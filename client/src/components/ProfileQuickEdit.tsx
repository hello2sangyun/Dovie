import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Edit3, Camera, User as UserIcon, Save, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { User } from "@shared/schema";

interface ProfileQuickEditProps {
  user: User;
  trigger?: React.ReactNode;
  mode?: "inline" | "modal";
  onSave?: () => void;
}

export function ProfileQuickEdit({ user, trigger, mode = "modal", onSave }: ProfileQuickEditProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(mode === "inline");
  const [displayName, setDisplayName] = useState(user.displayName || "");
  const [bio, setBio] = useState((user as any).bio || "");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const updateProfileMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const response = await fetch("/api/auth/profile", {
        method: "PATCH",
        body: data,
      });
      if (!response.ok) {
        throw new Error("프로필 업데이트에 실패했습니다.");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      setIsOpen(false);
      setIsEditing(false);
      setAvatarFile(null);
      setAvatarPreview(null);
      onSave?.();
      toast({
        title: "프로필 업데이트 완료",
        description: "프로필이 성공적으로 업데이트되었습니다.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "업데이트 실패",
        description: error.message || "프로필 업데이트에 실패했습니다.",
        variant: "destructive",
      });
    },
  });

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "파일 크기 초과",
          description: "이미지 파일은 5MB 이하여야 합니다.",
          variant: "destructive",
        });
        return;
      }

      setAvatarFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setAvatarPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    const formData = new FormData();
    formData.append("displayName", displayName);
    formData.append("bio", bio);
    
    if (avatarFile) {
      formData.append("avatar", avatarFile);
    }

    updateProfileMutation.mutate(formData);
  };

  const handleCancel = () => {
    setDisplayName(user.displayName || "");
    setBio((user as any).bio || "");
    setAvatarFile(null);
    setAvatarPreview(null);
    setIsEditing(false);
    setIsOpen(false);
  };

  const renderEditForm = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-center">
        <div className="relative">
          <Avatar className="h-20 w-20 cursor-pointer" onClick={() => fileInputRef.current?.click()}>
            <AvatarImage src={avatarPreview || user.profilePicture || undefined} />
            <AvatarFallback className="text-lg">
              {displayName.charAt(0).toUpperCase() || user.username?.charAt(0).toUpperCase() || <UserIcon />}
            </AvatarFallback>
          </Avatar>
          <Button
            size="sm"
            variant="outline"
            className="absolute -bottom-2 -right-2 h-8 w-8 p-0 rounded-full bg-white shadow-md"
            onClick={() => fileInputRef.current?.click()}
          >
            <Camera className="h-4 w-4" />
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleAvatarChange}
            className="hidden"
          />
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <Label htmlFor="displayName" className="text-sm font-medium">
            표시 이름
          </Label>
          <Input
            id="displayName"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="표시 이름을 입력하세요"
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor="bio" className="text-sm font-medium">
            소개
          </Label>
          <Textarea
            id="bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="자신을 소개해보세요"
            className="mt-1 resize-none"
            rows={3}
          />
        </div>
      </div>

      <div className="flex gap-2">
        <Button
          onClick={handleSave}
          disabled={updateProfileMutation.isPending}
          className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
        >
          {updateProfileMutation.isPending ? (
            "저장 중..."
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              저장
            </>
          )}
        </Button>
        <Button
          onClick={handleCancel}
          variant="outline"
          disabled={updateProfileMutation.isPending}
        >
          <X className="h-4 w-4 mr-2" />
          취소
        </Button>
      </div>
    </div>
  );

  if (mode === "inline") {
    return (
      <div className={cn("transition-all duration-200", isEditing ? "space-y-4" : "")}>
        {!isEditing ? (
          <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer" onClick={() => setIsEditing(true)}>
            <Avatar className="h-12 w-12">
              <AvatarImage src={user.profilePicture || undefined} />
              <AvatarFallback>
                {user.displayName?.charAt(0).toUpperCase() || user.username?.charAt(0).toUpperCase() || <User />}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">{user.displayName || user.username}</div>
              <div className="text-sm text-gray-500 truncate">{user.bio || "소개를 추가해보세요"}</div>
            </div>
            <Edit3 className="h-4 w-4 text-gray-400" />
          </div>
        ) : (
          <div className="p-4 border rounded-lg bg-white dark:bg-gray-900">
            {renderEditForm()}
          </div>
        )}
      </div>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Edit3 className="h-4 w-4 mr-2" />
            프로필 편집
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>프로필 빠른 편집</DialogTitle>
        </DialogHeader>
        {renderEditForm()}
      </DialogContent>
    </Dialog>
  );
}