import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, Copy, RefreshCw } from 'lucide-react';
import QRCode from 'qrcode';

interface QRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function QRCodeModal({ isOpen, onClose }: QRCodeModalProps) {
  const { user } = useAuth();
  const [qrCodeUrl, setQRCodeUrl] = useState<string>('');
  const [token, setToken] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);

  const generateQRCode = async () => {
    if (!user) return;
    
    setIsGenerating(true);
    try {
      // 서버에서 QR 토큰 생성
      const response = await fetch('/api/qr/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': user.id.toString()
        }
      });

      if (!response.ok) {
        throw new Error('QR 코드 생성 실패');
      }

      const data = await response.json();
      const newToken = data.token;
      setToken(newToken);

      // QR 코드 이미지 생성
      const qrDataUrl = await QRCode.toDataURL(newToken, {
        width: 256,
        margin: 2,
        color: {
          dark: '#7c3aed',
          light: '#ffffff'
        }
      });

      setQRCodeUrl(qrDataUrl);
    } catch (error) {
      console.error('QR 코드 생성 오류:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToken = () => {
    if (token) {
      navigator.clipboard.writeText(token);
    }
  };

  // 모달이 열릴 때 QR 코드 생성
  useEffect(() => {
    if (isOpen && user) {
      generateQRCode();
    }
  }, [isOpen, user]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">내 QR 코드</DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col items-center space-y-4 py-4">
          {isGenerating ? (
            <div className="flex flex-col items-center space-y-2">
              <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
              <p className="text-sm text-gray-600">QR 코드 생성 중...</p>
            </div>
          ) : qrCodeUrl ? (
            <>
              <div className="bg-white p-4 rounded-lg border-2 border-purple-200 shadow-lg">
                <img 
                  src={qrCodeUrl} 
                  alt="QR Code" 
                  className="w-48 h-48"
                />
              </div>
              
              <div className="text-center space-y-2">
                <p className="text-sm font-medium text-gray-700">
                  {user?.displayName}님의 연락처 QR 코드
                </p>
                <p className="text-xs text-gray-500">
                  이 코드를 다른 사람이 스캔하면 자동으로 연락처에 추가됩니다.
                </p>
                <p className="text-xs text-red-500">
                  ⏰ 24시간 후 자동 만료됩니다.
                </p>
              </div>

              <div className="flex space-x-2 w-full">
                <Button
                  onClick={copyToken}
                  variant="outline"
                  className="flex-1"
                  size="sm"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  코드 복사
                </Button>
                <Button
                  onClick={generateQRCode}
                  variant="outline"
                  className="flex-1"
                  size="sm"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  새로 생성
                </Button>
              </div>
            </>
          ) : (
            <div className="text-center">
              <p className="text-sm text-gray-600">QR 코드를 생성할 수 없습니다.</p>
            </div>
          )}
        </div>

        <div className="flex justify-center">
          <Button onClick={onClose} variant="outline">
            닫기
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}