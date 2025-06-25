import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';

// 강제 배지 설정 컴포넌트 - 테스트용
export function PWABadgeForcer() {
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      console.log('🔥 PWA 배지 강제 설정 시작');
      
      // 2초 후 강제로 12 배지 설정
      setTimeout(() => {
        forceBadgeSet(12);
      }, 2000);
      
      // 5초마다 배지 강제 설정 반복
      const interval = setInterval(() => {
        forceBadgeSet(12);
      }, 5000);

      return () => clearInterval(interval);
    }
  }, [user]);

  return null;
}

async function forceBadgeSet(count: number) {
  try {
    console.log('🔥 강제 배지 설정 시도:', count);
    
    if ('setAppBadge' in navigator) {
      await navigator.clearAppBadge();
      await navigator.setAppBadge(count);
      console.log('✅ 강제 배지 설정 성공:', count);
    } else {
      console.error('❌ setAppBadge API 미지원');
    }
  } catch (error) {
    console.error('❌ 강제 배지 설정 실패:', error);
  }
}