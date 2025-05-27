import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import DovieLogo from "@/components/DovieLogo";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Phone, Play } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const { setUser } = useAuth();
  const { toast } = useToast();
  const [username] = useState(`testuser_${Math.floor(Math.random() * 10000)}`);

  const testLoginMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/auth/test-login", { username });
      return response.json();
    },
    onSuccess: (data) => {
      setUser(data.user);
      localStorage.setItem("userId", data.user.id.toString());
      setLocation("/app");
      toast({
        title: "로그인 성공",
        description: `${data.user.displayName}님 환영합니다!`,
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "로그인 실패",
        description: "다시 시도해주세요.",
      });
    },
  });

  return (
    <div className="fixed inset-0 bg-white flex items-center justify-center">
      <div className="w-full max-w-md p-8 animate-slide-up">
        <div className="text-center mb-8">
          <DovieLogo withText={true} className="mx-auto mb-6" />
          <p className="text-gray-600">로그인하여 시작하세요</p>
        </div>

        <div className="space-y-4">
          <Card className="bg-gray-50 border">
            <CardContent className="p-4">
              <h3 className="font-medium text-gray-900 mb-2">전화번호 인증</h3>
              <p className="text-sm text-gray-600 mb-3">전화번호로 로그인하세요</p>
              <Button 
                className="w-full" 
                variant="secondary" 
                disabled
              >
                <Phone className="mr-2 h-4 w-4" />
                준비중
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-purple-50 border-purple-200">
            <CardContent className="p-4">
              <h3 className="font-medium text-gray-900 mb-2">테스트 로그인</h3>
              <p className="text-sm text-gray-600 mb-3">테스트용 계정으로 바로 시작</p>
              <Button 
                className="w-full purple-gradient hover:purple-gradient-hover"
                onClick={() => testLoginMutation.mutate()}
                disabled={testLoginMutation.isPending}
              >
                <Play className="mr-2 h-4 w-4" />
                {testLoginMutation.isPending ? "로그인 중..." : "테스트 시작하기"}
              </Button>
            </CardContent>
          </Card>
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
