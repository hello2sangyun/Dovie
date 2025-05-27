import { useState, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import VaultLogo from "@/components/VaultLogo";
import { User, Camera, Check } from "lucide-react";
import { useLocation } from "wouter";

export default function ProfileSetup() {
  const { user, setUser } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [profilePicture, setProfilePicture] = useState<string>("");
  const [profilePreview, setProfilePreview] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 프로필 사진 업로드
  const uploadProfilePicture = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      const response = await apiRequest("/api/upload", "POST", formData);
      return response;
    },
    onSuccess: (data) => {
      setProfilePicture(data.fileUrl);
      setProfilePreview(data.fileUrl);
      toast({
        title: "업로드 완료",
        description: "프로필 사진이 업로드되었습니다.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "업로드 실패",
        description: "프로필 사진 업로드에 실패했습니다.",
        variant: "destructive",
      });
    },
  });

  // 프로필 설정 완료
  const completeProfileMutation = useMutation({
    mutationFn: async (data: { userId: number; username: string; displayName: string; profilePicture?: string }) => {
      const response = await apiRequest("/api/auth/complete-profile", "POST", data);
      return response;
    },
    onSuccess: (data) => {
      setUser(data.user);
      toast({
        title: "프로필 설정 완료",
        description: "Dovie Messenger에 오신 것을 환영합니다!",
      });
      setLocation("/");
    },
    onError: (error: any) => {
      const message = error.message || "프로필 설정에 실패했습니다.";
      toast({
        title: "설정 실패",
        description: message,
        variant: "destructive",
      });
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // 파일 크기 확인 (5MB 제한)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "파일 크기 초과",
          description: "5MB 이하의 이미지를 선택해주세요.",
          variant: "destructive",
        });
        return;
      }

      // 이미지 파일 확인
      if (!file.type.startsWith('image/')) {
        toast({
          title: "잘못된 파일 형식",
          description: "이미지 파일만 업로드 가능합니다.",
          variant: "destructive",
        });
        return;
      }

      // 미리보기 생성
      const reader = new FileReader();
      reader.onload = (e) => {
        setProfilePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);

      // 파일 업로드
      uploadProfilePicture.mutate(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username.trim()) {
      toast({
        title: "사용자명 필요",
        description: "사용자명을 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    if (!displayName.trim()) {
      toast({
        title: "표시 이름 필요",
        description: "표시 이름을 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    if (!user?.id) {
      toast({
        title: "오류",
        description: "사용자 정보를 찾을 수 없습니다.",
        variant: "destructive",
      });
      return;
    }

    completeProfileMutation.mutate({
      userId: user.id,
      username: username.trim(),
      displayName: displayName.trim(),
      profilePicture: profilePicture || undefined,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <VaultLogo size="lg" animated />
          </div>
          <CardTitle className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            프로필 설정
          </CardTitle>
          <CardDescription>
            마지막 단계입니다! 프로필 정보를 설정해주세요
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 프로필 사진 */}
            <div className="flex flex-col items-center space-y-4">
              <div className="relative">
                <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-100 border-4 border-white shadow-lg">
                  {profilePreview ? (
                    <img 
                      src={profilePreview} 
                      alt="프로필 미리보기" 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <User className="w-8 h-8 text-gray-400" />
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute -bottom-2 -right-2 w-8 h-8 bg-purple-600 hover:bg-purple-700 text-white rounded-full flex items-center justify-center shadow-lg transition-colors"
                  disabled={uploadProfilePicture.isPending}
                >
                  {uploadProfilePicture.isPending ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Camera className="w-4 h-4" />
                  )}
                </button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
              <p className="text-sm text-gray-500 text-center">
                프로필 사진을 선택하세요<br />
                <span className="text-xs">(선택사항, 5MB 이하)</span>
              </p>
            </div>

            {/* 사용자명 */}
            <div className="space-y-2">
              <Label htmlFor="username">사용자명 (ID) *</Label>
              <Input
                id="username"
                type="text"
                placeholder="영문, 숫자, _ 사용 가능"
                value={username}
                onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, "").slice(0, 20))}
                className="text-base"
                maxLength={20}
              />
              <p className="text-xs text-gray-500">
                다른 사용자들이 회원님을 찾을 때 사용할 고유 ID입니다
              </p>
            </div>

            {/* 표시 이름 */}
            <div className="space-y-2">
              <Label htmlFor="displayName">표시 이름 *</Label>
              <Input
                id="displayName"
                type="text"
                placeholder="친구들에게 보여질 이름"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value.slice(0, 30))}
                className="text-base"
                maxLength={30}
              />
              <p className="text-xs text-gray-500">
                친구들이 채팅에서 보게 될 이름입니다
              </p>
            </div>

            <Button 
              type="submit" 
              className="w-full purple-gradient text-white"
              disabled={completeProfileMutation.isPending || !username.trim() || !displayName.trim()}
            >
              {completeProfileMutation.isPending ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>설정 중...</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <Check className="w-4 h-4" />
                  <span>Dovie 시작하기</span>
                </div>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}