import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useSimpleAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { apiRequest, queryClient } from "@/lib/queryClient";
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
  const [isDetectingLocation, setIsDetectingLocation] = useState(true);

  // 사용자 위치 기반 국가 자동 선택
  useEffect(() => {
    const detectUserCountry = async () => {
      try {
        // IP 기반 위치 감지 (빠른 방법)
        const ipResponse = await fetch('https://ipapi.co/json/');
        if (ipResponse.ok) {
          const ipData = await ipResponse.json();
          const detectedCountry = countries.find(c => c.code === ipData.country_code);
          if (detectedCountry) {
            setSelectedCountry(detectedCountry);
            setIsDetectingLocation(false);
            return;
          }
        }
      } catch (error) {
        console.log("IP 기반 위치 감지 실패:", error);
      }

      try {
        // GPS 기반 위치 감지 (대안)
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            async (position) => {
              try {
                const { latitude, longitude } = position.coords;
                const geoResponse = await fetch(
                  `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
                );
                if (geoResponse.ok) {
                  const geoData = await geoResponse.json();
                  const detectedCountry = countries.find(c => c.code === geoData.countryCode);
                  if (detectedCountry) {
                    setSelectedCountry(detectedCountry);
                  }
                }
              } catch (error) {
                console.log("GPS 기반 위치 감지 실패:", error);
              } finally {
                setIsDetectingLocation(false);
              }
            },
            () => {
              // GPS 권한 거부 또는 실패시 기본값 유지
              setIsDetectingLocation(false);
            },
            { timeout: 5000, enableHighAccuracy: false }
          );
        } else {
          setIsDetectingLocation(false);
        }
      } catch (error) {
        console.log("GPS 감지 실패:", error);
        setIsDetectingLocation(false);
      }
    };

    detectUserCountry();
  }, []);

  // SMS 전송 요청
  const sendSMSMutation = useMutation({
    mutationFn: async (data: { phoneNumber: string; countryCode: string }) => {
      const response = await apiRequest("/api/auth/send-sms", "POST", data);
      return response.json();
    },
    onSuccess: (data) => {
      setFullPhoneNumber(`${selectedCountry.dialCode}${phoneNumber}`);
      setStep("verification");
      
      if (data.developmentMode && data.verificationCode) {
        toast({
          title: "개발 모드 - 인증 코드",
          description: `콘솔에 표시된 인증 코드: ${data.verificationCode}`,
          duration: 10000, // 10초간 표시
        });
      } else {
        toast({
          title: "인증 코드 전송",
          description: `${selectedCountry.dialCode}${phoneNumber}로 인증 코드를 전송했습니다.`,
        });
      }
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
    mutationFn: async (data: { phoneNumber: string; verificationCode: string; countryCode: string }) => {
      const response = await apiRequest("/api/auth/verify-sms", "POST", data);
      return response.json();
    },
    onSuccess: async (data) => {
      console.log("SMS verification successful, user data:", data.user);
      setUser(data.user);
      localStorage.setItem("userId", data.user.id.toString());
      
      // React Query 캐시 무효화로 인증 상태 즉시 업데이트
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      
      toast({
        title: "로그인 성공",
        description: "Dovie Messenger에 오신 것을 환영합니다!",
      });
      
      // 인증 상태 업데이트 후 페이지 이동
      setTimeout(() => {
        // 프로필이 미완성이거나 임시 이메일을 사용하는 경우 프로필 설정으로 이동
        const hasTemporaryEmail = data.user.email && data.user.email.includes('@phone.local');
        const needsProfileSetup = !data.user.isProfileComplete || hasTemporaryEmail;
        
        if (needsProfileSetup) {
          window.location.href = "/profile-setup";
        } else {
          window.location.href = "/app";
        }
      }, 500);
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
      phoneNumber: phoneNumber,
      countryCode: selectedCountry.dialCode,
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
      phoneNumber: phoneNumber,
      verificationCode,
      countryCode: selectedCountry.dialCode,
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
                <Label htmlFor="country">
                  국가 선택
                  {isDetectingLocation && (
                    <span className="ml-2 text-xs text-purple-600 animate-pulse">
                      위치 감지 중...
                    </span>
                  )}
                </Label>
                <Select
                  value={selectedCountry.code}
                  onValueChange={(value) => {
                    const country = countries.find(c => c.code === value);
                    if (country) setSelectedCountry(country);
                  }}
                  disabled={isDetectingLocation}
                >
                  <SelectTrigger className={isDetectingLocation ? "opacity-50" : ""}>
                    <SelectValue>
                      <div className="flex items-center space-x-2">
                        <span>{selectedCountry.flag}</span>
                        <span>{selectedCountry.name}</span>
                        <span className="text-gray-500">{selectedCountry.dialCode}</span>
                      </div>
                    </SelectValue>
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