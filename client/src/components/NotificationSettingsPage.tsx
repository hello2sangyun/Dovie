import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Bell, Volume2, Smartphone, MessageSquare, CheckCircle2, XCircle } from "lucide-react";
import { PushNotificationManager } from "./PushNotificationManager";
import { PushNotificationTester } from "./PushNotificationTester";
import { useSwipeBack } from "@/hooks/useSwipeBack";

interface NotificationSettingsPageProps {
  onBack: () => void;
}

const LOCALSTORAGE_KEY = "notification_settings";

interface LocalStorageSettings {
  messageNotifications: boolean;
  groupNotifications: boolean;
  mentionNotifications: boolean;
  locationChatNotifications: boolean;
  businessNotifications: boolean;
  vibration: boolean;
  showPreview: boolean;
  quietHours: boolean;
  quietStart: string;
  quietEnd: string;
}

export default function NotificationSettingsPage({ onBack }: NotificationSettingsPageProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // 스와이프로 뒤로가기
  useSwipeBack({ onBack });
  
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [settings, setSettings] = useState({
    notificationsEnabled: user?.notificationsEnabled ?? true,
    notificationSound: user?.notificationSound ?? "default",
    messageNotifications: true,
    groupNotifications: true,
    mentionNotifications: true,
    locationChatNotifications: true,
    businessNotifications: true,
    vibration: true,
    showPreview: true,
    quietHours: false,
    quietStart: "22:00",
    quietEnd: "08:00",
    muteAllNotifications: false,
    alwaysNotify: true,
  });

  const { data: backendSettings, isLoading } = useQuery({
    queryKey: ["/api/notification-settings"],
    enabled: !!user,
  });

  useEffect(() => {
    if (user && backendSettings) {
      setSettings(prev => ({
        ...prev,
        notificationsEnabled: user.notificationsEnabled ?? true,
        notificationSound: backendSettings.notificationSound || user.notificationSound || "default",
        showPreview: backendSettings.showPreview ?? true,
        quietStart: backendSettings.quietHoursStart || "22:00",
        quietEnd: backendSettings.quietHoursEnd || "08:00",
        quietHours: !!(backendSettings.quietHoursStart && backendSettings.quietHoursEnd),
        muteAllNotifications: backendSettings.muteAllNotifications ?? false,
        alwaysNotify: backendSettings.alwaysNotify ?? true,
      }));
      
      const savedLocalSettings = localStorage.getItem(LOCALSTORAGE_KEY);
      if (savedLocalSettings) {
        try {
          const parsed: LocalStorageSettings = JSON.parse(savedLocalSettings);
          setSettings(prev => ({ ...prev, ...parsed }));
        } catch (error) {
          console.error("Failed to parse local settings:", error);
        }
      }
    }
  }, [user, backendSettings]);

  const updateNotificationsMutation = useMutation({
    mutationFn: async (data: typeof settings) => {
      await apiRequest("/api/auth/notifications", "PATCH", {
        notificationsEnabled: data.notificationsEnabled,
        notificationSound: data.notificationSound,
      });
      
      const response = await apiRequest("/api/notification-settings", "POST", {
        notificationSound: data.notificationSound,
        showPreview: data.showPreview,
        quietHoursStart: data.quietHours ? data.quietStart : null,
        quietHoursEnd: data.quietHours ? data.quietEnd : null,
        muteAllNotifications: data.muteAllNotifications,
        alwaysNotify: data.alwaysNotify,
      });
      
      const localSettings: LocalStorageSettings = {
        messageNotifications: data.messageNotifications,
        groupNotifications: data.groupNotifications,
        mentionNotifications: data.mentionNotifications,
        locationChatNotifications: data.locationChatNotifications,
        businessNotifications: data.businessNotifications,
        vibration: data.vibration,
        showPreview: data.showPreview,
        quietHours: data.quietHours,
        quietStart: data.quietStart,
        quietEnd: data.quietEnd,
      };
      localStorage.setItem(LOCALSTORAGE_KEY, JSON.stringify(localSettings));
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notification-settings"] });
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
    },
    onError: () => {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    },
  });

  const handleSave = () => {
    updateNotificationsMutation.mutate(settings);
  };

  const handleToggle = (key: keyof typeof settings, value: boolean) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSelectChange = (key: keyof typeof settings, value: string) => {
    setSettings(prev => ({ ...prev, [key]: value }));
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
          data-testid="button-back"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-lg font-semibold text-gray-900">알림 설정</h1>
      </div>

      {/* Content - 모바일 Footer 하단 여백 확보 */}
      <div className="flex-1 overflow-y-auto p-4 pb-24 space-y-6">
        {/* Save Status Message */}
        {saveStatus !== 'idle' && (
          <div className={`flex items-center gap-2 p-3 rounded-lg ${
            saveStatus === 'success' 
              ? 'bg-green-50 text-green-700 border border-green-200' 
              : 'bg-red-50 text-red-700 border border-red-200'
          }`} data-testid="save-status-message">
            {saveStatus === 'success' ? (
              <>
                <CheckCircle2 className="h-5 w-5" />
                <span className="text-sm font-medium">알림 설정이 성공적으로 저장되었습니다.</span>
              </>
            ) : (
              <>
                <XCircle className="h-5 w-5" />
                <span className="text-sm font-medium">알림 설정 저장에 실패했습니다. 다시 시도해주세요.</span>
              </>
            )}
          </div>
        )}

        {/* General Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center">
              <Bell className="h-5 w-5 mr-2 text-purple-600" />
              일반 알림
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">모든 알림</Label>
                <p className="text-xs text-gray-500">앱의 모든 알림을 활성화/비활성화</p>
              </div>
              <Switch
                checked={settings.notificationsEnabled}
                onCheckedChange={(checked) => handleToggle("notificationsEnabled", checked)}
                data-testid="switch-notifications-enabled"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">모든 알림 음소거</Label>
                <p className="text-xs text-gray-500">모든 푸시 알림을 완전히 끄기</p>
              </div>
              <Switch
                checked={settings.muteAllNotifications}
                onCheckedChange={(checked) => handleToggle("muteAllNotifications", checked)}
                data-testid="switch-mute-all-notifications"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">항상 알림받기</Label>
                <p className="text-xs text-gray-500">앱 사용 중에도 알림 표시</p>
              </div>
              <Switch
                checked={settings.alwaysNotify}
                onCheckedChange={(checked) => handleToggle("alwaysNotify", checked)}
                disabled={!settings.notificationsEnabled || settings.muteAllNotifications}
                data-testid="switch-always-notify"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center">
                <Volume2 className="h-4 w-4 mr-2 text-purple-600" />
                알림 소리
              </Label>
              <Select
                value={settings.notificationSound}
                onValueChange={(value) => handleSelectChange("notificationSound", value)}
                disabled={!settings.notificationsEnabled || settings.muteAllNotifications}
              >
                <SelectTrigger data-testid="select-notification-sound">
                  <SelectValue placeholder="알림 소리 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">기본음</SelectItem>
                  <SelectItem value="bell">벨소리</SelectItem>
                  <SelectItem value="chime">차임</SelectItem>
                  <SelectItem value="notification">알림음</SelectItem>
                  <SelectItem value="silent">무음</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Message Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center">
              <MessageSquare className="h-5 w-5 mr-2 text-purple-600" />
              메시지 알림
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">개인 메시지</Label>
                <p className="text-xs text-gray-500">개인 채팅 메시지 알림</p>
              </div>
              <Switch
                checked={settings.messageNotifications}
                onCheckedChange={(checked) => handleToggle("messageNotifications", checked)}
                disabled={!settings.notificationsEnabled}
                data-testid="switch-message-notifications"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">그룹 메시지</Label>
                <p className="text-xs text-gray-500">그룹 채팅 메시지 알림</p>
              </div>
              <Switch
                checked={settings.groupNotifications}
                onCheckedChange={(checked) => handleToggle("groupNotifications", checked)}
                disabled={!settings.notificationsEnabled}
                data-testid="switch-group-notifications"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">멘션 알림</Label>
                <p className="text-xs text-gray-500">나를 언급하는 메시지 알림</p>
              </div>
              <Switch
                checked={settings.mentionNotifications}
                onCheckedChange={(checked) => handleToggle("mentionNotifications", checked)}
                disabled={!settings.notificationsEnabled}
                data-testid="switch-mention-notifications"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">주변챗 알림</Label>
                <p className="text-xs text-gray-500">위치 기반 채팅 알림</p>
              </div>
              <Switch
                checked={settings.locationChatNotifications}
                onCheckedChange={(checked) => handleToggle("locationChatNotifications", checked)}
                disabled={!settings.notificationsEnabled}
                data-testid="switch-location-chat-notifications"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">비즈니스 알림</Label>
                <p className="text-xs text-gray-500">비즈니스 관련 알림</p>
              </div>
              <Switch
                checked={settings.businessNotifications}
                onCheckedChange={(checked) => handleToggle("businessNotifications", checked)}
                disabled={!settings.notificationsEnabled}
                data-testid="switch-business-notifications"
              />
            </div>
          </CardContent>
        </Card>

        {/* App Behavior */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center">
              <Smartphone className="h-5 w-5 mr-2 text-purple-600" />
              앱 동작
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">진동</Label>
                <p className="text-xs text-gray-500">알림시 진동 사용</p>
              </div>
              <Switch
                checked={settings.vibration}
                onCheckedChange={(checked) => handleToggle("vibration", checked)}
                disabled={!settings.notificationsEnabled}
                data-testid="switch-vibration"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">메시지 미리보기</Label>
                <p className="text-xs text-gray-500">알림에서 메시지 내용 표시</p>
              </div>
              <Switch
                checked={settings.showPreview}
                onCheckedChange={(checked) => handleToggle("showPreview", checked)}
                disabled={!settings.notificationsEnabled}
                data-testid="switch-show-preview"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">방해금지 시간</Label>
                <p className="text-xs text-gray-500">지정된 시간에 알림 비활성화</p>
              </div>
              <Switch
                checked={settings.quietHours}
                onCheckedChange={(checked) => handleToggle("quietHours", checked)}
                disabled={!settings.notificationsEnabled}
                data-testid="switch-quiet-hours"
              />
            </div>

            {settings.quietHours && (
              <div className="ml-4 space-y-3 border-l-2 border-gray-200 pl-4">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">시작 시간</Label>
                  <input
                    type="time"
                    value={settings.quietStart}
                    onChange={(e) => handleSelectChange("quietStart", e.target.value)}
                    className="text-sm border rounded px-2 py-1"
                    data-testid="input-quiet-start"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-sm">종료 시간</Label>
                  <input
                    type="time"
                    value={settings.quietEnd}
                    onChange={(e) => handleSelectChange("quietEnd", e.target.value)}
                    className="text-sm border rounded px-2 py-1"
                    data-testid="input-quiet-end"
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Push Notification Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center">
              <Bell className="h-5 w-5 mr-2 text-purple-600" />
              푸시 알림 관리
            </CardTitle>
          </CardHeader>
          <CardContent>
            <PushNotificationManager />
          </CardContent>
        </Card>

        {/* iPhone PWA Push Notification Diagnostics */}
        <PushNotificationTester />

        {/* Save Button with extra bottom padding for mobile Footer */}
        <div className="pt-4 pb-24 mb-8">
          <Button 
            onClick={handleSave}
            className="w-full"
            disabled={updateNotificationsMutation.isPending}
            data-testid="button-save-settings"
          >
            {updateNotificationsMutation.isPending ? "저장 중..." : "설정 저장"}
          </Button>
        </div>

      </div>
    </div>
  );
}