import { useState, useEffect } from "react";
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
import { MessageSquare, Check, X } from "lucide-react";
import { countries } from "@/data/countries";

export default function Signup() {
  const { setUser } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState<"phone" | "verification">("phone");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [selectedCountry, setSelectedCountry] = useState(countries[0]);
  const [fullPhoneNumber, setFullPhoneNumber] = useState("");
  const [phoneStatus, setPhoneStatus] = useState<"checking" | "available" | "taken" | "">("");

  // 전화번호 중복 체크
  const checkPhoneMutation = useMutation({
    mutationFn: async (phoneNumber: string) => {
      const response = await apiRequest("/api/auth/check-phone", "POST", { phoneNumber });
      return response;
    },
    onSuccess: (data: any) => {
      setPhoneStatus(data.available ? "available" : "taken");
    },
    onError: () => {
      setPhoneStatus("");
    },
  });

  // 전화번호 입력 시 실시간 체크
  useEffect(() => {
    if (phoneNumber.length >= 8) {
      const fullPhone = `${selectedCountry.dialCode}${phoneNumber}`;
      setPhoneStatus("checking");
      const timer = setTimeout(() => {
        checkPhoneMutation.mutate(fullPhone);
      }, 500); // 0.5초 디바운스

      return () => clearTimeout(timer);
    } else {
      setPhoneStatus("");
    }
  }, [phoneNumber, selectedCountry.dialCode]);

  // SMS 인증 코드 전송 (회원가입용)
  const sendSMSMutation = useMutation({
    mutationFn: async (data: { phoneNumber: string; countryCode: string }) => {
      const response = await apiRequest("/api/auth/signup-sms", "POST", data);
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

  // SMS 인증 코드 확인 (회원가입용)
  const verifySMSMutation = useMutation({
    mutationFn: async (data: { phoneNumber: string; verificationCode: string }) => {
      const response = await apiRequest("/api/auth/signup-verify-sms", "POST", data);
      return response;
    },
    onSuccess: (data: any) => {
      console.log("SMS 인증 성공:", data);
      setUser(data.user);
      toast({
        title: "전화번호 인증 완료",
        description: "프로필을 설정해주세요.",
      });
      window.location.href = "/profile-setup";
    },
    onError: (error: any) => {
      console.error("SMS 인증 실패:", error);
      toast({
        title: "인증 실패",
        description: error.message || "인증 코드가 올바르지 않습니다.",
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

    if (phoneStatus !== "available") {
      toast({
        title: "오류",
        description: "사용 가능한 전화번호를 입력해주세요.",
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

  const getPhoneStatusMessage = () => {
    switch (phoneStatus) {
      case "checking":
        return <span className="text-xs text-gray-500">확인 중...</span>;
      case "available":
        return (
          <div className="flex items-center space-x-1 text-xs text-green-600">
            <Check className="w-3 h-3" />
            <span>사용 가능한 번호입니다</span>
          </div>
        );
      case "taken":
        return (
          <div className="flex items-center space-x-1 text-xs text-red-600">
            <X className="w-3 h-3" />
            <span>이미 가입된 번호입니다</span>
          </div>
        );
      default:
        return null;
    }
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
            {step === "phone" ? "전화번호로 회원가입하세요" : "인증 코드를 입력해주세요"}
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
                {getPhoneStatusMessage()}
              </div>

              <div className="flex space-x-2">
                <Button 
                  type="button"
                  variant="outline"
                  onClick={() => window.location.href = "/login"}
                  className="flex-1"
                >
                  로그인하기
                </Button>
                <Button 
                  type="submit" 
                  className="flex-1 purple-gradient text-white"
                  disabled={sendSMSMutation.isPending || phoneStatus !== "available"}
                >
                  {sendSMSMutation.isPending ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>전송 중...</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <MessageSquare className="w-4 h-4" />
                      <span>인증 코드 받기</span>
                    </div>
                  )}
                </Button>
              </div>
            </form>
          ) : (
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
                  {verifySMSMutation.isPending ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>인증 중...</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <MessageSquare className="w-4 h-4" />
                      <span>회원가입</span>
                    </div>
                  )}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}