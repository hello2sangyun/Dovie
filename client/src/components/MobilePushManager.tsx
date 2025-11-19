import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Bell, BellOff } from 'lucide-react';
import { getApiUrl } from '@/lib/api-config';

export function MobilePushManager() {
  const { user } = useAuth();
  const [showPrompt, setShowPrompt] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);

  useEffect(() => {
    if (!user) return;

    const checkMobilePushSetup = async () => {
      // Check if this is a mobile device
      const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const isPWA = window.matchMedia && window.matchMedia('(display-mode: standalone)').matches;
      
      if (!isMobile && !isPWA) return;

      // Check if notifications are supported
      if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
        return;
      }

      // Check current permission status
      const permission = Notification.permission;
      console.log('Mobile push check - Permission:', permission);

      // Check if we have an active subscription
      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        setIsSubscribed(!!subscription);
        
        console.log('Mobile push check - Subscription exists:', !!subscription);

        // Show prompt if no permission or subscription
        if (permission === 'default' || !subscription) {
          setShowPrompt(true);
        }
      } catch (error) {
        console.error('Mobile push setup check failed:', error);
      }
    };

    // Check after a small delay to ensure everything is loaded
    const timer = setTimeout(checkMobilePushSetup, 2000);
    return () => clearTimeout(timer);
  }, [user]);

  const enablePushNotifications = async () => {
    try {
      console.log('Mobile: Enabling push notifications');
      
      // Request permission
      const permission = await Notification.requestPermission();
      console.log('Mobile: Permission result:', permission);
      
      if (permission !== 'granted') {
        alert('알림 권한이 필요합니다. 브라우저 설정에서 알림을 허용해주세요.');
        return;
      }

      // Get VAPID key
      const vapidResponse = await fetch(getApiUrl('/api/vapid-public-key'));
      const { publicKey } = await vapidResponse.json();
      console.log('Mobile: Got VAPID key');

      // Get service worker registration
      const registration = await navigator.serviceWorker.ready;
      console.log('Mobile: Service worker ready');

      // Subscribe to push notifications
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey)
      });

      console.log('Mobile: Created push subscription');

      // Send subscription to server
      const response = await fetch(getApiUrl('/api/push-subscription'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': user?.id.toString() || ''
        },
        body: JSON.stringify({
          endpoint: subscription.endpoint,
          p256dh: arrayBufferToBase64(subscription.getKey('p256dh')),
          auth: arrayBufferToBase64(subscription.getKey('auth')),
          userAgent: navigator.userAgent
        })
      });

      if (response.ok) {
        console.log('Mobile: Push subscription registered successfully');
        setIsSubscribed(true);
        setShowPrompt(false);
        
        // Send test notification after successful registration
        setTimeout(async () => {
          try {
            const testResponse = await fetch(getApiUrl('/api/test-push-notification'), {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-User-ID': user?.id.toString() || ''
              },
              body: JSON.stringify({
                title: 'Dovie Messenger',
                body: '푸시 알림이 활성화되었습니다!'
              })
            });

            if (testResponse.ok) {
              console.log('Mobile: Test notification sent successfully');
            } else {
              console.error('Mobile: Test notification failed');
            }
          } catch (error) {
            console.error('Mobile: Test notification error:', error);
          }
        }, 2000); // Wait 2 seconds for subscription to be fully registered
      } else {
        console.error('Mobile: Failed to register subscription');
        alert('푸시 알림 등록에 실패했습니다. 다시 시도해주세요.');
      }
    } catch (error) {
      console.error('Mobile: Push notification setup failed:', error);
      alert('푸시 알림 설정에 실패했습니다: ' + error.message);
    }
  };

  const dismissPrompt = () => {
    setShowPrompt(false);
    localStorage.setItem('pushPromptDismissed', 'true');
  };

  // Helper functions
  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
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

  if (!showPrompt) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-purple-600 text-white p-3 shadow-lg">
      <div className="flex items-center justify-between max-w-sm mx-auto">
        <div className="flex items-center space-x-2">
          <Bell className="h-4 w-4" />
          <div className="text-sm">
            <p className="font-medium">알림 받기</p>
            <p className="text-xs opacity-90">새 메시지 알림을 받으시겠어요?</p>
          </div>
        </div>
        <div className="flex space-x-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={dismissPrompt}
            className="text-white hover:bg-purple-700 text-xs px-2 py-1"
          >
            나중에
          </Button>
          <Button
            size="sm"
            onClick={enablePushNotifications}
            className="bg-white text-purple-600 hover:bg-gray-100 text-xs px-2 py-1"
          >
            허용
          </Button>
        </div>
      </div>
    </div>
  );
}

export default MobilePushManager;