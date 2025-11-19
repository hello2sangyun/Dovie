import { useEffect, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { getApiUrl } from '@/lib/api-config';

// Telegram/WhatsApp-style notification management
// Suppresses notifications when user is actively using the app
interface TelegramStyleNotificationManagerProps {
  className?: string;
}

export function TelegramStyleNotificationManager({ className }: TelegramStyleNotificationManagerProps = {}) {
  const { user } = useAuth();
  const lastActivityRef = useRef(Date.now());
  const isActiveRef = useRef(true);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (!user?.id) return;

    console.log('[NotificationManager] Initializing Telegram-style activity tracking');

    // Track user activity like Telegram/WhatsApp
    // Only updates local timestamp - actual heartbeat sent by interval
    const updateActivity = () => {
      lastActivityRef.current = Date.now();
      isActiveRef.current = true;
      // Note: Heartbeat sent via 15-second interval, not on every activity
    };

    // Activity event listeners
    const activityEvents = [
      'mousedown', 'mousemove', 'keypress', 'scroll', 
      'touchstart', 'touchmove', 'click', 'focus'
    ];

    activityEvents.forEach(event => {
      document.addEventListener(event, updateActivity, { passive: true });
    });

    // Visibility change detection (like Telegram app focus)
    const handleVisibilityChange = () => {
      if (document.hidden) {
        console.log('[NotificationManager] App hidden - enabling notifications');
        isActiveRef.current = false;
        sendActivityStatus(false);
      } else {
        console.log('[NotificationManager] App visible - suppressing notifications');
        isActiveRef.current = true;
        lastActivityRef.current = Date.now();
        sendActivityStatus(true);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Page focus/blur events
    const handleFocus = () => {
      console.log('[NotificationManager] Window focused');
      isActiveRef.current = true;
      lastActivityRef.current = Date.now();
      sendActivityStatus(true);
    };

    const handleBlur = () => {
      console.log('[NotificationManager] Window blurred');
      setTimeout(() => {
        if (Date.now() - lastActivityRef.current > 5000) { // 5 seconds like WhatsApp
          isActiveRef.current = false;
          sendActivityStatus(false);
        }
      }, 5000);
    };

    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);

    // Activity timeout check (like Telegram "last seen")
    const checkActivityTimeout = () => {
      const timeSinceActivity = Date.now() - lastActivityRef.current;
      
      if (timeSinceActivity > 30000 && isActiveRef.current) { // 30 seconds like Telegram
        console.log('[NotificationManager] User inactive - enabling notifications');
        isActiveRef.current = false;
        sendActivityStatus(false);
      }
    };

    // Heartbeat every 15 seconds (like WhatsApp)
    heartbeatIntervalRef.current = setInterval(() => {
      checkActivityTimeout();
      if (isActiveRef.current) {
        sendActivityHeartbeat();
      }
    }, 15000);

    // Initial activity status
    sendActivityStatus(true);

    return () => {
      // Cleanup
      activityEvents.forEach(event => {
        document.removeEventListener(event, updateActivity);
      });
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
      
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }

      // Mark user as offline when component unmounts
      sendActivityStatus(false);
    };
  }, [user?.id]);

  // Send activity heartbeat to server (like WhatsApp "online" status)
  const sendActivityHeartbeat = async () => {
    if (!user?.id) return;

    try {
      await fetch(getApiUrl('/api/user/heartbeat'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id.toString()
        },
        body: JSON.stringify({
          timestamp: Date.now(),
          isActive: isActiveRef.current
        })
      });
    } catch (error) {
      console.error('[NotificationManager] Heartbeat failed:', error);
    }
  };

  // Send activity status update
  const sendActivityStatus = async (isActive: boolean) => {
    if (!user?.id) return;

    try {
      await fetch(getApiUrl('/api/user/activity-status'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id.toString()
        },
        body: JSON.stringify({
          isOnline: isActive,
          lastSeen: Date.now()
        })
      });
      
      console.log(`[NotificationManager] Activity status updated: ${isActive ? 'online' : 'offline'}`);
    } catch (error) {
      console.error('[NotificationManager] Activity status update failed:', error);
    }
  };

  // This component doesn't render anything - it's purely for activity tracking
  return null;
}