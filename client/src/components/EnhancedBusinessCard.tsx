import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  ArrowLeft, 
  Edit3, 
  Save, 
  X, 
  Upload, 
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
  Wifi
} from "lucide-react";
import QRCode from "qrcode";
import CameraCapture from "@/components/CameraCapture";

interface EnhancedBusinessCardProps {
  onBack?: () => void;
}

export default function EnhancedBusinessCard({ onBack }: EnhancedBusinessCardProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [activeTab, setActiveTab] = useState("view");
  const [isEditing, setIsEditing] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);
  const [isNfcSupported, setIsNfcSupported] = useState(false);
  const [isNfcSharing, setIsNfcSharing] = useState(false);
  const [showCamera, setShowCamera] = useState(false);

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

  // Check NFC support
  useEffect(() => {
    if ('NDEFReader' in window) {
      setIsNfcSupported(true);
    }
  }, []);

  // Listen for camera scan trigger from floating action button
  useEffect(() => {
    const handleCameraScanTrigger = () => {
      setShowCamera(true);
    };

    window.addEventListener('triggerCameraScan', handleCameraScanTrigger);
    return () => {
      window.removeEventListener('triggerCameraScan', handleCameraScanTrigger);
    };
  }, []);

  // Fetch share info
  const { data: shareData } = useQuery({
    queryKey: ["/api/business-cards/share-info"]
  });

  // Update business card mutation
  const updateCardMutation = useMutation({
    mutationFn: async (cardData: any) => {
      const response = await apiRequest("/api/business-cards", "POST", cardData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/business-cards"] });
      setIsEditing(false);
      setActiveTab("view");
      toast({
        title: "명함 저장 완료",
        description: "명함 정보가 성공적으로 저장되었습니다.",
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "저장 실패",
        description: "명함 저장 중 오류가 발생했습니다.",
      });
    },
  });

  // Create share link mutation
  const createShareLinkMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("/api/business-cards/share", "POST", {});
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/business-cards/share-info"] });
      generateQRCode(data.shareUrl);
      navigator.clipboard.writeText(data.shareUrl);
      toast({
        title: "공유 링크 생성 및 복사 완료",
        description: "링크가 자동으로 클립보드에 복사되었습니다.",
      });
    },
  });

  // Generate vCard for contact download
  const generateVCard = () => {
    const card = (businessCard as any)?.businessCard || formData;
    const vcard = `BEGIN:VCARD
VERSION:3.0
FN:${card.fullName || ''}
ORG:${card.companyName || ''}
TITLE:${card.jobTitle || ''}
EMAIL:${card.email || ''}
TEL:${card.phoneNumber || ''}
URL:${card.website || ''}
ADR:;;${card.address || ''};;;;
NOTE:${card.description || ''}
END:VCARD`;
    
    const blob = new Blob([vcard], { type: 'text/vcard' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${card.fullName || 'contact'}.vcf`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // NFC sharing functionality
  const shareViaUNFC = async () => {
    if (!isNfcSupported) {
      toast({
        variant: "destructive",
        title: "NFC 지원 안함",
        description: "이 기기는 NFC를 지원하지 않습니다.",
      });
      return;
    }

    try {
      setIsNfcSharing(true);
      
      // Start NFC exchange on backend
      const response = await apiRequest("/api/nfc/start-exchange", "POST");
      const exchangeData = await response.json();
      
      // Create NDEF reader
      const ndef = new (window as any).NDEFReader();
      
      // Prepare the message to write with exchange URL
      const card = (businessCard as any)?.businessCard || formData;
      
      const message = {
        records: [
          {
            recordType: "url",
            data: exchangeData.exchangeUrl
          },
          {
            recordType: "text",
            data: `${card.fullName || ''}님의 디지털 명함 - 교환하여 친구 추가`
          }
        ]
      };

      // Start writing to NFC tag/device
      await ndef.write(message);
      
      toast({
        title: "NFC 대기 중",
        description: "다른 기기를 가까이 대어주세요. 서로 자동으로 친구 추가됩니다.",
      });

      // Auto stop after 30 seconds
      setTimeout(() => {
        setIsNfcSharing(false);
      }, 30000);

    } catch (error) {
      console.error('NFC Error:', error);
      setIsNfcSharing(false);
      
      if (error instanceof DOMException) {
        if (error.name === 'NotAllowedError') {
          toast({
            variant: "destructive",
            title: "NFC 권한 거부",
            description: "NFC 사용 권한을 허용해주세요.",
          });
        } else if (error.name === 'NotSupportedError') {
          toast({
            variant: "destructive",
            title: "NFC 지원 안함",
            description: "이 기기는 NFC 쓰기를 지원하지 않습니다.",
          });
        } else {
          toast({
            variant: "destructive",
            title: "NFC 오류",
            description: "NFC 공유 중 오류가 발생했습니다.",
          });
        }
      } else {
        toast({
          variant: "destructive",
          title: "교환 시작 실패",
          description: "명함 교환을 시작할 수 없습니다.",
        });
      }
    }
  };

  // Stop NFC sharing
  const stopNfcSharing = () => {
    setIsNfcSharing(false);
    toast({
      title: "NFC 공유 중지",
      description: "NFC 공유가 중지되었습니다.",
    });
  };

  // Handle camera capture for business card scanning
  const handleCameraCapture = async (file: File) => {
    try {
      setIsUploading(true);
      
      console.log('Starting business card analysis...', file.name, file.size);
      
      toast({
        title: "명함 분석 중",
        description: "AI가 명함 정보를 추출하고 있습니다...",
      });
      
      // Create FormData and upload image
      const formData = new FormData();
      formData.append('image', file);

      console.log('Sending request to /api/business-cards/analyze');
      
      const response = await fetch('/api/business-cards/analyze', {
        method: 'POST',
        headers: {
          'x-user-id': localStorage.getItem('userId') || user?.id?.toString() || '',
        },
        body: formData,
      });

      console.log('Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Response error:', errorText);
        throw new Error(`분석 실패: ${response.status}`);
      }

      const result = await response.json();
      console.log('Analysis result:', result);
      
      if (result.success && result.analysis) {
        console.log('Auto-filling form with:', result.analysis);
        
        // Auto-fill the form with analyzed data
        const newFormData = {
          fullName: result.analysis.name || "",
          companyName: result.analysis.company || "",
          jobTitle: result.analysis.title || "",
          department: "",
          email: result.analysis.email || "",
          phoneNumber: result.analysis.phone || "",
          website: result.analysis.website || "",
          address: result.analysis.address || "",
          description: result.analysis.additionalInfo || "",
          profileImageUrl: ""
        };
        
        console.log('Setting form data:', newFormData);
        setFormData(newFormData);
        
        // Switch to create tab
        setActiveTab("create");
        
        toast({
          title: "명함 스캔 완료",
          description: `${result.analysis.name || '정보'}가 추출되었습니다. 확인 후 저장하세요.`,
        });
      } else {
        console.error('Analysis failed or no data:', result);
        throw new Error(result.error || '분석된 정보가 없습니다.');
      }
    } catch (error) {
      console.error('Camera capture error:', error);
      toast({
        variant: "destructive",
        title: "스캔 실패",
        description: error instanceof Error ? error.message : "명함 스캔 중 오류가 발생했습니다.",
      });
    } finally {
      setIsUploading(false);
      setShowCamera(false);
    }
  };

  // Crop image to square aspect ratio
  const cropImageToSquare = (file: File): Promise<File> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        const size = Math.min(img.width, img.height);
        canvas.width = size;
        canvas.height = size;
        
        const x = (img.width - size) / 2;
        const y = (img.height - size) / 2;
        
        ctx?.drawImage(img, x, y, size, size, 0, 0, size, size);
        
        canvas.toBlob((blob) => {
          if (blob) {
            const croppedFile = new File([blob], file.name, {
              type: file.type,
              lastModified: Date.now(),
            });
            resolve(croppedFile);
          }
        }, file.type, 0.9);
      };
      
      img.src = URL.createObjectURL(file);
    });
  };

  // Handle photo upload
  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast({
        variant: "destructive",
        title: "파일 크기 초과",
        description: "5MB 이하의 이미지를 선택해주세요.",
      });
      return;
    }

    setIsUploading(true);

    try {
      // Crop image to square before upload
      const croppedFile = await cropImageToSquare(file);
      
      const formDataUpload = new FormData();
      formDataUpload.append("file", croppedFile);

      const response = await fetch("/api/upload", {
        method: "POST",
        headers: {
          "x-user-id": user?.id?.toString() || "",
        },
        body: formDataUpload,
      });

      if (response.ok) {
        const result = await response.json();
        const imageUrl = result.fileUrl || result.url;
        console.log('Upload result:', result);
        console.log('Setting image URL:', imageUrl);
        
        setFormData(prev => {
          const newData = { ...prev, profileImageUrl: imageUrl };
          console.log('Updated formData:', newData);
          return newData;
        });
        
        // Clear the file input to allow re-selection of the same file
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        
        toast({
          title: "사진 업로드 완료",
          description: "프로필 사진이 정사각형으로 자동 조정되어 업로드되었습니다.",
        });
      } else {
        throw new Error("Upload failed");
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "업로드 실패",
        description: "사진 업로드 중 오류가 발생했습니다.",
      });
    } finally {
      setIsUploading(false);
    }
  };

  // Generate QR Code
  const generateQRCode = async (url: string) => {
    try {
      const qrDataUrl = await QRCode.toDataURL(url, {
        width: 200,
        margin: 2,
      });
      setQrCodeUrl(qrDataUrl);
    } catch (error) {
      console.error("QR Code generation error:", error);
    }
  };

  // Handle save
  const handleSave = () => {
    if (!formData.fullName.trim()) {
      toast({
        variant: "destructive",
        title: "필수 정보 누락",
        description: "이름을 입력해주세요.",
      });
      return;
    }

    updateCardMutation.mutate(formData);
  };

  // Handle input changes
  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="max-w-2xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-16 bg-gray-200 rounded-lg"></div>
            <div className="h-96 bg-gray-200 rounded-lg"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col">
      <div className="max-w-md mx-auto w-full flex flex-col h-full p-2">
        {/* Compact Header */}
        <div className="flex items-center justify-between py-1 flex-shrink-0">
          <Button 
            variant="ghost" 
            onClick={onBack}
            className="flex items-center space-x-1 p-2 h-8"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">뒤로가기</span>
          </Button>
          <h1 className="text-lg font-bold text-gray-900">디지털 명함</h1>
          <div className="w-16"></div>
        </div>

        {/* Enhanced Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex flex-col flex-1 min-h-0">
          <TabsList className="grid w-full grid-cols-3 h-12 flex-shrink-0 bg-white rounded-lg border border-gray-200 shadow-sm">
            <TabsTrigger 
              value="view" 
              className="text-sm font-medium data-[state=active]:bg-blue-600 data-[state=active]:text-white transition-all duration-200"
            >
              명함 보기
            </TabsTrigger>
            <TabsTrigger 
              value="create" 
              className="text-sm font-medium data-[state=active]:bg-blue-600 data-[state=active]:text-white transition-all duration-200"
            >
              수동 생성
            </TabsTrigger>
            <TabsTrigger 
              value="share" 
              className="text-sm font-medium data-[state=active]:bg-blue-600 data-[state=active]:text-white transition-all duration-200"
            >
              공유하기
            </TabsTrigger>
          </TabsList>

          {/* View Tab */}
          <TabsContent value="view" className="flex-1 overflow-y-auto" style={{ WebkitOverflowScrolling: 'touch', height: 'calc(100vh - 200px)' }}>
            <div className="space-y-3 pb-40">
              <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
              <CardHeader className="text-center py-4 pb-2">
                <div className="flex justify-center mb-2">
                  <div className="relative">
                    <Avatar className="w-16 h-16 border-2 border-white shadow-md">
                      <AvatarImage src={(businessCard as any)?.businessCard?.profileImageUrl || formData.profileImageUrl} />
                      <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-lg">
                        {((businessCard as any)?.businessCard?.fullName || formData.fullName || "사용자")[0]}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                </div>
                <CardTitle className="text-xl text-gray-900 mb-1">
                  {(businessCard as any)?.businessCard?.fullName || formData.fullName || "이름을 설정해주세요"}
                </CardTitle>
                <p className="text-base text-blue-600 font-medium mb-1">
                  {(businessCard as any)?.businessCard?.jobTitle || formData.jobTitle || "직책을 설정해주세요"}
                </p>
                <p className="text-sm text-gray-600">
                  {(businessCard as any)?.businessCard?.companyName || formData.companyName || "회사명을 설정해주세요"}
                </p>
              </CardHeader>
              <CardContent className="space-y-2 px-4 pb-4">
                {((businessCard as any)?.businessCard || Object.values(formData).some(v => v)) ? (
                  <div className="grid gap-2">
                    {((businessCard as any)?.businessCard?.email || formData.email) && (
                      <div className="flex items-center space-x-2 p-2 bg-gray-50 rounded-lg">
                        <Mail className="w-4 h-4 text-gray-500" />
                        <span className="text-sm text-gray-700">{(businessCard as any)?.businessCard?.email || formData.email}</span>
                      </div>
                    )}
                    
                    {((businessCard as any)?.businessCard?.phoneNumber || formData.phoneNumber) && (
                      <div className="flex items-center space-x-2 p-2 bg-gray-50 rounded-lg">
                        <Phone className="w-4 h-4 text-gray-500" />
                        <span className="text-sm text-gray-700">{(businessCard as any)?.businessCard?.phoneNumber || formData.phoneNumber}</span>
                      </div>
                    )}
                    
                    {((businessCard as any)?.businessCard?.website || formData.website) && (
                      <div className="flex items-center space-x-2 p-2 bg-gray-50 rounded-lg">
                        <Globe className="w-4 h-4 text-gray-500" />
                        <a 
                          href={(businessCard as any)?.businessCard?.website || formData.website} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:underline"
                        >
                          웹사이트 방문
                        </a>
                      </div>
                    )}
                    
                    {((businessCard as any)?.businessCard?.address || formData.address) && (
                      <div className="flex items-center space-x-2 p-2 bg-gray-50 rounded-lg">
                        <MapPin className="w-4 h-4 text-gray-500" />
                        <span className="text-sm text-gray-700">{(businessCard as any)?.businessCard?.address || formData.address}</span>
                      </div>
                    )}
                    
                    {((businessCard as any)?.businessCard?.description || formData.description) && (
                      <div className="p-2 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-700">{(businessCard as any)?.businessCard?.description || formData.description}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <Building2 className="w-8 h-8 mx-auto text-gray-300 mb-2" />
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">One Pager를 만들어보세요</h3>
                    <p className="text-sm text-gray-500 mb-4">카메라로 명함을 스캔하거나 수동으로 정보를 입력하세요</p>
                    <div className="flex flex-col gap-3 justify-center">
                      <Button 
                        onClick={() => setShowCamera(true)} 
                        className="h-12 text-sm bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transition-all duration-200"
                        disabled={isUploading}
                      >
                        <Camera className="w-5 h-5 mr-2" />
                        {isUploading ? "스캔 중..." : "📸 카메라로 명함 스캔"}
                      </Button>
                      <Button 
                        onClick={() => setActiveTab("create")} 
                        variant="outline"
                        className="h-12 text-sm border-2 border-gray-300 hover:border-blue-500 hover:bg-blue-50"
                      >
                        <Edit3 className="w-5 h-5 mr-2" />
                        ✏️ 수동으로 정보 입력
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
            </div>
          </TabsContent>

          {/* Create Tab */}
          <TabsContent value="create" className="flex-1 overflow-y-auto" style={{ WebkitOverflowScrolling: 'touch', height: 'calc(100vh - 200px)' }}>
            <div className="space-y-3 pb-48">
              <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
                <CardHeader className="py-2">
                  <CardTitle className="flex items-center space-x-2 text-base">
                    <Edit3 className="w-4 h-4" />
                    <span>명함 정보 입력</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 px-3 pb-3">
                {/* Enhanced Profile Photo Upload */}
                <div className="flex flex-col items-center space-y-3">
                  <div className="relative">
                    <Avatar 
                      className="w-20 h-20 border-4 border-white shadow-lg cursor-pointer hover:shadow-xl transition-shadow"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <AvatarImage src={formData.profileImageUrl} />
                      <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-xl">
                        {(formData.fullName || "사용자")[0]}
                      </AvatarFallback>
                    </Avatar>
                    <Button
                      size="sm"
                      className="absolute -bottom-1 -right-1 rounded-full w-10 h-10 p-0 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 border-2 border-white shadow-lg transition-colors"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                    >
                      {isUploading ? (
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      ) : (
                        <Camera className="w-5 h-5" />
                      )}
                    </Button>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,image/heic,image/heif"
                    onChange={handlePhotoUpload}
                    className="hidden"
                    multiple={false}
                  />
                  <p className="text-sm text-gray-600 font-medium">프로필 사진 선택</p>
                </div>

                {/* Optimized Form Fields */}
                <div className="grid gap-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="fullName" className="text-sm font-medium text-gray-700">이름 *</Label>
                      <Input
                        id="fullName"
                        value={formData.fullName}
                        onChange={(e) => handleInputChange("fullName", e.target.value)}
                        placeholder="홍길동"
                        className="mt-1 h-11 text-base border-2 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                      />
                    </div>
                    <div>
                      <Label htmlFor="jobTitle" className="text-sm font-medium text-gray-700">직책</Label>
                      <Input
                        id="jobTitle"
                        value={formData.jobTitle}
                        onChange={(e) => handleInputChange("jobTitle", e.target.value)}
                        placeholder="대표이사"
                        className="mt-1 h-11 text-base border-2 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="companyName" className="text-sm font-medium text-gray-700">회사명</Label>
                      <Input
                        id="companyName"
                        value={formData.companyName}
                        onChange={(e) => handleInputChange("companyName", e.target.value)}
                        placeholder="(주)도비테크"
                        className="mt-1 h-11 text-base border-2 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                      />
                    </div>
                    <div>
                      <Label htmlFor="department" className="text-sm font-medium text-gray-700">부서</Label>
                      <Input
                        id="department"
                        value={formData.department}
                        onChange={(e) => handleInputChange("department", e.target.value)}
                        placeholder="개발팀"
                        className="mt-1 h-11 text-base border-2 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="email" className="text-sm font-medium text-gray-700">이메일</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => handleInputChange("email", e.target.value)}
                        placeholder="hello@example.com"
                        className="mt-1 h-11 text-base border-2 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                      />
                    </div>
                    <div>
                      <Label htmlFor="phoneNumber" className="text-sm font-medium text-gray-700">전화번호</Label>
                      <Input
                        id="phoneNumber"
                        value={formData.phoneNumber}
                        onChange={(e) => handleInputChange("phoneNumber", e.target.value)}
                        placeholder="010-1234-5678"
                        className="mt-1 h-11 text-base border-2 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="website" className="text-sm font-medium text-gray-700">웹사이트</Label>
                    <Input
                      id="website"
                      value={formData.website}
                      onChange={(e) => handleInputChange("website", e.target.value)}
                      placeholder="https://company.com"
                      className="mt-1 h-11 text-base border-2 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                    />
                  </div>

                  <div>
                    <Label htmlFor="address" className="text-sm font-medium text-gray-700">주소</Label>
                    <Input
                      id="address"
                      value={formData.address}
                      onChange={(e) => handleInputChange("address", e.target.value)}
                      placeholder="서울시 강남구 테헤란로 123"
                      className="mt-1 h-11 text-base border-2 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                    />
                  </div>

                  <div>
                    <Label htmlFor="description" className="text-sm font-medium text-gray-700">소개</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => handleInputChange("description", e.target.value)}
                      placeholder="간단한 소개를 입력해주세요"
                      rows={3}
                      className="mt-1 text-base border-2 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all resize-none"
                    />
                  </div>
                </div>

                {/* Optimized Action Buttons */}
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex space-x-3">
                    <Button 
                      onClick={handleSave} 
                      disabled={updateCardMutation.isPending}
                      className="flex-1 h-12 text-sm font-medium bg-blue-600 hover:bg-blue-700 active:bg-blue-800 transition-colors"
                    >
                      {updateCardMutation.isPending ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      ) : (
                        <Save className="w-4 h-4 mr-2" />
                      )}
                      저장하기
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => setActiveTab("view")}
                      className="flex-1 h-12 text-sm font-medium border-2 border-gray-300 hover:border-gray-400 active:bg-gray-100 transition-colors"
                    >
                      미리보기
                    </Button>
                  </div>
                </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Share Tab */}
          <TabsContent value="share" className="flex-1 overflow-y-auto" style={{ WebkitOverflowScrolling: 'touch', height: 'calc(100vh - 200px)' }}>
            <div className="space-y-3 pb-40">
              <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
                  <CardHeader className="py-3">
                    <CardTitle className="flex items-center space-x-2 text-lg">
                      <Share2 className="w-4 h-4" />
                      <span>명함 공유</span>
                    </CardTitle>
                  </CardHeader>
              <CardContent className="space-y-3 px-4 pb-4">
                {(shareData as any)?.shareUrl ? (
                  <div className="space-y-3">
                    {/* Compact Share URL */}
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <Label className="text-xs font-medium text-gray-700">공유 링크</Label>
                      <div className="flex items-center space-x-2 mt-1">
                        <Input
                          value={(shareData as any).shareUrl}
                          readOnly
                          className="flex-1 h-8 text-xs"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            navigator.clipboard.writeText((shareData as any).shareUrl);
                            toast({ title: "링크 복사 완료" });
                          }}
                          className="h-8 w-8 p-0"
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>

                    {/* Compact QR Code */}
                    {qrCodeUrl && (
                      <div className="text-center">
                        <Label className="text-xs font-medium text-gray-700">QR 코드</Label>
                        <div className="mt-2 inline-block p-2 bg-white rounded-lg shadow-sm">
                          <img src={qrCodeUrl} alt="QR Code" className="w-32 h-32" />
                        </div>
                        <div className="mt-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const link = document.createElement('a');
                              link.download = 'business-card-qr.png';
                              link.href = qrCodeUrl;
                              link.click();
                            }}
                            className="h-8 text-xs"
                          >
                            <Download className="w-3 h-3 mr-1" />
                            QR 코드 다운로드
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Quick Share Actions */}
                    <div className="space-y-2">
                      <Button
                        onClick={() => {
                          navigator.clipboard.writeText((shareData as any).shareUrl);
                          toast({ title: "링크 복사 완료", description: "명함 링크가 클립보드에 복사되었습니다." });
                        }}
                        className="w-full h-10 text-sm"
                      >
                        <Share2 className="w-4 h-4 mr-2" />
                        링크 공유하기
                      </Button>

                      {/* NFC Share Button */}
                      <Button
                        onClick={isNfcSharing ? stopNfcSharing : shareViaUNFC}
                        variant={isNfcSharing ? "destructive" : "default"}
                        className="w-full h-10 text-sm"
                        disabled={!shareData || !(shareData as any).shareUrl}
                      >
                        {isNfcSharing ? (
                          <>
                            <X className="w-4 h-4 mr-2" />
                            NFC 공유 중지
                          </>
                        ) : (
                          <>
                            <Smartphone className="w-4 h-4 mr-2" />
                            핸드폰 대고 공유하기
                          </>
                        )}
                      </Button>

                      {/* NFC Status Indicator */}
                      {isNfcSharing && (
                        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-center">
                          <div className="flex items-center justify-center space-x-2 mb-2">
                            <Wifi className="w-5 h-5 text-blue-600 animate-pulse" />
                            <span className="text-sm font-medium text-blue-700">NFC 대기 중</span>
                          </div>
                          <p className="text-xs text-blue-600">
                            다른 스마트폰을 이 기기 뒷면에 가까이 대어주세요
                          </p>
                        </div>
                      )}
                      
                      <Button
                        variant="outline"
                        onClick={generateVCard}
                        className="w-full h-10 text-sm"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        연락처 다운로드 (vCard)
                      </Button>
                    </div>

                    {/* Compact Share Stats */}
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t">
                      <div className="text-center">
                        <div className="text-lg font-bold text-blue-600">{(shareData as any).viewCount || 0}</div>
                        <div className="text-xs text-gray-500">조회수</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-green-600">∞</div>
                        <div className="text-xs text-gray-500">유효기간</div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <QrCode className="w-8 h-8 mx-auto text-gray-300 mb-2" />
                    <h3 className="text-base font-semibold text-gray-500 mb-1">공유 링크가 없습니다</h3>
                    <p className="text-sm text-gray-500 mb-4">명함을 공유할 수 있는 링크를 생성해보세요</p>
                    <Button 
                      onClick={() => createShareLinkMutation.mutate()}
                      disabled={createShareLinkMutation.isPending}
                      className="h-12 text-sm bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-lg hover:shadow-xl transition-all duration-200"
                    >
                      {createShareLinkMutation.isPending ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                          링크 생성 중...
                        </>
                      ) : (
                        <>
                          <Share2 className="w-5 h-5 mr-2" />
                          🔗 공유 링크 생성하기
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Camera Capture Component */}
      <CameraCapture
        isOpen={showCamera}
        onCapture={handleCameraCapture}
        onClose={() => setShowCamera(false)}
      />
    </div>
  );
}