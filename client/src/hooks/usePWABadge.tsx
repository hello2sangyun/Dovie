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
    staleTime: 10000, // 10초간 fresh
    retry: 1 // 실패 시 1회만 재시도
  });

  // 배지 업데이트 함수 (iOS 16+ PWA 최적화)
  const updateBadge = useCallback(async (count: number) => {
    console.log('🎯 배지 업데이트 시작:', count);
    
    try {
      // 방법 1: Navigator API 직접 사용
      if ('setAppBadge' in navigator) {
        if (count > 0) {
          await (navigator as any).setAppBadge(count);
          console.log('✅ navigator.setAppBadge 성공:', count);
        } else {
          await (navigator as any).clearAppBadge();
          console.log('✅ navigator.clearAppBadge 성공');
        }
      }
    } catch (error) {
      console.log('navigator.setAppBadge 실패:', error);
    }

    try {
      // 방법 2: 기존 Service Worker를 통한 배지 설정 (별도 SW 등록하지 않음)
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'UPDATE_BADGE',
          count: count
        });
        console.log('✅ Service Worker 배지 업데이트 요청 전송:', count);
      }
    } catch (error) {
      console.log('Service Worker 배지 설정 실패:', error);
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