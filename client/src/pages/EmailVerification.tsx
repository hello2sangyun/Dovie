import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import VaultLogo from "@/components/VaultLogo";
import { Mail, ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";

export default function EmailVerification() {
  const { user, setUser } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [step, setStep] = useState<"email" | "verification">("email");

  // 이메일 인증 코드 전송
  const sendEmailMutation = useMutation({
    mutationFn: async (data: { email: string; userId: number }) => {
      try {
        const response = await fetch("/api/auth/send-email", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        });
        
        if (!response.ok) {
          throw new Error("이메일 전송 실패");
        }
        
        const result = await response.json();
        return result;
      } catch (error) {
        console.error("이메일 전송 오류:", error);
        throw error;
      }
    },
    onSuccess: (data) => {
      console.log("이메일 전송 성공:", data);
      setStep("verification");
      toast({
        title: "인증 코드 전송",
        description: `${email}로 인증 코드를 전송했습니다.`,
      });
    },
    onError: (error: any) => {
      console.error("이메일 전송 실패:", error);
      toast({
        title: "오류",
        description: "인증 코드 전송에 실패했습니다. 다시 시도해주세요.",
        variant: "destructive",
      });
    },
  });

  // 이메일 인증 확인
  const verifyEmailMutation = useMutation({
    mutationFn: async (data: { email: string; verificationCode: string; userId: number }) => {
      try {
        const response = await fetch("/api/auth/verify-email", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        });
        
        if (!response.ok) {
          throw new Error("이메일 인증 실패");
        }
        
        const result = await response.json();
        return result;
      } catch (error) {
        console.error("이메일 인증 오류:", error);
        throw error;
      }
    },
    onSuccess: (data) => {
      console.log("이메일 인증 성공:", data);
      setUser(data.user);
      toast({
        title: "이메일 인증 완료",
        description: "이메일 인증이 완료되었습니다. 프로필을 설정해주세요.",
      });
      window.location.href = "/profile-setup";
    },
    onError: (error: any) => {
      console.error("이메일 인증 실패:", error);
      toast({
        title: "인증 실패",
        description: "인증 코드가 올바르지 않습니다. 다시 확인해주세요.",
        variant: "destructive",
      });
    },
  });

  const handleSendEmail = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast({
        title: "오류",
        description: "이메일을 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    console.log("현재 사용자 정보:", user);
    
    // localStorage에서 사용자 정보 확인
    const storedUser = localStorage.getItem('user');
    let currentUser = user;
    
    if (!currentUser && storedUser) {
      try {
        currentUser = JSON.parse(storedUser);
        console.log("localStorage에서 사용자 정보 복원:", currentUser);
      } catch (error) {
        console.error("사용자 정보 파싱 오류:", error);
      }
    }

    if (!currentUser?.id) {
      toast({
        title: "오류",
        description: "사용자 정보를 찾을 수 없습니다. 전화번호 인증부터 다시 진행해주세요.",
        variant: "destructive",
      });
      window.location.href = "/phone-login";
      return;
    }

    sendEmailMutation.mutate({
      email,
      userId: currentUser.id,
    });
  };

  const handleVerifyEmail = (e: React.FormEvent) => {
    e.preventDefault();
    if (!verificationCode.trim()) {
      toast({
        title: "오류",
        description: "인증 코드를 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    if (!user?.id) {
      toast({
        title: "오류",
        description: "사용자 정보를 찾을 수 없습니다.",
        variant: "destructive",
      });
      return;
    }

    verifyEmailMutation.mutate({
      email,
      verificationCode,
      userId: user.id,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <VaultLogo size="lg" animated />
          </div>
          <CardTitle className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            Dovie Messenger
          </CardTitle>
          <CardDescription>
            {step === "email" ? "이메일로 2차 인증을 진행해주세요" : "이메일로 받은 인증 코드를 입력해주세요"}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {step === "email" ? (
            <form onSubmit={handleSendEmail} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">이메일 주소</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="text-base"
                />
              </div>

              <Button 
                type="submit" 
                className="w-full purple-gradient text-white"
                disabled={sendEmailMutation.isPending}
              >
                {sendEmailMutation.isPending ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>인증 코드 전송 중...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <Mail className="w-4 h-4" />
                    <span>인증 코드 받기</span>
                  </div>
                )}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerifyEmail} className="space-y-4">
              <div className="text-center space-y-2">
                <Mail className="w-12 h-12 mx-auto text-purple-600" />
                <p className="text-sm text-gray-600">
                  <span className="font-medium">{email}</span>로<br />
                  인증 코드를 전송했습니다
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="code">인증 코드 (6자리)</Label>
                <Input
                  id="code"
                  type="text"
                  placeholder="000000"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/[^\d]/g, "").slice(0, 6))}
                  className="text-center text-lg tracking-wider"
                  maxLength={6}
                />
              </div>

              <Button 
                type="submit" 
                className="w-full purple-gradient text-white"
                disabled={verifyEmailMutation.isPending || verificationCode.length !== 6}
              >
                {verifyEmailMutation.isPending ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>인증 중...</span>
                  </div>
                ) : (
                  "이메일 인증 완료"
                )}
              </Button>

              <Button 
                type="button" 
                variant="ghost" 
                className="w-full"
                onClick={() => setStep("email")}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                이메일 다시 입력
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}