import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';

/**
 * Telegram/WhatsApp Style Badge Manager
 * Replicates exact badge behavior from popular messaging apps
 * - Polls database every 1.5 seconds for real-time accuracy
 * - Shows exact sum of unread messages across all chat rooms
 * - Independent of push notifications like Telegram
 */
export function TelegramBadgeManager() {
  const { user } = useAuth();

  // Poll unread counts like Telegram - frequent updates for real-time accuracy
  const { data: unreadData, isSuccess } = useQuery({
    queryKey: ['/api/unread-counts'],
    enabled: !!user,
    staleTime: 0, // Always fresh data like messaging apps
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    refetchInterval: 1500, // 1.5s like Telegram
    refetchOnReconnect: true,
    retry: 5,
  });

  // Apply Telegram-style badge logic
  useEffect(() => {
    if (!user || !isSuccess) return;

    const response = unreadData as { unreadCounts?: Array<{ chatRoomId: number; unreadCount: number }> };
    const unreadCounts = response?.unreadCounts || [];

    // Calculate total like Telegram - simple sum of all room badges
    const totalUnread = unreadCounts.reduce((total, room) => total + (room.unreadCount || 0), 0);

    console.log('📱 Telegram Badge Update:', totalUnread, 'from', unreadCounts.length, 'rooms');
    
    // Apply badge using multiple methods for maximum compatibility
    applyTelegramBadge(totalUnread);
  }, [user, unreadData, isSuccess]);

  return null; // Background component
}

// Apply badge using Telegram's multi-method approach
async function applyTelegramBadge(count: number) {
  console.log('🔢 Applying Telegram-style badge:', count);

  try {
    // Method 1: PWA Badge API (iOS 16+, Android PWA)
    if ('setAppBadge' in navigator) {
      if (count > 0) {
        await navigator.setAppBadge(count);
        console.log('✅ PWA Badge API success:', count);
      } else {
        await navigator.clearAppBadge();
        console.log('✅ PWA Badge cleared');
      }
    }

    // Method 2: Service Worker message
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'TELEGRAM_BADGE_UPDATE',
        count: count,
        timestamp: Date.now()
      });
    }

    // Method 3: Silent notification (fallback for older devices)
    if (count > 0 && 'Notification' in window && Notification.permission === 'granted') {
      try {
        const notification = new Notification('', {
          badge: '/icons/icon-72x72.png',
          silent: true,
          tag: 'telegram-badge',
          data: { telegramBadge: true, count }
        });
        setTimeout(() => notification.close(), 100);
      } catch (e) {
        // Silent fail for notification fallback
      }
    }
  } catch (error) {
    console.error('❌ Telegram badge update failed:', error);
  }
}

export default TelegramBadgeManager;