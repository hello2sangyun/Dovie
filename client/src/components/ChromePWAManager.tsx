import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { usePWAPushNotifications } from '@/hooks/usePWAPushNotifications';
import { usePWABadge } from '@/hooks/usePWABadge';
import { PWAInstallPrompt } from './PWAInstallPrompt';

export function ChromePWAManager() {
  const { user } = useAuth();
  const { isSupported, permission, isSubscribed, reinitialize } = usePWAPushNotifications();
  const { updateBadge, clearBadge, unreadCount } = usePWABadge();

  // Chrome PWA 초기화
  useEffect(() => {
    if (user) {
      console.log('[Chrome PWA] 사용자 로그인 감지 - PWA 시스템 초기화');
      
      // Chrome PWA 푸시 알림 시스템 초기화
      if (!isSubscribed && permission !== 'denied') {
        reinitialize();
      }
      
      // 초기 배지 설정
      if (unreadCount > 0) {
        updateBadge(unreadCount);
      }
    }
  }, [user, isSubscribed, permission, reinitialize, updateBadge, unreadCount]);

  // Chrome PWA 앱 포커스 시 배지 클리어
  useEffect(() => {
    const handleFocus = () => {
      clearBadge();
    };

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        clearBadge();
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [clearBadge]);

  // Chrome PWA Service Worker 메시지 처리
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      console.log('[Chrome PWA] Service Worker 메시지:', event.data);
      
      if (event.data?.type === 'BADGE_UPDATE') {
        updateBadge(event.data.count || 0);
      } else if (event.data?.type === 'NOTIFICATION_CLICKED') {
        clearBadge();
      }
    };

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleMessage);
      
      return () => {
        navigator.serviceWorker.removeEventListener('message', handleMessage);
      };
    }
  }, [updateBadge, clearBadge]);

  return (
    <>
      {/* Chrome PWA 설치 프롬프트 */}
      <PWAInstallPrompt />
      
      {/* Chrome PWA 상태 디버깅 (개발 모드에서만) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed top-0 right-0 bg-black text-white text-xs p-2 z-50 opacity-75">
          <div>Chrome PWA 지원: {isSupported ? '✅' : '❌'}</div>
          <div>알림 권한: {permission}</div>
          <div>푸시 구독: {isSubscribed ? '✅' : '❌'}</div>
          <div>읽지 않은 메시지: {unreadCount}</div>
        </div>
      )}
    </>
  );
}