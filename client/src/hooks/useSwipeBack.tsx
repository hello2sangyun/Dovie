import { useEffect, useRef } from "react";

interface UseSwipeBackOptions {
  onBack: () => void;
  enabled?: boolean;
  edgeThreshold?: number; // 왼쪽 가장자리 감지 영역 (px)
  swipeThreshold?: number; // 스와이프 완료 거리 (px)
  onSwipeProgress?: (deltaX: number, progress: number) => void; // 스와이프 진행 상태 콜백
}

export function useSwipeBack({
  onBack,
  enabled = true,
  edgeThreshold = 30,
  swipeThreshold = 100,
  onSwipeProgress,
}: UseSwipeBackOptions) {
  const touchStartXRef = useRef<number>(0);
  const touchStartYRef = useRef<number>(0);
  const isSwipingRef = useRef<boolean>(false);

  useEffect(() => {
    if (!enabled) return;

    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      touchStartXRef.current = touch.clientX;
      touchStartYRef.current = touch.clientY;

      // 왼쪽 가장자리에서 시작한 경우만 스와이프 가능
      if (touch.clientX <= edgeThreshold) {
        isSwipingRef.current = true;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isSwipingRef.current) return;

      const touch = e.touches[0];
      const deltaX = touch.clientX - touchStartXRef.current;
      const deltaY = Math.abs(touch.clientY - touchStartYRef.current);

      // 가로 방향 스와이프인지 확인 (세로 움직임이 가로보다 작아야 함)
      if (deltaX > 20 && deltaY < deltaX / 2) {
        // 스크롤 방지
        e.preventDefault();
        
        // 스와이프 진행 상태 콜백 호출
        if (onSwipeProgress) {
          const progress = Math.min(deltaX / swipeThreshold, 1);
          onSwipeProgress(deltaX, progress);
        }
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!isSwipingRef.current) return;

      const touch = e.changedTouches[0];
      const deltaX = touch.clientX - touchStartXRef.current;

      // 오른쪽으로 충분히 스와이프했으면 뒤로가기
      if (deltaX >= swipeThreshold) {
        onBack();
      } else {
        // 스와이프 취소 시 progress를 0으로 리셋
        if (onSwipeProgress) {
          onSwipeProgress(0, 0);
        }
      }

      isSwipingRef.current = false;
    };

    const handleTouchCancel = () => {
      // 스와이프 취소 시 progress를 0으로 리셋
      if (onSwipeProgress) {
        onSwipeProgress(0, 0);
      }
      isSwipingRef.current = false;
    };

    // 이벤트 리스너 등록
    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });
    document.addEventListener('touchcancel', handleTouchCancel, { passive: true });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
      document.removeEventListener('touchcancel', handleTouchCancel);
    };
  }, [enabled, onBack, edgeThreshold, swipeThreshold, onSwipeProgress]);
}
