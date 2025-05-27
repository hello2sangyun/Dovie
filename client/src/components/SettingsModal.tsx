import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Camera, QrCode, HelpCircle } from "lucide-react";

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

export default function SettingsModal({ open, onClose }: SettingsModalProps) {
  const { user, setUser } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [displayName, setDisplayName] = useState(user?.displayName || "");
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber || "");
  const [birthday, setBirthday] = useState(user?.birthday || "");
  const [language, setLanguage] = useState(user?.language || "ko");
  const [notificationsEnabled, setNotificationsEnabled] = useState(user?.notificationsEnabled ?? true);
  const [notificationSound, setNotificationSound] = useState(user?.notificationSound || "default");

  const updateUserMutation = useMutation({
    mutationFn: async (updates: any) => {
      const response = await apiRequest("PUT", `/api/users/${user!.id}`, updates);
      return response.json();
    },
    onSuccess: (data) => {
      setUser(data.user);
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({
        title: "설정 저장 완료",
        description: "사용자 설정이 업데이트되었습니다.",
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "설정 저장 실패",
        description: "다시 시도해주세요.",
      });
    },
  });

  const handleSave = () => {
    updateUserMutation.mutate({
      displayName,
      phoneNumber: phoneNumber || null,
      birthday: birthday || null,
      language,
      notificationsEnabled,
      notificationSound,
    });
  };

  const handleClose = () => {
    // Reset to original values
    setDisplayName(user?.displayName || "");
    setPhoneNumber(user?.phoneNumber || "");
    setBirthday(user?.birthday || "");
    setLanguage(user?.language || "ko");
    setNotificationsEnabled(user?.notificationsEnabled ?? true);
    setNotificationSound(user?.notificationSound || "default");
    onClose();
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(word => word.charAt(0).toUpperCase()).join('').slice(0, 2);
  };

  // Mock storage usage (would come from API in real app)
  const storageUsed = 2.3;
  const storageTotal = 5.0;
  const storagePercentage = (storageUsed / storageTotal) * 100;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">설정</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Profile Section */}
          <div>
            <h4 className="font-medium text-gray-900 mb-4">프로필</h4>
            <div className="flex items-center space-x-4 mb-4">
              <div className="w-16 h-16 purple-gradient rounded-full flex items-center justify-center text-white text-xl font-semibold">
                {getInitials(displayName)}
              </div>
              <Button variant="outline" disabled>
                <Camera className="mr-2 h-4 w-4" />
                프로필 사진 변경 (준비중)
              </Button>
            </div>
            
            <div className="space-y-3">
              <div>
                <Label htmlFor="displayName">사용자명</Label>
                <Input
                  id="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="phoneNumber">전화번호</Label>
                <Input
                  id="phoneNumber"
                  type="tel"
                  placeholder="전화번호를 입력하세요"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="birthday">생일</Label>
                <Input
                  id="birthday"
                  type="date"
                  value={birthday}
                  onChange={(e) => setBirthday(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
          </div>

          {/* QR Code Section */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-3">QR 코드</h4>
            <div className="flex items-center justify-center mb-3">
              <div className="w-32 h-32 bg-white border-2 border-gray-200 rounded-lg flex items-center justify-center">
                <QrCode className="h-16 w-16 text-gray-400" />
              </div>
            </div>
            <div className="flex space-x-2">
              <Button variant="outline" className="flex-1" disabled>
                QR 생성 (준비중)
              </Button>
              <Button variant="outline" className="flex-1" disabled>
                QR 스캔 (준비중)
              </Button>
            </div>
          </div>

          {/* Notification Settings */}
          <div>
            <h4 className="font-medium text-gray-900 mb-4">알림 및 소리</h4>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="notifications">푸시 알림</Label>
                <Switch
                  id="notifications"
                  checked={notificationsEnabled}
                  onCheckedChange={setNotificationsEnabled}
                />
              </div>
              
              <div>
                <Label htmlFor="notificationSound">알림 소리</Label>
                <Select value={notificationSound} onValueChange={setNotificationSound}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">기본 소리</SelectItem>
                    <SelectItem value="bell1">벨소리 1</SelectItem>
                    <SelectItem value="bell2">벨소리 2</SelectItem>
                    <SelectItem value="none">무음</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Storage Info */}
          <div>
            <h4 className="font-medium text-gray-900 mb-4">저장소</h4>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-700">사용 중</span>
                <span className="text-sm font-medium text-gray-900">
                  {storageUsed} GB / {storageTotal} GB
                </span>
              </div>
              <Progress value={storagePercentage} className="mb-3" />
              <Button className="w-full purple-gradient hover:purple-gradient-hover" disabled>
                용량 업그레이드 (준비중)
              </Button>
            </div>
          </div>

          {/* Language Settings */}
          <div>
            <h4 className="font-medium text-gray-900 mb-4">언어 설정</h4>
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ko">한국어</SelectItem>
                <SelectItem value="en">English</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Support */}
          <div>
            <Button variant="outline" className="w-full" disabled>
              <HelpCircle className="mr-2 h-4 w-4" />
              질문하기 (준비중)
            </Button>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3 pt-4 border-t">
            <Button
              variant="outline"
              className="flex-1"
              onClick={handleClose}
              disabled={updateUserMutation.isPending}
            >
              취소
            </Button>
            <Button
              className="flex-1 purple-gradient hover:purple-gradient-hover"
              onClick={handleSave}
              disabled={updateUserMutation.isPending}
            >
              {updateUserMutation.isPending ? "저장 중..." : "저장"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
