import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, Globe, Check } from "lucide-react";

interface LanguageSettingsPageProps {
  onBack: () => void;
}

const LANGUAGES = [
  { code: 'ko', name: '한국어', nativeName: '한국어', flag: '🇰🇷' },
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵' },
  { code: 'zh', name: 'Chinese', nativeName: '中文', flag: '🇨🇳' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷' },
];

export default function LanguageSettingsPage({ onBack }: LanguageSettingsPageProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedLanguage, setSelectedLanguage] = useState(user?.language || 'ko');

  useEffect(() => {
    if (user?.language) {
      setSelectedLanguage(user.language);
    }
  }, [user]);

  const updateLanguageMutation = useMutation({
    mutationFn: async (language: string) => {
      const response = await apiRequest("/api/auth/language", "PATCH", { language });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "언어 설정 업데이트에 실패했습니다.");
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["/api/auth/me"], { user: data.user });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    },
    onError: (error: Error) => {
      alert(error.message || "언어 설정 업데이트에 실패했습니다.");
      setSelectedLanguage(user?.language || 'ko');
    },
  });

  const handleLanguageSelect = (languageCode: string) => {
    setSelectedLanguage(languageCode);
    updateLanguageMutation.mutate(languageCode);
  };

  if (!user) return null;

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <div className="flex items-center px-4 py-3 bg-white/80 backdrop-blur-sm border-b border-gray-200 flex-shrink-0">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="mr-2 h-8 w-8 p-0"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-lg font-semibold text-gray-900">언어 설정</h1>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 pb-24 space-y-6">
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-md">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center">
              <Globe className="h-5 w-5 mr-2 text-blue-600" />
              메인 언어 선택
            </CardTitle>
            <CardDescription>
              앱에서 사용할 기본 언어를 선택하세요
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                onClick={() => handleLanguageSelect(lang.code)}
                disabled={updateLanguageMutation.isPending}
                className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                  selectedLanguage === lang.code
                    ? 'border-purple-500 bg-purple-50'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                } ${updateLanguageMutation.isPending ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                data-testid={`button-language-${lang.code}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className="text-3xl">{lang.flag}</span>
                    <div>
                      <div className="font-semibold text-gray-900">{lang.nativeName}</div>
                      <div className="text-sm text-gray-500">{lang.name}</div>
                    </div>
                  </div>
                  {selectedLanguage === lang.code && (
                    <div className="flex items-center justify-center w-6 h-6 bg-purple-500 rounded-full">
                      <Check className="h-4 w-4 text-white" />
                    </div>
                  )}
                </div>
              </button>
            ))}
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 shadow-md">
          <CardContent className="p-4">
            <div className="flex items-start space-x-3">
              <Globe className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-semibold text-blue-900 mb-1">언어 변경 안내</h4>
                <p className="text-sm text-blue-700">
                  언어를 변경하면 앱의 메뉴, 버튼, 메시지 등이 선택한 언어로 표시됩니다.
                  사용자가 보낸 메시지는 영향을 받지 않습니다.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
