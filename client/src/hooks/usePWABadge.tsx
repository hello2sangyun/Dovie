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

  // Chrome PWA 배지 업데이트 함수
  const updateBadge = useCallback(async (count: number) => {
    console.log('🎯 Chrome PWA 배지 업데이트 시작:', count);
    
    try {
      // Chrome PWA Navigator Badge API (최우선)
      if ('setAppBadge' in navigator) {
        if (count > 0) {
          await (navigator as any).setAppBadge(count);
          console.log('✅ Chrome PWA navigator.setAppBadge 성공:', count);
        } else {
          await (navigator as any).clearAppBadge();
          console.log('✅ Chrome PWA navigator.clearAppBadge 성공');
        }
        return; // Chrome PWA에서 성공하면 바로 반환
      }
    } catch (error) {
      console.log('Chrome PWA navigator.setAppBadge 실패:', error);
    }

    try {
      // Chrome PWA Service Worker를 통한 배지 설정
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        
        // Service Worker Registration Badge API
        if (registration && 'setAppBadge' in registration) {
          if (count > 0) {
            await (registration as any).setAppBadge(count);
            console.log('✅ Chrome PWA registration.setAppBadge 성공:', count);
          } else {
            await (registration as any).clearAppBadge();
            console.log('✅ Chrome PWA registration.clearAppBadge 성공');
          }
          return;
        }
        
        // Service Worker 메시지를 통한 배지 설정
        if (registration.active) {
          registration.active.postMessage({
            type: 'BADGE_UPDATE',
            count: count
          });
          console.log('📤 Chrome PWA Service Worker 배지 메시지 전송:', count);
        }
      }
    } catch (error) {
      console.log('Chrome PWA Service Worker 배지 설정 실패:', error);
    }
  }, []);

  // 배지 클리어 함수
  const clearBadge = useCallback(async () => {
    await updateBadge(0);
  }, [updateBadge]);

  // 읽지 않은 메시지 수 변경 시 배지 업데이트
  useEffect(() => {
    if (unreadCounts) {
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