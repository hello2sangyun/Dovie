import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import VaultLogo from "@/components/VaultLogo";
import { countries } from "@/data/countries";
import { Phone, MessageSquare, ArrowLeft, CheckCircle, XCircle } from "lucide-react";

export default function Signup() {
  const { setUser } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState<"phone" | "verification">("phone");
  const [selectedCountry, setSelectedCountry] = useState(countries.find(c => c.code === "KR") || countries[0]);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [fullPhoneNumber, setFullPhoneNumber] = useState("");
  const [phoneStatus, setPhoneStatus] = useState<"checking" | "available" | "taken" | "idle">("idle");

  // 전화번호 가용성 확인 (디바운스)
  useEffect(() => {
    if (phoneNumber.length >= 8) {
      const timeoutId = setTimeout(() => {
        checkPhoneAvailability();
      }, 500);
      return () => clearTimeout(timeoutId);
    } else {
      setPhoneStatus("idle");
    }
  }, [phoneNumber, selectedCountry]);

  const checkPhoneAvailability = async () => {
    const fullPhone = `${selectedCountry.dialCode}${phoneNumber}`;
    setPhoneStatus("checking");
    
    try {
      const response = await fetch("/api/auth/check-phone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber: fullPhone }),
      });
      
      const result = await response.json();
      setPhoneStatus(result.available ? "available" : "taken");
    } catch (error) {
      console.error("전화번호 확인 오류:", error);
      setPhoneStatus("idle");
    }
  };

  // SMS 전송 요청 (회원가입용)
  const sendSMSMutation = useMutation({
    mutationFn: async (data: { phoneNumber: string; countryCode: string }) => {
      const response = await fetch("/api/auth/send-sms-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || "SMS 전송 실패");
      }
      return result;
    },
    onSuccess: (data) => {
      console.log("SMS 전송 성공:", data);
      setStep("verification");
      toast({
        title: "인증 코드 전송",
        description: `${fullPhoneNumber}로 인증 코드를 전송했습니다.`,
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

  // SMS 인증 확인 (회원가입용)
  const verifySMSMutation = useMutation({
    mutationFn: async (data: { phoneNumber: string; verificationCode: string }) => {
      const response = await fetch("/api/auth/verify-sms-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || "인증 실패");
      }
      return result;
    },
    onSuccess: (data) => {
      console.log("SMS 인증 성공:", data);
      setUser(data.user);
      toast({
        title: "회원가입 성공",
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
        title: "입력 오류",
        description: "전화번호를 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    if (phoneStatus !== "available") {
      toast({
        title: "사용 불가능한 번호",
        description: "이미 가입된 전화번호이거나 유효하지 않은 번호입니다.",
        variant: "destructive",
      });
      return;
    }

    const fullPhone = `${selectedCountry.dialCode}${phoneNumber}`;
    setFullPhoneNumber(fullPhone);
    
    sendSMSMutation.mutate({
      phoneNumber: phoneNumber,
      countryCode: selectedCountry.dialCode,
    });
  };

  const handleVerifySMS = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!verificationCode.trim() || verificationCode.length !== 6) {
      toast({
        title: "입력 오류",
        description: "6자리 인증 코드를 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    verifySMSMutation.mutate({
      phoneNumber: fullPhoneNumber,
      verificationCode: verificationCode,
    });
  };

  const getPhoneStatusMessage = () => {
    switch (phoneStatus) {
      case "checking":
        return <span className="text-yellow-600 text-xs">확인 중...</span>;
      case "available":
        return (
          <span className="text-green-600 text-xs flex items-center gap-1">
            <CheckCircle className="w-3 h-3" />
            사용 가능한 번호입니다
          </span>
        );
      case "taken":
        return (
          <span className="text-red-600 text-xs flex items-center gap-1">
            <XCircle className="w-3 h-3" />
            이미 가입된 번호입니다
          </span>
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
            회원가입
          </CardTitle>
          <CardDescription>
            {step === "phone" ? "전화번호를 입력해주세요" : "전화번호로 받은 인증 코드를 입력해주세요"}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {step === "phone" ? (
            <form onSubmit={handleSendSMS} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="country">국가</Label>
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
                        {country.flag} {country.name} ({country.dialCode})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">전화번호</Label>
                <div className="flex gap-2">
                  <div className="w-20 px-3 py-2 border rounded-md bg-gray-50 text-sm text-center">
                    {selectedCountry.dialCode}
                  </div>
                  <div className="flex-1 space-y-1">
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="01012345678"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value.replace(/[^\d]/g, ""))}
                      className="text-base"
                    />
                    {phoneNumber.length >= 8 && getPhoneStatusMessage()}
                  </div>
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full purple-gradient text-white"
                disabled={sendSMSMutation.isPending || phoneStatus !== "available"}
              >
                {sendSMSMutation.isPending ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>전송 중...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <MessageSquare className="w-4 h-4" />
                    <span>인증 코드 받기</span>
                  </div>
                )}
              </Button>

              <Button 
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => window.location.href = "/"}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                뒤로 가기
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
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>인증 중...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <Phone className="w-4 h-4" />
                    <span>인증 완료</span>
                  </div>
                )}
              </Button>

              <Button 
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => setStep("phone")}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                전화번호 다시 입력
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}