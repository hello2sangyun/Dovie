import { useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';

export function usePWABadge() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // 읽지 않은 메시지 수 조회 - independent from push notifications
  const { data: unreadCounts } = useQuery({
    queryKey: ['/api/unread-counts'],
    enabled: !!user,
    staleTime: 0, // Always fetch fresh data for accurate badge count
    refetchOnMount: true, // Always refresh when component mounts
    refetchOnWindowFocus: true, // Refresh when app becomes visible
    refetchInterval: 5000, // Poll every 5 seconds for accurate badge updates
  });

  // 배지 업데이트 함수 - 실제 읽지 않은 메시지 수만 반영
  const updateBadge = useCallback(async (count: number) => {
    try {
      console.log('🎯 PWA 배지 업데이트 시도 (실제 읽지 않은 메시지):', count);
      
      // iOS 16+ PWA 배지 API 사용 - 강제 업데이트
      if ('setAppBadge' in navigator) {
        // Always clear first, then set new count
        await navigator.clearAppBadge();
        
        if (count > 0) {
          await navigator.setAppBadge(count);
          console.log('🎯 PWA 배지 설정 완료:', count);
        } else {
          console.log('🎯 PWA 배지 클리어 완료');
        }
      } else {
        console.log('🎯 setAppBadge API 지원하지 않음, 카운트:', count);
      }

      // Service Worker에도 정확한 카운트 전달
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'UPDATE_BADGE_FORCE',
          count: count,
          source: 'database' // 데이터베이스 기반 업데이트임을 명시
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

  // 읽지 않은 메시지 수 변경 시 배지 업데이트 - 실제 데이터베이스 기반으로만 업데이트
  useEffect(() => {
    if (unreadCounts?.unreadCounts && Array.isArray(unreadCounts.unreadCounts)) {
      const totalUnread = unreadCounts.unreadCounts.reduce((total: number, room: any) => 
        total + (room.unreadCount || 0), 0
      );
      console.log('🎯 PWA 배지 업데이트 (데이터베이스 기반):', totalUnread);
      
      // Force clear all existing notifications to prevent interference
      if ('serviceWorker' in navigator && 'getNotifications' in navigator.serviceWorker) {
        navigator.serviceWorker.getNotifications().then(notifications => {
          notifications.forEach(notification => notification.close());
        }).catch(err => console.log('Could not clear notifications:', err));
      }
      
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