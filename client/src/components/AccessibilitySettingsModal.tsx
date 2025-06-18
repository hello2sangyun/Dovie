import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Eye, Ear, Hand, Settings, Volume2, Vibrate } from "lucide-react";

interface AccessibilitySettings {
  visualRecordingMode: boolean;
  highContrastMode: boolean;
  reducedMotion: boolean;
  largeButtons: boolean;
  hapticFeedback: boolean;
  screenReaderMode: boolean;
  voiceGuidance: boolean;
  keyboardNavigation: boolean;
}

interface AccessibilitySettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AccessibilitySettings;
  onSettingsChange: (settings: AccessibilitySettings) => void;
}

const defaultSettings: AccessibilitySettings = {
  visualRecordingMode: false,
  highContrastMode: false,
  reducedMotion: false,
  largeButtons: false,
  hapticFeedback: true,
  screenReaderMode: false,
  voiceGuidance: false,
  keyboardNavigation: true,
};

export default function AccessibilitySettingsModal({
  isOpen,
  onClose,
  settings,
  onSettingsChange
}: AccessibilitySettingsModalProps) {
  const [localSettings, setLocalSettings] = useState<AccessibilitySettings>(settings);

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  const handleSettingChange = (key: keyof AccessibilitySettings, value: boolean) => {
    const newSettings = { ...localSettings, [key]: value };
    setLocalSettings(newSettings);
    onSettingsChange(newSettings);
  };

  const resetToDefaults = () => {
    setLocalSettings(defaultSettings);
    onSettingsChange(defaultSettings);
  };

  const SettingItem = ({ 
    icon: Icon, 
    title, 
    description, 
    settingKey 
  }: {
    icon: any;
    title: string;
    description: string;
    settingKey: keyof AccessibilitySettings;
  }) => (
    <div className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50">
      <Icon className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
      <div className="flex-1 space-y-1">
        <Label 
          htmlFor={settingKey}
          className="text-sm font-medium cursor-pointer"
        >
          {title}
        </Label>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch
        id={settingKey}
        checked={localSettings[settingKey]}
        onCheckedChange={(checked) => handleSettingChange(settingKey, checked)}
        aria-label={`${title} 설정 토글`}
      />
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            접근성 설정
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Visual Accessibility */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Eye className="h-4 w-4" />
                시각 접근성
              </CardTitle>
              <CardDescription>
                시각적 피드백과 표시 방식을 조정합니다
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <SettingItem
                icon={Eye}
                title="음성 녹음 시각 모드"
                description="음성 녹음 중 파형, 음성 레벨, 시각적 피드백을 표시합니다"
                settingKey="visualRecordingMode"
              />
              <SettingItem
                icon={Eye}
                title="고대비 모드"
                description="더 높은 대비로 텍스트와 버튼의 가독성을 향상시킵니다"
                settingKey="highContrastMode"
              />
              <SettingItem
                icon={Eye}
                title="큰 버튼 모드"
                description="모든 버튼과 터치 영역을 더 크게 표시합니다"
                settingKey="largeButtons"
              />
            </CardContent>
          </Card>

          {/* Motion and Animation */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Hand className="h-4 w-4" />
                동작 및 애니메이션
              </CardTitle>
              <CardDescription>
                움직임과 애니메이션 효과를 조정합니다
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <SettingItem
                icon={Hand}
                title="동작 효과 줄이기"
                description="애니메이션과 화면 전환 효과를 최소화합니다"
                settingKey="reducedMotion"
              />
              <SettingItem
                icon={Vibrate}
                title="햅틱 피드백"
                description="터치 시 진동 피드백을 제공합니다 (모바일)"
                settingKey="hapticFeedback"
              />
            </CardContent>
          </Card>

          {/* Audio and Voice */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Ear className="h-4 w-4" />
                청각 접근성
              </CardTitle>
              <CardDescription>
                음성 안내와 청각적 피드백을 설정합니다
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <SettingItem
                icon={Volume2}
                title="음성 안내"
                description="주요 동작과 상태를 음성으로 안내합니다"
                settingKey="voiceGuidance"
              />
              <SettingItem
                icon={Ear}
                title="스크린 리더 최적화"
                description="스크린 리더 사용자를 위한 추가 정보를 제공합니다"
                settingKey="screenReaderMode"
              />
            </CardContent>
          </Card>

          {/* Navigation */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Hand className="h-4 w-4" />
                탐색 및 조작
              </CardTitle>
              <CardDescription>
                키보드 탐색과 조작 방식을 설정합니다
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <SettingItem
                icon={Hand}
                title="키보드 탐색 강화"
                description="키보드만으로 모든 기능을 사용할 수 있도록 합니다"
                settingKey="keyboardNavigation"
              />
            </CardContent>
          </Card>

          <Separator />

          {/* Action Buttons */}
          <div className="flex justify-between items-center">
            <Button 
              variant="outline" 
              onClick={resetToDefaults}
              aria-label="기본 설정으로 초기화"
            >
              기본값으로 초기화
            </Button>
            
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>
                취소
              </Button>
              <Button onClick={onClose}>
                완료
              </Button>
            </div>
          </div>

          {/* Accessibility Information */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-6">
              <div className="text-sm text-blue-800 space-y-2">
                <h4 className="font-medium">접근성 도움말</h4>
                <ul className="space-y-1 text-xs">
                  <li>• 설정은 자동으로 저장되며 다음 방문 시에도 유지됩니다</li>
                  <li>• 시각 장애가 있는 경우 음성 안내 모드를 활성화하세요</li>
                  <li>• 청각 장애가 있는 경우 시각적 피드백 모드를 활성화하세요</li>
                  <li>• 운동 장애가 있는 경우 큰 버튼 모드를 활성화하세요</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export { type AccessibilitySettings };