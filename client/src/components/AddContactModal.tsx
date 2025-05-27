import { useState, useRef, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserPlus, QrCode as QrCodeIcon, Camera, Download } from "lucide-react";
import QrCode from 'qrcode';
import QRScannerModal from "./QRScannerModal";

interface AddContactModalProps {
  open: boolean;
  onClose: () => void;
}

export default function AddContactModal({ open, onClose }: AddContactModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [contactUsername, setContactUsername] = useState("");
  const [nickname, setNickname] = useState("");
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [myQRCode, setMyQRCode] = useState<string>("");
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const addContactMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/contacts", {
        contactUsername: contactUsername.startsWith('@') ? contactUsername.slice(1) : contactUsername,
        nickname: nickname.trim() || undefined,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      toast({
        title: "친구 추가 완료",
        description: "새로운 친구가 추가되었습니다.",
      });
      handleClose();
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "친구 추가 실패",
        description: error.message || "다시 시도해주세요.",
      });
    },
  });

  const handleClose = () => {
    setContactUsername("");
    setNickname("");
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactUsername.trim()) {
      toast({
        variant: "destructive",
        title: "입력 오류",
        description: "사용자 ID를 입력해주세요.",
      });
      return;
    }
    addContactMutation.mutate();
  };

  // QR 코드 생성
  useEffect(() => {
    if (open && user?.id) {
      generateQRCode();
    }
  }, [open, user?.id]);

  const generateQRCode = async () => {
    if (!user?.id) return;
    
    try {
      const qrData = JSON.stringify({
        type: 'vault_user',
        userId: user.id,
        username: user.username,
        displayName: user.displayName
      });
      
      const qrCodeDataUrl = await QrCode.toDataURL(qrData, {
        width: 256,
        margin: 2,
        color: {
          dark: '#7C3AED', // 보라색
          light: '#FFFFFF'
        }
      });
      
      setMyQRCode(qrCodeDataUrl);
    } catch (error) {
      console.error('QR 코드 생성 실패:', error);
    }
  };

  // QR 스캔 결과 처리
  const handleQRScanResult = async (userId: number, userData: any) => {
    try {
      const response = await apiRequest("POST", "/api/contacts", {
        contactUserId: userId,
        nickname: userData.displayName || userData.username,
      });
      
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      toast({
        title: "친구 추가 완료",
        description: `${userData.displayName || userData.username}님이 친구로 추가되었습니다.`,
      });
      
      onClose();
    } catch (error) {
      toast({
        title: "친구 추가 실패",
        description: "이미 추가된 친구이거나 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  };

  // QR 코드 다운로드
  const downloadQRCode = () => {
    if (!myQRCode) return;
    
    const link = document.createElement('a');
    link.download = `vault-qr-${user?.username}.png`;
    link.href = myQRCode;
    link.click();
  };

  return (
    <>
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="w-full max-w-md">
        <DialogHeader>
          <DialogTitle>친구 추가</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="contactUsername" className="text-sm font-medium text-gray-700">
              사용자 ID
            </Label>
            <Input
              id="contactUsername"
              type="text"
              placeholder="@username"
              value={contactUsername}
              onChange={(e) => setContactUsername(e.target.value)}
              className="mt-1"
              disabled={addContactMutation.isPending}
            />
          </div>
          
          <div>
            <Label htmlFor="nickname" className="text-sm font-medium text-gray-700">
              표시될 닉네임 (선택사항)
            </Label>
            <Input
              id="nickname"
              type="text"
              placeholder="닉네임을 입력하세요"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className="mt-1"
              disabled={addContactMutation.isPending}
            />
            <p className="text-xs text-gray-500 mt-1">
              입력하지 않으면 사용자 ID가 표시됩니다
            </p>
          </div>
          
          <div className="border-t border-gray-200 pt-4 space-y-3">
            <Button
              type="submit"
              className="w-full purple-gradient hover:purple-gradient-hover"
              disabled={addContactMutation.isPending}
            >
              <UserPlus className="mr-2 h-4 w-4" />
              {addContactMutation.isPending ? "추가 중..." : "친구 추가"}
            </Button>
            
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => setShowQRScanner(true)}
            >
              <Camera className="mr-2 h-4 w-4" />
              QR 코드 스캔
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>

    {/* QR Scanner Modal */}
    <QRScannerModal
      open={showQRScanner}
      onClose={() => setShowQRScanner(false)}
      onScanResult={handleQRScanResult}
    />
    </>
  );
}
