import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Upload, User, Mail, Phone, Calendar } from "lucide-react";

interface ProfileSettingsPageProps {
  onBack: () => void;
}

export default function ProfileSettingsPage({ onBack }: ProfileSettingsPageProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState({
    displayName: user?.displayName || "",
    email: user?.email || "",
    phoneNumber: user?.phoneNumber || "",
    birthday: user?.birthday || "",
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await apiRequest("/api/auth/profile", "PATCH", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({
        title: "프로필 업데이트 완료",
        description: "프로필 정보가 성공적으로 업데이트되었습니다.",
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "업데이트 실패",
        description: "프로필 업데이트 중 오류가 발생했습니다.",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfileMutation.mutate(formData);
  };

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
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
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  placeholder="이메일을 입력하세요"
                />
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

              <div className="space-y-2">
                <Label htmlFor="birthday" className="flex items-center text-sm font-medium">
                  <Calendar className="h-4 w-4 mr-2 text-gray-500" />
                  생년월일
                </Label>
                <Input
                  id="birthday"
                  type="date"
                  value={formData.birthday}
                  onChange={(e) => handleInputChange("birthday", e.target.value)}
                />
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

        {/* Account Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">계정 정보</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-sm text-gray-600">사용자명</span>
              <span className="text-sm font-medium">@{user.username}</span>
            </div>
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