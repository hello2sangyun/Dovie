import { useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';

export function usePWABadge() {
  // 읽지 않은 메시지 수 조회
  const { data: unreadCounts } = useQuery({
    queryKey: ['/api/unread-counts'],
    staleTime: 30000, // 30초 캐시
    refetchInterval: false, // 불필요한 반복 요청 방지
  });

  const updateBadge = useCallback(async (count: number) => {
    try {
      if ('setAppBadge' in navigator) {
        if (count > 0) {
          await (navigator as any).setAppBadge(count);
        } else {
          await (navigator as any).clearAppBadge();
        }
      }
    } catch (error) {
      // 배지 설정 실패는 조용히 처리
    }
  }, []);

  const clearBadge = useCallback(async () => {
    await updateBadge(0);
  }, [updateBadge]);

  // 읽지 않은 메시지 수 변경 시 배지 업데이트
  useEffect(() => {
    if (Array.isArray(unreadCounts)) {
      const totalUnread = unreadCounts.reduce((total: number, room: any) => 
        total + (room.unreadCount || 0), 0
      );
      updateBadge(totalUnread);
    }
  }, [unreadCounts, updateBadge]);

  // 앱이 포커스될 때 배지 클리어
  useEffect(() => {
    const handleFocus = () => {
      clearBadge();
      
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

  return {
    updateBadge,
    clearBadge,
    unreadCount: Array.isArray(unreadCounts) ? 
      unreadCounts.reduce((total: number, room: any) => total + (room.unreadCount || 0), 0) : 0
  };
}