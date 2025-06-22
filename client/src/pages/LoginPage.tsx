import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import VaultLogo from "@/components/VaultLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, Lock, Phone, Play, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const { setUser } = useAuth();
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [keepLoggedIn, setKeepLoggedIn] = useState(true);
  // Test login functionality removed



  const loginMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await apiRequest("/api/auth/login", "POST", data);
      return response.json();
    },
    onSuccess: (data) => {
      console.log("로그인 성공, 사용자 데이터:", data.user);
      
      // 사용자 정보와 localStorage를 동시에 설정
      setUser(data.user);
      localStorage.setItem("userId", data.user.id.toString());
      
      // 로그인 유지 설정
      if (keepLoggedIn) {
        localStorage.setItem("keepLoggedIn", "true");
        localStorage.setItem("userToken", data.token || "");
      }
      
      // 관리자 계정 체크
      if (formData.email === "master@master.com") {
        console.log("관리자 로그인 - /admin으로 이동");
        setTimeout(() => setLocation("/admin"), 50);
        // 관리자 로그인 - 알림 제거
        return;
      }
      
      // 프로필이 완성되지 않은 경우 프로필 설정 페이지로
      if (!data.user.isProfileComplete) {
        console.log("프로필 미완성 - /profile-setup으로 이동");
        setTimeout(() => setLocation("/profile-setup"), 50);
        // 프로필 미완성 - 알림 제거
      } else {
        console.log("프로필 완성됨 - /app으로 이동");
        
        // React Query 캐시 무효화하여 사용자 상태 즉시 업데이트
        queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
        
        // 로그인 성공 - 알림 제거
        
        // 마이크 권한 요청
        const requestMicrophonePermission = async () => {
          try {
            await navigator.mediaDevices.getUserMedia({ audio: true });
            console.log("마이크 권한 승인됨");
          } catch (error) {
            console.log("마이크 권한 거부됨:", error);
            // 권한이 거부되어도 로그인은 계속 진행
          }
        };
        
        // 마이크 권한 요청 후 라우팅
        requestMicrophonePermission().finally(() => {
          setTimeout(() => setLocation("/app"), 100);
        });
      }
    },
    onError: (error: any) => {
      // 로그인 실패 - 알림 제거
    },
  });

  // Test login functionality removed per user request

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate(formData);
  };

  return (
    <div className="fixed inset-0 bg-gray-50 flex items-center justify-center">
      <div className="w-full max-w-md p-8 animate-slide-up">
        <div className="text-center mb-8">
          <VaultLogo size="lg" className="mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Dovie Messenger</h2>
          <p className="text-gray-600">비즈니스 메신저 서비스에 로그인하세요</p>
        </div>

        <div className="space-y-4">
          {/* 이메일 로그인 */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-center text-lg">이메일로 로그인</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">이메일</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="example@company.com"
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
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
                      placeholder="비밀번호를 입력하세요"
                      value={formData.password}
                      onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
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

                <div className="flex items-center space-x-2 mb-4">
                  <input
                    type="checkbox"
                    id="keepLoggedIn"
                    checked={keepLoggedIn}
                    onChange={(e) => setKeepLoggedIn(e.target.checked)}
                    className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                  />
                  <label htmlFor="keepLoggedIn" className="text-sm text-gray-700">
                    로그인 상태 유지
                  </label>
                </div>

                <Button 
                  type="submit" 
                  className="w-full purple-gradient hover:purple-gradient-hover"
                  disabled={loginMutation.isPending}
                >
                  {loginMutation.isPending ? "로그인 중..." : "로그인"}
                </Button>
              </form>

              <div className="mt-4 text-center">
                <p className="text-sm text-gray-600">
                  계정이 없으신가요?{" "}
                  <button
                    onClick={() => setLocation("/signup")}
                    className="text-purple-600 hover:text-purple-700 font-medium"
                  >
                    회원가입하기
                  </button>
                </p>
              </div>
            </CardContent>
          </Card>

          {/* 기타 로그인 옵션 */}
          <div className="space-y-3">
            <Card className="bg-gray-50 border">
              <CardContent className="p-4">
                <Button 
                  className="w-full" 
                  variant="secondary" 
                  onClick={() => setLocation("/phone-login")}
                >
                  <Phone className="mr-2 h-4 w-4" />
                  전화번호로 로그인
                </Button>
              </CardContent>
            </Card>

            {/* Test login functionality removed per user request */}
          </div>
        </div>

        <div className="mt-8 text-center">
          <p className="text-xs text-gray-500">
            계속 진행하면 <span className="text-purple-600">이용약관</span> 및{" "}
            <span className="text-purple-600">개인정보처리방침</span>에 동의한 것으로 간주됩니다.
          </p>
        </div>
      </div>
    </div>
  );
}
