import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, UserX, AlertTriangle, Trash2, Phone, Shield } from "lucide-react";
import { useLocation } from "wouter";
import { useSwipeBack } from "@/hooks/useSwipeBack";
import { useToast } from "@/hooks/use-toast";

interface AccountManagementPageProps {
  onBack: () => void;
}

type DeleteStep = 'confirm' | 'phone' | 'verify' | 'password';

export default function AccountManagementPage({ onBack }: AccountManagementPageProps) {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // 스와이프로 뒤로가기
  useSwipeBack({ onBack });
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteStep, setDeleteStep] = useState<DeleteStep>('confirm');
  const [confirmText, setConfirmText] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [password, setPassword] = useState("");
  const [isCodeSent, setIsCodeSent] = useState(false);

  // 전화번호 인증 코드 전송
  const sendCodeMutation = useMutation({
    mutationFn: async (phoneNumber: string) => {
      const response = await apiRequest("/api/auth/send-phone-code", "POST", { phoneNumber });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "인증 코드 전송에 실패했습니다.");
      }
      return response.json();
    },
    onSuccess: () => {
      setIsCodeSent(true);
      setDeleteStep('verify');
      toast({
        title: "인증 코드 전송 완료",
        description: "입력하신 전화번호로 인증 코드를 전송했습니다.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "전송 실패",
        description: error.message || "인증 코드 전송에 실패했습니다.",
        variant: "destructive",
      });
    },
  });

  // 전화번호 인증 코드 확인
  const verifyCodeMutation = useMutation({
    mutationFn: async (data: { phoneNumber: string; code: string }) => {
      const response = await apiRequest("/api/auth/verify-phone-code", "POST", data);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "인증에 실패했습니다.");
      }
      return response.json();
    },
    onSuccess: () => {
      setDeleteStep('password');
      toast({
        title: "인증 성공",
        description: "전화번호 인증이 완료되었습니다.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "인증 실패",
        description: error.message || "인증 코드가 올바르지 않습니다.",
        variant: "destructive",
      });
    },
  });

  // 계정 삭제
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
      toast({
        title: "계정 삭제 완료",
        description: "그동안 이용해 주셔서 감사합니다.",
      });
      setTimeout(() => {
        logout();
        setLocation("/");
      }, 1500);
    },
    onError: (error: Error) => {
      toast({
        title: "계정 삭제 실패",
        description: error.message || "비밀번호를 확인해주세요.",
        variant: "destructive",
      });
    },
  });

  const handleNextStep = () => {
    if (deleteStep === 'confirm') {
      if (confirmText !== "DELETE") {
        toast({
          title: "입력 오류",
          description: '정확히 "DELETE"를 입력해주세요.',
          variant: "destructive",
        });
        return;
      }
      setDeleteStep('phone');
    } else if (deleteStep === 'phone') {
      if (!phoneNumber) {
        toast({
          title: "입력 오류",
          description: "전화번호를 입력해주세요.",
          variant: "destructive",
        });
        return;
      }
      if (phoneNumber !== user?.phoneNumber) {
        toast({
          title: "전화번호 불일치",
          description: "등록된 전화번호와 일치하지 않습니다.",
          variant: "destructive",
        });
        return;
      }
      sendCodeMutation.mutate(phoneNumber);
      setDeleteStep('verify');
    } else if (deleteStep === 'verify') {
      if (!verificationCode) {
        toast({
          title: "입력 오류",
          description: "인증 코드를 입력해주세요.",
          variant: "destructive",
        });
        return;
      }
      verifyCodeMutation.mutate({ phoneNumber, code: verificationCode });
    } else if (deleteStep === 'password') {
      if (!password) {
        toast({
          title: "입력 오류",
          description: "비밀번호를 입력해주세요.",
          variant: "destructive",
        });
        return;
      }
      deleteAccountMutation.mutate({ password });
    }
  };

  const handleDialogClose = () => {
    setShowDeleteDialog(false);
    setDeleteStep('confirm');
    setConfirmText("");
    setPhoneNumber("");
    setVerificationCode("");
    setPassword("");
    setIsCodeSent(false);
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
      <div className="flex-1 overflow-y-auto p-4 pb-24 space-y-6">
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
              <span className="text-sm text-gray-600">전화번호</span>
              <span className="text-sm font-medium text-gray-900">{user.phoneNumber}</span>
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

      {/* Delete Confirmation Dialog - Multi-step */}
      <Dialog open={showDeleteDialog} onOpenChange={handleDialogClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center text-red-600">
              <AlertTriangle className="h-5 w-5 mr-2" />
              {deleteStep === 'confirm' && "계정을 정말 삭제하시겠습니까?"}
              {deleteStep === 'phone' && "전화번호 인증"}
              {deleteStep === 'verify' && "인증 코드 확인"}
              {deleteStep === 'password' && "비밀번호 확인"}
            </DialogTitle>
            <DialogDescription>
              {deleteStep === 'confirm' && "이 작업은 되돌릴 수 없습니다. 모든 데이터가 영구적으로 삭제됩니다."}
              {deleteStep === 'phone' && "계정 삭제를 위해 등록된 전화번호로 본인 인증을 진행합니다."}
              {deleteStep === 'verify' && "전송된 인증 코드를 입력해주세요."}
              {deleteStep === 'password' && "최종 확인을 위해 비밀번호를 입력해주세요."}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Step 1: Confirm DELETE text */}
            {deleteStep === 'confirm' && (
              <div className="space-y-2">
                <Label htmlFor="confirm-text">
                  확인을 위해 <span className="font-bold text-red-600">DELETE</span>를 입력해주세요
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
            )}

            {/* Step 2: Phone number */}
            {deleteStep === 'phone' && (
              <div className="space-y-2">
                <Label htmlFor="phone-number" className="flex items-center">
                  <Phone className="h-4 w-4 mr-2" />
                  등록된 전화번호
                </Label>
                <Input
                  id="phone-number"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder={user?.phoneNumber || "전화번호를 입력하세요"}
                  data-testid="input-phone-number"
                />
                <p className="text-xs text-gray-500">
                  등록된 전화번호: {user?.phoneNumber}
                </p>
              </div>
            )}

            {/* Step 3: Verification code */}
            {deleteStep === 'verify' && (
              <div className="space-y-2">
                <Label htmlFor="verification-code" className="flex items-center">
                  <Shield className="h-4 w-4 mr-2" />
                  인증 코드
                </Label>
                <Input
                  id="verification-code"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  placeholder="6자리 인증 코드"
                  maxLength={6}
                  data-testid="input-verification-code"
                />
                <p className="text-xs text-gray-500">
                  {phoneNumber}(으)로 전송된 인증 코드를 입력해주세요.
                </p>
              </div>
            )}

            {/* Step 4: Password */}
            {deleteStep === 'password' && (
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
            )}
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={handleDialogClose}
              className="w-full sm:w-auto"
            >
              취소
            </Button>
            <Button
              variant="destructive"
              onClick={handleNextStep}
              disabled={
                (deleteStep === 'confirm' && confirmText !== "DELETE") ||
                (deleteStep === 'phone' && (!phoneNumber || sendCodeMutation.isPending)) ||
                (deleteStep === 'verify' && (!verificationCode || verifyCodeMutation.isPending)) ||
                (deleteStep === 'password' && (!password || deleteAccountMutation.isPending))
              }
              className="w-full sm:w-auto"
              data-testid="button-next-step"
            >
              {deleteStep === 'confirm' && "다음"}
              {deleteStep === 'phone' && (sendCodeMutation.isPending ? "전송 중..." : "인증 코드 전송")}
              {deleteStep === 'verify' && (verifyCodeMutation.isPending ? "확인 중..." : "인증 확인")}
              {deleteStep === 'password' && (deleteAccountMutation.isPending ? "삭제 중..." : "계정 삭제")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
