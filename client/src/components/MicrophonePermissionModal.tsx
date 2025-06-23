import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Mic, MicOff } from 'lucide-react';

interface MicrophonePermissionModalProps {
  isOpen: boolean;
  onPermissionResult: (granted: boolean) => void;
}

export function MicrophonePermissionModal({ isOpen, onPermissionResult }: MicrophonePermissionModalProps) {
  const [isRequesting, setIsRequesting] = useState(false);

  const handleAllowMicrophone = async () => {
    setIsRequesting(true);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: true,
        video: false 
      });
      
      // 스트림을 즉시 중지
      stream.getTracks().forEach(track => track.stop());
      
      console.log('마이크 권한이 허용되었습니다.');
      onPermissionResult(true);
    } catch (error) {
      console.log('마이크 권한이 거부되었습니다:', error);
      onPermissionResult(false);
    } finally {
      setIsRequesting(false);
    }
  };

  const handleDenyMicrophone = () => {
    console.log('사용자가 마이크 권한을 거부했습니다.');
    onPermissionResult(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900">
            <Mic className="h-6 w-6 text-purple-600 dark:text-purple-400" />
          </div>
          <DialogTitle className="text-xl font-semibold">
            마이크 권한 요청
          </DialogTitle>
          <DialogDescription className="text-center space-y-2">
            <p>
              음성 메시지 기능을 사용하려면 마이크 접근 권한이 필요합니다.
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              권한을 허용하면 더 편리하게 메시지를 보낼 수 있습니다.
            </p>
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 mt-6">
          <Button
            onClick={handleAllowMicrophone}
            disabled={isRequesting}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white"
          >
            {isRequesting ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                권한 요청 중...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Mic className="h-4 w-4" />
                마이크 권한 허용
              </div>
            )}
          </Button>

          <Button
            onClick={handleDenyMicrophone}
            variant="outline"
            disabled={isRequesting}
            className="w-full"
          >
            <MicOff className="h-4 w-4 mr-2" />
            나중에 설정하기
          </Button>
        </div>

        <div className="mt-4 text-xs text-gray-500 dark:text-gray-400 text-center">
          이 설정은 나중에 브라우저 설정에서 변경할 수 있습니다.
        </div>
      </DialogContent>
    </Dialog>
  );
}