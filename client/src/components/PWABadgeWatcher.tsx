import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';

// PWA 배지 전용 감시 컴포넌트 - 푸시 알림과 완전히 독립적으로 작동
export function PWABadgeWatcher() {
  const { user } = useAuth();

  // 읽지 않은 메시지 수 지속적 모니터링 - 푸시 알림과 무관
  const { data: unreadCounts } = useQuery({
    queryKey: ['/api/unread-counts'],
    enabled: !!user,
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    refetchInterval: 2000, // 2초마다 배지 업데이트
    refetchOnReconnect: true,
    retry: 3,
  });

  // 데이터베이스 기반 배지 업데이트
  useEffect(() => {
    if (unreadCounts?.unreadCounts && Array.isArray(unreadCounts.unreadCounts)) {
      const totalUnread = unreadCounts.unreadCounts.reduce((total: number, room: any) => 
        total + (room.unreadCount || 0), 0
      );
      
      console.log('🔴 PWA 배지 자동 업데이트:', totalUnread);
      
      // 직접 배지 API 호출 - 푸시 알림 시스템 우회
      updatePWABadgeDirect(totalUnread);
    }
  }, [unreadCounts]);

  return null; // 렌더링 없음, 백그라운드 작업만
}

// 직접 배지 업데이트 함수 - 푸시 알림 시스템과 독립적
async function updatePWABadgeDirect(count: number) {
  try {
    if ('setAppBadge' in navigator) {
      // 푸시 알림 영향 제거를 위해 항상 clear 후 설정
      await navigator.clearAppBadge();
      
      if (count > 0) {
        await navigator.setAppBadge(count);
        console.log('✅ 배지 직접 설정 완료:', count);
      } else {
        console.log('✅ 배지 직접 클리어 완료');
      }
    }
  } catch (error) {
    console.error('❌ 직접 배지 업데이트 실패:', error);
  }
}