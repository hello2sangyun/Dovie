import { useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';

export function usePWABadge() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // 읽지 않은 메시지 수 조회 - purely database-driven, completely independent from push notifications
  const { data: unreadCounts } = useQuery({
    queryKey: ['/api/unread-counts'],
    enabled: !!user,
    staleTime: 0, // Always fetch fresh data for real-time accuracy
    refetchOnMount: true, // Always refresh when component mounts
    refetchOnWindowFocus: true, // Refresh when app becomes visible
    refetchInterval: 3000, // Poll every 3 seconds for immediate badge updates
    refetchOnReconnect: true, // Refresh when network reconnects
    retry: 3, // Retry failed requests
  });

  // 배지 업데이트 함수 - 순수하게 데이터베이스 읽지 않은 메시지 수만 반영
  const updateBadge = useCallback(async (count: number) => {
    try {
      console.log('🔢 PWA 배지를 데이터베이스 카운트로 설정:', count);
      
      // iOS 16+ PWA 배지 API 사용 - 정확한 데이터베이스 카운트로 설정
      if ('setAppBadge' in navigator) {
        // 푸시 알림 영향을 완전히 제거하기 위해 clear 후 설정
        await navigator.clearAppBadge();
        
        // 항상 정확한 데이터베이스 카운트 반영
        if (count > 0) {
          await navigator.setAppBadge(count);
          console.log('✅ PWA 배지가 정확한 읽지 않은 메시지 수로 설정됨:', count);
        } else {
          console.log('✅ PWA 배지 클리어됨 (읽지 않은 메시지 없음)');
        }
      } else {
        console.log('⚠️ setAppBadge API 미지원, 읽지 않은 메시지 수:', count);
      }
    } catch (error) {
      console.error('❌ 배지 업데이트 실패:', error);
    }
  }, []);

  // 배지 클리어 함수
  const clearBadge = useCallback(async () => {
    await updateBadge(0);
  }, [updateBadge]);

  // 읽지 않은 메시지 수 변경 시 배지 업데이트 - 순수하게 데이터베이스 읽지 않은 메시지만 반영
  useEffect(() => {
    if (unreadCounts?.unreadCounts && Array.isArray(unreadCounts.unreadCounts)) {
      const totalUnread = unreadCounts.unreadCounts.reduce((total: number, room: any) => 
        total + (room.unreadCount || 0), 0
      );
      
      console.log('📊 실제 읽지 않은 메시지 수:', totalUnread);
      console.log('📊 각 채팅방별 읽지 않은 메시지:', unreadCounts.unreadCounts);
      
      // 푸시 알림과 완전히 독립적으로 배지 업데이트
      updateBadge(totalUnread);
      
      // 명시적으로 Service Worker에 정확한 카운트 전달
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'SET_BADGE_DATABASE_COUNT',
          count: totalUnread,
          source: 'pure_database',
          timestamp: Date.now()
        });
      }
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