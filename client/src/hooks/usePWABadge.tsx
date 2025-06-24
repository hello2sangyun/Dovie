import { useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from './useAuth';

export function usePWABadge() {
  const { user } = useAuth();

  // 읽지 않은 메시지 수 조회
  const { data: unreadCounts } = useQuery({
    queryKey: ['/api/unread-counts'],
    enabled: !!user,
    refetchInterval: 30000, // 30초마다 갱신
    staleTime: 10000 // 10초간 fresh
  });

  // iOS 16 PWA 배지 업데이트 (안전한 방식)
  const updateBadge = useCallback(async (count: number) => {
    if (typeof count !== 'number' || count < 0) return;
    
    try {
      // iOS 16+ PWA에서 가장 안정적인 방법
      if ('setAppBadge' in navigator) {
        if (count > 0) {
          await (navigator as any).setAppBadge(count);
          console.log('배지 설정:', count);
        } else {
          await (navigator as any).clearAppBadge();
          console.log('배지 클리어');
        }
        return; // 성공하면 SW 메소드는 건너뛰기
      }
    } catch (error) {
      console.log('배지 API 실패:', error);
    }

    try {
      // Service Worker 백업 방법 (충돌 방지)
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'SET_BADGE',
          count: count
        });
      }
    } catch (error) {
      console.log('SW 배지 실패:', error);
    }
  }, []);

  // 배지 클리어 함수
  const clearBadge = useCallback(async () => {
    await updateBadge(0);
  }, [updateBadge]);

  // 읽지 않은 메시지 수 변경 시 배지 업데이트
  useEffect(() => {
    if (unreadCounts && Array.isArray(unreadCounts)) {
      const totalUnread = unreadCounts.reduce((total: number, room: any) => 
        total + (room.unreadCount || 0), 0
      );
      updateBadge(totalUnread);
    }
  }, [unreadCounts, updateBadge]);

  // 앱이 포커스될 때 배지 클리어
  useEffect(() => {
    const handleFocus = () => {
      console.log('🎯 앱 포커스됨 - 배지 클리어');
      clearBadge();
      
      // Service Worker에 포커스 알림
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'APP_FOCUS'
        });
      }
    };

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        handleFocus();
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [clearBadge]);

  // Service Worker 메시지 수신
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'BADGE_UPDATE') {
        updateBadge(event.data.count || 0);
      } else if (event.data?.type === 'NOTIFICATION_CLICKED') {
        // 알림 클릭 시 배지 클리어
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

  return {
    updateBadge,
    clearBadge,
    unreadCount: unreadCounts?.reduce((total: number, room: any) => 
      total + (room.unreadCount || 0), 0) || 0
  };
}