import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Building2, 
  Mail, 
  Phone, 
  Globe, 
  MapPin, 
  User, 
  Briefcase, 
  Users, 
  Sparkles,
  X
} from "lucide-react";
import { getInitials, getAvatarColor } from "@/lib/utils";

interface FriendBusinessCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  friendUserId: number;
  friendName: string;
}

export default function FriendBusinessCardModal({ 
  isOpen, 
  onClose, 
  friendUserId, 
  friendName 
}: FriendBusinessCardModalProps) {
  const [activeTab, setActiveTab] = useState<"card" | "profile">("card");

  // 친구의 명함 정보 조회
  const { data: businessCard, isLoading: cardLoading } = useQuery({
    queryKey: [`/api/users/${friendUserId}/business-card`],
    enabled: isOpen && !!friendUserId,
  });

  // 친구의 비즈니스 프로필 정보 조회
  const { data: businessProfile, isLoading: profileLoading } = useQuery({
    queryKey: [`/api/users/${friendUserId}/business-profile`],
    enabled: isOpen && !!friendUserId,
  });

  const hasBusinessCard = businessCard?.businessCard;
  const hasBusinessProfile = businessProfile?.businessProfile;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg mx-auto bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 border-0 shadow-2xl">
        <DialogHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <div
                  className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${getAvatarColor(friendName)} flex items-center justify-center text-white font-bold text-lg shadow-lg`}
                >
                  {getInitials(friendName)}
                </div>
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                  <Sparkles className="w-3 h-3 text-white" />
                </div>
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-gray-900">
                  {friendName}님
                </DialogTitle>
                <p className="text-xs text-gray-500">프로필 정보</p>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onClose}
              className="h-8 w-8 p-0 hover:bg-white/50"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        {/* 컴팩트 탭 네비게이션 */}
        <div className="flex bg-white/60 backdrop-blur-sm rounded-xl p-1 mb-4">
          <button
            className={`flex-1 flex items-center justify-center space-x-2 py-2 px-3 text-xs font-medium rounded-lg transition-all ${
              activeTab === "card"
                ? "bg-white text-blue-600 shadow-sm"
                : "text-gray-600 hover:text-gray-800"
            }`}
            onClick={() => setActiveTab("card")}
          >
            <User className="w-3.5 h-3.5" />
            <span>명함</span>
          </button>
          <button
            className={`flex-1 flex items-center justify-center space-x-2 py-2 px-3 text-xs font-medium rounded-lg transition-all ${
              activeTab === "profile"
                ? "bg-white text-blue-600 shadow-sm"
                : "text-gray-600 hover:text-gray-800"
            }`}
            onClick={() => setActiveTab("profile")}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>회사정보</span>
          </button>
        </div>

        <div className="space-y-4 max-h-96 overflow-y-auto">
          {activeTab === "card" && (
            <div>
              {cardLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                </div>
              ) : hasBusinessCard ? (
                <div className="space-y-4">
                  {/* 명함 정보 */}
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-lg border">
                    <div className="space-y-3">
                      {hasBusinessCard.fullName && (
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">
                            {hasBusinessCard.fullName}
                          </h3>
                        </div>
                      )}
                      
                      {hasBusinessCard.jobTitle && (
                        <div className="flex items-center space-x-2 text-gray-600">
                          <Briefcase className="w-4 h-4" />
                          <span className="text-sm">{hasBusinessCard.jobTitle}</span>
                        </div>
                      )}

                      {hasBusinessCard.companyName && (
                        <div className="flex items-center space-x-2 text-gray-600">
                          <Building2 className="w-4 h-4" />
                          <span className="text-sm">{hasBusinessCard.companyName}</span>
                        </div>
                      )}

                      {hasBusinessCard.department && (
                        <div className="flex items-center space-x-2 text-gray-600">
                          <Users className="w-4 h-4" />
                          <span className="text-sm">{hasBusinessCard.department}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 연락처 정보 */}
                  <div className="space-y-3">
                    <h4 className="font-medium text-gray-900">연락처</h4>
                    
                    {hasBusinessCard.email && (
                      <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                        <Mail className="w-4 h-4 text-gray-500" />
                        <span className="text-sm text-gray-700">{hasBusinessCard.email}</span>
                      </div>
                    )}

                    {hasBusinessCard.phoneNumber && (
                      <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                        <Phone className="w-4 h-4 text-gray-500" />
                        <span className="text-sm text-gray-700">{hasBusinessCard.phoneNumber}</span>
                      </div>
                    )}

                    {hasBusinessCard.website && (
                      <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                        <Globe className="w-4 h-4 text-gray-500" />
                        <a 
                          href={hasBusinessCard.website} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:underline"
                        >
                          {hasBusinessCard.website}
                        </a>
                      </div>
                    )}

                    {hasBusinessCard.address && (
                      <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                        <MapPin className="w-4 h-4 text-gray-500" />
                        <span className="text-sm text-gray-700">{hasBusinessCard.address}</span>
                      </div>
                    )}
                  </div>

                  {hasBusinessCard.description && (
                    <div className="space-y-2">
                      <h4 className="font-medium text-gray-900">소개</h4>
                      <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                        {hasBusinessCard.description}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <User className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-sm">등록된 명함이 없습니다.</p>
                </div>
              )}
            </div>
          )}

          {activeTab === "profile" && (
            <div>
              {profileLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                </div>
              ) : hasBusinessProfile ? (
                <div className="space-y-4">
                  {/* 회사 정보 */}
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-lg border">
                    <div className="space-y-3">
                      {hasBusinessProfile.companyName && (
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">
                            {hasBusinessProfile.companyName}
                          </h3>
                        </div>
                      )}
                      
                      {hasBusinessProfile.jobTitle && (
                        <div className="flex items-center space-x-2 text-gray-600">
                          <Briefcase className="w-4 h-4" />
                          <span className="text-sm">{hasBusinessProfile.jobTitle}</span>
                        </div>
                      )}

                      {hasBusinessProfile.department && (
                        <div className="flex items-center space-x-2 text-gray-600">
                          <Users className="w-4 h-4" />
                          <span className="text-sm">{hasBusinessProfile.department}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 소개 */}
                  {hasBusinessProfile.bio && (
                    <div className="space-y-2">
                      <h4 className="font-medium text-gray-900">소개</h4>
                      <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                        {hasBusinessProfile.bio}
                      </p>
                    </div>
                  )}

                  {/* 스킬 */}
                  {hasBusinessProfile.skills && hasBusinessProfile.skills.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-medium text-gray-900">전문 분야</h4>
                      <div className="flex flex-wrap gap-2">
                        {hasBusinessProfile.skills.map((skill: string, index: number) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 소셜 링크 */}
                  <div className="space-y-3">
                    {hasBusinessProfile.website && (
                      <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                        <Globe className="w-4 h-4 text-gray-500" />
                        <a 
                          href={hasBusinessProfile.website} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:underline"
                        >
                          회사 웹사이트
                        </a>
                      </div>
                    )}

                    {hasBusinessProfile.linkedinProfile && (
                      <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                        <Building2 className="w-4 h-4 text-gray-500" />
                        <a 
                          href={hasBusinessProfile.linkedinProfile} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:underline"
                        >
                          LinkedIn 프로필
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Building2 className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-sm">등록된 비즈니스 프로필이 없습니다.</p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <Button variant="outline" onClick={onClose}>
            닫기
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}