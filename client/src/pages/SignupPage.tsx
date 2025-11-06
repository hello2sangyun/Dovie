import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import VaultLogo from "@/components/VaultLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Lock, User, Eye, EyeOff, Phone, Check, Image as ImageIcon } from "lucide-react";
import { FcGoogle } from "react-icons/fc";
import { SiApple } from "react-icons/si";

export default function SignupPage() {
  const [, setLocation] = useLocation();
  const { setUser } = useAuth();
  
  // Multi-step form state
  const [step, setStep] = useState<'phone' | 'verify' | 'details'>('phone');
  const [phoneNumber, setPhoneNumber] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Step 1: Send verification code
  const sendCodeMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("/api/auth/send-verification-code", "POST", {
        phoneNumber,
      });
      return response.json();
    },
    onSuccess: (data) => {
      console.log("Verification code sent:", data);
      setStep('verify');
      if (data.developmentMode) {
        console.log("📱 인증 코드:", data.verificationCode);
      }
    },
    onError: (error: any) => {
      console.error("Send code error:", error);
    },
  });

  // Step 2: Verify code
  const verifyCodeMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("/api/auth/verify-phone-code", "POST", {
        phoneNumber,
        code: verificationCode,
      });
      return response.json();
    },
    onSuccess: (data) => {
      console.log("Verification successful:", data);
      setStep('details');
    },
    onError: (error: any) => {
      console.error("Verify code error:", error);
    },
  });

  // Step 3: Complete signup
  const signupMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("/api/auth/signup-phone", "POST", {
        phoneNumber,
        code: verificationCode,
        username,
        displayName,
        password,
        profilePicture,
      });
      return response.json();
    },
    onSuccess: (data) => {
      setUser(data.user);
      localStorage.setItem("userId", data.user.id.toString());
      setLocation("/contacts");
    },
    onError: (error: any) => {
      console.error("Signup error:", error);
    },
  });

  const handleSendCode = (e: React.FormEvent) => {
    e.preventDefault();
    sendCodeMutation.mutate();
  };

  const handleVerifyCode = (e: React.FormEvent) => {
    e.preventDefault();
    verifyCodeMutation.mutate();
  };

  const handleSignup = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username.trim()) {
      return;
    }
    
    if (password !== confirmPassword) {
      return;
    }

    if (password.length < 6) {
      return;
    }

    signupMutation.mutate();
  };

  const handleProfilePictureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("profilePicture", file);

    try {
      const response = await fetch("/api/upload/profile-picture", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();
      setProfilePicture(data.profilePicture);
    } catch (error) {
      console.error("Profile picture upload error:", error);
    }
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
      
      setLocation("/contacts");
    } catch (error: any) {
      console.error(`${provider} signup error:`, error);
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
            <CardTitle className="text-center text-lg">
              {step === 'phone' && '휴대폰 인증'}
              {step === 'verify' && '인증 코드 입력'}
              {step === 'details' && '회원 정보 입력'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Step 1: Phone Number */}
            {step === 'phone' && (
              <form onSubmit={handleSendCode} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="phoneNumber">휴대폰 번호</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      id="phoneNumber"
                      type="tel"
                      placeholder="+821012345678"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      className="pl-10"
                      required
                      data-testid="input-phone"
                    />
                  </div>
                  <p className="text-xs text-gray-500">국가 코드를 포함한 전화번호를 입력해주세요 (예: +821012345678)</p>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                  disabled={sendCodeMutation.isPending}
                  data-testid="button-send-code"
                >
                  {sendCodeMutation.isPending ? "전송 중..." : "인증 코드 받기"}
                </Button>

                <div className="mt-6">
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <Separator className="w-full" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-white px-2 text-gray-500">또는</span>
                    </div>
                  </div>

                  <div className="mt-6 space-y-3">
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
              </form>
            )}

            {/* Step 2: Verification Code */}
            {step === 'verify' && (
              <form onSubmit={handleVerifyCode} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="verificationCode">인증 코드</Label>
                  <div className="relative">
                    <Check className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      id="verificationCode"
                      type="text"
                      placeholder="6자리 인증 코드"
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value)}
                      className="pl-10"
                      required
                      maxLength={6}
                      data-testid="input-verification-code"
                    />
                  </div>
                  <p className="text-xs text-gray-500">SMS로 전송된 6자리 인증 코드를 입력해주세요</p>
                </div>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep('phone')}
                    className="flex-1"
                  >
                    이전
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                    disabled={verifyCodeMutation.isPending}
                    data-testid="button-verify-code"
                  >
                    {verifyCodeMutation.isPending ? "확인 중..." : "인증 확인"}
                  </Button>
                </div>
              </form>
            )}

            {/* Step 3: Details */}
            {step === 'details' && (
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username">사용자명 (ID)</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      id="username"
                      type="text"
                      placeholder="영문과 특수문자만 사용 가능"
                      value={username}
                      onChange={(e) => {
                        const value = e.target.value;
                        const regex = /^[a-zA-Z!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]*$/;
                        if (regex.test(value) || value === '') {
                          setUsername(value);
                        }
                      }}
                      className="pl-10"
                      required
                      data-testid="input-username"
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
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="pl-10"
                      required
                      data-testid="input-displayname"
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
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 pr-10"
                      required
                      data-testid="input-password"
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
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="pl-10 pr-10"
                      required
                      data-testid="input-confirm-password"
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

                <div className="space-y-2">
                  <Label>프로필 사진 (선택)</Label>
                  <div className="flex items-center gap-4">
                    {profilePicture ? (
                      <div className="relative w-20 h-20 rounded-full overflow-hidden">
                        <img src={profilePicture} alt="Profile" className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center">
                        <ImageIcon className="h-8 w-8 text-gray-400" />
                      </div>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleProfilePictureUpload}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex-1"
                      data-testid="button-upload-profile-pic"
                    >
                      {profilePicture ? "사진 변경" : "사진 업로드"}
                    </Button>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep('verify')}
                    className="flex-1"
                  >
                    이전
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                    disabled={signupMutation.isPending}
                    data-testid="button-signup"
                  >
                    {signupMutation.isPending ? "가입 중..." : "계정 만들기"}
                  </Button>
                </div>
              </form>
            )}

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
