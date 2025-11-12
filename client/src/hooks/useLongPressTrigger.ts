import { useRef, useCallback } from 'react';

interface UseLongPressTriggerOptions {
  onLongPress: () => void;
  onShortPress?: () => void;
  disabled?: boolean;
  delay?: number; // in milliseconds, default 500ms
}

/**
 * Shared hook for detecting long-press gestures across mouse and touch interfaces
 * Used consistently across voice recording triggers (ChatArea, ChatsList, ContactsList)
 */
export function useLongPressTrigger({
  onLongPress,
  onShortPress,
  disabled = false,
  delay = 500
}: UseLongPressTriggerOptions) {
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressRef = useRef(false);
  const lastTouchTimeRef = useRef<number>(0);

  const clearTimer = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  const handleStart = useCallback(() => {
    if (disabled) return;

    isLongPressRef.current = false;
    clearTimer();

    // Start long-press detection
    longPressTimerRef.current = setTimeout(() => {
      isLongPressRef.current = true;
      onLongPress();
    }, delay);
  }, [disabled, delay, onLongPress, clearTimer]);

  const handleEnd = useCallback(() => {
    const wasShortPress = longPressTimerRef.current !== null && !isLongPressRef.current;
    
    clearTimer();

    // If it was a short press and callback is provided
    if (wasShortPress && onShortPress) {
      onShortPress();
    }

    isLongPressRef.current = false;
  }, [clearTimer, onShortPress]);

  // Mouse event handlers
  const handleMouseDown = useCallback(() => {
    // Prevent duplicate events after touch (500ms grace period)
    const timeSinceLastTouch = Date.now() - lastTouchTimeRef.current;
    if (timeSinceLastTouch < 500) {
      return;
    }

    handleStart();
  }, [handleStart]);

  const handleMouseUp = useCallback(() => {
    handleEnd();
  }, [handleEnd]);

  const handleMouseLeave = useCallback(() => {
    handleEnd();
  }, [handleEnd]);

  // Touch event handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    lastTouchTimeRef.current = Date.now();
    handleStart();
  }, [handleStart]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    handleEnd();
  }, [handleEnd]);

  return {
    handlers: {
      onMouseDown: handleMouseDown,
      onMouseUp: handleMouseUp,
      onMouseLeave: handleMouseLeave,
      onTouchStart: handleTouchStart,
      onTouchEnd: handleTouchEnd
    },
    isLongPress: isLongPressRef.current
  };
}
