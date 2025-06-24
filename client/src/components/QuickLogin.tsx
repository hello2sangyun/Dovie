import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useDirectAuth";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export function QuickLogin() {
  const [, setLocation] = useLocation();
  const { loginWithEmail } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleQuickLogin = async () => {
    setIsLoading(true);
    try {
      await loginWithEmail("smbaek04@gmail.com", "test123");
      toast({
        title: "로그인 성공",
        description: "Dovie Messenger에 오신 것을 환영합니다!",
      });
      setLocation("/app");
    } catch (error) {
      toast({
        title: "로그인 실패",
        description: "로그인 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Button 
        onClick={handleQuickLogin}
        disabled={isLoading}
        className="w-full"
      >
        {isLoading ? "로그인 중..." : "빠른 로그인 (딸기)"}
      </Button>
      <p className="text-sm text-gray-600 text-center">
        PWA 테스트용 빠른 로그인
      </p>
    </div>
  );
}