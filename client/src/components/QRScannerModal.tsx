import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Camera, X, Flashlight, FlashlightOff } from "lucide-react";
import QrScanner from 'qr-scanner';
import { useToast } from "@/hooks/use-toast";

interface QRScannerModalProps {
  open: boolean;
  onClose: () => void;
  onScanResult: (userId: number, userData: any) => void;
}

export default function QRScannerModal({ open, onClose, onScanResult }: QRScannerModalProps) {
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const qrScannerRef = useRef<QrScanner | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [hasFlashlight, setHasFlashlight] = useState(false);
  const [flashlightOn, setFlashlightOn] = useState(false);
  const [cameraError, setCameraError] = useState<string>("");

  useEffect(() => {
    if (open && videoRef.current) {
      startScanning();
    } else {
      stopScanning();
    }

    return () => {
      stopScanning();
    };
  }, [open]);

  const startScanning = async () => {
    if (!videoRef.current) return;

    try {
      setCameraError("");
      setIsScanning(true);

      // 먼저 카메라 권한을 요청
      try {
        await navigator.mediaDevices.getUserMedia({ video: true });
      } catch (permissionError) {
        throw new Error("카메라 권한이 필요합니다. 브라우저에서 카메라 접근을 허용해주세요.");
      }

      // QR 스캐너 초기화
      qrScannerRef.current = new QrScanner(
        videoRef.current,
        (result) => handleScanResult(result.data),
        {
          highlightScanRegion: true,
          highlightCodeOutline: true,
          preferredCamera: 'environment', // 후면 카메라 우선
          maxScansPerSecond: 5,
        }
      );

      await qrScannerRef.current.start();

      // 플래시라이트 지원 확인
      try {
        const hasFlash = await qrScannerRef.current.hasFlash();
        setHasFlashlight(hasFlash);
      } catch (flashError) {
        console.log("플래시라이트 지원 안됨");
        setHasFlashlight(false);
      }

    } catch (error: any) {
      console.error("카메라 시작 실패:", error);
      let errorMessage = "카메라에 접근할 수 없습니다.";
      
      if (error?.message) {
        errorMessage = error.message;
      } else if (error?.name === 'NotAllowedError') {
        errorMessage = "카메라 권한이 거부되었습니다. 브라우저 설정에서 카메라 접근을 허용해주세요.";
      } else if (error?.name === 'NotFoundError') {
        errorMessage = "카메라를 찾을 수 없습니다. 디바이스에 카메라가 연결되어 있는지 확인해주세요.";
      } else if (error?.name === 'NotSupportedError') {
        errorMessage = "이 브라우저에서는 카메라 기능이 지원되지 않습니다.";
      } else if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
        errorMessage = "보안상의 이유로 HTTPS 연결에서만 카메라를 사용할 수 있습니다.";
      }
      
      setCameraError(errorMessage);
      setIsScanning(false);
    }
  };

  const stopScanning = () => {
    if (qrScannerRef.current) {
      qrScannerRef.current.stop();
      qrScannerRef.current.destroy();
      qrScannerRef.current = null;
    }
    setIsScanning(false);
    setFlashlightOn(false);
  };

  const handleScanResult = async (qrData: string) => {
    try {
      // QR 데이터가 사용자 ID인지 확인
      const userData = JSON.parse(qrData);
      
      if (userData.type === 'vault_user' && userData.userId) {
        // 사용자 정보 가져오기
        const response = await fetch(`/api/users/${userData.userId}`, {
          headers: {
            'x-user-id': localStorage.getItem('userId') || '',
          },
        });

        if (response.ok) {
          const userInfo = await response.json();
          onScanResult(userData.userId, userInfo.user);
          onClose();
          
          toast({
            title: "QR 스캔 성공!",
            description: `${userInfo.user.displayName}을 친구로 추가합니다.`,
          });
        } else {
          throw new Error("사용자 정보를 가져올 수 없습니다.");
        }
      } else {
        throw new Error("올바른 Dovie Messenger QR코드가 아닙니다.");
      }
    } catch (error) {
      toast({
        title: "QR 스캔 오류",
        description: error instanceof Error ? error.message : "올바른 QR코드를 스캔해주세요.",
        variant: "destructive",
      });
    }
  };

  const toggleFlashlight = async () => {
    if (qrScannerRef.current && hasFlashlight) {
      try {
        if (flashlightOn) {
          await qrScannerRef.current.turnFlashOff();
          setFlashlightOn(false);
        } else {
          await qrScannerRef.current.turnFlashOn();
          setFlashlightOn(true);
        }
      } catch (error) {
        console.error("플래시라이트 제어 실패:", error);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Camera className="h-5 w-5 text-purple-600" />
            <span>QR코드 스캔</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {cameraError ? (
            <div className="text-center py-8">
              <div className="text-red-600 mb-4 text-sm">{cameraError}</div>
              <div className="space-y-2">
                <Button onClick={startScanning} variant="outline" className="w-full">
                  <Camera className="h-4 w-4 mr-2" />
                  다시 시도
                </Button>
                <div className="text-xs text-gray-500">
                  브라우저에서 카메라 권한을 허용해주세요
                </div>
              </div>
            </div>
          ) : (
            <div className="relative">
              <video
                ref={videoRef}
                className="w-full h-64 bg-black rounded-lg object-cover"
                playsInline
                muted
              />
              
              {isScanning && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-48 h-48 border-2 border-purple-500 rounded-lg relative">
                    <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-purple-500"></div>
                    <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-purple-500"></div>
                    <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-purple-500"></div>
                    <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-purple-500"></div>
                  </div>
                </div>
              )}

              {/* 플래시라이트 버튼 */}
              {hasFlashlight && isScanning && (
                <Button
                  onClick={toggleFlashlight}
                  variant="secondary"
                  size="sm"
                  className="absolute top-2 right-2"
                >
                  {flashlightOn ? (
                    <FlashlightOff className="h-4 w-4" />
                  ) : (
                    <Flashlight className="h-4 w-4" />
                  )}
                </Button>
              )}
            </div>
          )}

          <div className="text-center text-sm text-gray-600">
            상대방의 QR코드를 카메라로 스캔하세요
          </div>

          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={onClose}>
              취소
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}