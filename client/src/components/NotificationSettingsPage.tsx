import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Bell, Volume2, Smartphone, MessageSquare } from "lucide-react";
import { PushNotificationManager } from "./PushNotificationManager";
import { PushNotificationTester } from "./PushNotificationTester";

interface NotificationSettingsPageProps {
  onBack: () => void;
}

export default function NotificationSettingsPage({ onBack }: NotificationSettingsPageProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
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
  });

  const updateNotificationsMutation = useMutation({
    mutationFn: async (data: typeof settings) => {
      const response = await apiRequest("/api/auth/notifications", "PATCH", {
        notificationsEnabled: data.notificationsEnabled,
        notificationSound: data.notificationSound,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({
        title: "알림 설정 저장",
        description: "알림 설정이 성공적으로 저장되었습니다.",
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "저장 실패",
        description: "알림 설정 저장 중 오류가 발생했습니다.",
      });
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
      <div className="flex items-center px-4 py-3 border-b border-gray-200 flex-shrink-0">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="mr-2 h-8 w-8 p-0"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-lg font-semibold text-gray-900">알림 설정</h1>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6" style={{ maxHeight: 'calc(100vh - 120px)' }}>
        {/* General Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center">
              <Bell className="h-5 w-5 mr-2 text-orange-600" />
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
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center">
                <Volume2 className="h-4 w-4 mr-2 text-gray-500" />
                알림 소리
              </Label>
              <Select
                value={settings.notificationSound}
                onValueChange={(value) => handleSelectChange("notificationSound", value)}
                disabled={!settings.notificationsEnabled}
              >
                <SelectTrigger>
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
              <MessageSquare className="h-5 w-5 mr-2 text-blue-600" />
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
              />
            </div>
          </CardContent>
        </Card>

        {/* App Behavior */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center">
              <Smartphone className="h-5 w-5 mr-2 text-green-600" />
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
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-sm">종료 시간</Label>
                  <input
                    type="time"
                    value={settings.quietEnd}
                    onChange={(e) => handleSelectChange("quietEnd", e.target.value)}
                    className="text-sm border rounded px-2 py-1"
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
              <Bell className="h-5 w-5 mr-2 text-blue-600" />
              푸시 알림 관리
            </CardTitle>
          </CardHeader>
          <CardContent>
            <PushNotificationManager />
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="pt-4">
          <Button 
            onClick={handleSave}
            className="w-full"
            disabled={updateNotificationsMutation.isPending}
          >
            {updateNotificationsMutation.isPending ? "저장 중..." : "설정 저장"}
          </Button>
        </div>

        {/* Push Notification Testing Interface */}
        <div className="pt-8">
          <PushNotificationTester />
        </div>
      </div>
    </div>
  );
}