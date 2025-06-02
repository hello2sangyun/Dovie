import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { 
  Building2, 
  Mail, 
  Phone, 
  MapPin, 
  Globe, 
  Linkedin, 
  Twitter, 
  Share2, 
  Copy, 
  Download,
  Edit3,
  Eye
} from "lucide-react";

interface BusinessCardProps {
  userId?: number;
  isOwnCard?: boolean;
}

export default function BusinessCard({ userId, isOwnCard = false }: BusinessCardProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);

  const targetUserId = userId || user?.id;

  // Fetch user's business card
  const { data: businessCard, isLoading: cardLoading } = useQuery({
    queryKey: ["/api/business-cards", targetUserId],
    enabled: !!targetUserId,
  });

  // Fetch user's business profile
  const { data: businessProfile, isLoading: profileLoading } = useQuery({
    queryKey: ["/api/business-profiles", targetUserId],
    enabled: !!targetUserId,
  });

  // Fetch business card share data (only for own card)
  const { data: shareData, isLoading: shareLoading } = useQuery({
    queryKey: ["/api/business-cards/share-info"],
    enabled: isOwnCard,
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
      toast({
        title: "명함 업데이트 완료",
        description: "명함 정보가 성공적으로 업데이트되었습니다.",
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "명함 업데이트 실패",
        description: "명함 업데이트 중 오류가 발생했습니다.",
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
      navigator.clipboard.writeText(data.shareUrl);
      toast({
        title: "공유 링크 생성 완료",
        description: "공유 링크가 클립보드에 복사되었습니다.",
      });
    },
  });

  const [formData, setFormData] = useState({
    fullName: businessCard?.fullName || "",
    companyName: businessCard?.companyName || "",
    jobTitle: businessCard?.jobTitle || "",
    email: businessCard?.email || "",
    phoneNumber: businessCard?.phoneNumber || "",
    website: businessCard?.website || "",
    address: businessCard?.address || "",
    description: businessCard?.description || "",
  });

  const handleSave = () => {
    updateCardMutation.mutate(formData);
  };

  const handleCopyShareLink = (shareUrl: string) => {
    navigator.clipboard.writeText(shareUrl);
    toast({
      title: "링크 복사 완료",
      description: "공유 링크가 클립보드에 복사되었습니다.",
    });
  };

  if (cardLoading || profileLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      {/* Business Card Display */}
      <Card className="bg-gradient-to-br from-blue-50 to-purple-50 border-2">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl">명함</CardTitle>
            {isOwnCard && (
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(!isEditing)}
                >
                  <Edit3 className="h-4 w-4 mr-1" />
                  수정
                </Button>
                <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Share2 className="h-4 w-4 mr-1" />
                      공유
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>명함 공유</DialogTitle>
                      <DialogDescription>
                        외부 사용자에게 명함을 공유할 수 있는 링크를 생성합니다.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      {shareData?.shareUrl ? (
                        <div className="space-y-3">
                          <div className="p-3 bg-gray-50 rounded border">
                            <p className="text-sm text-gray-600 mb-2">공유 링크</p>
                            <div className="flex items-center space-x-2">
                              <code className="flex-1 p-2 bg-white border rounded text-sm">
                                {shareData.shareUrl}
                              </code>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleCopyShareLink(shareData.shareUrl)}
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          <div className="text-sm text-gray-500">
                            <p>조회수: {shareData.viewCount}회</p>
                            {shareData.expiresAt && (
                              <p>만료일: {new Date(shareData.expiresAt).toLocaleDateString()}</p>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <p className="text-gray-500 mb-4">공유 링크가 없습니다</p>
                          <Button 
                            onClick={() => createShareLinkMutation.mutate()}
                            disabled={createShareLinkMutation.isPending}
                          >
                            공유 링크 생성
                          </Button>
                        </div>
                      )}
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {isEditing ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="fullName">이름</Label>
                  <Input
                    id="fullName"
                    value={formData.fullName}
                    onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                    placeholder="홍길동"
                  />
                </div>
                <div>
                  <Label htmlFor="jobTitle">직책</Label>
                  <Input
                    id="jobTitle"
                    value={formData.jobTitle}
                    onChange={(e) => setFormData({...formData, jobTitle: e.target.value})}
                    placeholder="대표이사"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="companyName">회사명</Label>
                <Input
                  id="companyName"
                  value={formData.companyName}
                  onChange={(e) => setFormData({...formData, companyName: e.target.value})}
                  placeholder="(주)도비테크"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="email">이메일</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    placeholder="hello@example.com"
                  />
                </div>
                <div>
                  <Label htmlFor="phoneNumber">전화번호</Label>
                  <Input
                    id="phoneNumber"
                    value={formData.phoneNumber}
                    onChange={(e) => setFormData({...formData, phoneNumber: e.target.value})}
                    placeholder="010-1234-5678"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="website">웹사이트</Label>
                <Input
                  id="website"
                  value={formData.website}
                  onChange={(e) => setFormData({...formData, website: e.target.value})}
                  placeholder="https://company.com"
                />
              </div>

              <div>
                <Label htmlFor="address">주소</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                  placeholder="서울시 강남구 테헤란로 123"
                />
              </div>

              <div>
                <Label htmlFor="description">소개</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="간단한 소개를 입력해주세요"
                  rows={3}
                />
              </div>

              <div className="flex space-x-2">
                <Button onClick={handleSave} disabled={updateCardMutation.isPending}>
                  저장
                </Button>
                <Button variant="outline" onClick={() => setIsEditing(false)}>
                  취소
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-center pb-4">
                <h3 className="text-2xl font-bold text-gray-900">
                  {businessCard?.fullName || "이름 없음"}
                </h3>
                <p className="text-lg text-blue-600 font-medium">
                  {businessCard?.jobTitle || "직책 없음"}
                </p>
                <p className="text-gray-600">
                  {businessCard?.companyName || "회사명 없음"}
                </p>
              </div>

              <Separator />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {businessCard?.email && (
                  <div className="flex items-center space-x-2">
                    <Mail className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">{businessCard.email}</span>
                  </div>
                )}
                
                {businessCard?.phoneNumber && (
                  <div className="flex items-center space-x-2">
                    <Phone className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">{businessCard.phoneNumber}</span>
                  </div>
                )}
                
                {businessCard?.website && (
                  <div className="flex items-center space-x-2">
                    <Globe className="h-4 w-4 text-gray-500" />
                    <a 
                      href={businessCard.website} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline"
                    >
                      웹사이트
                    </a>
                  </div>
                )}

                {businessCard?.address && (
                  <div className="flex items-center space-x-2">
                    <MapPin className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">{businessCard.address}</span>
                  </div>
                )}
              </div>

              {businessCard?.description && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm text-gray-700">{businessCard.description}</p>
                  </div>
                </>
              )}

              {!businessCard && (
                <div className="text-center py-8 text-gray-500">
                  <p>명함 정보가 없습니다</p>
                  {isOwnCard && (
                    <Button 
                      className="mt-4" 
                      onClick={() => setIsEditing(true)}
                    >
                      명함 만들기
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}