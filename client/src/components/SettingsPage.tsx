import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera, User, LogOut } from "lucide-react";
import { getInitials } from "@/lib/utils";
import DovieLogo from "./DovieLogo";

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

  // Profile update mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: { displayName?: string; profilePicture?: string }) => {
      const response = await apiRequest("PUT", `/api/users/${user?.id}`, data);
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
        body: formData,
      });
      
      if (!response.ok) throw new Error("Upload failed");
      return response.json();
    },
    onSuccess: (uploadData) => {
      updateProfileMutation.mutate({
        displayName,
        profilePicture: uploadData.fileUrl
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

  const handleLogout = () => {
    setUser(null);
    window.location.href = "/";
  };

  if (!user) return null;

  return (
    <div className={`${isMobile ? 'p-4' : 'max-w-2xl mx-auto p-6'} space-y-6`}>
      {/* Header */}
      <div className="flex items-center space-x-3">
        <VaultLogo size="sm" />
        <h1 className="text-2xl font-bold text-gray-900">설정</h1>
      </div>

      {/* Profile Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <User className="h-5 w-5" />
            <span>프로필</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Profile Image */}
          <div className="flex flex-col items-center space-y-4">
            <div className="relative">
              <Avatar className="w-24 h-24">
                <AvatarImage 
                  src={previewUrl || user.profilePicture || undefined} 
                  alt={user.displayName} 
                />
                <AvatarFallback className="text-2xl purple-gradient text-white">
                  {getInitials(user.displayName)}
                </AvatarFallback>
              </Avatar>
              <button
                onClick={() => document.getElementById('profile-image-input')?.click()}
                className="absolute -bottom-2 -right-2 w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center hover:bg-purple-700 transition-colors"
              >
                <Camera className="h-4 w-4" />
              </button>
              <input
                id="profile-image-input"
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
              />
            </div>
            <p className="text-sm text-gray-500 text-center">
              프로필 사진을 변경하려면 카메라 아이콘을 클릭하세요
            </p>
          </div>

          {/* Display Name */}
          <div className="space-y-2">
            <Label htmlFor="displayName">표시 이름</Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="표시 이름을 입력하세요"
            />
          </div>

          {/* Username (Read-only) */}
          <div className="space-y-2">
            <Label htmlFor="username">사용자명</Label>
            <Input
              id="username"
              value={user.username}
              disabled
              className="bg-gray-100"
            />
          </div>

          {/* Save Button */}
          <Button
            onClick={handleSaveProfile}
            disabled={updateProfileMutation.isPending || uploadImageMutation.isPending}
            className="w-full purple-gradient"
          >
            {updateProfileMutation.isPending || uploadImageMutation.isPending
              ? "저장 중..."
              : "프로필 저장"
            }
          </Button>
        </CardContent>
      </Card>

      {/* App Info */}
      <Card>
        <CardContent className="pt-6">
          <div className="text-center space-y-2">
            <DovieLogo size="md" className="mx-auto" />
            <p className="text-sm text-gray-500">Dovie</p>
            <p className="text-xs text-gray-400">Version 1.0.0</p>
          </div>
        </CardContent>
      </Card>

      {/* Logout */}
      <Button
        onClick={handleLogout}
        variant="outline"
        className="w-full text-red-600 border-red-200 hover:bg-red-50"
      >
        <LogOut className="h-4 w-4 mr-2" />
        로그아웃
      </Button>
    </div>
  );
}