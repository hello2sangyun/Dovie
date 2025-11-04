import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import VaultLogo from "@/components/VaultLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Mail, Lock, User, Eye, EyeOff, Phone } from "lucide-react";
import { FcGoogle } from "react-icons/fc";
import { SiApple } from "react-icons/si";
import { Capacitor } from "@capacitor/core";
import { useToast } from "@/hooks/use-toast";

export default function SignupPage() {
  const [, setLocation] = useLocation();
  const { setUser } = useAuth();
  const { toast } = useToast();
  const [checkingRedirect, setCheckingRedirect] = useState(false);
  
  const [usernameFormData, setUsernameFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    displayName: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Phone signup redirects to phone login
  const handlePhoneSignup = () => {
    setLocation("/phone-login");
  };

  // Check for redirect result on mount (for native platforms)
  useEffect(() => {
    const handleRedirectResult = async () => {
      if (!Capacitor.isNativePlatform()) {
        return;
      }

      setCheckingRedirect(true);
      
      try {
        const { checkRedirectResult } = await import('@/lib/firebase');
        const result = await checkRedirectResult();
        
        if (result) {
          console.log('📱 Processing redirect result');
          
          // Determine provider from result (Google or Apple)
          const authProvider = 'google'; // Default to Google for now
          
          const response = await apiRequest("/api/auth/social-login", "POST", {
            idToken: result.idToken,
            authProvider,
          });
          
          const data = await response.json();
          setUser(data.user);
          localStorage.setItem("userId", data.user.id.toString());
          
          setLocation("/profile-setup");
        }
      } catch (error: any) {
        console.error('Redirect result processing error:', error);
      } finally {
        setCheckingRedirect(false);
      }
    };

    handleRedirectResult();
  }, [setUser, setLocation]);

  const signupMutation = useMutation({
    mutationFn: async (data: typeof usernameFormData) => {
      const response = await apiRequest("/api/auth/signup", "POST", {
        email: data.email,
        password: data.password,
        displayName: data.displayName,
        username: data.username,
      });
      return response.json();
    },
    onSuccess: (data) => {
      setUser(data.user);
      localStorage.setItem("userId", data.user.id.toString());
      setLocation("/profile-setup");
    },
    onError: (error: any) => {
    },
  });

  const handleUsernameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!usernameFormData.username.trim()) {
      return;
    }
    
    if (usernameFormData.password !== usernameFormData.confirmPassword) {
      return;
    }

    if (usernameFormData.password.length < 6) {
      return;
    }

    signupMutation.mutate(usernameFormData);
  };

  const handleSocialSignup = async (provider: 'google' | 'apple') => {
    try {
      const { signInWithGoogle, signInWithApple } = await import('@/lib/firebase');
      
      const result = provider === 'google' 
        ? await signInWithGoogle()
        : await signInWithApple();
      
      const response = await apiRequest("/api/auth/social-login", "POST", {
        idToken: result.idToken,
        authProvider: provider,
      });
      
      const data = await response.json();
      setUser(data.user);
      localStorage.setItem("userId", data.user.id.toString());
      
      setLocation("/profile-setup");
    } catch (error: any) {
      if (error.message === 'REDIRECT_IN_PROGRESS') {
        // Redirect initiated - result will be handled on app resume
        console.log('📱 Redirect initiated, waiting for callback...');
        return;
      }
      console.error(`${provider} signup error:`, error);
      toast({
        title: "회원가입 실패",
        description: error.message || "회원가입 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-50 flex items-center justify-center">
      <div className="w-full max-w-md p-8">
        <div className="text-center mb-8">
          <VaultLogo size="lg" className="mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Dovie 계정 만들기</h2>
          <p className="text-gray-600">비즈니스 메신저 서비스에 오신 것을 환영합니다</p>
        </div>

        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-center text-lg">회원가입</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="username" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="username" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  사용자명
                </TabsTrigger>
                <TabsTrigger value="phone" className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  휴대폰
                </TabsTrigger>
              </TabsList>

              <TabsContent value="username" className="mt-6">
                <form onSubmit={handleUsernameSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="username">사용자명 (ID)</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        id="username"
                        type="text"
                        placeholder="영문과 특수문자만 사용 가능"
                        value={usernameFormData.username}
                        onChange={(e) => {
                          const value = e.target.value;
                          // 영문 + 특수문자만 허용
                          const regex = /^[a-zA-Z!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]*$/;
                          if (regex.test(value) || value === '') {
                            setUsernameFormData(prev => ({ ...prev, username: value }));
                          }
                        }}
                        className="pl-10"
                        required
                      />
                    </div>
                    <p className="text-xs text-gray-500">영문과 특수문자만 사용 가능 (대소문자 구분 안 함)</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="displayName">이름</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        id="displayName"
                        type="text"
                        placeholder="실명을 입력해주세요"
                        value={usernameFormData.displayName}
                        onChange={(e) => setUsernameFormData(prev => ({ ...prev, displayName: e.target.value }))}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">이메일</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="이메일을 입력해주세요"
                        value={usernameFormData.email}
                        onChange={(e) => setUsernameFormData(prev => ({ ...prev, email: e.target.value }))}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">비밀번호</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="비밀번호를 입력해주세요"
                        value={usernameFormData.password}
                        onChange={(e) => setUsernameFormData(prev => ({ ...prev, password: e.target.value }))}
                        className="pl-10 pr-10"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">비밀번호 확인</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="비밀번호를 다시 입력해주세요"
                        value={usernameFormData.confirmPassword}
                        onChange={(e) => setUsernameFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                        className="pl-10 pr-10"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                    disabled={signupMutation.isPending}
                    data-testid="button-signup"
                  >
                    {signupMutation.isPending ? "계정 생성 중..." : "계정 만들기"}
                  </Button>
                </form>

                <div className="mt-6">
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <Separator className="w-full" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-white px-2 text-gray-500">또는</span>
                    </div>
                  </div>

                  <div className="mt-6">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleSocialSignup('google')}
                      className="w-full"
                      data-testid="button-google-signup"
                    >
                      <FcGoogle className="h-5 w-5 mr-2" />
                      Google로 계속하기
                    </Button>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="phone" className="mt-6">
                <div className="text-center space-y-4">
                  <p className="text-gray-600">휴대폰 인증을 통해 가입하시겠습니까?</p>
                  <Button
                    onClick={handlePhoneSignup}
                    className="w-full bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700"
                  >
                    휴대폰 인증으로 가입하기
                  </Button>
                </div>
              </TabsContent>
            </Tabs>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                이미 계정이 있나요?{" "}
                <button
                  onClick={() => setLocation("/login")}
                  className="text-purple-600 hover:text-purple-700 font-medium"
                >
                  로그인하기
                </button>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}