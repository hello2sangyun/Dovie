import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { OptimizedAvatar } from "@/components/OptimizedAvatar";
import { 
  User, 
  Mail, 
  Phone, 
  Building, 
  MapPin, 
  Globe, 
  UserPlus,
  MessageCircle,
  Download,
  Share2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function SharePage() {
  const { userId } = useParams();
  const { toast } = useToast();
  const [isAddingContact, setIsAddingContact] = useState(false);

  // For demo purposes, use the current user's data when viewing their own QR
  // In production, this would fetch the specific user's public profile
  const { data: userProfile, isLoading, error } = useQuery({
    queryKey: ['/api/auth/me'],
    queryFn: async () => {
      const response = await fetch('/api/auth/me');
      if (!response.ok) {
        throw new Error('사용자를 찾을 수 없습니다');
      }
      const data = await response.json();
      return data.user;
    },
    enabled: !!userId,
  });

  const { data: businessCard } = useQuery({
    queryKey: [`/api/users/${userId}/business-card`],
    queryFn: async () => {
      // Mock business card data for demo
      return {
        company: userProfile?.businessName || "One Pager",
        location: userProfile?.businessAddress || "서울시 강남구",
        jobTitle: "Professional Networker",
        website: "https://onepager.app",
        skills: ["네트워킹", "비즈니스", "AI", "모바일"]
      };
    },
    enabled: !!userProfile,
  });

  const addToContacts = async () => {
    if (!userProfile) return;
    
    setIsAddingContact(true);
    try {
      const response = await fetch('/api/contacts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contactUserId: userProfile.id,
          nickname: userProfile.displayName,
        }),
      });

      if (response.ok) {
        toast({
          title: "연락처 추가 완료",
          description: `${userProfile.displayName}님이 연락처에 추가되었습니다.`,
        });
      } else {
        throw new Error('연락처 추가에 실패했습니다');
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "연락처 추가 실패",
        description: "연락처 추가 중 오류가 발생했습니다.",
      });
    } finally {
      setIsAddingContact(false);
    }
  };

  const shareProfile = async () => {
    if (!userProfile) return;

    const shareData = {
      title: `${userProfile.displayName}의 One Pager`,
      text: "One Pager에서 내 연락처를 확인하세요",
      url: window.location.href,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (error) {
        // Fallback to clipboard
        await navigator.clipboard.writeText(window.location.href);
        toast({
          title: "링크 복사됨",
          description: "프로필 링크가 클립보드에 복사되었습니다.",
        });
      }
    } else {
      await navigator.clipboard.writeText(window.location.href);
      toast({
        title: "링크 복사됨",
        description: "프로필 링크가 클립보드에 복사되었습니다.",
      });
    }
  };

  const downloadVCard = () => {
    if (!userProfile) return;

    const vcard = `BEGIN:VCARD
VERSION:3.0
FN:${userProfile.displayName}
N:${userProfile.displayName};;;;
${userProfile.email ? `EMAIL:${userProfile.email}` : ''}
${userProfile.phone ? `TEL:${userProfile.phone}` : ''}
${businessCard?.company ? `ORG:${businessCard.company}` : ''}
${businessCard?.jobTitle ? `TITLE:${businessCard.jobTitle}` : ''}
END:VCARD`;

    const blob = new Blob([vcard], { type: 'text/vcard' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${userProfile.displayName}.vcf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    toast({
      title: "연락처 다운로드",
      description: "연락처 파일이 다운로드되었습니다.",
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">프로필을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error || !userProfile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">프로필을 찾을 수 없습니다</h2>
            <p className="text-gray-600 mb-4">
              요청하신 사용자의 프로필이 존재하지 않거나 공개되지 않았습니다.
            </p>
            <Button onClick={() => window.location.href = '/'}>
              One Pager 홈으로
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-4">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">One Pager</h1>
          <p className="text-gray-600">디지털 명함 & 네트워킹</p>
        </div>

        {/* Business Card */}
        <Card className="mb-6 overflow-hidden shadow-lg">
          <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-6 text-white">
            <div className="flex items-center space-x-4 mb-4">
              <OptimizedAvatar
                src={userProfile.profilePicture}
                alt={userProfile.displayName}
                className="h-16 w-16 border-2 border-white"
              />
              <div>
                <h2 className="text-xl font-bold">{userProfile.displayName}</h2>
                {businessCard?.jobTitle && (
                  <p className="text-purple-100">{businessCard.jobTitle}</p>
                )}
                {businessCard?.company && (
                  <p className="text-purple-200 text-sm">{businessCard.company}</p>
                )}
              </div>
            </div>

            {userProfile.bio && (
              <p className="text-purple-100 text-sm">{userProfile.bio}</p>
            )}
          </div>

          <CardContent className="p-6">
            <div className="space-y-3">
              {userProfile.email && (
                <div className="flex items-center space-x-3">
                  <Mail className="h-4 w-4 text-gray-500" />
                  <span className="text-sm">{userProfile.email}</span>
                </div>
              )}

              {userProfile.phone && (
                <div className="flex items-center space-x-3">
                  <Phone className="h-4 w-4 text-gray-500" />
                  <span className="text-sm">{userProfile.phone}</span>
                </div>
              )}

              {businessCard?.company && (
                <div className="flex items-center space-x-3">
                  <Building className="h-4 w-4 text-gray-500" />
                  <span className="text-sm">{businessCard.company}</span>
                </div>
              )}

              {businessCard?.location && (
                <div className="flex items-center space-x-3">
                  <MapPin className="h-4 w-4 text-gray-500" />
                  <span className="text-sm">{businessCard.location}</span>
                </div>
              )}

              {businessCard?.website && (
                <div className="flex items-center space-x-3">
                  <Globe className="h-4 w-4 text-gray-500" />
                  <a 
                    href={businessCard.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline"
                  >
                    {businessCard.website}
                  </a>
                </div>
              )}
            </div>

            {/* Skills/Tags */}
            {businessCard?.skills && businessCard.skills.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">전문 분야</h4>
                <div className="flex flex-wrap gap-1">
                  {businessCard.skills.slice(0, 6).map((skill: string, index: number) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="space-y-3">
          <Button 
            onClick={addToContacts}
            disabled={isAddingContact}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white gap-2"
          >
            <UserPlus className="h-4 w-4" />
            {isAddingContact ? '추가 중...' : '연락처에 추가'}
          </Button>

          <div className="grid grid-cols-2 gap-3">
            <Button 
              variant="outline" 
              onClick={downloadVCard}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              다운로드
            </Button>
            <Button 
              variant="outline" 
              onClick={shareProfile}
              className="gap-2"
            >
              <Share2 className="h-4 w-4" />
              공유하기
            </Button>
          </div>

          <Button 
            variant="ghost" 
            onClick={() => window.location.href = '/'}
            className="w-full text-gray-600"
          >
            One Pager 앱 다운로드
          </Button>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-xs text-gray-500">
          <p>Powered by One Pager</p>
          <p>디지털 명함과 네트워킹의 새로운 경험</p>
        </div>
      </div>
    </div>
  );
}