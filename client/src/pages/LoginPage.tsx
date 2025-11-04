import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import VaultLogo from "@/components/VaultLogo";
import { User, Lock, Phone } from "lucide-react";
import { FcGoogle } from "react-icons/fc";
import { SiApple } from "react-icons/si";
import { useToast } from "@/hooks/use-toast";
import { Capacitor } from "@capacitor/core";

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const { setUser } = useAuth();
  const { toast } = useToast();
  const [checkingRedirect, setCheckingRedirect] = useState(false);
  
  // Username/Password login state
  const [usernameLoginData, setUsernameLoginData] = useState({
    username: "",
    password: "",
  });
  
  // Phone login state - redirect to phone login page
  const handlePhoneLogin = () => {
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
          
          if (!data.user.isProfileComplete) {
            setLocation("/profile-setup");
          } else if (data.user.email === "master@master.com") {
            // 관리자 계정 - 모바일 체크
            const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
            if (isMobile) {
              toast({
                title: "접근 불가",
                description: "관리자 페이지는 PC에서만 접속 가능합니다.",
                variant: "destructive",
              });
              // 로그아웃
              setUser(null);
              localStorage.removeItem("userId");
            } else {
              setLocation("/admin");
            }
          } else {
            setLocation("/app");
          }
        }
      } catch (error: any) {
        console.error('Redirect result processing error:', error);
      } finally {
        setCheckingRedirect(false);
      }
    };

    handleRedirectResult();
  }, [setUser, setLocation, toast]);

  const usernameLoginMutation = useMutation({
    mutationFn: async (data: typeof usernameLoginData) => {
      const response = await apiRequest("/api/auth/username-login", "POST", data);
      return response.json();
    },
    onSuccess: (data) => {
      setUser(data.user);
      localStorage.setItem("userId", data.user.id.toString());
      
      if (!data.user.isProfileComplete) {
        setLocation("/profile-setup");
      } else if (data.user.email === "master@master.com") {
        // 관리자 계정 - 모바일 체크
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        if (isMobile) {
          toast({
            title: "접근 불가",
            description: "관리자 페이지는 PC에서만 접속 가능합니다.",
            variant: "destructive",
          });
          // 로그아웃
          setUser(null);
          localStorage.removeItem("userId");
        } else {
          setLocation("/admin");
        }
      } else {
        setLocation("/app");
      }
    },
    onError: (error: any) => {
    },
  });

  const handleUsernameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!usernameLoginData.username || !usernameLoginData.password) {
      return;
    }
    
    usernameLoginMutation.mutate(usernameLoginData);
  };

  const handleSocialLogin = (provider: 'google' | 'apple') => {
    import('@/lib/firebase').then(async ({ signInWithGoogle, signInWithApple }) => {
      try {
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
        
        if (!data.user.isProfileComplete) {
          setLocation("/profile-setup");
        } else if (data.user.email === "master@master.com") {
          // 관리자 계정 - 모바일 체크
          const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
          if (isMobile) {
            toast({
              title: "접근 불가",
              description: "관리자 페이지는 PC에서만 접속 가능합니다.",
              variant: "destructive",
            });
            // 로그아웃
            setUser(null);
            localStorage.removeItem("userId");
          } else {
            setLocation("/admin");
          }
        } else {
          setLocation("/app");
        }
      } catch (error: any) {
        if (error.message === 'REDIRECT_IN_PROGRESS') {
          // Redirect initiated - result will be handled on app resume
          console.log('📱 Redirect initiated, waiting for callback...');
          return;
        }
        console.error(`${provider} login error:`, error);
        toast({
          title: "로그인 실패",
          description: error.message || "로그인 중 오류가 발생했습니다.",
          variant: "destructive",
        });
      }
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <VaultLogo size="lg" className="mx-auto mb-4" />
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Dovie 메신저</h2>
          <p className="text-gray-600">안전하고 스마트한 메신저</p>
        </div>

        <Card className="border-0 shadow-xl">
          <CardHeader>
            <CardTitle className="text-center text-xl">로그인</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="username" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="username" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  아이디 로그인
                </TabsTrigger>
                <TabsTrigger value="phone" className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  전화번호 로그인
                </TabsTrigger>
              </TabsList>

              <TabsContent value="username">
                <form onSubmit={handleUsernameSubmit} className="space-y-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="username">사용자명 (아이디)</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <Input
                          id="username"
                          type="text"
                          placeholder="사용자명을 입력하세요"
                          value={usernameLoginData.username}
                          onChange={(e) => setUsernameLoginData(prev => ({ ...prev, username: e.target.value }))}
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
                          type="password"
                          placeholder="비밀번호를 입력하세요"
                          value={usernameLoginData.password}
                          onChange={(e) => setUsernameLoginData(prev => ({ ...prev, password: e.target.value }))}
                          className="pl-10"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-purple-600 hover:bg-purple-700"
                    disabled={usernameLoginMutation.isPending}
                    data-testid="button-username-login"
                  >
                    {usernameLoginMutation.isPending ? "로그인 중..." : "로그인"}
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
                      onClick={() => handleSocialLogin('google')}
                      className="w-full"
                      data-testid="button-google-login"
                    >
                      <FcGoogle className="h-5 w-5 mr-2" />
                      Google로 로그인
                    </Button>
                  </div>
                </div>

                <div className="mt-6 text-center">
                  <p className="text-sm text-gray-600">
                    계정이 없으신가요?{" "}
                    <Button variant="link" className="p-0" onClick={() => setLocation("/signup")}>
                      회원가입
                    </Button>
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="phone">
                <div className="space-y-6">
                  <div className="text-center py-8">
                    <Phone className="mx-auto h-12 w-12 text-purple-600 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">전화번호로 로그인</h3>
                    <p className="text-sm text-gray-600 mb-6">
                      전화번호 인증을 통해 안전하게 로그인하세요
                    </p>
                    
                    <Button
                      onClick={handlePhoneLogin}
                      className="w-full bg-green-600 hover:bg-green-700"
                    >
                      전화번호 인증 시작하기
                    </Button>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}