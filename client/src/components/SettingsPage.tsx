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
import { Camera, User, LogOut, Building2 } from "lucide-react";
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

  // Profile update mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: { displayName?: string; profilePicture?: string }) => {
      const response = await apiRequest(`/api/users/${user?.id}`, "PATCH", data);
      return response.json();
    },
    onSuccess: (data) => {
      setUser(data.user);
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({
        title: "프로필 업데이트 완료",
        description: "프로필이 성공적으로 업데이트되었습니다.",
      });
    },
    onError: () => {
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
      const formData = new FormData();
      formData.append("file", file);
      
      const response = await fetch("/api/upload", {
        method: "POST",
        headers: {
          "x-user-id": user?.id.toString() || "",
        },
        body: formData,
      });
      
      if (!response.ok) throw new Error("Upload failed");
      return response.json();
    },
    onSuccess: (uploadData) => {
      console.log("Image uploaded successfully:", uploadData);
      updateProfileMutation.mutate({
        displayName,
        profilePicture: uploadData.fileUrl
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
      setProfileImage(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleSaveProfile = () => {
    if (profileImage) {
      uploadImageMutation.mutate(profileImage);
    } else {
      updateProfileMutation.mutate({ displayName });
    }
  };

  // Update local states when user data changes
  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || "");
      setPreviewUrl(null);
      setProfileImage(null);
    }
  }, [user]);

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
                <Avatar className="w-16 h-16">
                  <AvatarImage 
                    src={previewUrl || user.profilePicture || undefined} 
                    alt={user.displayName} 
                  />
                  <AvatarFallback className="text-lg purple-gradient text-white">
                    {getInitials(user.displayName)}
                  </AvatarFallback>
                </Avatar>
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

        {/* App Info */}
        <Card className="w-full">
          <CardContent className="pt-4 pb-4">
            <div className="text-center space-y-1">
              <VaultLogo size="sm" className="mx-auto" />
              <p className="text-sm text-gray-500">Vault Messenger</p>
              <p className="text-xs text-gray-400">보안 메신저 v1.0.0</p>
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
    </div>
  );
}