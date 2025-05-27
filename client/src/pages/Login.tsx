import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import VaultLogo from "@/components/VaultLogo";
import { MessageSquare, User } from "lucide-react";
import { countries } from "@/data/countries";

export default function Login() {
  const { setUser } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState<"main" | "phone" | "verification">("main");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [selectedCountry, setSelectedCountry] = useState(countries[0]);
  const [fullPhoneNumber, setFullPhoneNumber] = useState("");
  const [testUsername, setTestUsername] = useState("");

  // 테스트 로그인
  const testLoginMutation = useMutation({
    mutationFn: async (username: string) => {
      const response = await apiRequest("/api/auth/test-login", "POST", { username });
      return response;
    },
    onSuccess: (data: any) => {
      setUser(data.user);
      toast({
        title: "테스트 로그인 성공",
        description: "개발 모드로 로그인되었습니다.",
      });
      window.location.href = "/";
    },
    onError: (error: any) => {
      toast({
        title: "로그인 실패",
        description: error.message || "로그인에 실패했습니다.",
        variant: "destructive",
      });
    },
  });

  // SMS 인증 코드 전송 (로그인용)
  const sendSMSMutation = useMutation({
    mutationFn: async (data: { phoneNumber: string; countryCode: string }) => {
      const response = await apiRequest("/api/auth/login-sms", "POST", data);
      return response;
    },
    onSuccess: (data: any) => {
      console.log("SMS 전송 성공:", data);
      setStep("verification");
      setFullPhoneNumber(`${selectedCountry.dialCode}${phoneNumber}`);
      toast({
        title: "인증 코드 전송",
        description: `${selectedCountry.dialCode}${phoneNumber}로 인증 코드를 전송했습니다.`,
      });
    },
    onError: (error: any) => {
      console.error("SMS 전송 실패:", error);
      toast({
        title: "전송 실패",
        description: error.message || "인증 코드 전송에 실패했습니다.",
        variant: "destructive",
      });
    },
  });

  // SMS 인증 코드 확인 (로그인용)
  const verifySMSMutation = useMutation({
    mutationFn: async (data: { phoneNumber: string; verificationCode: string }) => {
      const response = await apiRequest("/api/auth/login-verify-sms", "POST", data);
      return response;
    },
    onSuccess: (data: any) => {
      console.log("SMS 인증 성공:", data);
      setUser(data.user);
      toast({
        title: "로그인 성공",
        description: "Dovie Messenger에 오신 것을 환영합니다!",
      });
      window.location.href = "/";
    },
    onError: (error: any) => {
      console.error("SMS 인증 실패:", error);
      if (error.message?.includes("사용자를 찾을 수 없습니다")) {
        toast({
          title: "가입되지 않은 번호",
          description: "회원가입을 먼저 진행해주세요.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "인증 실패",
          description: error.message || "인증 코드가 올바르지 않습니다.",
          variant: "destructive",
        });
      }
    },
  });

  const handleTestLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!testUsername.trim()) {
      toast({
        title: "오류",
        description: "사용자명을 입력해주세요.",
        variant: "destructive",
      });
      return;
    }
    testLoginMutation.mutate(testUsername);
  };

  const handleSendSMS = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber.trim()) {
      toast({
        title: "오류",
        description: "전화번호를 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    sendSMSMutation.mutate({
      phoneNumber: `${selectedCountry.dialCode}${phoneNumber}`,
      countryCode: selectedCountry.code,
    });
  };

  const handleVerifySMS = (e: React.FormEvent) => {
    e.preventDefault();
    if (!verificationCode.trim()) {
      toast({
        title: "오류",
        description: "인증 코드를 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    verifySMSMutation.mutate({
      phoneNumber: fullPhoneNumber,
      verificationCode,
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
            {step === "main" && "로그인 또는 회원가입을 선택해주세요"}
            {step === "phone" && "등록된 전화번호로 로그인하세요"}
            {step === "verification" && "인증 코드를 입력해주세요"}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {step === "main" && (
            <div className="space-y-4">
              {/* 전화번호 로그인 */}
              <Button 
                onClick={() => setStep("phone")}
                className="w-full purple-gradient text-white"
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                전화번호 인증
              </Button>

              {/* 회원가입 링크 */}
              <div className="text-center">
                <button
                  onClick={() => window.location.href = "/signup"}
                  className="text-sm text-purple-600 hover:text-purple-800 underline"
                >
                  회원가입하기
                </button>
              </div>

              {/* 구분선 */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">개발 모드</span>
                </div>
              </div>

              {/* 테스트 로그인 */}
              <form onSubmit={handleTestLogin} className="space-y-2">
                <Input
                  type="text"
                  placeholder="테스트 사용자명"
                  value={testUsername}
                  onChange={(e) => setTestUsername(e.target.value)}
                  className="text-sm"
                />
                <Button 
                  type="submit"
                  variant="outline"
                  className="w-full"
                  disabled={testLoginMutation.isPending}
                >
                  {testLoginMutation.isPending ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                      <span>로그인 중...</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <User className="w-4 h-4" />
                      <span>테스트 로그인</span>
                    </div>
                  )}
                </Button>
              </form>
            </div>
          )}

          {step === "phone" && (
            <form onSubmit={handleSendSMS} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="country">국가 선택</Label>
                <Select
                  value={selectedCountry.code}
                  onValueChange={(value) => {
                    const country = countries.find(c => c.code === value);
                    if (country) setSelectedCountry(country);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {countries.map((country) => (
                      <SelectItem key={country.code} value={country.code}>
                        <div className="flex items-center space-x-2">
                          <span>{country.flag}</span>
                          <span>{country.name}</span>
                          <span className="text-gray-500">{country.dialCode}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">등록된 전화번호</Label>
                <div className="flex space-x-2">
                  <div className="flex items-center px-3 py-2 border border-gray-300 rounded-md bg-gray-50 min-w-20">
                    <span className="text-sm font-medium">{selectedCountry.dialCode}</span>
                  </div>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="전화번호 입력"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value.replace(/[^\d]/g, ""))}
                    className="flex-1"
                  />
                </div>
              </div>

              <div className="flex space-x-2">
                <Button 
                  type="button"
                  variant="outline"
                  onClick={() => setStep("main")}
                  className="flex-1"
                >
                  뒤로
                </Button>
                <Button 
                  type="submit" 
                  className="flex-1 purple-gradient text-white"
                  disabled={sendSMSMutation.isPending}
                >
                  {sendSMSMutation.isPending ? "전송 중..." : "인증 코드 받기"}
                </Button>
              </div>
            </form>
          )}

          {step === "verification" && (
            <form onSubmit={handleVerifySMS} className="space-y-4">
              <div className="text-center space-y-2">
                <MessageSquare className="w-12 h-12 mx-auto text-purple-600" />
                <p className="text-sm text-gray-600">
                  <span className="font-medium">{fullPhoneNumber}</span>로<br />
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

              <div className="flex space-x-2">
                <Button 
                  type="button"
                  variant="outline"
                  onClick={() => setStep("phone")}
                  className="flex-1"
                >
                  뒤로
                </Button>
                <Button 
                  type="submit" 
                  className="flex-1 purple-gradient text-white"
                  disabled={verifySMSMutation.isPending}
                >
                  {verifySMSMutation.isPending ? "인증 중..." : "로그인"}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}