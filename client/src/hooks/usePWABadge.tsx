import { useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';

export function usePWABadge() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // 읽지 않은 메시지 수 조회
  const { data: unreadCounts } = useQuery({
    queryKey: ['/api/unread-counts'],
    enabled: !!user,
    refetchInterval: 30000, // 30초마다 갱신
    staleTime: 10000 // 10초간 fresh
  });

  // 배지 업데이트 함수
  const updateBadge = useCallback(async (count: number) => {
    try {
      // iOS 16+ PWA 배지 API 사용
      if ('setAppBadge' in navigator) {
        if (count > 0) {
          await navigator.setAppBadge(count);
          console.log('🎯 PWA 배지 업데이트:', count);
        } else {
          await navigator.clearAppBadge();
          console.log('🎯 PWA 배지 클리어');
        }
      }

      // Service Worker에도 알림
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'UPDATE_BADGE',
          count: count
        });
      }
    } catch (error) {
      console.error('❌ 배지 업데이트 실패:', error);
    }
  }, []);

  // 배지 클리어 함수
  const clearBadge = useCallback(async () => {
    await updateBadge(0);
  }, [updateBadge]);

  // 읽지 않은 메시지 수 변경 시 배지 업데이트 (앱 시작시에도 실행)
  useEffect(() => {
    if (unreadCounts?.unreadCounts && Array.isArray(unreadCounts.unreadCounts)) {
      const totalUnread = unreadCounts.unreadCounts.reduce((total: number, room: any) => 
        total + (room.unreadCount || 0), 0
      );
      console.log('🎯 PWA 배지 업데이트 요청:', totalUnread);
      updateBadge(totalUnread);
    }
  }, [unreadCounts, updateBadge]);

  // PWA 앱 시작시 배지 상태 강제 복원
  useEffect(() => {
    if (user) {
      // 앱이 시작될 때 unread counts를 즉시 새로고침하여 배지 복원
      queryClient.invalidateQueries({ queryKey: ['/api/unread-counts'] });
      console.log('🎯 PWA 앱 시작 - 배지 상태 복원');
    }
  }, [user, queryClient]);

  // 앱 포커스 시 Service Worker에만 알림 (배지는 실제 읽음 처리 시에만 클리어)
  useEffect(() => {
    const handleFocus = () => {
      console.log('🎯 앱 포커스됨 - Service Worker에 알림');
      
      // Service Worker에 포커스 알림 (배지 클리어 없이)
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
  }, []);

  // Service Worker 메시지 수신
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'BADGE_UPDATE') {
        updateBadge(event.data.count || 0);
      } else if (event.data?.type === 'NOTIFICATION_CLICKED') {
        // 알림 클릭 시 실제 읽지 않은 메시지 수를 다시 조회하여 배지 업데이트
        queryClient.invalidateQueries({ queryKey: ['/api/unread-counts'] });
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
    unreadCount: unreadCounts?.unreadCounts?.reduce((total: number, room: any) => 
      total + (room.unreadCount || 0), 0) || 0
  };
}