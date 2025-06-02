import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  UserX
} from "lucide-react";
import { getInitials, getAvatarColor } from "@/lib/utils";
import BusinessCard from "./BusinessCard";
import BusinessProfile from "./BusinessProfile";
import BlockedContactsPage from "./BlockedContactsPage";
import ProfileSettingsPage from "./ProfileSettingsPage";
import NotificationSettingsPage from "./NotificationSettingsPage";
import SecuritySettingsPage from "./SecuritySettingsPage";
import SimpleSpacePage from "../pages/SimpleSpacePage";

interface ModernSettingsPageProps {
  isMobile?: boolean;
}

export default function ModernSettingsPage({ isMobile = false }: ModernSettingsPageProps) {
  const { user, logout } = useAuth();
  const [activeView, setActiveView] = useState<'main' | 'business-card' | 'space' | 'blocked-contacts' | 'profile' | 'notifications' | 'security'>('main');

  if (!user) return null;

  if (activeView === 'business-card') {
    return (
      <div className="flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
          <BusinessCard onBack={() => setActiveView('main')} />
        </div>
      </div>
    );
  }

  if (activeView === 'space') {
    return (
      <div className="flex-1 overflow-hidden">
        <SimpleSpacePage />
      </div>
    );
  }

  if (activeView === 'blocked-contacts') {
    return (
      <div className="flex-1 overflow-hidden">
        <BlockedContactsPage onBack={() => setActiveView('main')} />
      </div>
    );
  }

  if (activeView === 'profile') {
    return (
      <div className="flex-1 overflow-hidden">
        <ProfileSettingsPage onBack={() => setActiveView('main')} />
      </div>
    );
  }

  if (activeView === 'notifications') {
    return (
      <div className="flex-1 overflow-hidden">
        <NotificationSettingsPage onBack={() => setActiveView('main')} />
      </div>
    );
  }

  if (activeView === 'security') {
    return (
      <div className="flex-1 overflow-hidden">
        <SecuritySettingsPage onBack={() => setActiveView('main')} />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <div className="max-w-2xl mx-auto p-4 space-y-4 min-h-full">
          {/* 헤더 */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                <Settings className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">설정</h1>
                <p className="text-sm text-gray-500">계정 및 프로필 관리</p>
              </div>
            </div>
            <Badge variant="secondary" className="bg-white/80 backdrop-blur-sm">
              <Sparkles className="w-3 h-3 mr-1" />
              Dovie
            </Badge>
          </div>

          {/* 프로필 카드 */}
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <Avatar className="w-16 h-16 border-4 border-white shadow-lg">
                    <AvatarImage src={user.profilePicture || undefined} />
                    <AvatarFallback className={`${getAvatarColor(user.displayName)} text-white font-bold text-lg`}>
                      {getInitials(user.displayName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center shadow-md">
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

          {/* 비즈니스 섹션 */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-gray-700 px-2">비즈니스</h4>
            
            <Card 
              className="bg-white/80 backdrop-blur-sm border-0 shadow-md hover:shadow-lg transition-all cursor-pointer group"
              onClick={() => setActiveView('business-card')}
            >
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <CreditCard className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <h5 className="font-semibold text-gray-900">디지털 명함</h5>
                    <p className="text-xs text-gray-500">명함 정보 관리 및 공유</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
                </div>
              </CardContent>
            </Card>

            <Card 
              className="bg-white/80 backdrop-blur-sm border-0 shadow-md hover:shadow-lg transition-all cursor-pointer group"
              onClick={() => setActiveView('space')}
            >
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Building2 className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <h5 className="font-semibold text-gray-900">Business Space</h5>
                    <p className="text-xs text-gray-500">비즈니스 네트워킹 및 피드</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
                </div>
              </CardContent>
            </Card>
          </div>

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
    </div>
  );
}