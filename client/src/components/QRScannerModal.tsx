import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { Camera, Upload, Type } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import QrScanner from 'qr-scanner';

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (contact: any) => void;
}

export default function QRScannerModal({ isOpen, onClose, onSuccess }: QRScannerModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const qrScannerRef = useRef<QrScanner | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [manualToken, setManualToken] = useState('');
  const [scanMode, setScanMode] = useState<'camera' | 'manual'>('camera');
  const [isProcessing, setIsProcessing] = useState(false);

  const startScanning = async () => {
    if (!videoRef.current) {
      console.log('Video element not ready');
      return;
    }

    try {
      setIsScanning(true);
      
      // 카메라 권한 요청
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment' // 후면 카메라 우선
        } 
      });
      
      // QR 스캐너 초기화
      qrScannerRef.current = new QrScanner(
        videoRef.current,
        (result) => {
          handleQRResult(result.data);
        },
        {
          highlightScanRegion: true,
          highlightCodeOutline: true,
          maxScansPerSecond: 2,
          preferredCamera: 'environment'
        }
      );

      await qrScannerRef.current.start();
      console.log('QR 스캐너 시작됨');
    } catch (error) {
      console.error('카메라 시작 오류:', error);
      toast({
        title: "카메라 오류",
        description: "카메라에 접근할 수 없습니다. 브라우저 설정에서 카메라 권한을 허용해주세요.",
        variant: "destructive"
      });
      setScanMode('manual');
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
  };

  const handleQRResult = async (token: string) => {
    if (isProcessing) return;
    
    setIsProcessing(true);
    stopScanning();

    try {
      await processQRToken(token);
    } finally {
      setIsProcessing(false);
    }
  };

  const processQRToken = async (token: string) => {
    if (!user || !token.trim()) return;

    try {
      const response = await fetch('/api/qr/scan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': user.id.toString()
        },
        body: JSON.stringify({ token: token.trim() })
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "연락처 추가 완료",
          description: data.message
        });
        onSuccess(data.contact);
        onClose();
      } else {
        toast({
          title: "연락처 추가 실패",
          description: data.message,
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('QR 처리 오류:', error);
      toast({
        title: "오류",
        description: "QR 코드 처리 중 오류가 발생했습니다.",
        variant: "destructive"
      });
    }
  };

  const handleManualSubmit = () => {
    if (manualToken.trim()) {
      processQRToken(manualToken.trim());
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      QrScanner.scanImage(file)
        .then((result) => {
          handleQRResult(result);
        })
        .catch((error) => {
          console.error('이미지 QR 스캔 오류:', error);
          toast({
            title: "스캔 실패",
            description: "이미지에서 QR 코드를 찾을 수 없습니다.",
            variant: "destructive"
          });
        });
    }
  };

  useEffect(() => {
    if (isOpen && scanMode === 'camera') {
      // 모달이 완전히 렌더링된 후 카메라 시작
      setTimeout(() => {
        startScanning();
      }, 100);
    }

    return () => {
      stopScanning();
    };
  }, [isOpen, scanMode]);

  useEffect(() => {
    return () => {
      stopScanning();
    };
  }, []);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">QR 코드 스캔</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* 스캔 모드 선택 */}
          <div className="flex space-x-2">
            <Button
              onClick={() => setScanMode('camera')}
              variant={scanMode === 'camera' ? 'default' : 'outline'}
              size="sm"
              className="flex-1"
            >
              <Camera className="h-4 w-4 mr-2" />
              카메라
            </Button>
            <Button
              onClick={() => setScanMode('manual')}
              variant={scanMode === 'manual' ? 'default' : 'outline'}
              size="sm"
              className="flex-1"
            >
              <Type className="h-4 w-4 mr-2" />
              직접 입력
            </Button>
          </div>

          {scanMode === 'camera' ? (
            <div className="space-y-4">
              <div className="relative bg-black rounded-lg overflow-hidden">
                <video
                  ref={videoRef}
                  className="w-full h-64 object-cover"
                  playsInline
                  muted
                />
                {isProcessing && (
                  <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                    <div className="text-white text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
                      <p>처리 중...</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="text-center">
                <p className="text-sm text-gray-600 mb-2">
                  QR 코드를 카메라에 맞춰주세요
                </p>
                
                {/* 파일 업로드 옵션 */}
                <div className="flex justify-center">
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <Button variant="outline" size="sm" asChild>
                      <span>
                        <Upload className="h-4 w-4 mr-2" />
                        이미지에서 스캔
                      </span>
                    </Button>
                  </label>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  QR 코드 입력
                </label>
                <Input
                  value={manualToken}
                  onChange={(e) => setManualToken(e.target.value)}
                  placeholder="QR 코드를 직접 입력하세요"
                  className="w-full"
                />
              </div>
              
              <Button 
                onClick={handleManualSubmit}
                disabled={!manualToken.trim() || isProcessing}
                className="w-full"
              >
                {isProcessing ? '처리 중...' : '연락처 추가'}
              </Button>
            </div>
          )}
        </div>

        <div className="flex justify-center space-x-2">
          <Button onClick={onClose} variant="outline">
            닫기
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}