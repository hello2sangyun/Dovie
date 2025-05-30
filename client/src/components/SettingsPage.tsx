import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserAvatar } from "@/components/UserAvatar";
import { ImageCropper } from "@/components/ImageCropper";
import { Camera, User, LogOut, Building2, Moon, Sun } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { getInitials } from "@/lib/utils";
import VaultLogo from "./VaultLogo";

interface SettingsPageProps {
  isMobile?: boolean;
}

export default function SettingsPage({ isMobile = false }: SettingsPageProps) {
  const { user, setUser } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [displayName, setDisplayName] = useState(user?.displayName || "");
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [businessName, setBusinessName] = useState("");
  const [businessAddress, setBusinessAddress] = useState("");
  const [showImageCropper, setShowImageCropper] = useState(false);
  const [originalImageUrl, setOriginalImageUrl] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('darkMode') === 'true' || 
             (!localStorage.getItem('darkMode') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
    return false;
  });

  // Profile update mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: { displayName?: string; profilePicture?: string }) => {
      console.log("Updating profile with data:", data);
      const response = await apiRequest(`/api/users/${user?.id}`, "PATCH", data);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    },
    onSuccess: async (data) => {
      console.log("Profile update successful:", data);
      
      // 1. Auth 컨텍스트 즉시 업데이트
      setUser(data.user);
      
      // 2. React Query 캐시 즉시 업데이트 (캐시된 데이터 직접 설정)
      queryClient.setQueryData(["/api/auth/me"], { user: data.user });
      
      // 3. 모든 관련 쿼리를 즉시 새로고침하여 프로필 변경사항 반영
      await queryClient.refetchQueries({ queryKey: ["/api/chat-rooms"] });
      await queryClient.refetchQueries({ queryKey: ["/api/contacts"] });
      
      // 4. 로컬 상태 초기화
      setProfileImage(null);
      setPreviewUrl(null);
      
      // 5. 강제로 모든 컴포넌트 리렌더링 트리거
      queryClient.invalidateQueries();
      
      console.log("✅ Profile updated successfully, new URL:", data.user.profilePicture);
      
      toast({
        title: "프로필 업데이트 완료",
        description: "프로필이 성공적으로 업데이트되었습니다.",
      });
    },
    onError: (error) => {
      console.error("Profile update error:", error);
      toast({
        variant: "destructive",
        title: "업데이트 실패",
        description: "다시 시도해주세요.",
      });
    },
  });

  // Profile image upload mutation
  const uploadImageMutation = useMutation({
    mutationFn: async (file: File) => {
      console.log("Starting image upload...");
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
        const errorText = await response.text();
        console.error("Upload failed:", errorText);
        throw new Error(`Upload failed: ${response.status}`);
      }
      
      const result = await response.json();
      console.log("Image upload result:", result);
      return result;
    },
    onSuccess: (uploadData) => {
      console.log("Image uploaded successfully, updating profile:", uploadData);
      updateProfileMutation.mutate({
        displayName,
        profilePicture: uploadData.fileUrl
      });
    },
    onError: (error) => {
      console.error("Image upload error:", error);
      toast({
        variant: "destructive",
        title: "이미지 업로드 실패",
        description: "이미지 업로드에 실패했습니다.",
      });
    },
  });

  // Business user registration mutation
  const businessRegistrationMutation = useMutation({
    mutationFn: async (data: { businessName: string; businessAddress: string }) => {
      const response = await apiRequest("/api/users/register-business", "POST", data);
      return response.json();
    },
    onSuccess: (data) => {
      setUser(data.user);
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({
        title: "비즈니스 등록 신청 완료",
        description: "검토 후 승인 여부를 알려드립니다.",
      });
      setBusinessName("");
      setBusinessAddress("");
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "등록 신청 실패",
        description: "다시 시도해주세요.",
      });
    },
  });

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setOriginalImageUrl(url);
      setShowImageCropper(true);
    }
  };

  const handleCropComplete = (croppedFile: File) => {
    setProfileImage(croppedFile);
    const url = URL.createObjectURL(croppedFile);
    setPreviewUrl(url);
    setShowImageCropper(false);
    console.log("Cropped image ready for upload:", croppedFile);
  };

  const handleSaveProfile = () => {
    if (profileImage) {
      uploadImageMutation.mutate(profileImage);
    } else {
      updateProfileMutation.mutate({ displayName });
    }
  };

  // Initialize display name when user data loads
  useEffect(() => {
    if (user && !displayName) {
      setDisplayName(user.displayName || "");
    }
  }, [user, displayName]);

  const handleBusinessRegistration = () => {
    if (!businessName.trim() || !businessAddress.trim()) {
      toast({
        variant: "destructive",
        title: "입력 오류",
        description: "사업장명과 주소를 모두 입력해주세요.",
      });
      return;
    }
    
    businessRegistrationMutation.mutate({
      businessName: businessName.trim(),
      businessAddress: businessAddress.trim()
    });
  };

  // Dark mode effect
  useEffect(() => {
    const root = document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('darkMode', isDarkMode.toString());
  }, [isDarkMode]);

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
  };

  const handleLogout = () => {
    setUser(null);
    window.location.href = "/";
  };

  if (!user) return null;

  return (
    <div className={`${isMobile ? 'h-full flex flex-col' : 'h-full'} overflow-hidden`}>
      {/* Scrollable Content */}
      <div className={`${isMobile ? 'flex-1 overflow-y-auto p-4' : 'h-full overflow-y-auto max-w-xl mx-auto p-4'} space-y-4`}>
        {/* Header */}
        <div className="flex items-center space-x-3 mb-4">
          <VaultLogo size="sm" />
          <h1 className="text-xl font-bold text-gray-900">설정</h1>
        </div>

        {/* Profile Section */}
        <Card className="w-full">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center space-x-2 text-base">
              <User className="h-4 w-4" />
              <span>프로필</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Profile Image - Compact */}
            <div className="flex items-center space-x-4">
              <div className="relative">
                {previewUrl ? (
                  <Avatar className="w-16 h-16">
                    <AvatarImage 
                      src={previewUrl} 
                      alt="미리보기"
                    />
                    <AvatarFallback className="text-lg purple-gradient text-white">
                      {getInitials(user.displayName)}
                    </AvatarFallback>
                  </Avatar>
                ) : (
                  <UserAvatar 
                    user={user} 
                    size="xl" 
                    fallbackClassName="purple-gradient"
                  />
                )}
                <button
                  onClick={() => document.getElementById('profile-image-input')?.click()}
                  className="absolute -bottom-1 -right-1 w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center hover:bg-purple-700 transition-colors"
                >
                  <Camera className="h-3 w-3" />
                </button>
                <input
                  id="profile-image-input"
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="hidden"
                />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">{user.displayName}</p>
                <p className="text-xs text-gray-500">@{user.username}</p>
              </div>
            </div>

            {/* Display Name */}
            <div className="space-y-1">
              <Label htmlFor="displayName" className="text-sm">표시 이름</Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="표시 이름을 입력하세요"
                className="h-9"
              />
            </div>

            {/* Username (Read-only) */}
            <div className="space-y-1">
              <Label htmlFor="username" className="text-sm">사용자명</Label>
              <Input
                id="username"
                value={user.username}
                disabled
                className="bg-gray-100 h-9"
              />
            </div>

            {/* Save Button */}
            <Button
              onClick={handleSaveProfile}
              disabled={updateProfileMutation.isPending || uploadImageMutation.isPending}
              className="w-full purple-gradient h-9"
              size="sm"
            >
              {updateProfileMutation.isPending || uploadImageMutation.isPending
                ? "저장 중..."
                : "프로필 저장"
              }
            </Button>
          </CardContent>
        </Card>

        {/* Business User Registration */}
        {user.userRole === "user" && (
          <Card className="w-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                비즈니스 사용자 등록
              </CardTitle>
              <p className="text-xs text-gray-500">
                매장 운영자라면 공식 채팅방을 생성하고 관리할 수 있습니다
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="businessName" className="text-sm">사업장명</Label>
                <Input
                  id="businessName"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="예: 이태원 브런치카페"
                  className="h-9"
                />
              </div>
              
              <div className="space-y-1">
                <Label htmlFor="businessAddress" className="text-sm">사업장 주소</Label>
                <Input
                  id="businessAddress"
                  value={businessAddress}
                  onChange={(e) => setBusinessAddress(e.target.value)}
                  placeholder="예: 서울시 용산구 이태원동 123-45"
                  className="h-9"
                />
              </div>
              
              <Button
                onClick={handleBusinessRegistration}
                disabled={businessRegistrationMutation.isPending}
                className="w-full h-9"
                variant="outline"
              >
                {businessRegistrationMutation.isPending ? "신청 중..." : "비즈니스 사용자 신청"}
              </Button>
              
              <p className="text-xs text-gray-400 text-center">
                신청 후 검토를 거쳐 승인됩니다
              </p>
            </CardContent>
          </Card>
        )}

        {/* Business Status for Business Users */}
        {user.userRole === "business" && (
          <Card className="w-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                비즈니스 계정
                {user.isBusinessVerified && (
                  <span className="text-xs bg-green-100 text-green-600 px-2 py-1 rounded-full">
                    인증됨
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {user.businessName && (
                <div>
                  <p className="text-sm font-medium">{user.businessName}</p>
                  {user.businessAddress && (
                    <p className="text-xs text-gray-500">{user.businessAddress}</p>
                  )}
                </div>
              )}
              
              <div className="flex gap-2">
                <Button
                  className="flex-1 h-9"
                  variant="outline"
                  size="sm"
                >
                  내 공식방 관리
                </Button>
                <Button
                  className="flex-1 h-9"
                  variant="outline" 
                  size="sm"
                >
                  비즈니스 설정
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Appearance Settings */}
        <Card className="w-full">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center space-x-2 text-base">
              {isDarkMode ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
              <span>화면 설정</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">다크 모드</Label>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  어두운 테마로 전환합니다
                </p>
              </div>
              <Switch
                checked={isDarkMode}
                onCheckedChange={toggleDarkMode}
                className="data-[state=checked]:bg-purple-600"
              />
            </div>
          </CardContent>
        </Card>

        {/* App Info */}
        <Card className="w-full">
          <CardContent className="pt-4 pb-4">
            <div className="text-center space-y-1">
              <VaultLogo size="sm" className="mx-auto" />
              <p className="text-sm text-gray-500">Dovie Messenger</p>
              <p className="text-xs text-gray-400">스마트 메신저 v1.0.0</p>
              <p className="text-xs text-gray-400">모든 메시지와 파일이 암호화됩니다</p>
            </div>
          </CardContent>
        </Card>

        {/* Logout */}
        <Button
          onClick={handleLogout}
          variant="outline"
          className="w-full text-red-600 border-red-200 hover:bg-red-50 h-9"
          size="sm"
        >
          <LogOut className="h-4 w-4 mr-2" />
          로그아웃
        </Button>
      </div>

      {/* Image Cropper Modal */}
      <ImageCropper
        open={showImageCropper}
        onClose={() => setShowImageCropper(false)}
        imageSrc={originalImageUrl || ""}
        onCropComplete={handleCropComplete}
      />
    </div>
  );
}