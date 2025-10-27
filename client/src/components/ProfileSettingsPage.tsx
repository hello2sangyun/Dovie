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
import { ArrowLeft, Upload, User, Mail, Phone, Calendar, Mic } from "lucide-react";

interface ProfileSettingsPageProps {
  onBack: () => void;
}

export default function ProfileSettingsPage({ onBack }: ProfileSettingsPageProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
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

  const updateProfileMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await apiRequest("/api/auth/profile", "PATCH", data);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "프로필 업데이트에 실패했습니다.");
      }
      return response.json();
    },
    onSuccess: () => {
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
      <div className="flex items-center px-4 py-3 border-b border-gray-200 flex-shrink-0">
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
      <div className="flex-1 overflow-y-auto p-4 space-y-6" style={{ maxHeight: 'calc(100vh - 120px)' }}>


        {/* Personal Information Form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">개인 정보</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username" className="flex items-center text-sm font-medium">
                  <User className="h-4 w-4 mr-2 text-gray-500" />
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
                  <User className="h-4 w-4 mr-2 text-gray-500" />
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
                <Label htmlFor="email" className="flex items-center text-sm font-medium">
                  <Mail className="h-4 w-4 mr-2 text-gray-500" />
                  이메일
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  disabled
                  className="bg-gray-100 cursor-not-allowed"
                  placeholder="이메일을 입력하세요"
                />
                <p className="text-xs text-gray-500">보안을 위해 이메일은 변경할 수 없습니다</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phoneNumber" className="flex items-center text-sm font-medium">
                  <Phone className="h-4 w-4 mr-2 text-gray-500" />
                  전화번호
                </Label>
                <Input
                  id="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={(e) => handleInputChange("phoneNumber", e.target.value)}
                  placeholder="전화번호를 입력하세요"
                />
              </div>

              <div className="space-y-3">
                <Label className="flex items-center text-sm font-medium">
                  <Calendar className="h-4 w-4 mr-2 text-gray-500" />
                  생년월일
                </Label>
                <p className="text-xs text-gray-500">생년월일을 선택해주세요</p>
                <div className="grid grid-cols-3 gap-2 sm:gap-3">
                  {/* Year Select */}
                  <div className="space-y-1">
                    <Label htmlFor="birth-year" className="text-xs text-gray-600">년도</Label>
                    <Select value={birthYear} onValueChange={setBirthYear}>
                      <SelectTrigger 
                        id="birth-year" 
                        className="h-12 text-base"
                        data-testid="select-birth-year"
                      >
                        <SelectValue placeholder="년" />
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        {Array.from({ length: 100 }, (_, i) => {
                          const year = new Date().getFullYear() - i;
                          return (
                            <SelectItem key={year} value={year.toString()}>
                              {year}년
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Month Select */}
                  <div className="space-y-1">
                    <Label htmlFor="birth-month" className="text-xs text-gray-600">월</Label>
                    <Select value={birthMonth} onValueChange={setBirthMonth}>
                      <SelectTrigger 
                        id="birth-month" 
                        className="h-12 text-base"
                        data-testid="select-birth-month"
                      >
                        <SelectValue placeholder="월" />
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        {Array.from({ length: 12 }, (_, i) => {
                          const month = (i + 1).toString().padStart(2, '0');
                          return (
                            <SelectItem key={month} value={month}>
                              {i + 1}월
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Day Select */}
                  <div className="space-y-1">
                    <Label htmlFor="birth-day" className="text-xs text-gray-600">일</Label>
                    <Select value={birthDay} onValueChange={setBirthDay}>
                      <SelectTrigger 
                        id="birth-day" 
                        className="h-12 text-base"
                        data-testid="select-birth-day"
                      >
                        <SelectValue placeholder="일" />
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        {Array.from({ length: maxDays }, (_, i) => {
                          const day = (i + 1).toString().padStart(2, '0');
                          return (
                            <SelectItem key={day} value={day}>
                              {i + 1}일
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
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
              <Mic className="h-4 w-4 mr-2 text-gray-500" />
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
                {new Date(user.createdAt).toLocaleDateString('ko-KR')}
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