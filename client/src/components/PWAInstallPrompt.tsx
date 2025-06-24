import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { X, Download } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Chrome PWA 설치 프롬프트 감지
    const handleBeforeInstallPrompt = (e: Event) => {
      console.log('[Chrome PWA] 설치 프롬프트 감지됨');
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowInstallPrompt(true);
    };

    // Chrome PWA 설치 완료 감지
    const handleAppInstalled = () => {
      console.log('[Chrome PWA] 앱 설치 완료');
      setIsInstalled(true);
      setShowInstallPrompt(false);
      setDeferredPrompt(null);
    };

    // Chrome PWA 모드 감지
    const checkIfInstalled = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      const isInWebApk = (window.navigator as any).standalone === true;
      
      if (isStandalone || isInWebApk) {
        console.log('[Chrome PWA] 이미 설치된 상태');
        setIsInstalled(true);
        setShowInstallPrompt(false);
      }
    };

    // 이벤트 리스너 등록
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    
    // 초기 설치 상태 확인
    checkIfInstalled();

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    try {
      console.log('[Chrome PWA] 설치 프롬프트 표시');
      await deferredPrompt.prompt();
      
      const { outcome } = await deferredPrompt.userChoice;
      console.log('[Chrome PWA] 사용자 선택:', outcome);
      
      if (outcome === 'accepted') {
        console.log('[Chrome PWA] 설치 승인됨');
      } else {
        console.log('[Chrome PWA] 설치 거부됨');
      }
      
      setDeferredPrompt(null);
      setShowInstallPrompt(false);
    } catch (error) {
      console.error('[Chrome PWA] 설치 프롬프트 오류:', error);
    }
  };

  const handleDismiss = () => {
    setShowInstallPrompt(false);
    localStorage.setItem('pwa-install-dismissed', 'true');
  };

  // 이미 설치되었거나 프롬프트가 없으면 표시하지 않음
  if (isInstalled || !showInstallPrompt || !deferredPrompt) {
    return null;
  }

  // 이전에 거부한 경우 표시하지 않음
  if (localStorage.getItem('pwa-install-dismissed') === 'true') {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-sm">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
              Dovie Messenger 설치
            </h3>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              홈 화면에 추가하여 더 빠르게 접속하세요
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="flex gap-2">
          <Button
            onClick={handleInstallClick}
            size="sm"
            className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
          >
            <Download className="h-4 w-4 mr-1" />
            설치
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDismiss}
            className="flex-1"
          >
            나중에
          </Button>
        </div>
      </div>
    </div>
  );
}