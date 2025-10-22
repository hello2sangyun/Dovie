import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import VaultLogo from "@/components/VaultLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Camera, Calendar, User, ArrowRight } from "lucide-react";

export default function ProfileSetupPage() {
  const [, setLocation] = useLocation();
  const { user, setUser } = useAuth();
  
  const [formData, setFormData] = useState({
    username: user?.username || "",
    displayName: user?.displayName || "",
    email: user?.email?.includes('@phone.local') ? "" : (user?.email || ""),
    phoneNumber: user?.phoneNumber || "",
    password: "",
    confirmPassword: "",
    birthday: "",
    profilePicture: "",
  });
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");

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

  // Update form data when user data changes
  useEffect(() => {
    if (user) {
      setFormData({
        username: user.username || "",
        displayName: user.displayName || "",
        email: user.email?.includes('@phone.local') ? "" : (user.email || ""),
        phoneNumber: user.phoneNumber || "",
        password: "",
        confirmPassword: "",
        birthday: "",
        profilePicture: user.profilePicture || "",
      });
    }
  }, [user]);

  const uploadImageMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      
      const response = await fetch("/api/upload", {
        method: "POST",
        headers: {
          "x-user-id": user?.id.toString() || "",
        },
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error("이미지 업로드에 실패했습니다");
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      setFormData(prev => ({ ...prev, profilePicture: data.fileUrl }));
    },
    onError: () => {
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await apiRequest(`/api/users/${user?.id}`, "PATCH", {
        ...data,
        isProfileComplete: true,
      });
      return response.json();
    },
    onSuccess: (data) => {
      setUser(data.user);
      setLocation("/app");
    },
    onError: (error: any) => {
    },
  });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProfileImage(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      uploadImageMutation.mutate(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Password validation
    if (!formData.password || formData.password.length < 6) {
      return;
    }
    
    if (formData.password !== formData.confirmPassword) {
      return;
    }
    
    updateProfileMutation.mutate(formData);
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(word => word.charAt(0).toUpperCase()).join('').slice(0, 2);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-8 px-4 overflow-y-auto">
      <div className="w-full max-w-md animate-slide-up">
        <div className="text-center mb-8">
          <VaultLogo size="lg" className="mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">프로필 설정</h2>
          <p className="text-gray-600">나를 소개하는 프로필을 만들어보세요</p>
        </div>

        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-center text-lg">프로필 완성하기</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* 프로필 이미지 */}
              <div className="flex flex-col items-center space-y-4">
                <div className="relative">
                  <Avatar className="w-24 h-24">
                    <AvatarImage src={previewUrl || formData.profilePicture} />
                    <AvatarFallback className="text-xl bg-purple-100 text-purple-600">
                      {getInitials(formData.displayName)}
                    </AvatarFallback>
                  </Avatar>
                  <label htmlFor="profile-image" className="absolute bottom-0 right-0 bg-purple-600 hover:bg-purple-700 text-white rounded-full p-2 cursor-pointer shadow-lg transition-colors">
                    <Camera className="h-4 w-4" />
                  </label>
                  <input
                    id="profile-image"
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </div>
                <p className="text-sm text-gray-500 text-center">
                  프로필 사진을 추가해보세요<br />
                  <span className="text-xs">(선택사항)</span>
                </p>
              </div>

              {/* 사용자명 */}
              <div className="space-y-2">
                <Label htmlFor="username">사용자명 (아이디)</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    id="username"
                    type="text"
                    placeholder="고유한 사용자명을 입력해주세요"
                    value={formData.username}
                    onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              {/* 표시 이름 */}
              <div className="space-y-2">
                <Label htmlFor="displayName">표시 이름</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    id="displayName"
                    type="text"
                    placeholder="다른 사용자에게 표시될 이름"
                    value={formData.displayName}
                    onChange={(e) => setFormData(prev => ({ ...prev, displayName: e.target.value }))}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              {/* 이메일 */}
              <div className="space-y-2">
                <Label htmlFor="email">이메일</Label>
                <div className="relative">
                  <Input
                    id="email"
                    type="email"
                    placeholder="이메일 주소를 입력해주세요"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    required
                  />
                </div>
              </div>

              {/* 비밀번호 */}
              <div className="space-y-2">
                <Label htmlFor="password">비밀번호</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type="password"
                    placeholder="비밀번호를 입력해주세요 (최소 6자)"
                    value={formData.password}
                    onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                    required
                    minLength={6}
                  />
                </div>
              </div>

              {/* 비밀번호 확인 */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">비밀번호 확인</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="비밀번호를 다시 입력해주세요"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    required
                  />
                </div>
                {formData.password && formData.confirmPassword && formData.password !== formData.confirmPassword && (
                  <p className="text-xs text-red-500">비밀번호가 일치하지 않습니다</p>
                )}
              </div>

              {/* 전화번호 */}
              <div className="space-y-2">
                <Label htmlFor="phoneNumber">전화번호</Label>
                <div className="relative">
                  <Input
                    id="phoneNumber"
                    type="tel"
                    placeholder="전화번호"
                    value={formData.phoneNumber}
                    onChange={(e) => setFormData(prev => ({ ...prev, phoneNumber: e.target.value }))}
                    required
                    disabled
                    className="bg-gray-100"
                  />
                </div>
                <p className="text-xs text-gray-500">인증된 전화번호입니다</p>
              </div>

              {/* 생년월일 */}
              <div className="space-y-3">
                <Label className="flex items-center text-sm font-medium">
                  <Calendar className="h-4 w-4 mr-2 text-gray-500" />
                  생년월일 (선택사항)
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

              <Button 
                type="submit" 
                className="w-full purple-gradient hover:purple-gradient-hover"
                disabled={updateProfileMutation.isPending || uploadImageMutation.isPending}
              >
                {updateProfileMutation.isPending ? "프로필 저장 중..." : "Dovie 시작하기"}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </form>

            <div className="mt-6 text-center">
              <button
                onClick={() => setLocation("/app")}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                나중에 설정하기
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}