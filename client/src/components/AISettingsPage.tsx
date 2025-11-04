import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Sparkles, Brain, Filter, Zap } from "lucide-react";

interface AISettingsPageProps {
  onBack: () => void;
}

interface AIPreferences {
  smartInboxEnabled: boolean;
  analysisLevel: 'simple' | 'standard' | 'detailed';
  categories: {
    invoices: boolean;
    reservations: boolean;
    events: boolean;
    promotions: boolean;
    updates: boolean;
    social: boolean;
    news: boolean;
    packages: boolean;
  };
}

const defaultPreferences: AIPreferences = {
  smartInboxEnabled: true,
  analysisLevel: 'standard',
  categories: {
    invoices: true,
    reservations: true,
    events: true,
    promotions: true,
    updates: true,
    social: true,
    news: true,
    packages: true,
  }
};

export default function AISettingsPage({ onBack }: AISettingsPageProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const [preferences, setPreferences] = useState<AIPreferences>(defaultPreferences);

  useEffect(() => {
    if (user?.aiPreferences) {
      setPreferences(prev => ({
        ...prev,
        ...user.aiPreferences as AIPreferences
      }));
    }
  }, [user]);

  const updateAIPreferencesMutation = useMutation({
    mutationFn: async (data: AIPreferences) => {
      const response = await apiRequest("/api/auth/ai-preferences", "PATCH", { aiPreferences: data });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "AI 설정 업데이트에 실패했습니다.");
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["/api/auth/me"], { user: data.user });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    },
    onError: (error: Error) => {
      alert(error.message || "AI 설정 업데이트에 실패했습니다.");
    },
  });

  const handleToggleSmartInbox = (checked: boolean) => {
    const newPrefs = { ...preferences, smartInboxEnabled: checked };
    setPreferences(newPrefs);
    updateAIPreferencesMutation.mutate(newPrefs);
  };

  const handleAnalysisLevelChange = (value: string) => {
    const newPrefs = { ...preferences, analysisLevel: value as 'simple' | 'standard' | 'detailed' };
    setPreferences(newPrefs);
    updateAIPreferencesMutation.mutate(newPrefs);
  };

  const handleCategoryToggle = (category: keyof AIPreferences['categories'], checked: boolean) => {
    const newPrefs = {
      ...preferences,
      categories: {
        ...preferences.categories,
        [category]: checked
      }
    };
    setPreferences(newPrefs);
    updateAIPreferencesMutation.mutate(newPrefs);
  };

  if (!user) return null;

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="flex items-center px-4 py-3 pt-[calc(0.75rem+var(--safe-area-inset-top))] bg-white border-b border-gray-200 flex-shrink-0">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="mr-2 h-8 w-8 p-0"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-lg font-semibold text-gray-900">AI 기능 설정</h1>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 pb-24 space-y-4">
        {/* Smart Inbox Toggle */}
        <Card className="bg-white border border-gray-200">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center">
              <Sparkles className="h-5 w-5 mr-2 text-purple-600" />
              Smart Inbox
            </CardTitle>
            <CardDescription>
              AI가 메시지를 자동으로 분석하고 중요한 정보를 추출합니다
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="smart-inbox" className="text-base">Smart Inbox 활성화</Label>
                <p className="text-sm text-gray-500">메시지에서 자동으로 중요 정보 감지</p>
              </div>
              <Switch
                id="smart-inbox"
                checked={preferences.smartInboxEnabled}
                onCheckedChange={handleToggleSmartInbox}
                data-testid="switch-smart-inbox"
              />
            </div>
          </CardContent>
        </Card>

        {/* Analysis Level */}
        {preferences.smartInboxEnabled && (
          <Card className="bg-white border border-gray-200">
            <CardHeader>
              <CardTitle className="text-base font-semibold flex items-center">
                <Brain className="h-5 w-5 mr-2 text-purple-600" />
                AI 분석 레벨
              </CardTitle>
              <CardDescription>
                메시지 분석의 상세도를 조정합니다
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Select value={preferences.analysisLevel} onValueChange={handleAnalysisLevelChange}>
                <SelectTrigger data-testid="select-analysis-level">
                  <SelectValue placeholder="분석 레벨 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="simple">간단 - 기본 정보만 추출</SelectItem>
                  <SelectItem value="standard">표준 - 균형잡힌 분석 (권장)</SelectItem>
                  <SelectItem value="detailed">상세 - 모든 정보 상세 분석</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500 mt-2">
                {preferences.analysisLevel === 'simple' && '빠르고 가볍게 핵심 정보만 추출합니다'}
                {preferences.analysisLevel === 'standard' && '대부분의 경우에 적합한 균형잡힌 분석을 제공합니다'}
                {preferences.analysisLevel === 'detailed' && '모든 세부 정보를 포함한 완전한 분석을 수행합니다'}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Category Filters */}
        {preferences.smartInboxEnabled && (
          <Card className="bg-white border border-gray-200">
            <CardHeader>
              <CardTitle className="text-base font-semibold flex items-center">
                <Filter className="h-5 w-5 mr-2 text-purple-600" />
                필터 카테고리
              </CardTitle>
              <CardDescription>
                감지할 메시지 유형을 선택하세요
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {Object.entries({
                invoices: { label: '송장/영수증', icon: '💰', description: '결제 정보 및 영수증' },
                reservations: { label: '예약', icon: '📅', description: '호텔, 항공권, 레스토랑 예약' },
                events: { label: '이벤트', icon: '🎉', description: '일정 및 이벤트 초대' },
                promotions: { label: '프로모션', icon: '🏷️', description: '할인 및 마케팅 메시지' },
                updates: { label: '업데이트', icon: '🔔', description: '앱 및 서비스 업데이트' },
                social: { label: '소셜', icon: '👥', description: '소셜 미디어 알림' },
                news: { label: '뉴스', icon: '📰', description: '뉴스레터 및 기사' },
                packages: { label: '배송', icon: '📦', description: '배송 및 추적 정보' },
              }).map(([key, { label, icon, description }]) => (
                <div key={key} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">{icon}</span>
                    <div>
                      <Label htmlFor={`category-${key}`} className="text-sm font-medium">
                        {label}
                      </Label>
                      <p className="text-xs text-gray-500">{description}</p>
                    </div>
                  </div>
                  <Switch
                    id={`category-${key}`}
                    checked={preferences.categories[key as keyof AIPreferences['categories']]}
                    onCheckedChange={(checked) => handleCategoryToggle(key as keyof AIPreferences['categories'], checked)}
                    data-testid={`switch-category-${key}`}
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Performance Tip */}
        <Card className="bg-white border border-gray-200">
          <CardContent className="p-4">
            <div className="flex items-start space-x-3">
              <Zap className="h-5 w-5 text-purple-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-semibold text-gray-900 mb-1">팁</h4>
                <p className="text-sm text-gray-600">
                  필요한 카테고리만 활성화하면 더 빠르고 정확한 분석이 가능합니다.
                  표준 레벨은 대부분의 사용자에게 가장 적합합니다.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
