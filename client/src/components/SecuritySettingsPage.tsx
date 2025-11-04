import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Shield, Lock, Eye, EyeOff, Key, Smartphone } from "lucide-react";
import { useSwipeBack } from "@/hooks/useSwipeBack";

interface SecuritySettingsPageProps {
  onBack: () => void;
}

export default function SecuritySettingsPage({ onBack }: SecuritySettingsPageProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // 스와이프로 뒤로가기
  useSwipeBack({ onBack });
  
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [securitySettings, setSecuritySettings] = useState({
    twoFactorAuth: false,
    biometricAuth: false,
    sessionTimeout: "30",
    loginNotifications: true,
    suspiciousActivityAlerts: true,
  });

  const changePasswordMutation = useMutation({
    mutationFn: async (data: typeof passwordForm) => {
      const response = await apiRequest("/api/auth/change-password", "POST", data);
      return response.json();
    },
    onSuccess: () => {
      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    },
    onError: (error: any) => {
    },
  });

  const updateSecurityMutation = useMutation({
    mutationFn: async (data: typeof securitySettings) => {
      const response = await apiRequest("/api/auth/security", "PATCH", data);
      return response.json();
    },
    onSuccess: () => {
    },
    onError: () => {
    },
  });

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      return;
    }

    changePasswordMutation.mutate(passwordForm);
  };

  const handleSecuritySave = () => {
    updateSecurityMutation.mutate(securitySettings);
  };

  const handlePasswordInputChange = (field: keyof typeof passwordForm, value: string) => {
    setPasswordForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSecurityToggle = (key: keyof typeof securitySettings, value: boolean | string) => {
    setSecuritySettings(prev => ({ ...prev, [key]: value }));
  };

  if (!user) return null;

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex items-center px-4 py-3 pt-[calc(0.75rem+var(--safe-area-inset-top))] border-b border-gray-200 flex-shrink-0">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="mr-2 h-8 w-8 p-0"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-lg font-semibold text-gray-900">보안 및 개인정보</h1>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 pb-24 space-y-6">
        {/* Password Change */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center">
              <Lock className="h-5 w-5 mr-2 text-purple-600" />
              비밀번호 변경
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">현재 비밀번호</Label>
                <div className="relative">
                  <Input
                    id="currentPassword"
                    type={showCurrentPassword ? "text" : "password"}
                    value={passwordForm.currentPassword}
                    onChange={(e) => handlePasswordInputChange("currentPassword", e.target.value)}
                    placeholder="현재 비밀번호 입력"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  >
                    {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword">새 비밀번호</Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showNewPassword ? "text" : "password"}
                    value={passwordForm.newPassword}
                    onChange={(e) => handlePasswordInputChange("newPassword", e.target.value)}
                    placeholder="새 비밀번호 입력 (최소 6자)"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                  >
                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">새 비밀번호 확인</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={passwordForm.confirmPassword}
                    onChange={(e) => handlePasswordInputChange("confirmPassword", e.target.value)}
                    placeholder="새 비밀번호 다시 입력"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full"
                disabled={changePasswordMutation.isPending}
              >
                {changePasswordMutation.isPending ? "변경 중..." : "비밀번호 변경"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Two-Factor Authentication */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center">
              <Key className="h-5 w-5 mr-2 text-purple-600" />
              2단계 인증
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">2단계 인증 활성화</Label>
                <p className="text-xs text-gray-500">로그인시 추가 보안 코드 요구</p>
              </div>
              <Switch
                checked={securitySettings.twoFactorAuth}
                onCheckedChange={(checked) => handleSecurityToggle("twoFactorAuth", checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">생체 인증</Label>
                <p className="text-xs text-gray-500">지문 또는 얼굴 인식으로 로그인</p>
              </div>
              <Switch
                checked={securitySettings.biometricAuth}
                onCheckedChange={(checked) => handleSecurityToggle("biometricAuth", checked)}
              />
            </div>

            {securitySettings.twoFactorAuth && (
              <div className="ml-4 p-3 bg-blue-50 rounded-lg border-l-4 border-blue-400">
                <p className="text-sm text-blue-800">
                  2단계 인증을 설정하려면 인증 앱(Google Authenticator, Authy 등)이 필요합니다.
                </p>
                <Button variant="outline" size="sm" className="mt-2">
                  QR 코드 생성
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Session & Login Security */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center">
              <Smartphone className="h-5 w-5 mr-2 text-purple-600" />
              세션 및 로그인 보안
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">세션 만료 시간 (분)</Label>
              <select
                value={securitySettings.sessionTimeout}
                onChange={(e) => handleSecurityToggle("sessionTimeout", e.target.value)}
                className="w-full p-2 border rounded-md text-sm"
              >
                <option value="15">15분</option>
                <option value="30">30분</option>
                <option value="60">1시간</option>
                <option value="120">2시간</option>
                <option value="0">만료 없음</option>
              </select>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">로그인 알림</Label>
                <p className="text-xs text-gray-500">새 기기에서 로그인시 알림</p>
              </div>
              <Switch
                checked={securitySettings.loginNotifications}
                onCheckedChange={(checked) => handleSecurityToggle("loginNotifications", checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">의심스러운 활동 경고</Label>
                <p className="text-xs text-gray-500">비정상적인 로그인 시도시 알림</p>
              </div>
              <Switch
                checked={securitySettings.suspiciousActivityAlerts}
                onCheckedChange={(checked) => handleSecurityToggle("suspiciousActivityAlerts", checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Account Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center">
              <Shield className="h-5 w-5 mr-2 text-purple-600" />
              계정 보안 정보
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-sm text-gray-600">마지막 로그인</span>
              <span className="text-sm font-medium">
                {new Date(user.lastSeen || new Date()).toLocaleString('ko-KR')}
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-sm text-gray-600">활성 세션</span>
              <span className="text-sm font-medium text-green-600">1개</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-sm text-gray-600">계정 보안 수준</span>
              <span className="text-sm font-medium text-yellow-600">보통</span>
            </div>
          </CardContent>
        </Card>

        {/* Save Security Settings */}
        <div className="pt-4">
          <Button 
            onClick={handleSecuritySave}
            className="w-full"
            disabled={updateSecurityMutation.isPending}
          >
            {updateSecurityMutation.isPending ? "저장 중..." : "보안 설정 저장"}
          </Button>
        </div>
      </div>
    </div>
  );
}