import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, UserX, AlertTriangle, Trash2 } from "lucide-react";
import { useLocation } from "wouter";

interface AccountManagementPageProps {
  onBack: () => void;
}

export default function AccountManagementPage({ onBack }: AccountManagementPageProps) {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [password, setPassword] = useState("");

  const deleteAccountMutation = useMutation({
    mutationFn: async (data: { password: string }) => {
      const response = await apiRequest("/api/auth/delete-account", "POST", data);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "계정 삭제에 실패했습니다.");
      }
      return response.json();
    },
    onSuccess: () => {
      alert("계정이 성공적으로 삭제되었습니다. 그동안 이용해 주셔서 감사합니다.");
      logout();
      setLocation("/");
    },
    onError: (error: Error) => {
      alert(error.message || "계정 삭제에 실패했습니다. 비밀번호를 확인해주세요.");
    },
  });

  const handleDeleteAccount = () => {
    if (confirmText !== "DELETE") {
      alert('정확히 "DELETE"를 입력해주세요.');
      return;
    }
    if (!password) {
      alert("비밀번호를 입력해주세요.");
      return;
    }
    deleteAccountMutation.mutate({ password });
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
        <h1 className="text-lg font-semibold text-gray-900">계정 관리</h1>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Account Info Card */}
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-md">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center">
              <UserX className="h-5 w-5 mr-2 text-gray-600" />
              계정 정보
            </CardTitle>
            <CardDescription>
              현재 로그인된 계정 정보입니다
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-sm text-gray-600">사용자명</span>
              <span className="text-sm font-medium text-gray-900">@{user.username}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-sm text-gray-600">이메일</span>
              <span className="text-sm font-medium text-gray-900">{user.email}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-sm text-gray-600">가입일</span>
              <span className="text-sm font-medium text-gray-900">
                {user.createdAt ? new Date(user.createdAt).toLocaleDateString('ko-KR') : '정보 없음'}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="bg-white/80 backdrop-blur-sm border-2 border-red-200 shadow-md">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center text-red-600">
              <AlertTriangle className="h-5 w-5 mr-2" />
              위험 구역
            </CardTitle>
            <CardDescription>
              이 작업은 되돌릴 수 없습니다. 신중하게 진행해주세요.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-red-50 rounded-lg border border-red-200">
              <h4 className="font-semibold text-red-900 mb-2 flex items-center">
                <Trash2 className="h-4 w-4 mr-2" />
                계정 삭제
              </h4>
              <p className="text-sm text-red-700 mb-3">
                계정을 삭제하면 모든 데이터가 영구적으로 삭제됩니다:
              </p>
              <ul className="text-sm text-red-700 space-y-1 ml-4 mb-4">
                <li>• 모든 메시지 및 대화 기록</li>
                <li>• 업로드한 파일 및 미디어</li>
                <li>• 연락처 및 그룹 정보</li>
                <li>• 프로필 정보 및 설정</li>
              </ul>
              <Button
                variant="destructive"
                onClick={() => setShowDeleteDialog(true)}
                className="w-full"
                data-testid="button-delete-account"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                계정 영구 삭제
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center text-red-600">
              <AlertTriangle className="h-5 w-5 mr-2" />
              계정을 정말 삭제하시겠습니까?
            </DialogTitle>
            <DialogDescription>
              이 작업은 되돌릴 수 없습니다. 모든 데이터가 영구적으로 삭제됩니다.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="confirm-text">
                확인을 위해 <span className="font-bold">DELETE</span>를 입력해주세요
              </Label>
              <Input
                id="confirm-text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="DELETE"
                className="font-mono"
                data-testid="input-confirm-delete"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">비밀번호 확인</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="현재 비밀번호"
                data-testid="input-password"
              />
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteDialog(false);
                setConfirmText("");
                setPassword("");
              }}
              className="w-full sm:w-auto"
            >
              취소
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteAccount}
              disabled={confirmText !== "DELETE" || !password || deleteAccountMutation.isPending}
              className="w-full sm:w-auto"
              data-testid="button-confirm-delete"
            >
              {deleteAccountMutation.isPending ? "삭제 중..." : "계정 삭제"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
