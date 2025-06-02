import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, 
  Save, 
  Share2, 
  Eye, 
  Copy, 
  Mail, 
  Phone, 
  Globe, 
  MapPin, 
  Building2, 
  Briefcase,
  User,
  Sparkles,
  ExternalLink
} from "lucide-react";

interface ModernBusinessCardProps {
  onBack?: () => void;
}

export default function ModernBusinessCard({ onBack }: ModernBusinessCardProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Form states
  const [formData, setFormData] = useState({
    fullName: "",
    companyName: "",
    jobTitle: "",
    department: "",
    email: "",
    phoneNumber: "",
    website: "",
    address: "",
    description: ""
  });

  // 명함 정보 조회
  const { data: businessCardData, isLoading } = useQuery({
    queryKey: ["/api/business-cards"],
    onSuccess: (data) => {
      if (data?.businessCard) {
        setFormData({
          fullName: data.businessCard.fullName || "",
          companyName: data.businessCard.companyName || "",
          jobTitle: data.businessCard.jobTitle || "",
          department: data.businessCard.department || "",
          email: data.businessCard.email || "",
          phoneNumber: data.businessCard.phoneNumber || "",
          website: data.businessCard.website || "",
          address: data.businessCard.address || "",
          description: data.businessCard.description || ""
        });
      }
    }
  });

  // 공유 정보 조회
  const { data: shareData } = useQuery({
    queryKey: ["/api/business-cards/share-info"],
  });

  // 명함 저장 뮤테이션
  const saveBusinessCardMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await apiRequest("/api/business-cards", "POST", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/business-cards"] });
      toast({
        title: "명함이 저장되었습니다",
        description: "디지털 명함 정보가 성공적으로 업데이트되었습니다.",
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

  // 공유 링크 생성 뮤테이션
  const createShareLinkMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("/api/business-cards/share", "POST");
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/business-cards/share-info"] });
      navigator.clipboard.writeText(data.shareUrl);
      toast({
        title: "공유 링크가 생성되었습니다",
        description: "링크가 클립보드에 복사되었습니다.",
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "공유 링크 생성 실패",
        description: "링크 생성 중 오류가 발생했습니다.",
      });
    },
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    saveBusinessCardMutation.mutate(formData);
  };

  const handleShare = () => {
    createShareLinkMutation.mutate();
  };

  const copyShareLink = () => {
    if (shareData?.shareUrl) {
      navigator.clipboard.writeText(shareData.shareUrl);
      toast({
        title: "링크가 복사되었습니다",
        description: "공유 링크가 클립보드에 복사되었습니다.",
      });
    }
  };

  const businessCard = businessCardData?.businessCard;

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {onBack && (
            <Button variant="ghost" size="sm" onClick={onBack} className="h-8 w-8 p-0">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          )}
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
              <User className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">디지털 명함</h1>
              <p className="text-xs text-gray-500">개인 명함 정보 관리</p>
            </div>
          </div>
        </div>
        <Badge variant="secondary" className="bg-white/80 backdrop-blur-sm">
          <Sparkles className="w-3 h-3 mr-1" />
          Premium
        </Badge>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* 명함 편집 폼 */}
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center space-x-2">
              <Briefcase className="w-5 h-5 text-blue-600" />
              <span>명함 정보</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="fullName" className="text-xs font-medium text-gray-700">이름</Label>
                <Input
                  id="fullName"
                  value={formData.fullName}
                  onChange={(e) => handleInputChange("fullName", e.target.value)}
                  className="h-9 text-sm"
                  placeholder="홍길동"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="jobTitle" className="text-xs font-medium text-gray-700">직책</Label>
                <Input
                  id="jobTitle"
                  value={formData.jobTitle}
                  onChange={(e) => handleInputChange("jobTitle", e.target.value)}
                  className="h-9 text-sm"
                  placeholder="개발자"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="companyName" className="text-xs font-medium text-gray-700">회사명</Label>
                <Input
                  id="companyName"
                  value={formData.companyName}
                  onChange={(e) => handleInputChange("companyName", e.target.value)}
                  className="h-9 text-sm"
                  placeholder="회사명"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="department" className="text-xs font-medium text-gray-700">부서</Label>
                <Input
                  id="department"
                  value={formData.department}
                  onChange={(e) => handleInputChange("department", e.target.value)}
                  className="h-9 text-sm"
                  placeholder="개발팀"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="email" className="text-xs font-medium text-gray-700">이메일</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  className="h-9 text-sm"
                  placeholder="example@company.com"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="phoneNumber" className="text-xs font-medium text-gray-700">전화번호</Label>
                <Input
                  id="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={(e) => handleInputChange("phoneNumber", e.target.value)}
                  className="h-9 text-sm"
                  placeholder="010-1234-5678"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="website" className="text-xs font-medium text-gray-700">웹사이트</Label>
              <Input
                id="website"
                value={formData.website}
                onChange={(e) => handleInputChange("website", e.target.value)}
                className="h-9 text-sm"
                placeholder="https://company.com"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="address" className="text-xs font-medium text-gray-700">주소</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => handleInputChange("address", e.target.value)}
                className="h-9 text-sm"
                placeholder="서울특별시 강남구..."
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="description" className="text-xs font-medium text-gray-700">소개</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange("description", e.target.value)}
                className="text-sm resize-none"
                rows={3}
                placeholder="간단한 자기소개나 업무 설명을 입력하세요"
              />
            </div>

            <Button 
              onClick={handleSave}
              disabled={saveBusinessCardMutation.isPending}
              className="w-full h-10 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              <Save className="w-4 h-4 mr-2" />
              {saveBusinessCardMutation.isPending ? "저장 중..." : "저장"}
            </Button>
          </CardContent>
        </Card>

        {/* 명함 미리보기 */}
        <div className="space-y-4">
          {/* 명함 프리뷰 */}
          <Card className="bg-gradient-to-br from-blue-600 to-purple-600 text-white border-0 shadow-xl">
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <h3 className="text-xl font-bold">
                      {formData.fullName || "이름을 입력하세요"}
                    </h3>
                    <p className="text-blue-100 text-sm">
                      {formData.jobTitle || "직책을 입력하세요"}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                    <Building2 className="w-6 h-6 text-white" />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center space-x-2 text-sm text-blue-100">
                    <Building2 className="w-4 h-4" />
                    <span>{formData.companyName || "회사명"}</span>
                  </div>
                  
                  {formData.email && (
                    <div className="flex items-center space-x-2 text-sm text-blue-100">
                      <Mail className="w-4 h-4" />
                      <span>{formData.email}</span>
                    </div>
                  )}
                  
                  {formData.phoneNumber && (
                    <div className="flex items-center space-x-2 text-sm text-blue-100">
                      <Phone className="w-4 h-4" />
                      <span>{formData.phoneNumber}</span>
                    </div>
                  )}
                  
                  {formData.website && (
                    <div className="flex items-center space-x-2 text-sm text-blue-100">
                      <Globe className="w-4 h-4" />
                      <span className="truncate">{formData.website}</span>
                    </div>
                  )}
                </div>

                {formData.description && (
                  <div className="pt-2 border-t border-white/20">
                    <p className="text-xs text-blue-100 leading-relaxed">
                      {formData.description}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* 공유 설정 */}
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center space-x-2">
                <Share2 className="w-5 h-5 text-green-600" />
                <span>공유 설정</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {shareData?.shareUrl ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <Eye className="w-4 h-4 text-green-600" />
                      <span className="text-sm text-green-700">
                        조회수: {shareData.viewCount || 0}회
                      </span>
                    </div>
                    <Badge variant="secondary" className="bg-green-100 text-green-700">
                      활성
                    </Badge>
                  </div>
                  
                  <div className="flex space-x-2">
                    <Button 
                      onClick={copyShareLink}
                      variant="outline" 
                      className="flex-1 h-9"
                      size="sm"
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      링크 복사
                    </Button>
                    <Button 
                      onClick={() => window.open(shareData.shareUrl, '_blank')}
                      variant="outline" 
                      className="h-9 px-3"
                      size="sm"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-sm text-gray-500 mb-3">
                    아직 공유 링크가 생성되지 않았습니다
                  </p>
                  <Button 
                    onClick={handleShare}
                    disabled={createShareLinkMutation.isPending}
                    className="w-full h-10 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                  >
                    <Share2 className="w-4 h-4 mr-2" />
                    {createShareLinkMutation.isPending ? "생성 중..." : "공유 링크 생성"}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}