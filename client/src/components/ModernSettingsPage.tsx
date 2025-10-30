import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import InstantAvatar from "./InstantAvatar";
import { Badge } from "@/components/ui/badge";
import { 
  User, 
  Settings, 
  LogOut, 
  CreditCard, 
  Building2, 
  Bell, 
  Shield, 
  ChevronRight,
  Edit3,
  Sparkles,
  UserX,
  QrCode,
  Globe,
  HelpCircle,
  Brain,
  Trash2
} from "lucide-react";
import { getInitials, getAvatarColor } from "@/lib/utils";
import BlockedContactsPage from "./BlockedContactsPage";
import ProfileSettingsPage from "./ProfileSettingsPage";
import NotificationSettingsPage from "./NotificationSettingsPage";
import SecuritySettingsPage from "./SecuritySettingsPage";
import ProfilePhotoUpload from "./ProfilePhotoUpload";
import AccountManagementPage from "./AccountManagementPage";
import AISettingsPage from "./AISettingsPage";
import LanguageSettingsPage from "./LanguageSettingsPage";
import HelpSupportPage from "./HelpSupportPage";

interface ModernSettingsPageProps {
  isMobile?: boolean;
  onQRCodeClick?: () => void;
}

export default function ModernSettingsPage({ isMobile = false, onQRCodeClick }: ModernSettingsPageProps) {
  const { user, logout } = useAuth();
  const [activeView, setActiveView] = useState<'main' | 'blocked-contacts' | 'profile' | 'notifications' | 'security' | 'account-management' | 'ai-settings' | 'language' | 'help-support'>('main');
  const [showProfilePhotoUpload, setShowProfilePhotoUpload] = useState(false);

  if (!user) return null;



  if (activeView === 'blocked-contacts') {
    return <BlockedContactsPage onBack={() => setActiveView('main')} />;
  }

  if (activeView === 'profile') {
    return <ProfileSettingsPage onBack={() => setActiveView('main')} />;
  }

  if (activeView === 'notifications') {
    return <NotificationSettingsPage onBack={() => setActiveView('main')} />;
  }

  if (activeView === 'security') {
    return <SecuritySettingsPage onBack={() => setActiveView('main')} />;
  }

  if (activeView === 'account-management') {
    return <AccountManagementPage onBack={() => setActiveView('main')} />;
  }

  if (activeView === 'ai-settings') {
    return <AISettingsPage onBack={() => setActiveView('main')} />;
  }

  if (activeView === 'language') {
    return <LanguageSettingsPage onBack={() => setActiveView('main')} />;
  }

  if (activeView === 'help-support') {
    return <HelpSupportPage onBack={() => setActiveView('main')} />;
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto scrollbar-thin bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <div className="max-w-2xl mx-auto p-4 space-y-4 min-h-full pb-24">
          {/* 헤더 */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                <Settings className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">설정</h1>
                <p className="text-sm text-gray-500">계정 및 앱 설정 관리</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={onQRCodeClick}
                className="p-2 text-gray-500 hover:text-purple-600 hover:bg-white/50 rounded-lg transition-colors"
                title="QR 코드 생성"
              >
                <QrCode className="h-5 w-5" />
              </button>
              <Badge variant="secondary" className="bg-white/80 backdrop-blur-sm">
                <Sparkles className="w-3 h-3 mr-1" />
                Dovie
              </Badge>
            </div>
          </div>

          {/* 프로필 카드 */}
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="relative cursor-pointer" onClick={() => setShowProfilePhotoUpload(true)}>
                  <InstantAvatar 
                    src={user.profilePicture}
                    fallbackText={getInitials(user.displayName)}
                    size="xl"
                    className="w-16 h-16 border-4 border-white shadow-lg transition-transform hover:scale-105"
                  />
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center shadow-md hover:scale-110 transition-transform">
                    <Edit3 className="w-3 h-3 text-white" />
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-900">{user.displayName}</h3>
                  <p className="text-sm text-gray-500">@{user.username}</p>
                  <div className="flex items-center space-x-2 mt-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-xs text-green-600 font-medium">온라인</span>
                  </div>
                </div>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>



          {/* 계정 설정 섹션 */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-gray-700 px-2">계정 설정</h4>
            
            <Card 
              className="bg-white/80 backdrop-blur-sm border-0 shadow-md hover:shadow-lg transition-all cursor-pointer group"
              onClick={() => setActiveView('profile')}
            >
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <User className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <h5 className="font-semibold text-gray-900">개인정보</h5>
                    <p className="text-xs text-gray-500">프로필 및 계정 정보 수정</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
                </div>
              </CardContent>
            </Card>

            <Card 
              className="bg-white/80 backdrop-blur-sm border-0 shadow-md hover:shadow-lg transition-all cursor-pointer group"
              onClick={() => setActiveView('notifications')}
            >
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Bell className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <h5 className="font-semibold text-gray-900">알림 설정</h5>
                    <p className="text-xs text-gray-500">메시지 및 앱 알림 관리</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
                </div>
              </CardContent>
            </Card>

            <Card 
              className="bg-white/80 backdrop-blur-sm border-0 shadow-md hover:shadow-lg transition-all cursor-pointer group"
              onClick={() => setActiveView('security')}
            >
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-gray-600 to-gray-700 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Shield className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <h5 className="font-semibold text-gray-900">보안 및 개인정보</h5>
                    <p className="text-xs text-gray-500">비밀번호 및 보안 설정</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
                </div>
              </CardContent>
            </Card>

            <Card 
              className="bg-white/80 backdrop-blur-sm border-0 shadow-md hover:shadow-lg transition-all cursor-pointer group"
              onClick={() => setActiveView('blocked-contacts')}
            >
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-pink-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <UserX className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <h5 className="font-semibold text-gray-900">차단된 연락처</h5>
                    <p className="text-xs text-gray-500">차단된 사용자 관리</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
                </div>
              </CardContent>
            </Card>

            <Card 
              className="bg-white/80 backdrop-blur-sm border-0 shadow-md hover:shadow-lg transition-all cursor-pointer group"
              onClick={() => setActiveView('account-management')}
            >
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-red-600 to-red-700 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Trash2 className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <h5 className="font-semibold text-gray-900">계정 관리</h5>
                    <p className="text-xs text-gray-500">계정 삭제 및 관리</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* AI 기능 섹션 */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-gray-700 px-2">AI 기능</h4>
            
            <Card 
              className="bg-white/80 backdrop-blur-sm border-0 shadow-md hover:shadow-lg transition-all cursor-pointer group"
              onClick={() => setActiveView('ai-settings')}
            >
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Brain className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <h5 className="font-semibold text-gray-900">Smart Inbox 설정</h5>
                    <p className="text-xs text-gray-500">AI 필터 및 자동 분석 조정</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 일반 설정 섹션 */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-gray-700 px-2">일반</h4>
            
            <Card 
              className="bg-white/80 backdrop-blur-sm border-0 shadow-md hover:shadow-lg transition-all cursor-pointer group"
              onClick={() => setActiveView('language')}
            >
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Globe className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <h5 className="font-semibold text-gray-900">언어 설정</h5>
                    <p className="text-xs text-gray-500">메인 언어 선택</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 지원 섹션 */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-gray-700 px-2">지원</h4>
            
            <Card 
              className="bg-white/80 backdrop-blur-sm border-0 shadow-md hover:shadow-lg transition-all cursor-pointer group"
              onClick={() => setActiveView('help-support')}
            >
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-emerald-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <HelpCircle className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <h5 className="font-semibold text-gray-900">도움말 & 문의</h5>
                    <p className="text-xs text-gray-500">가이드, 문의, 약관</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 로그아웃 버튼 */}
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-md">
            <CardContent className="p-4">
              <Button 
                onClick={logout}
                variant="ghost" 
                className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 h-12"
              >
                <LogOut className="w-5 h-5 mr-3" />
                로그아웃
              </Button>
            </CardContent>
          </Card>

          {/* 푸터 */}
          <div className="text-center py-4">
            <p className="text-xs text-gray-400">Dovie Messenger v1.0</p>
          </div>
        </div>
      </div>

      {/* 프로필 사진 업로드 모달 */}
      <ProfilePhotoUpload
        isOpen={showProfilePhotoUpload}
        onClose={() => setShowProfilePhotoUpload(false)}
      />
    </div>
  );
}