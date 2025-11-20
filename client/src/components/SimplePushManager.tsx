import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';

export function SimplePushManager() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const initializePushNotifications = async () => {
      // Check if notifications are supported
      if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
        console.log('❌ Push notifications not supported on this device');
        return;
      }

      // Auto-request permission on mobile devices for PWA
      const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const isAndroid = /Android/i.test(navigator.userAgent);
      const isPWA = window.matchMedia && window.matchMedia('(display-mode: standalone)').matches;
      
      console.log('📱 Device detection:', {
        mobile: isMobile,
        android: isAndroid,
        pwa: isPWA,
        userAgent: navigator.userAgent.substring(0, 50)
      });
      
      // 모바일/PWA에서만 자동으로 알림 권한 요청
      if (Notification.permission === 'default' && (isMobile || isPWA)) {
        console.log('🔔 알림 권한 요청 중 (모바일/PWA)...');
        const permission = await Notification.requestPermission();
        console.log('🔔 Permission result:', permission);
        if (permission !== 'granted') {
          console.log('❌ Notification permission denied');
          return;
        }
      } else if (Notification.permission !== 'granted') {
        console.log('❌ Notification permission not granted:', Notification.permission);
        return;
      }
      
      console.log('✅ 알림 권한 확인됨');

      try {
        // Service Worker 등록 상태 확인 및 재등록
        console.log('🔍 Service Worker 등록 상태 확인 중...');
        const existingRegistration = await navigator.serviceWorker.getRegistration();
        
        if (!existingRegistration) {
          console.log('⚠️ Service Worker가 등록되지 않음 - 재등록 시작');
          try {
            await navigator.serviceWorker.register('/sw.js');
            console.log('✅ Service Worker 재등록 완료');
          } catch (error) {
            console.error('❌ Service Worker 재등록 실패:', error);
            return;
          }
        } else {
          console.log('✅ Service Worker 등록 확인됨:', existingRegistration.scope);
          // 기존 등록이 있어도 업데이트 체크
          await existingRegistration.update();
        }
        
        // Get VAPID key
        console.log('🔑 Fetching VAPID public key...');
        const vapidResponse = await fetch('/api/vapid-public-key');
        if (!vapidResponse.ok) {
          console.error('❌ Failed to fetch VAPID key:', vapidResponse.status);
          return;
        }
        
        const { publicKey } = await vapidResponse.json();
        console.log('✅ VAPID key received');

        // Get service worker registration (fresh reference after ready)
        console.log('🔧 Waiting for service worker to be ready...');
        const registration = await navigator.serviceWorker.ready;
        console.log('✅ Service worker ready');
        
        if (!registration.pushManager) {
          console.error('❌ PushManager not available');
          return;
        }

        // Check if already subscribed
        console.log('🔍 Checking for existing push subscription...');
        const existingSubscription = await registration.pushManager.getSubscription();
        if (existingSubscription) {
          console.log('✅ Existing push subscription found, updating server:', {
            endpoint: existingSubscription.endpoint.substring(0, 50) + '...'
          });
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
            console.log('✅ Push subscription verified with server');
            localStorage.setItem('pushNotificationInitialized', 'true');
          } else {
            console.error('❌ Failed to verify subscription with server:', response.status);
          }
          return;
        }

        // Create new subscription
        console.log('📝 Creating new push subscription...');
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey)
        });
        console.log('✅ Push subscription created:', {
          endpoint: subscription.endpoint.substring(0, 50) + '...'
        });

        // Send to server - fix format
        console.log('📤 Sending new push subscription to server...');
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
          console.log('✅ Push subscription successfully registered on server!');
          console.log('🎉 PWA Push notifications are now enabled!');
          localStorage.setItem('pushNotificationInitialized', 'true');
        } else {
          const errorText = await response.text();
          console.error('❌ Failed to register push subscription:', response.status, errorText);
        }
      } catch (error) {
        console.error('❌ Push notification setup failed:', error);
        if (error instanceof Error) {
          console.error('Error details:', error.message, error.stack);
        }
      }
    };

    // Initialize immediately on mobile/PWA, or when permission is granted
    const timer = setTimeout(() => {
      initializePushNotifications();
    }, 1000); // Small delay to ensure user context is ready

    // Service Worker 지속성 유지 - 주기적으로 체크 및 재등록
    const keepAliveInterval = setInterval(async () => {
      try {
        console.log('🔄 Service Worker 상태 체크...');
        const registration = await navigator.serviceWorker.getRegistration();
        
        if (!registration) {
          console.log('⚠️ Service Worker가 사라짐 - 푸시 알림 재초기화');
          await initializePushNotifications();
        } else {
          // Service Worker 업데이트 체크
          await registration.update();
          console.log('✅ Service Worker 정상 작동 중');
        }
      } catch (error) {
        console.error('❌ Service Worker 체크 실패:', error);
      }
    }, 60000); // 1분마다 체크

    // 앱이 포그라운드로 돌아올 때 즉시 체크
    const handleVisibilityChange = async () => {
      if (!document.hidden) {
        console.log('👁️ 앱이 활성화됨 - Service Worker 상태 확인');
        const registration = await navigator.serviceWorker.getRegistration();
        if (!registration) {
          console.log('⚠️ Service Worker 재등록 필요');
          await initializePushNotifications();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearTimeout(timer);
      clearInterval(keepAliveInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
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