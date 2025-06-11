import { useState, useRef } from "react";
import { Camera, Upload, User, Briefcase, Mail, Phone, MapPin, Globe, Loader2, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface CardData {
  name: string;
  title?: string;
  company?: string;
  email?: string;
  phone?: string;
  address?: string;
  website?: string;
  additionalInfo?: string;
}

interface OnePagerData {
  displayName: string;
  jobTitle: string;
  company: string;
  bio: string;
  skills: string[];
  website?: string;
  socialLinks?: { platform: string; url: string }[];
}

export default function CardScannerPage() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [cardData, setCardData] = useState<CardData | null>(null);
  const [onePagerData, setOnePagerData] = useState<OnePagerData | null>(null);
  const [step, setStep] = useState<'upload' | 'analyze' | 'edit' | 'generate' | 'complete'>('upload');

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        toast({
          title: "파일 크기 오류",
          description: "이미지 파일은 10MB 이하여야 합니다.",
          variant: "destructive"
        });
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setSelectedImage(result);
        setStep('analyze');
      };
      reader.readAsDataURL(file);
    }
  };

  const analyzeBusinessCard = async () => {
    if (!selectedImage) return;

    setIsAnalyzing(true);
    try {
      const response = await fetch("/api/onepager/analyze-card", {
        method: "POST",
        body: JSON.stringify({ image: selectedImage }),
        headers: { 
          "Content-Type": "application/json",
          "x-user-id": localStorage.getItem("userId") || ""
        }
      });

      const result = await response.json();

      if (result.success) {
        setCardData(result.data);
        setStep('edit');
        toast({
          title: "명함 분석 완료",
          description: "명함 정보가 성공적으로 추출되었습니다."
        });
      } else {
        throw new Error(result.message || "분석 실패");
      }
    } catch (error) {
      console.error("Card analysis error:", error);
      toast({
        title: "분석 실패",
        description: "명함 분석 중 오류가 발생했습니다. 다시 시도해주세요.",
        variant: "destructive"
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const generateOnePager = async () => {
    if (!cardData) return;

    setIsGenerating(true);
    try {
      const response = await fetch("/api/onepager/generate", {
        method: "POST",
        body: JSON.stringify(cardData),
        headers: { 
          "Content-Type": "application/json",
          "x-user-id": localStorage.getItem("userId") || ""
        }
      });

      const result = await response.json();

      if (result.success) {
        setOnePagerData(result.data);
        setStep('complete');
        toast({
          title: "One Pager 생성 완료",
          description: "디지털 명함이 성공적으로 생성되었습니다."
        });
      } else {
        throw new Error(result.message || "생성 실패");
      }
    } catch (error) {
      console.error("OnePager generation error:", error);
      toast({
        title: "생성 실패",
        description: "One Pager 생성 중 오류가 발생했습니다. 다시 시도해주세요.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const updateCardData = (field: keyof CardData, value: string) => {
    if (cardData) {
      setCardData({ ...cardData, [field]: value });
    }
  };

  const resetScanner = () => {
    setSelectedImage(null);
    setCardData(null);
    setOnePagerData(null);
    setStep('upload');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            명함 스캐너
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            종이 명함을 촬영하여 자동으로 디지털 One Pager를 생성하세요
          </p>
        </div>

        {/* Progress Indicator */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center space-x-4">
            <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
              step === 'upload' ? 'bg-blue-600 text-white' : 
              ['analyze', 'edit', 'generate', 'complete'].includes(step) ? 'bg-green-600 text-white' : 
              'bg-gray-300 text-gray-600'
            }`}>
              1
            </div>
            <div className={`w-16 h-1 ${
              ['analyze', 'edit', 'generate', 'complete'].includes(step) ? 'bg-green-600' : 'bg-gray-300'
            }`} />
            <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
              step === 'analyze' ? 'bg-blue-600 text-white' : 
              ['edit', 'generate', 'complete'].includes(step) ? 'bg-green-600 text-white' : 
              'bg-gray-300 text-gray-600'
            }`}>
              2
            </div>
            <div className={`w-16 h-1 ${
              ['edit', 'generate', 'complete'].includes(step) ? 'bg-green-600' : 'bg-gray-300'
            }`} />
            <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
              step === 'edit' ? 'bg-blue-600 text-white' : 
              ['generate', 'complete'].includes(step) ? 'bg-green-600 text-white' : 
              'bg-gray-300 text-gray-600'
            }`}>
              3
            </div>
            <div className={`w-16 h-1 ${
              ['generate', 'complete'].includes(step) ? 'bg-green-600' : 'bg-gray-300'
            }`} />
            <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
              step === 'complete' ? 'bg-green-600 text-white' : 'bg-gray-300 text-gray-600'
            }`}>
              4
            </div>
          </div>
        </div>

        {/* Step 1: Upload Image */}
        {step === 'upload' && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="w-5 h-5" />
                명함 이미지 업로드
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center">
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-300 mb-4">
                  명함 이미지를 선택하거나 드래그해서 업로드하세요
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                <Button 
                  onClick={() => fileInputRef.current?.click()}
                  className="mb-2"
                >
                  이미지 선택
                </Button>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  JPG, PNG, WEBP 형식 지원 (최대 10MB)
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Analyze Image */}
        {step === 'analyze' && selectedImage && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>명함 이미지 분석</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row gap-6">
                <div className="md:w-1/2">
                  <img 
                    src={selectedImage} 
                    alt="Uploaded business card" 
                    className="w-full h-auto rounded-lg border"
                  />
                </div>
                <div className="md:w-1/2 flex flex-col justify-center">
                  <Button 
                    onClick={analyzeBusinessCard}
                    disabled={isAnalyzing}
                    className="mb-4"
                  >
                    {isAnalyzing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        분석 중...
                      </>
                    ) : (
                      '명함 분석 시작'
                    )}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={resetScanner}
                    disabled={isAnalyzing}
                  >
                    다른 이미지 선택
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Edit Card Data */}
        {step === 'edit' && cardData && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>명함 정보 확인 및 수정</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">이름 *</Label>
                  <Input
                    id="name"
                    value={cardData.name || ''}
                    onChange={(e) => updateCardData('name', e.target.value)}
                    className="mb-4"
                  />
                </div>
                <div>
                  <Label htmlFor="title">직책</Label>
                  <Input
                    id="title"
                    value={cardData.title || ''}
                    onChange={(e) => updateCardData('title', e.target.value)}
                    className="mb-4"
                  />
                </div>
                <div>
                  <Label htmlFor="company">회사명</Label>
                  <Input
                    id="company"
                    value={cardData.company || ''}
                    onChange={(e) => updateCardData('company', e.target.value)}
                    className="mb-4"
                  />
                </div>
                <div>
                  <Label htmlFor="email">이메일</Label>
                  <Input
                    id="email"
                    type="email"
                    value={cardData.email || ''}
                    onChange={(e) => updateCardData('email', e.target.value)}
                    className="mb-4"
                  />
                </div>
                <div>
                  <Label htmlFor="phone">전화번호</Label>
                  <Input
                    id="phone"
                    value={cardData.phone || ''}
                    onChange={(e) => updateCardData('phone', e.target.value)}
                    className="mb-4"
                  />
                </div>
                <div>
                  <Label htmlFor="website">웹사이트</Label>
                  <Input
                    id="website"
                    value={cardData.website || ''}
                    onChange={(e) => updateCardData('website', e.target.value)}
                    className="mb-4"
                  />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="address">주소</Label>
                  <Input
                    id="address"
                    value={cardData.address || ''}
                    onChange={(e) => updateCardData('address', e.target.value)}
                    className="mb-4"
                  />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="additionalInfo">기타 정보</Label>
                  <Textarea
                    id="additionalInfo"
                    value={cardData.additionalInfo || ''}
                    onChange={(e) => updateCardData('additionalInfo', e.target.value)}
                    className="mb-4"
                  />
                </div>
              </div>
              <div className="flex gap-4 mt-6">
                <Button 
                  onClick={generateOnePager}
                  disabled={!cardData.name || isGenerating}
                  className="flex-1"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      원페이저 생성 중...
                    </>
                  ) : (
                    '원페이저 생성'
                  )}
                </Button>
                <Button variant="outline" onClick={resetScanner}>
                  처음부터 다시
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 4: Generated OnePager */}
        {step === 'complete' && onePagerData && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                원페이저 생성 완료
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-800 dark:to-gray-700 p-6 rounded-lg">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center">
                    <User className="w-8 h-8 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                      {onePagerData.displayName}
                    </h3>
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300 mb-2">
                      <Briefcase className="w-4 h-4" />
                      <span>{onePagerData.jobTitle} at {onePagerData.company}</span>
                    </div>
                    <p className="text-gray-600 dark:text-gray-300 mb-4">
                      {onePagerData.bio}
                    </p>
                  </div>
                </div>

                {cardData?.email && (
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300 mb-2">
                    <Mail className="w-4 h-4" />
                    <span>{cardData.email}</span>
                  </div>
                )}

                {cardData?.phone && (
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300 mb-2">
                    <Phone className="w-4 h-4" />
                    <span>{cardData.phone}</span>
                  </div>
                )}

                {cardData?.address && (
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300 mb-2">
                    <MapPin className="w-4 h-4" />
                    <span>{cardData.address}</span>
                  </div>
                )}

                {onePagerData.website && (
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300 mb-4">
                    <Globe className="w-4 h-4" />
                    <span>{onePagerData.website}</span>
                  </div>
                )}

                <div className="mb-4">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">핵심 역량</h4>
                  <div className="flex flex-wrap gap-2">
                    {onePagerData.skills.map((skill, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-sm"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-4 mt-6">
                <Button className="flex-1">
                  내 프로필에 저장
                </Button>
                <Button variant="outline" onClick={resetScanner}>
                  새 명함 스캔
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}