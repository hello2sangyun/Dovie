import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import VaultLogo from "@/components/VaultLogo";
import { User, Lock, Phone } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const { setUser } = useAuth();
  const { toast } = useToast();
  
  // Username/Password login state
  const [usernameLoginData, setUsernameLoginData] = useState({
    username: "",
    password: "",
  });
  
  // Phone login state - redirect to phone login page
  const handlePhoneLogin = () => {
    setLocation("/phone-login");
  };

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
        // 관리자 계정 - 바로 관리자 페이지로 이동
        setLocation("/admin");
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="transform scale-150 mb-8">
            <VaultLogo size="lg" className="mx-auto" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Dovie 메신저</h2>
          <p className="text-gray-600">안전하고 스마트한 메신저</p>
        </div>

        <Card className="border-0 shadow-xl bg-white">
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

                  <div className="flex items-center justify-between text-sm">
                    <Button 
                      variant="link" 
                      className="p-0 h-auto text-purple-600 hover:text-purple-700"
                      onClick={() => setLocation("/forgot-password")}
                    >
                      비밀번호를 잊으셨나요?
                    </Button>
                  </div>
                </form>

                <div className="mt-6 text-center">
                  <p className="text-sm text-gray-600">
                    계정이 없으신가요?{" "}
                    <Button variant="link" className="p-0 text-purple-600 hover:text-purple-700" onClick={() => setLocation("/signup")}>
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
                      className="w-full bg-purple-600 hover:bg-purple-700"
                    >
                      전화번호 인증 시작하기
                    </Button>
                  </div>

                  <div className="mt-6 text-center">
                    <p className="text-sm text-gray-600">
                      계정이 없으신가요?{" "}
                      <Button variant="link" className="p-0 text-purple-600 hover:text-purple-700" onClick={() => setLocation("/signup")}>
                        회원가입
                      </Button>
                    </p>
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