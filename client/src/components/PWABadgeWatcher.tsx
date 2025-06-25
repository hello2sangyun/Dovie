import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';

// PWA 배지 전용 감시 컴포넌트 - 푸시 알림과 완전히 독립적으로 작동
export function PWABadgeWatcher() {
  const { user } = useAuth();

  // 읽지 않은 메시지 수 지속적 모니터링 - 푸시 알림과 무관
  const { data: unreadCounts, isSuccess } = useQuery({
    queryKey: ['/api/unread-counts'],
    enabled: !!user,
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    refetchInterval: 2000, // 2초마다 배지 업데이트
    refetchOnReconnect: true,
    retry: 3,
  });

  // 컴포넌트 마운트시 즉시 배지 초기화
  useEffect(() => {
    if (user) {
      console.log('🚀 PWABadgeWatcher 초기화됨 - 사용자:', user.id);
      
      // 즉시 배지 상태 확인 및 설정
      setTimeout(() => {
        if (unreadCounts?.unreadCounts) {
          const totalUnread = unreadCounts.unreadCounts.reduce((total: number, room: any) => 
            total + (room.unreadCount || 0), 0
          );
          console.log('🔴 초기 배지 설정:', totalUnread);
          updatePWABadgeDirect(totalUnread);
        }
      }, 500);
    }
  }, [user]);

  // 데이터베이스 기반 배지 업데이트 - 항상 실행
  useEffect(() => {
    if (isSuccess && unreadCounts?.unreadCounts && Array.isArray(unreadCounts.unreadCounts)) {
      const totalUnread = unreadCounts.unreadCounts.reduce((total: number, room: any) => 
        total + (room.unreadCount || 0), 0
      );
      
      console.log('🔴 PWA 배지 자동 업데이트:', totalUnread, '개별 방별:', unreadCounts.unreadCounts);
      
      // 직접 배지 API 호출 - 푸시 알림 시스템 우회
      updatePWABadgeDirect(totalUnread);
    } else if (isSuccess && (!unreadCounts?.unreadCounts || unreadCounts.unreadCounts.length === 0)) {
      console.log('🔴 읽지 않은 메시지 없음 - 배지 클리어');
      updatePWABadgeDirect(0);
    }
  }, [unreadCounts, isSuccess]);

  return null; // 렌더링 없음, 백그라운드 작업만
}

// 직접 배지 업데이트 함수 - 푸시 알림 시스템과 독립적
async function updatePWABadgeDirect(count: number) {
  try {
    console.log('🎯 PWA 배지 직접 업데이트 시도:', count);
    
    if ('setAppBadge' in navigator) {
      // 푸시 알림 영향 제거를 위해 항상 clear 후 설정
      await navigator.clearAppBadge();
      
      if (count > 0) {
        await navigator.setAppBadge(count);
        console.log('✅ PWA 배지 직접 설정 완료:', count);
      } else {
        console.log('✅ PWA 배지 직접 클리어 완료');
      }
    } else {
      console.warn('⚠️ navigator.setAppBadge API 지원하지 않음');
    }
    
    // Service Worker를 통한 배지 설정도 시도
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'FORCE_SET_BADGE',
        count: count,
        source: 'direct_watcher'
      });
    }
  } catch (error) {
    console.error('❌ 직접 배지 업데이트 실패:', error);
  }
}