import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';

// PWA 배지 전용 감시 컴포넌트 - 푸시 알림과 완전히 독립적으로 작동
export function PWABadgeWatcher() {
  const { user } = useAuth();

  // Monitor unread messages like Telegram/WhatsApp - continuous polling
  const { data: unreadCounts, isSuccess } = useQuery({
    queryKey: ['/api/unread-counts'],
    enabled: !!user,
    staleTime: 0, // Always fresh like messaging apps
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    refetchInterval: 1500, // Every 1.5s like Telegram
    refetchOnReconnect: true,
    retry: 5,
  });

  // 컴포넌트 마운트시 즉시 배지 초기화
  useEffect(() => {
    if (user) {
      console.log('🚀 PWABadgeWatcher 초기화됨 - 사용자:', user.id);
    }
  }, [user]);

  // Telegram/WhatsApp style badge logic - exactly matches chat room red badges
  useEffect(() => {
    if (isSuccess && unreadCounts) {
      const counts = (unreadCounts as any)?.unreadCounts;
      
      if (counts && Array.isArray(counts)) {
        // Calculate total exactly like Telegram/WhatsApp
        const totalUnread = counts.reduce((total: number, room: any) => 
          total + (room.unreadCount || 0), 0
        );
        
        console.log('📱 Badge Update (Telegram Style):', totalUnread, 'rooms:', counts.length);
        console.log('📱 Individual room counts:', counts);
        
        // Force badge update like Telegram/WhatsApp
        updatePWABadgeDirect(totalUnread);
      } else {
        console.log('📱 No unread messages - clearing badge');
        updatePWABadgeDirect(0);
      }
    }
  }, [unreadCounts, isSuccess]);

  return null; // 렌더링 없음, 백그라운드 작업만
}

// Telegram/WhatsApp style badge update - always shows exact unread count
async function updatePWABadgeDirect(count: number) {
  try {
    console.log('🔢 Setting badge to exact count (like Telegram):', count);
    
    // Primary method: Direct PWA Badge API (iOS 16+, Android PWA)
    if ('setAppBadge' in navigator) {
      if (count > 0) {
        await navigator.setAppBadge(count);
        console.log('✅ Badge set via PWA API:', count);
      } else {
        await navigator.clearAppBadge();
        console.log('✅ Badge cleared via PWA API');
      }
    } else {
      console.log('ℹ️ PWA Badge API not available');
    }
    
    // Secondary method: Service Worker badge (fallback)
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'TELEGRAM_STYLE_BADGE',
        count: count,
        timestamp: Date.now()
      });
    }
    
    // Tertiary method: Manual notification badge (last resort)
    if (count > 0 && 'Notification' in window && Notification.permission === 'granted') {
      // This creates a silent notification that updates the badge
      try {
        const notification = new Notification('', {
          badge: '/icons/icon-72x72.png',
          silent: true,
          tag: 'badge-update',
          data: { badgeOnly: true }
        });
        notification.close();
      } catch (e) {
        // Silent fail for notification method
      }
    }
  } catch (error) {
    console.error('❌ Badge update failed:', error);
  }
}