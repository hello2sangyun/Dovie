import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Camera, Edit, Save, User, Phone, Mail, Building2, MapPin, Globe, QrCode, Copy } from "lucide-react";
import CameraCapture from "@/components/CameraCapture";

interface BusinessCard {
  id: number;
  userId: number;
  name: string;
  company?: string;
  jobTitle?: string;
  email?: string;
  phone?: string;
  address?: string;
  website?: string;
  businessCardImage?: string;
  isPublic: boolean;
  createdAt: string;
}

interface MyOnePagerPageProps {
  onBack?: () => void;
}

export default function MyOnePagerPage({ onBack }: MyOnePagerPageProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    company: "",
    jobTitle: "",
    email: "",
    phone: "",
    address: "",
    website: "",
    isPublic: true
  });

  // 기존 명함 데이터 조회
  const { data: businessCard, isLoading } = useQuery<BusinessCard>({
    queryKey: ["/api/business-cards"],
    enabled: !!user,
  });

  // 폼 데이터 초기화
  useEffect(() => {
    if (businessCard) {
      setFormData({
        name: businessCard.name || "",
        company: businessCard.company || "",
        jobTitle: businessCard.jobTitle || "",
        email: businessCard.email || "",
        phone: businessCard.phone || "",
        address: businessCard.address || "",
        website: businessCard.website || "",
        isPublic: businessCard.isPublic
      });
    } else if (user) {
      setFormData(prev => ({
        ...prev,
        name: user.displayName || "",
        email: user.email || ""
      }));
    }
  }, [businessCard, user]);

  // 명함 저장/업데이트
  const saveBusinessCardMutation = useMutation({
    mutationFn: async (data: any) => {
      const method = businessCard ? "PUT" : "POST";
      const url = businessCard ? `/api/business-cards/${businessCard.id}` : "/api/business-cards";
      return apiRequest(url, method, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/business-cards"] });
      setIsEditing(false);
      toast({
        title: "저장 완료",
        description: "명함 정보가 성공적으로 저장되었습니다.",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "저장 실패",
        description: error?.message || "명함 저장 중 오류가 발생했습니다.",
      });
    },
  });

  const handleSave = () => {
    if (!formData.name) {
      toast({
        variant: "destructive",
        title: "입력 오류",
        description: "이름을 입력해주세요.",
      });
      return;
    }

    saveBusinessCardMutation.mutate(formData);
  };

  const handleCameraCapture = (imageFile: File) => {
    // 명함 사진 찍기 후 OCR 처리
    const formDataWithImage = new FormData();
    formDataWithImage.append('image', imageFile);
    
    // OCR API 호출
    apiRequest("/api/business-cards/scan", "POST", formDataWithImage)
    .then(response => response.json())
    .then(data => {
      if (data.extractedData) {
        setFormData({
          name: data.extractedData.name || formData.name,
          company: data.extractedData.company || formData.company,
          jobTitle: data.extractedData.jobTitle || formData.jobTitle,
          email: data.extractedData.email || formData.email,
          phone: data.extractedData.phone || formData.phone,
          address: data.extractedData.address || formData.address,
          website: data.extractedData.website || formData.website,
          isPublic: formData.isPublic
        });
        setIsEditing(true);
        toast({
          title: "명함 인식 완료",
          description: "명함에서 정보를 추출했습니다. 내용을 확인하고 저장해주세요.",
        });
      }
    })
    .catch(error => {
      console.error("OCR error:", error);
      toast({
        variant: "destructive",
        title: "인식 실패",
        description: "명함 인식 중 오류가 발생했습니다.",
      });
    });
    
    setShowCamera(false);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "복사 완료",
      description: "클립보드에 복사되었습니다.",
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-500">명함 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (showCamera) {
    return (
      <CameraCapture
        onCapture={handleCameraCapture}
        onClose={() => setShowCamera(false)}
        title="내 명함 등록"
        subtitle="명함을 촬영하여 정보를 자동으로 입력하세요"
      />
    );
  }

  const hasBusinessCard = !!businessCard;

  return (
    <div className="h-full bg-gray-50 overflow-y-auto">
      <div className="p-4 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          {onBack && (
            <Button variant="ghost" onClick={onBack} className="p-2">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          )}
          <h1 className="text-xl font-bold text-gray-900">내 One Pager</h1>
          <div className="w-10"></div>
        </div>

        {!hasBusinessCard && !isEditing ? (
          /* 최초 등록 화면 */
          <div className="text-center py-8">
            <div className="w-24 h-24 bg-purple-100 rounded-full mx-auto mb-6 flex items-center justify-center">
              <User className="w-12 h-12 text-purple-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              내 명함을 등록해보세요
            </h2>
            <p className="text-gray-600 mb-8 max-w-sm mx-auto">
              명함을 촬영하여 자동으로 정보를 입력하거나 직접 입력할 수 있습니다.
            </p>
            
            <div className="space-y-3 max-w-xs mx-auto">
              <Button
                onClick={() => setShowCamera(true)}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                <Camera className="w-4 h-4 mr-2" />
                명함 사진 찍기
              </Button>
              
              <Button
                onClick={() => setIsEditing(true)}
                variant="outline"
                className="w-full"
              >
                <Edit className="w-4 h-4 mr-2" />
                직접 입력하기
              </Button>
            </div>
          </div>
        ) : isEditing ? (
          /* 편집 모드 */
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>명함 정보 {hasBusinessCard ? "수정" : "등록"}</span>
                <Button
                  onClick={() => setShowCamera(true)}
                  variant="outline"
                  size="sm"
                >
                  <Camera className="w-4 h-4 mr-2" />
                  사진으로 입력
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  이름 *
                </label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="홍길동"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  회사명
                </label>
                <Input
                  value={formData.company}
                  onChange={(e) => setFormData(prev => ({ ...prev, company: e.target.value }))}
                  placeholder="(주)회사명"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  직책/직위
                </label>
                <Input
                  value={formData.jobTitle}
                  onChange={(e) => setFormData(prev => ({ ...prev, jobTitle: e.target.value }))}
                  placeholder="대표이사"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  이메일
                </label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="example@company.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  전화번호
                </label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="010-1234-5678"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  주소
                </label>
                <Textarea
                  value={formData.address}
                  onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="서울시 강남구..."
                  rows={2}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  웹사이트
                </label>
                <Input
                  value={formData.website}
                  onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
                  placeholder="https://company.com"
                />
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isPublic"
                  checked={formData.isPublic}
                  onChange={(e) => setFormData(prev => ({ ...prev, isPublic: e.target.checked }))}
                  className="rounded border-gray-300"
                />
                <label htmlFor="isPublic" className="text-sm text-gray-700">
                  다른 사용자에게 공개
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  onClick={handleSave}
                  disabled={saveBusinessCardMutation.isPending}
                  className="flex-1"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {saveBusinessCardMutation.isPending ? "저장 중..." : "저장"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setIsEditing(false)}
                  className="flex-1"
                >
                  취소
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          /* 보기 모드 */
          <div className="space-y-6">
            {/* 프로필 섹션 */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-4 mb-6">
                  <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center">
                    {user?.profilePicture ? (
                      <img
                        src={user.profilePicture}
                        alt="Profile"
                        className="w-14 h-14 rounded-full object-cover"
                      />
                    ) : (
                      <User className="w-8 h-8 text-purple-600" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h2 className="text-xl font-bold text-gray-900">{businessCard?.name}</h2>
                    {businessCard?.jobTitle && businessCard?.company && (
                      <p className="text-gray-600">{businessCard.jobTitle} · {businessCard.company}</p>
                    )}
                  </div>
                  <Button
                    onClick={() => setIsEditing(true)}
                    variant="outline"
                    size="sm"
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    편집
                  </Button>
                </div>

                {/* 연락처 정보 */}
                <div className="space-y-3">
                  {businessCard?.email && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Mail className="w-5 h-5 text-gray-400" />
                        <span className="text-gray-900">{businessCard.email}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(businessCard.email || "")}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  )}

                  {businessCard?.phone && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Phone className="w-5 h-5 text-gray-400" />
                        <span className="text-gray-900">{businessCard.phone}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(businessCard.phone || "")}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  )}

                  {businessCard?.company && (
                    <div className="flex items-center space-x-3">
                      <Building2 className="w-5 h-5 text-gray-400" />
                      <span className="text-gray-900">{businessCard.company}</span>
                    </div>
                  )}

                  {businessCard?.address && (
                    <div className="flex items-center space-x-3">
                      <MapPin className="w-5 h-5 text-gray-400" />
                      <span className="text-gray-900">{businessCard.address}</span>
                    </div>
                  )}

                  {businessCard?.website && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Globe className="w-5 h-5 text-gray-400" />
                        <span className="text-gray-900">{businessCard.website}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(businessCard.website)}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* QR 코드 섹션 */}
            <Card>
              <CardContent className="p-6 text-center">
                <div className="w-32 h-32 bg-gray-100 rounded-lg mx-auto mb-4 flex items-center justify-center">
                  <QrCode className="w-16 h-16 text-gray-400" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">내 QR 코드</h3>
                <p className="text-sm text-gray-600">
                  QR 코드를 공유하여 간편하게 연락처를 교환하세요
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}