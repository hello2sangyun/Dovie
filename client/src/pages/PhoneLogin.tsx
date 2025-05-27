import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import VaultLogo from "@/components/VaultLogo";
import { countries } from "@/data/countries";
import { Phone, MessageSquare } from "lucide-react";

export default function PhoneLogin() {
  const { setUser } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState<"phone" | "verification">("phone");
  const [selectedCountry, setSelectedCountry] = useState(countries.find(c => c.code === "KR") || countries[0]);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [fullPhoneNumber, setFullPhoneNumber] = useState("");

  // SMS 전송 요청
  const sendSMSMutation = useMutation({
    mutationFn: async (data: { phoneNumber: string; countryCode: string }) => {
      const response = await apiRequest("/api/auth/send-sms", "POST", data);
      return response;
    },
    onSuccess: (data) => {
      setFullPhoneNumber(`${selectedCountry.dialCode}${phoneNumber}`);
      setStep("verification");
      toast({
        title: "인증 코드 전송",
        description: `${selectedCountry.dialCode}${phoneNumber}로 인증 코드를 전송했습니다.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "오류",
        description: "인증 코드 전송에 실패했습니다. 다시 시도해주세요.",
        variant: "destructive",
      });
    },
  });

  // SMS 인증 확인
  const verifySMSMutation = useMutation({
    mutationFn: async (data: { phoneNumber: string; verificationCode: string }) => {
      const response = await apiRequest("/api/auth/verify-sms", {
        method: "POST",
        body: JSON.stringify(data),
      });
      return response.json();
    },
    onSuccess: (data) => {
      setUser(data.user);
      toast({
        title: "로그인 성공",
        description: "Dovie Messenger에 오신 것을 환영합니다!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "인증 실패",
        description: "인증 코드가 올바르지 않습니다. 다시 확인해주세요.",
        variant: "destructive",
      });
    },
  });

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
            {step === "phone" ? "전화번호로 빠르게 시작하세요" : "인증 코드를 입력해주세요"}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {step === "phone" ? (
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
                <Label htmlFor="phone">전화번호</Label>
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

              <Button 
                type="submit" 
                className="w-full purple-gradient text-white"
                disabled={sendSMSMutation.isPending}
              >
                {sendSMSMutation.isPending ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>인증 코드 전송 중...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <MessageSquare className="w-4 h-4" />
                    <span>인증 코드 받기</span>
                  </div>
                )}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerifySMS} className="space-y-4">
              <div className="text-center space-y-2">
                <Phone className="w-12 h-12 mx-auto text-purple-600" />
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

              <Button 
                type="submit" 
                className="w-full purple-gradient text-white"
                disabled={verifySMSMutation.isPending || verificationCode.length !== 6}
              >
                {verifySMSMutation.isPending ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>인증 중...</span>
                  </div>
                ) : (
                  "로그인"
                )}
              </Button>

              <Button 
                type="button" 
                variant="ghost" 
                className="w-full"
                onClick={() => {
                  setStep("phone");
                  setVerificationCode("");
                }}
              >
                전화번호 다시 입력
              </Button>
            </form>
          )}
        </CardContent>

        <CardFooter className="text-center">
          <p className="text-xs text-gray-500 mx-auto">
            계속 진행하면 Dovie Messenger의{" "}
            <span className="text-purple-600 underline cursor-pointer">이용약관</span> 및{" "}
            <span className="text-purple-600 underline cursor-pointer">개인정보처리방침</span>에 동의하는 것으로 간주됩니다.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}