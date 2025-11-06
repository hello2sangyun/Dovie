import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, Upload, User, Mail, Phone, Calendar, Mic } from "lucide-react";
import { useSwipeBack } from "@/hooks/useSwipeBack";

interface ProfileSettingsPageProps {
  onBack: () => void;
}

export default function ProfileSettingsPage({ onBack }: ProfileSettingsPageProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // 스와이프로 뒤로가기
  useSwipeBack({ onBack });
  
  const [formData, setFormData] = useState({
    username: user?.username || "",
    displayName: user?.displayName || "",
    email: user?.email || "",
    phoneNumber: user?.phoneNumber || "",
    birthday: user?.birthday || "",
  });

  const [allowVoiceBookmarks, setAllowVoiceBookmarks] = useState(
    user?.allowVoiceBookmarks ?? true
  );

  // Birthday state for year/month/day selects
  const [birthYear, setBirthYear] = useState<string>("");
  const [birthMonth, setBirthMonth] = useState<string>("");
  const [birthDay, setBirthDay] = useState<string>("");

  const getDaysInMonth = (year: number, month: number): number => {
    if (month === 2) {
      const isLeapYear = (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
      return isLeapYear ? 29 : 28;
    }
    return [4, 6, 9, 11].includes(month) ? 30 : 31;
  };

  const maxDays = birthYear && birthMonth 
    ? getDaysInMonth(parseInt(birthYear), parseInt(birthMonth))
    : 31;

  // Parse birthday into year/month/day when user data loads
  useEffect(() => {
    if (user?.birthday) {
      const date = new Date(user.birthday);
      setBirthYear(date.getFullYear().toString());
      setBirthMonth((date.getMonth() + 1).toString().padStart(2, '0'));
      setBirthDay(date.getDate().toString().padStart(2, '0'));
    }
  }, [user?.birthday]);

  useEffect(() => {
    if (birthDay && parseInt(birthDay) > maxDays) {
      setBirthDay(maxDays.toString().padStart(2, '0'));
    }
  }, [maxDays, birthDay]);

  // Update formData.birthday when year/month/day changes
  useEffect(() => {
    if (birthYear && birthMonth && birthDay) {
      const birthday = `${birthYear}-${birthMonth.padStart(2, '0')}-${birthDay.padStart(2, '0')}`;
      setFormData(prev => ({ ...prev, birthday }));
    }
  }, [birthYear, birthMonth, birthDay]);

  // Sync formData with user data when user changes
  useEffect(() => {
    if (user) {
      setFormData({
        username: user.username || "",
        displayName: user.displayName || "",
        email: user.email || "",
        phoneNumber: user.phoneNumber || "",
        birthday: user.birthday || "",
      });
      setAllowVoiceBookmarks(user.allowVoiceBookmarks ?? true);
    }
  }, [user]);

  const updateProfileMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await apiRequest("/api/auth/profile", "PATCH", data);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "프로필 업데이트에 실패했습니다.");
      }
      return response.json();
    },
    onSuccess: (data) => {
      // 즉시 캐시에 반영하여 리프레시 없이 화면에 표시
      queryClient.setQueryData(["/api/auth/me"], { user: data.user });
      // 그 다음 캐시 갱신으로 최신 상태 확인
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      alert("프로필이 성공적으로 업데이트되었습니다.");
    },
    onError: (error: Error) => {
      alert(error.message || "프로필 업데이트에 실패했습니다.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfileMutation.mutate(formData);
  };

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleVoiceBookmarksChange = async (checked: boolean) => {
    const previousValue = allowVoiceBookmarks;
    setAllowVoiceBookmarks(checked);
    try {
      const response = await apiRequest("/api/auth/profile", "PATCH", {
        allowVoiceBookmarks: checked
      });
      if (!response.ok) {
        throw new Error("Failed to update voice bookmarks setting");
      }
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    } catch (error) {
      console.error("Failed to update voice bookmarks setting:", error);
      setAllowVoiceBookmarks(previousValue);
    }
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
        <h1 className="text-lg font-semibold text-gray-900">개인정보 설정</h1>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 pb-24 space-y-6">


        {/* Personal Information Form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">개인 정보</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username" className="flex items-center text-sm font-medium">
                  <User className="h-4 w-4 mr-2 text-purple-600" />
                  아이디 (사용자명)
                </Label>
                <Input
                  id="username"
                  value={formData.username}
                  onChange={(e) => handleInputChange("username", e.target.value)}
                  placeholder="아이디를 입력하세요"
                />
                <p className="text-xs text-gray-500">다른 사람들이 당신을 찾을 때 사용하는 고유 아이디입니다</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="displayName" className="flex items-center text-sm font-medium">
                  <User className="h-4 w-4 mr-2 text-purple-600" />
                  표시 이름
                </Label>
                <Input
                  id="displayName"
                  value={formData.displayName}
                  onChange={(e) => handleInputChange("displayName", e.target.value)}
                  placeholder="표시 이름을 입력하세요"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phoneNumber" className="flex items-center text-sm font-medium">
                  <Phone className="h-4 w-4 mr-2 text-purple-600" />
                  전화번호
                </Label>
                <Input
                  id="phoneNumber"
                  value={formData.phoneNumber}
                  disabled
                  className="bg-gray-100 cursor-not-allowed"
                  placeholder="전화번호를 입력하세요"
                />
                <button 
                  type="button"
                  className="text-sm text-purple-600 hover:text-purple-700 font-medium"
                  onClick={() => {
                    // TODO: 전화번호 변경 모달 열기
                    alert("전화번호 변경 기능은 곧 추가됩니다");
                  }}
                >
                  전화번호 변경
                </button>
              </div>

              <div className="pt-4">
                <Button 
                  type="submit" 
                  className="w-full"
                  disabled={updateProfileMutation.isPending}
                >
                  {updateProfileMutation.isPending ? "업데이트 중..." : "변경사항 저장"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Voice Message Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center">
              <Mic className="h-4 w-4 mr-2 text-purple-600" />
              음성 메시지 설정
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-start justify-between space-x-4">
              <div className="flex-1 space-y-1">
                <Label htmlFor="voice-bookmarks" className="text-sm font-medium cursor-pointer">
                  다른 사람이 내 음성 메시지를 북마크할 수 있도록 허용
                </Label>
                <p className="text-xs text-gray-500">
                  허용하지 않으면 다른 사람이 북마크 요청을 할 수 있습니다
                </p>
              </div>
              <Switch
                id="voice-bookmarks"
                checked={allowVoiceBookmarks}
                onCheckedChange={handleVoiceBookmarksChange}
                data-testid="switch-voice-bookmarks"
              />
            </div>
          </CardContent>
        </Card>

        {/* Account Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">계정 정보</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-sm text-gray-600">가입일</span>
              <span className="text-sm font-medium">
                {user.createdAt ? new Date(user.createdAt).toLocaleDateString('ko-KR') : '정보 없음'}
              </span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-sm text-gray-600">계정 상태</span>
              <span className="text-sm font-medium text-green-600">활성</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}