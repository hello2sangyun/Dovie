import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  ArrowLeft, 
  Edit3, 
  Save, 
  Camera, 
  User, 
  Building2, 
  Mail, 
  Phone, 
  Globe, 
  MapPin, 
  Share2, 
  Copy,
  QrCode,
  Download,
  Smartphone,
  Wifi,
  ScanLine,
  Plus,
  Check,
  Upload,
  ImageIcon,
  Sparkles
} from "lucide-react";
import QRCode from "qrcode";

interface MobileOptimizedBusinessCardProps {
  onBack?: () => void;
}

export default function MobileOptimizedBusinessCard({ onBack }: MobileOptimizedBusinessCardProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [activeView, setActiveView] = useState<"home" | "scan" | "edit" | "share">("home");
  const [isEditing, setIsEditing] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);
  const [scanStep, setScanStep] = useState<"upload" | "analyzing" | "editing" | "generating">("upload");
  const [scanProgress, setScanProgress] = useState(0);
  const [analyzedData, setAnalyzedData] = useState<any>(null);

  // Form data state
  const [formData, setFormData] = useState({
    fullName: "",
    companyName: "",
    jobTitle: "",
    department: "",
    email: "",
    phoneNumber: "",
    website: "",
    address: "",
    description: "",
    profileImageUrl: ""
  });

  // Fetch business card data
  const { data: businessCard, isLoading } = useQuery({
    queryKey: ["/api/business-cards"]
  });

  // Update form data when business card data changes
  useEffect(() => {
    if (businessCard && typeof businessCard === 'object' && 'businessCard' in businessCard) {
      const card = (businessCard as any).businessCard;
      setFormData({
        fullName: card?.fullName || "",
        companyName: card?.companyName || "",
        jobTitle: card?.jobTitle || "",
        department: card?.department || "",
        email: card?.email || "",
        phoneNumber: card?.phoneNumber || "",
        website: card?.website || "",
        address: card?.address || "",
        description: card?.description || "",
        profileImageUrl: card?.profileImageUrl || ""
      });
    }
  }, [businessCard]);

  // Generate QR Code
  const generateQRCode = async () => {
    try {
      const shareUrl = `${window.location.origin}/card/${user?.id}`;
      const qrDataUrl = await QRCode.toDataURL(shareUrl, {
        width: 256,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      });
      setQrCodeUrl(qrDataUrl);
    } catch (error) {
      console.error('QR Code generation failed:', error);
    }
  };

  useEffect(() => {
    generateQRCode();
  }, [user?.id]);

  // Save business card mutation
  const saveCardMutation = useMutation({
    mutationFn: (data: any) => apiRequest('/api/business-cards', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/business-cards'] });
      toast({ title: "원페이저가 저장되었습니다" });
      setIsEditing(false);
    },
    onError: (error: any) => {
      toast({ 
        title: "저장 실패", 
        description: error.message || "원페이저 저장 중 오류가 발생했습니다",
        variant: "destructive" 
      });
    }
  });

  // Card scanning mutation
  const scanCardMutation = useMutation({
    mutationFn: (formData: FormData) => {
      setScanStep("analyzing");
      setScanProgress(25);
      return fetch('/api/business-cards/analyze', {
        method: 'POST',
        body: formData,
      }).then(res => res.json());
    },
    onSuccess: (data) => {
      if (data.success) {
        setScanProgress(75);
        setAnalyzedData(data.data);
        setScanStep("editing");
        // Auto-fill form with analyzed data
        setFormData(prev => ({
          ...prev,
          ...data.data
        }));
      } else {
        toast({
          title: "분석 실패",
          description: data.error || "명함 분석에 실패했습니다",
          variant: "destructive"
        });
        setScanStep("upload");
      }
    },
    onError: () => {
      toast({
        title: "업로드 실패",
        description: "명함 이미지 업로드에 실패했습니다",
        variant: "destructive"
      });
      setScanStep("upload");
    }
  });

  // Generate One Pager mutation
  const generateOnePagerMutation = useMutation({
    mutationFn: () => {
      setScanStep("generating");
      setScanProgress(90);
      return apiRequest('/api/business-cards/generate-onepager', {
        method: 'POST',
        body: JSON.stringify(analyzedData),
      });
    },
    onSuccess: (data) => {
      if (data.success) {
        setScanProgress(100);
        queryClient.invalidateQueries({ queryKey: ['/api/business-cards'] });
        toast({ title: "원페이저가 생성되었습니다!" });
        setTimeout(() => {
          setActiveView("home");
          setScanStep("upload");
          setScanProgress(0);
        }, 1500);
      }
    }
  });

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: "잘못된 파일 형식",
        description: "이미지 파일만 업로드할 수 있습니다",
        variant: "destructive"
      });
      return;
    }

    const formData = new FormData();
    formData.append('businessCard', file);
    scanCardMutation.mutate(formData);
  };

  const handleSave = () => {
    if (!formData.fullName.trim()) {
      toast({
        title: "이름을 입력해주세요",
        variant: "destructive"
      });
      return;
    }

    saveCardMutation.mutate(formData);
  };

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/card/${user?.id}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${formData.fullName}님의 원페이저`,
          text: `${formData.companyName} ${formData.jobTitle}`,
          url: shareUrl,
        });
      } catch (error) {
        console.log('Sharing cancelled');
      }
    } else {
      await navigator.clipboard.writeText(shareUrl);
      toast({ title: "링크가 복사되었습니다" });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="h-full bg-gradient-to-br from-blue-50 to-indigo-50 overflow-hidden">
      {/* Home View */}
      {activeView === "home" && (
        <div className="h-full overflow-y-auto">
          {/* Header */}
          <div className="bg-white/80 backdrop-blur-lg border-b border-gray-100 p-4 sticky top-0 z-10">
            <div className="flex items-center justify-between">
              <h1 className="text-xl font-bold text-gray-900">원페이저</h1>
              <div className="flex space-x-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setActiveView("scan")}
                  className="flex items-center space-x-1"
                >
                  <ScanLine className="w-4 h-4" />
                  <span>스캔</span>
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setActiveView("share")}
                  className="flex items-center space-x-1"
                >
                  <Share2 className="w-4 h-4" />
                  <span>공유</span>
                </Button>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Digital Business Card Preview */}
            <Card className="bg-gradient-to-br from-white to-blue-50 border-0 shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-start space-x-4">
                  <Avatar className="w-16 h-16 border-4 border-white shadow-lg">
                    <AvatarImage src={formData.profileImageUrl} />
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-lg font-semibold">
                      {formData.fullName.charAt(0) || user?.displayName?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-xl font-bold text-gray-900 truncate">
                      {formData.fullName || user?.displayName || "이름 없음"}
                    </h2>
                    <p className="text-blue-600 font-medium">
                      {formData.jobTitle || "직책 없음"}
                    </p>
                    <p className="text-gray-600 text-sm">
                      {formData.companyName || "회사 없음"}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setActiveView("edit")}
                    className="text-gray-500 hover:text-blue-600"
                  >
                    <Edit3 className="w-4 h-4" />
                  </Button>
                </div>

                {/* Contact Info */}
                <div className="mt-6 space-y-3">
                  {formData.email && (
                    <div className="flex items-center space-x-3 text-sm">
                      <Mail className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-700">{formData.email}</span>
                    </div>
                  )}
                  {formData.phoneNumber && (
                    <div className="flex items-center space-x-3 text-sm">
                      <Phone className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-700">{formData.phoneNumber}</span>
                    </div>
                  )}
                  {formData.website && (
                    <div className="flex items-center space-x-3 text-sm">
                      <Globe className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-700">{formData.website}</span>
                    </div>
                  )}
                  {formData.address && (
                    <div className="flex items-center space-x-3 text-sm">
                      <MapPin className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-700">{formData.address}</span>
                    </div>
                  )}
                </div>

                {formData.description && (
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-700">{formData.description}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-4">
              <Button
                onClick={() => setActiveView("scan")}
                className="h-20 flex flex-col items-center justify-center space-y-2 bg-gradient-to-br from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
              >
                <Camera className="w-6 h-6" />
                <span className="text-sm font-medium">명함 스캔</span>
              </Button>
              <Button
                onClick={() => setActiveView("share")}
                variant="outline"
                className="h-20 flex flex-col items-center justify-center space-y-2 border-2 border-blue-200 hover:bg-blue-50"
              >
                <QrCode className="w-6 h-6 text-blue-600" />
                <span className="text-sm font-medium text-blue-600">QR 공유</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Card Scanner View */}
      {activeView === "scan" && (
        <div className="h-full flex flex-col bg-gray-900">
          {/* Header */}
          <div className="bg-black/50 backdrop-blur-lg p-4 flex items-center justify-between text-white">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setActiveView("home")}
              className="text-white hover:bg-white/20"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-lg font-semibold">명함 스캔</h1>
            <div className="w-10" />
          </div>

          {/* Scanner Content */}
          <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-6">
            {scanStep === "upload" && (
              <>
                <div className="w-32 h-32 bg-white/10 rounded-full flex items-center justify-center">
                  <Camera className="w-16 h-16 text-white" />
                </div>
                <div className="text-center space-y-2">
                  <h2 className="text-xl font-semibold text-white">명함을 촬영하거나 업로드하세요</h2>
                  <p className="text-gray-300">AI가 자동으로 정보를 인식합니다</p>
                </div>
                <div className="flex flex-col space-y-3 w-full max-w-sm">
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    className="h-12 bg-blue-600 hover:bg-blue-700 text-white font-medium"
                  >
                    <ImageIcon className="w-5 h-5 mr-2" />
                    갤러리에서 선택
                  </Button>
                  <Button
                    variant="outline"
                    className="h-12 border-white/30 text-white hover:bg-white/20"
                    onClick={() => {
                      // Camera functionality would be implemented here
                      toast({ title: "카메라 기능은 곧 추가될 예정입니다", variant: "default" });
                    }}
                  >
                    <Camera className="w-5 h-5 mr-2" />
                    카메라로 촬영
                  </Button>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </>
            )}

            {scanStep === "analyzing" && (
              <>
                <div className="w-32 h-32 bg-white/10 rounded-full flex items-center justify-center">
                  <Sparkles className="w-16 h-16 text-yellow-400 animate-pulse" />
                </div>
                <div className="text-center space-y-2">
                  <h2 className="text-xl font-semibold text-white">AI가 명함을 분석중입니다</h2>
                  <p className="text-gray-300">잠시만 기다려주세요...</p>
                </div>
                <div className="w-full max-w-sm bg-white/20 rounded-full h-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${scanProgress}%` }}
                  />
                </div>
              </>
            )}

            {scanStep === "editing" && analyzedData && (
              <>
                <div className="w-32 h-32 bg-white/10 rounded-full flex items-center justify-center">
                  <Check className="w-16 h-16 text-green-400" />
                </div>
                <div className="text-center space-y-2">
                  <h2 className="text-xl font-semibold text-white">분석 완료!</h2>
                  <p className="text-gray-300">정보를 확인하고 원페이저를 생성하세요</p>
                </div>
                <Button
                  onClick={() => generateOnePagerMutation.mutate()}
                  className="h-12 bg-green-600 hover:bg-green-700 text-white font-medium w-full max-w-sm"
                  disabled={generateOnePagerMutation.isPending}
                >
                  {generateOnePagerMutation.isPending ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
                      생성 중...
                    </>
                  ) : (
                    <>
                      <Plus className="w-5 h-5 mr-2" />
                      원페이저 생성
                    </>
                  )}
                </Button>
              </>
            )}

            {scanStep === "generating" && (
              <>
                <div className="w-32 h-32 bg-white/10 rounded-full flex items-center justify-center">
                  <div className="animate-spin rounded-full h-16 w-16 border-4 border-white/30 border-t-white" />
                </div>
                <div className="text-center space-y-2">
                  <h2 className="text-xl font-semibold text-white">원페이저 생성 중</h2>
                  <p className="text-gray-300">곧 완료됩니다...</p>
                </div>
                <div className="w-full max-w-sm bg-white/20 rounded-full h-2">
                  <div 
                    className="bg-green-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${scanProgress}%` }}
                  />
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Edit View */}
      {activeView === "edit" && (
        <div className="h-full overflow-y-auto">
          {/* Header */}
          <div className="bg-white/80 backdrop-blur-lg border-b border-gray-100 p-4 sticky top-0 z-10">
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setActiveView("home")}
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <h1 className="text-lg font-semibold">원페이저 편집</h1>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={saveCardMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {saveCardMutation.isPending ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-1" />
                    저장
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Form */}
          <div className="p-6 space-y-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="fullName">이름 *</Label>
                <Input
                  id="fullName"
                  value={formData.fullName}
                  onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
                  placeholder="홍길동"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="companyName">회사명</Label>
                <Input
                  id="companyName"
                  value={formData.companyName}
                  onChange={(e) => setFormData(prev => ({ ...prev, companyName: e.target.value }))}
                  placeholder="㈜예시회사"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="jobTitle">직책</Label>
                <Input
                  id="jobTitle"
                  value={formData.jobTitle}
                  onChange={(e) => setFormData(prev => ({ ...prev, jobTitle: e.target.value }))}
                  placeholder="대표이사"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="email">이메일</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="example@company.com"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="phoneNumber">전화번호</Label>
                <Input
                  id="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={(e) => setFormData(prev => ({ ...prev, phoneNumber: e.target.value }))}
                  placeholder="010-1234-5678"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="website">웹사이트</Label>
                <Input
                  id="website"
                  value={formData.website}
                  onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
                  placeholder="https://company.com"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="address">주소</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="서울시 강남구 테헤란로 123"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="description">소개</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="간단한 자기소개나 회사 소개를 입력하세요"
                  className="mt-1"
                  rows={3}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Share View */}
      {activeView === "share" && (
        <div className="h-full overflow-y-auto">
          {/* Header */}
          <div className="bg-white/80 backdrop-blur-lg border-b border-gray-100 p-4 sticky top-0 z-10">
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setActiveView("home")}
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <h1 className="text-lg font-semibold">원페이저 공유</h1>
              <div className="w-10" />
            </div>
          </div>

          {/* Share Content */}
          <div className="p-6 space-y-6">
            {/* QR Code */}
            <div className="text-center space-y-4">
              <div className="bg-white p-6 rounded-2xl shadow-lg inline-block">
                {qrCodeUrl ? (
                  <img src={qrCodeUrl} alt="QR Code" className="w-48 h-48" />
                ) : (
                  <div className="w-48 h-48 bg-gray-100 rounded-lg flex items-center justify-center">
                    <QrCode className="w-12 h-12 text-gray-400" />
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-gray-900">QR 코드로 공유</h3>
                <p className="text-gray-600 text-sm">상대방이 QR 코드를 스캔하면 원페이저를 볼 수 있습니다</p>
              </div>
            </div>

            {/* Share Options */}
            <div className="space-y-3">
              <Button
                onClick={handleShare}
                className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-medium"
              >
                <Share2 className="w-5 h-5 mr-2" />
                링크 공유
              </Button>
              
              <Button
                variant="outline"
                onClick={() => {
                  const canvas = document.createElement('canvas');
                  const ctx = canvas.getContext('2d');
                  const img = new Image();
                  img.onload = () => {
                    canvas.width = img.width;
                    canvas.height = img.height;
                    ctx?.drawImage(img, 0, 0);
                    canvas.toBlob((blob) => {
                      if (blob) {
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = 'qr-code.png';
                        a.click();
                        URL.revokeObjectURL(url);
                        toast({ title: "QR 코드가 저장되었습니다" });
                      }
                    });
                  };
                  img.src = qrCodeUrl;
                }}
                className="w-full h-12 border-2 border-gray-200 hover:bg-gray-50"
              >
                <Download className="w-5 h-5 mr-2" />
                QR 코드 저장
              </Button>
            </div>

            {/* Share Info */}
            <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <Smartphone className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">스마트 공유</h4>
                    <p className="text-sm text-gray-600">NFC 지원 기기에서는 터치로 간편하게 공유할 수 있습니다</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}