import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { usePWABadge } from '@/hooks/usePWABadge';

export function SimplePushManager() {
  const { user } = useAuth();
  const { updateBadge } = usePWABadge();

  useEffect(() => {
    console.log('🔍 SimplePushManager - 사용자 상태:', user ? `${user.id} (${user.displayName})` : 'null');
    
    if (!user) {
      console.log('⏸️ SimplePushManager - 사용자 없음, 푸시 알림 초기화 중단');
      return;
    }

    const initializePushNotifications = async () => {
      console.log('🔔 PWA 푸시 알림 초기화 시작 (사용자:', user.id, user.displayName, ')');

      // Check if notifications are supported
      if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
        return;
      }

      // Request notification permission if not granted
      if (Notification.permission === 'default') {
        console.log('🔔 Requesting notification permission...');
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          console.log('❌ Notification permission denied');
          return;
        }
        localStorage.setItem('notificationPermissionGranted', 'true');
        console.log('✅ Notification permission granted');
      } else if (Notification.permission !== 'granted') {
        return;
      }

      try {
        // Get VAPID key
        const vapidResponse = await fetch('/api/vapid-public-key');
        if (!vapidResponse.ok) return;
        
        const { publicKey } = await vapidResponse.json();

        // Get service worker registration
        const registration = await navigator.serviceWorker.ready;
        if (!registration.pushManager) return;

        // Check if already subscribed
        const existingSubscription = await registration.pushManager.getSubscription();
        if (existingSubscription) {
          // Verify with server
          await fetch('/api/push-subscription', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-User-ID': user.id.toString()
            },
            body: JSON.stringify({
              endpoint: existingSubscription.endpoint,
              keys: {
                p256dh: arrayBufferToBase64(existingSubscription.getKey('p256dh')),
                auth: arrayBufferToBase64(existingSubscription.getKey('auth'))
              }
            })
          });
          
          localStorage.setItem('pushNotificationInitialized', 'true');
          return;
        }

        // Create new subscription
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey)
        });

        // Send to server with properly encoded keys
        const p256dhKey = subscription.getKey('p256dh');
        const authKey = subscription.getKey('auth');
        
        if (!p256dhKey || !authKey) {
          console.log('❌ Missing required subscription keys');
          return;
        }

        const response = await fetch('/api/push-subscription', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-User-ID': user.id.toString()
          },
          body: JSON.stringify({
            endpoint: subscription.endpoint,
            keys: {
              p256dh: arrayBufferToBase64(p256dhKey),
              auth: arrayBufferToBase64(authKey)
            }
          })
        });

        if (response.ok) {
          console.log('✅ PWA 푸시 구독 완료:', user.id);
          localStorage.setItem('pushNotificationInitialized', 'true');
        } else {
          const errorText = await response.text();
          console.log('❌ 푸시 구독 실패:', response.status, errorText);
        }
      } catch (error) {
        console.error('❌ Push notification setup failed:', error);
      }
    };

    // Only initialize once per session
    initializePushNotifications();
  }, [user]);

  // Update badge based on unread counts
  useEffect(() => {
    if (user) {
      updateBadge();
    }
  }, [user, updateBadge]);

  // Helper functions
  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  const arrayBufferToBase64 = (buffer: ArrayBuffer | null) => {
    if (!buffer) return '';
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  };

  return null; // This component doesn't render anything
}