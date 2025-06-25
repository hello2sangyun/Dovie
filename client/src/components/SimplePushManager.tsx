import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';

export function SimplePushManager() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const initializePushNotifications = async () => {
      // Check if already initialized to prevent duplicates
      const alreadyInitialized = localStorage.getItem('pushNotificationInitialized');
      if (alreadyInitialized === 'true') {
        console.log('Push notifications already initialized, skipping');
        return;
      }

      // Check if notifications are supported
      if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
        console.log('Push notifications not supported on this device');
        return;
      }

      // Auto-request permission on mobile devices for PWA
      const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const isPWA = window.matchMedia && window.matchMedia('(display-mode: standalone)').matches;
      
      console.log('Device detection - Mobile:', isMobile, 'PWA:', isPWA);
      
      // Request permission if not already granted, especially for mobile PWA
      if (Notification.permission === 'default' && (isMobile || isPWA)) {
        console.log('Requesting notification permission for mobile/PWA');
        const permission = await Notification.requestPermission();
        console.log('Permission result:', permission);
        if (permission !== 'granted') {
          console.log('Notification permission denied');
          return;
        }
      } else if (Notification.permission !== 'granted') {
        console.log('Notification permission not granted:', Notification.permission);
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
          console.log('Existing push subscription found, updating server');
          // Verify with server - fixed format
          const response = await fetch('/api/push-subscription', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-User-ID': user.id.toString()
            },
            body: JSON.stringify({
              endpoint: existingSubscription.endpoint,
              p256dh: arrayBufferToBase64(existingSubscription.getKey('p256dh')),
              auth: arrayBufferToBase64(existingSubscription.getKey('auth')),
              userAgent: navigator.userAgent
            })
          });
          
          if (response.ok) {
            console.log('Push subscription verified with server');
            localStorage.setItem('pushNotificationInitialized', 'true');
          } else {
            console.error('Failed to verify subscription with server');
          }
          return;
        }

        // Create new subscription
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey)
        });

        // Send to server - fix format
        console.log('Sending new push subscription to server');
        const response = await fetch('/api/push-subscription', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-User-ID': user.id.toString()
          },
          body: JSON.stringify({
            endpoint: subscription.endpoint,
            p256dh: arrayBufferToBase64(subscription.getKey('p256dh')),
            auth: arrayBufferToBase64(subscription.getKey('auth')),
            userAgent: navigator.userAgent
          })
        });

        if (response.ok) {
          console.log('Push subscription successfully registered');
          localStorage.setItem('pushNotificationInitialized', 'true');
        } else {
          console.error('Failed to register push subscription:', await response.text());
        }
      } catch (error) {
        console.error('Push notification setup failed:', error);
      }
    };

    // Initialize immediately on mobile/PWA, or when permission is granted
    const timer = setTimeout(() => {
      initializePushNotifications();
    }, 1000); // Small delay to ensure user context is ready

    return () => clearTimeout(timer);
  }, [user]);

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