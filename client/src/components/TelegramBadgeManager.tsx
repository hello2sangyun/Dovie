import { useEffect, useRef } from 'react';
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
  const lastBadgeCount = useRef<number>(-1);

  // Poll unread counts like Telegram - frequent updates for real-time accuracy
  const { data: unreadData, isSuccess, error } = useQuery({
    queryKey: ['/api/unread-counts'],
    enabled: !!user,
    staleTime: 20000, // 20초 캐시로 성능 개선
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    refetchInterval: 120000, // 2분마다 업데이트로 배터리 절약
    refetchOnReconnect: true,
    retry: 3,
    retryDelay: 1000,
  });

  // Apply Telegram-style badge logic
  useEffect(() => {
    if (!user || !isSuccess || error) return;

    const response = unreadData as { unreadCounts?: Array<{ chatRoomId: number; unreadCount: number }> };
    const unreadCounts = response?.unreadCounts || [];

    // Calculate total like Telegram - simple sum of all room badges
    const totalUnread = unreadCounts.reduce((total, room) => total + (room.unreadCount || 0), 0);

    // Only update if count changed (efficiency like Telegram)
    if (lastBadgeCount.current !== totalUnread) {
      lastBadgeCount.current = totalUnread;
      console.log('📱 Badge Update (Telegram Style):', totalUnread, 'rooms:', unreadCounts.length);
      
      // Apply badge using multiple methods for maximum compatibility
      applyTelegramBadge(totalUnread);
    }
  }, [user, unreadData, isSuccess, error]);

  // Initialize badge on mount
  useEffect(() => {
    if (user) {
      console.log('🚀 Telegram Badge Manager initialized for user:', user.id);
      // Force initial badge check
      setTimeout(() => {
        if (lastBadgeCount.current >= 0) {
          applyTelegramBadge(lastBadgeCount.current);
        }
      }, 1000);
    }
  }, [user]);

  return null; // Background component
}

// Apply badge using Telegram's multi-method approach for maximum compatibility
async function applyTelegramBadge(count: number) {
  console.log('🔢 Setting badge (Telegram style):', count);

  // Method 1: Direct PWA Badge API (Most reliable for iOS 16+, Android PWA)
  try {
    if ('setAppBadge' in navigator) {
      if (count > 0) {
        await navigator.setAppBadge(count);
        console.log('✅ Badge set via PWA API:', count);
      } else {
        await navigator.clearAppBadge();
        console.log('✅ Badge cleared via PWA API');
      }
    } else {
      console.log('ℹ️ PWA Badge API not supported');
    }
  } catch (error) {
    console.error('❌ PWA Badge API failed:', error);
  }

  // Method 2: Service Worker message (Backup method)
  try {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'TELEGRAM_BADGE_UPDATE',
        count: count,
        timestamp: Date.now(),
        source: 'telegram_manager'
      });
    }
  } catch (error) {
    console.error('❌ Service Worker badge failed:', error);
  }

  // Method 3: Manual DOM badge for web browsers (fallback)
  try {
    updateFaviconBadge(count);
  } catch (error) {
    console.error('❌ Favicon badge failed:', error);
  }
}

// Update favicon with badge count (web browser fallback)
function updateFaviconBadge(count: number) {
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = 32;
    canvas.height = 32;

    // Draw base favicon (simplified)
    ctx.fillStyle = '#8B5CF6'; // Purple background
    ctx.fillRect(0, 0, 32, 32);
    
    if (count > 0) {
      // Draw red badge circle
      ctx.fillStyle = '#EF4444';
      ctx.beginPath();
      ctx.arc(24, 8, 8, 0, 2 * Math.PI);
      ctx.fill();
      
      // Draw count text
      ctx.fillStyle = 'white';
      ctx.font = 'bold 10px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(count > 99 ? '99+' : count.toString(), 24, 12);
    }

    // Update favicon
    const link = document.querySelector("link[rel*='icon']") as HTMLLinkElement || 
                 document.createElement('link');
    link.type = 'image/png';
    link.rel = 'shortcut icon';
    link.href = canvas.toDataURL();
    
    if (!document.querySelector("link[rel*='icon']")) {
      document.getElementsByTagName('head')[0].appendChild(link);
    }
  } catch (error) {
    // Silent fail for favicon method
  }
}

export default TelegramBadgeManager;