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
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const addContactMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("/api/contacts", "POST", {
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
      let errorMessage = "다시 시도해주세요.";
      
      if (error.message) {
        if (error.message.includes("already in your contacts")) {
          errorMessage = "이미 친구 목록에 있는 사용자입니다.";
        } else if (error.message.includes("Cannot add yourself")) {
          errorMessage = "자기 자신을 친구로 추가할 수 없습니다.";
        } else if (error.message.includes("User not found")) {
          errorMessage = "해당 사용자를 찾을 수 없습니다.";
        } else {
          errorMessage = error.message;
        }
      }
      
      toast({
        variant: "destructive",
        title: "친구 추가 실패",
        description: errorMessage,
      });
    },
  });

  const handleClose = () => {
    setContactUsername("");
    setNickname("");
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactUsername.trim()) {
      toast({
        variant: "destructive",
        title: "입력 오류",
        description: "사용자 ID를 입력해주세요.",
      });
      return;
    }

    // 닉네임이 비어있으면 사용자 정보를 가져와서 표시 이름을 자동 입력
    if (!nickname.trim()) {
      try {
        const response = await fetch(`/api/users/by-username/${contactUsername}`);
        if (response.ok) {
          const userData = await response.json();
          if (userData.user?.displayName) {
            setNickname(userData.user.displayName);
          }
        }
      } catch (error) {
        // 사용자 정보 가져오기 실패해도 계속 진행
        console.log('사용자 정보 가져오기 실패:', error);
      }
    }

    addContactMutation.mutate();
  };

  // QR 코드 생성
  useEffect(() => {
    if (open && user?.id) {
      generateQRCode();
    }
  }, [open, user?.id]);

  // 모바일 환경 감지 및 키보드 이벤트 처리
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024); // lg breakpoint
    };

    const handleResize = () => {
      if (isMobile) {
        const currentHeight = window.innerHeight;
        const screenHeight = window.screen.height;
        const keyboardThreshold = screenHeight * 0.75; // 화면의 75% 이하일 때 키보드가 올라온 것으로 판단
        
        if (currentHeight < keyboardThreshold) {
          setKeyboardHeight(screenHeight - currentHeight);
        } else {
          setKeyboardHeight(0);
        }
      }
    };

    checkMobile();
    handleResize();

    window.addEventListener('resize', checkMobile);
    window.addEventListener('resize', handleResize);
    
    // iOS Safari를 위한 visualViewport API 사용
    if (window.visualViewport) {
      const handleViewportChange = () => {
        if (isMobile) {
          const heightDiff = window.screen.height - window.visualViewport.height;
          setKeyboardHeight(heightDiff > 150 ? heightDiff : 0); // 150px 이상 차이날 때만 키보드로 판단
        }
      };
      
      window.visualViewport.addEventListener('resize', handleViewportChange);
      
      return () => {
        window.removeEventListener('resize', checkMobile);
        window.removeEventListener('resize', handleResize);
        window.visualViewport?.removeEventListener('resize', handleViewportChange);
      };
    }

    return () => {
      window.removeEventListener('resize', checkMobile);
      window.removeEventListener('resize', handleResize);
    };
  }, [open, isMobile]);

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
    // 자기 자신을 스캔한 경우 방지
    if (userId === user?.id) {
      toast({
        title: "친구 추가 불가",
        description: "자기 자신을 친구로 추가할 수 없습니다.",
        variant: "destructive",
      });
      return;
    }

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
    } catch (error: any) {
      let errorMessage = "오류가 발생했습니다.";
      
      if (error.message) {
        if (error.message.includes("already in your contacts")) {
          errorMessage = "이미 친구 목록에 있는 사용자입니다.";
        } else if (error.message.includes("Cannot add yourself")) {
          errorMessage = "자기 자신을 친구로 추가할 수 없습니다.";
        } else {
          errorMessage = error.message;
        }
      }
      
      toast({
        title: "친구 추가 실패",
        description: errorMessage,
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
      <DialogContent 
        className="w-full max-w-md"
        style={isMobile && keyboardHeight > 0 ? {
          position: 'fixed',
          top: '10px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '85vw',
          maxWidth: '320px',
          height: `${Math.min(window.innerHeight - keyboardHeight - 20, 350)}px`,
          minHeight: '260px',
          padding: '12px'
        } : isMobile ? {
          width: '85vw',
          maxWidth: '320px',
          maxHeight: '60vh',
          padding: '12px'
        } : {
          maxHeight: '80vh'
        }}
      >
        <div className={`flex flex-col ${isMobile && keyboardHeight > 0 ? 'h-full' : ''}`}>
          <DialogHeader className={`${isMobile && keyboardHeight > 0 ? 'flex-shrink-0' : ''} ${isMobile ? 'pb-2' : ''}`}>
            <DialogTitle className={isMobile ? 'text-base' : ''}>친구 추가</DialogTitle>
          </DialogHeader>
          
          <div className={`${isMobile && keyboardHeight > 0 ? 'flex-1 overflow-y-auto' : ''} ${isMobile ? '-mt-2' : ''}`}>
            <form onSubmit={handleSubmit} className={`${isMobile ? 'space-y-2' : 'space-y-4'}`}>
              <div className={isMobile ? 'space-y-1.5' : 'space-y-3'}>
                <div>
                  <Label htmlFor="contactUsername" className={`font-medium text-gray-700 ${isMobile ? 'text-xs mb-1' : 'text-sm'}`}>
                    사용자 ID
                  </Label>
                  <Input
                    id="contactUsername"
                    type="text"
                    placeholder="@username"
                    value={contactUsername}
                    onChange={(e) => setContactUsername(e.target.value)}
                    className={`${isMobile ? 'h-8 text-sm px-2' : 'mt-1'}`}
                    disabled={addContactMutation.isPending}
                  />
                </div>
                
                <div>
                  <Label htmlFor="nickname" className={`font-medium text-gray-700 ${isMobile ? 'text-xs mb-1' : 'text-sm'}`}>
                    닉네임 (선택)
                  </Label>
                  <Input
                    id="nickname"
                    type="text"
                    placeholder="닉네임"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    className={`${isMobile ? 'h-8 text-sm px-2' : 'mt-1'}`}
                    disabled={addContactMutation.isPending}
                  />
                  {!isMobile && (
                    <p className="text-xs text-gray-500 mt-1">
                      입력하지 않으면 사용자 ID가 표시됩니다
                    </p>
                  )}
                </div>
              </div>
              
              <div className={`border-t border-gray-200 ${isMobile ? 'pt-1.5 space-y-1.5' : 'pt-4 space-y-3'}`}>
                <Button
                  type="submit"
                  className={`w-full purple-gradient hover:purple-gradient-hover ${isMobile ? 'h-8 text-xs px-2' : ''}`}
                  disabled={addContactMutation.isPending}
                >
                  <UserPlus className={`${isMobile ? 'h-3 w-3 mr-1' : 'mr-2 h-4 w-4'}`} />
                  {addContactMutation.isPending ? "추가 중..." : "친구 추가"}
                </Button>
                
                <Button
                  type="button"
                  variant="outline"
                  className={`w-full ${isMobile ? 'h-8 text-xs px-2' : ''}`}
                  onClick={() => setShowQRScanner(true)}
                >
                  <Camera className={`${isMobile ? 'h-3 w-3 mr-1' : 'mr-2 h-4 w-4'}`} />
                  QR 스캔
                </Button>
              </div>
            </form>
          </div>
        </div>
      </DialogContent>
    </Dialog>

      <QRScannerModal
        isOpen={showQRScanner}
        onClose={() => setShowQRScanner(false)}
        onSuccess={(contact) => {
          queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
          setShowQRScanner(false);
          handleClose();
        }}
      />
    </>
  );
}
