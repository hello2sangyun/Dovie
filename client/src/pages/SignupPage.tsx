import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import VaultLogo from "@/components/VaultLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, Lock, User, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function SignupPage() {
  const [, setLocation] = useLocation();
  const { setUser } = useAuth();
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    displayName: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const signupMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await apiRequest("/api/auth/signup", "POST", {
        email: data.email,
        password: data.password,
        displayName: data.displayName,
        username: data.email.split('@')[0] + '_' + Math.floor(Math.random() * 1000),
      });
      return response;
    },
    onSuccess: (data) => {
      setUser(data.user);
      localStorage.setItem("userId", data.user.id.toString());
      toast({
        title: "회원가입 성공",
        description: "프로필을 완성해주세요!",
      });
      setLocation("/profile-setup");
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "회원가입 실패",
        description: error.message || "다시 시도해주세요.",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      toast({
        variant: "destructive",
        title: "비밀번호 불일치",
        description: "비밀번호가 일치하지 않습니다.",
      });
      return;
    }

    if (formData.password.length < 6) {
      toast({
        variant: "destructive",
        title: "비밀번호 오류",
        description: "비밀번호는 6자 이상이어야 합니다.",
      });
      return;
    }

    signupMutation.mutate(formData);
  };

  return (
    <div className="fixed inset-0 bg-gray-50 flex items-center justify-center">
      <div className="w-full max-w-md p-8 animate-slide-up">
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
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="displayName">이름</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    id="displayName"
                    type="text"
                    placeholder="실명을 입력해주세요"
                    value={formData.displayName}
                    onChange={(e) => setFormData(prev => ({ ...prev, displayName: e.target.value }))}
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
                    placeholder="6자 이상 입력해주세요"
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

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">비밀번호 확인</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="비밀번호를 다시 입력해주세요"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
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
                className="w-full purple-gradient hover:purple-gradient-hover"
                disabled={signupMutation.isPending}
              >
                {signupMutation.isPending ? "계정 생성 중..." : "계정 만들기"}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                이미 계정이 있으신가요?{" "}
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

        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            계정을 만들면 <span className="text-purple-600">이용약관</span> 및{" "}
            <span className="text-purple-600">개인정보처리방침</span>에 동의한 것으로 간주됩니다.
          </p>
        </div>
      </div>
    </div>
  );
}