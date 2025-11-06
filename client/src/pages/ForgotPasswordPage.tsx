import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import VaultLogo from "@/components/VaultLogo";
import { Phone, Lock, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

type Step = "phone" | "verify" | "reset";

export default function ForgotPasswordPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [step, setStep] = useState<Step>("phone");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const sendCodeMutation = useMutation({
    mutationFn: async (phone: string) => {
      const response = await apiRequest("/api/auth/send-verification-code", "POST", {
        phoneNumber: phone,
      });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "인증 코드 전송",
        description: data.developmentMode 
          ? `개발 모드: 콘솔에서 인증 코드를 확인하세요 (${data.verificationCode})`
          : "인증 코드가 전송되었습니다.",
      });
      setStep("verify");
    },
    onError: () => {
      toast({
        title: "전송 실패",
        description: "인증 코드 전송에 실패했습니다. 다시 시도해주세요.",
        variant: "destructive",
      });
    },
  });

  const verifyCodeMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("/api/auth/verify-phone-code", "POST", {
        phoneNumber,
        code: verificationCode,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "인증 성공",
        description: "새 비밀번호를 설정해주세요.",
      });
      setStep("reset");
    },
    onError: () => {
      toast({
        title: "인증 실패",
        description: "잘못된 인증 코드이거나 만료되었습니다.",
        variant: "destructive",
      });
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("/api/auth/reset-password", "POST", {
        phoneNumber,
        code: verificationCode,
        newPassword,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "비밀번호 재설정 완료",
        description: "새 비밀번호로 로그인해주세요.",
      });
      setLocation("/login");
    },
    onError: () => {
      toast({
        title: "재설정 실패",
        description: "비밀번호 재설정에 실패했습니다. 다시 시도해주세요.",
        variant: "destructive",
      });
    },
  });

  const handleSendCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber) {
      toast({
        title: "입력 오류",
        description: "전화번호를 입력해주세요.",
        variant: "destructive",
      });
      return;
    }
    sendCodeMutation.mutate(phoneNumber);
  };

  const handleVerifyCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!verificationCode) {
      toast({
        title: "입력 오류",
        description: "인증 코드를 입력해주세요.",
        variant: "destructive",
      });
      return;
    }
    verifyCodeMutation.mutate();
  };

  const handleResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || !confirmPassword) {
      toast({
        title: "입력 오류",
        description: "모든 필드를 입력해주세요.",
        variant: "destructive",
      });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({
        title: "입력 오류",
        description: "비밀번호가 일치하지 않습니다.",
        variant: "destructive",
      });
      return;
    }
    if (newPassword.length < 6) {
      toast({
        title: "입력 오류",
        description: "비밀번호는 최소 6자 이상이어야 합니다.",
        variant: "destructive",
      });
      return;
    }
    resetPasswordMutation.mutate();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="transform scale-150 mb-8">
            <VaultLogo size="lg" className="mx-auto" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">비밀번호 찾기</h2>
          <p className="text-gray-600">전화번호 인증을 통해 비밀번호를 재설정하세요</p>
        </div>

        <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-center text-xl">
              {step === "phone" && "전화번호 입력"}
              {step === "verify" && "인증 코드 입력"}
              {step === "reset" && "새 비밀번호 설정"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {step === "phone" && (
              <form onSubmit={handleSendCode} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="phone">전화번호</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+821012345678"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      className="pl-10"
                      required
                      data-testid="input-phone"
                    />
                  </div>
                  <p className="text-xs text-gray-500">국가 코드를 포함하여 입력하세요 (예: +8210...)</p>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-purple-600 hover:bg-purple-700"
                  disabled={sendCodeMutation.isPending}
                  data-testid="button-send-code"
                >
                  {sendCodeMutation.isPending ? "전송 중..." : "인증 코드 받기"}
                </Button>

                <div className="text-center">
                  <Button
                    variant="link"
                    className="p-0 text-purple-600 hover:text-purple-700"
                    onClick={() => setLocation("/login")}
                  >
                    <ArrowLeft className="h-4 w-4 mr-1" />
                    로그인으로 돌아가기
                  </Button>
                </div>
              </form>
            )}

            {step === "verify" && (
              <form onSubmit={handleVerifyCode} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="code">인증 코드</Label>
                  <Input
                    id="code"
                    type="text"
                    placeholder="6자리 인증 코드"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    maxLength={6}
                    required
                    data-testid="input-verification-code"
                  />
                  <p className="text-xs text-gray-500">전송된 6자리 인증 코드를 입력하세요</p>
                </div>

                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => setStep("phone")}
                    data-testid="button-back"
                  >
                    이전
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 bg-purple-600 hover:bg-purple-700"
                    disabled={verifyCodeMutation.isPending}
                    data-testid="button-verify-code"
                  >
                    {verifyCodeMutation.isPending ? "확인 중..." : "인증 확인"}
                  </Button>
                </div>
              </form>
            )}

            {step === "reset" && (
              <form onSubmit={handleResetPassword} className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">새 비밀번호</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        id="newPassword"
                        type="password"
                        placeholder="새 비밀번호 (최소 6자)"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="pl-10"
                        required
                        data-testid="input-new-password"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">비밀번호 확인</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        id="confirmPassword"
                        type="password"
                        placeholder="비밀번호 확인"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="pl-10"
                        required
                        data-testid="input-confirm-password"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => setStep("verify")}
                    data-testid="button-back-verify"
                  >
                    이전
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 bg-purple-600 hover:bg-purple-700"
                    disabled={resetPasswordMutation.isPending}
                    data-testid="button-reset-password"
                  >
                    {resetPasswordMutation.isPending ? "재설정 중..." : "비밀번호 재설정"}
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
