import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';

/**
 * Unread Badge Manager - Telegram/WhatsApp Style
 * Maintains PWA app icon badge with exact unread message count
 * Works independently of push notifications like popular messaging apps
 */
export function UnreadBadgeManager() {
  const { user } = useAuth();
  const lastBadgeCount = useRef<number>(-1);
  const isInitialized = useRef(false);

  // Query unread counts with aggressive polling like Telegram
  const { data: unreadData, isSuccess, isError } = useQuery({
    queryKey: ['/api/unread-counts'],
    enabled: !!user,
    staleTime: 10000, // 10초 캐시로 성능 개선
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    refetchInterval: 30000, // 30초마다 업데이트로 배터리 절약
    refetchOnReconnect: true,
    retry: 5,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Initialize badge system on mount
  useEffect(() => {
    if (user && !isInitialized.current) {
      isInitialized.current = true;
      console.log('🚀 Badge Manager initialized for user:', user.id);
      
      // Check PWA badge support
      if ('setAppBadge' in navigator) {
        console.log('✅ PWA Badge API supported');
      } else {
        console.log('⚠️ PWA Badge API not supported');
      }
    }
  }, [user]);

  // Update badge when unread counts change
  useEffect(() => {
    if (!user || !isSuccess || isError) return;

    try {
      const response = unreadData as { unreadCounts?: Array<{ chatRoomId: number; unreadCount: number }> };
      const unreadCounts = response?.unreadCounts || [];

      // Calculate total unread messages (Telegram style)
      const totalUnread = unreadCounts.reduce((total, room) => {
        return total + (room.unreadCount || 0);
      }, 0);

      // Only update if count changed (performance optimization)
      if (lastBadgeCount.current !== totalUnread) {
        lastBadgeCount.current = totalUnread;
        
        console.log(`📱 Badge update: ${totalUnread} unread messages`);
        console.log(`📊 Room breakdown:`, unreadCounts.map(r => `Room ${r.chatRoomId}: ${r.unreadCount}`));
        
        // Apply badge update using multiple methods
        setBadgeCount(totalUnread);
      }
    } catch (error) {
      console.error('❌ Badge calculation error:', error);
    }
  }, [user, unreadData, isSuccess, isError]);

  // Clear badge when app becomes active
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && user) {
        // Don't clear badge automatically - let database drive the count
        console.log('📱 App became visible - badge remains database-driven');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [user]);

  return null;
}

// Set badge count using multiple methods for maximum compatibility
async function setBadgeCount(count: number) {
  console.log(`🔢 Setting badge count: ${count}`);

  // Method 1: PWA Badge API (primary)
  try {
    if ('setAppBadge' in navigator) {
      if (count > 0) {
        await navigator.setAppBadge(count);
        console.log(`✅ PWA badge set: ${count}`);
      } else {
        await navigator.clearAppBadge();
        console.log('✅ PWA badge cleared');
      }
    }
  } catch (error) {
    console.error('❌ PWA Badge API failed:', error);
  }

  // Method 2: Service Worker (backup)
  try {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'UPDATE_BADGE_COUNT',
        count: count,
        timestamp: Date.now()
      });
    }
  } catch (error) {
    console.error('❌ Service Worker badge failed:', error);
  }

  // Method 3: Document title (web fallback)
  try {
    const baseTitle = 'Dovie Messenger';
    if (count > 0) {
      document.title = `(${count}) ${baseTitle}`;
    } else {
      document.title = baseTitle;
    }
  } catch (error) {
    console.error('❌ Title badge failed:', error);
  }
}

export default UnreadBadgeManager;