import { useState, useEffect } from 'react';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Bell, BellOff } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export function PushNotificationSettings() {
  const { user } = useAuth();
  const [isEnabled, setIsEnabled] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Check if push notifications are supported
    const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
    setIsSupported(supported);

    if (supported) {
      checkCurrentStatus();
    }
  }, []);

  const checkCurrentStatus = async () => {
    try {
      const permission = Notification.permission;
      const hasStoredPermission = localStorage.getItem('notificationPermissionGranted') === 'true';
      
      if (permission === 'granted' && hasStoredPermission) {
        // Check if we have an active subscription
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        setIsEnabled(!!subscription);
      } else {
        setIsEnabled(false);
      }
    } catch (error) {
      console.error('Failed to check push notification status:', error);
      setIsEnabled(false);
    }
  };

  const enablePushNotifications = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      // Request permission
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        alert('푸시 알림 권한이 필요합니다.');
        setIsLoading(false);
        return;
      }

      // Register service worker and subscribe
      const registration = await navigator.serviceWorker.ready;
      const vapidResponse = await fetch('/api/vapid-public-key');
      const { publicKey } = await vapidResponse.json();
      
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: publicKey
      });

      // Save subscription to server
      const response = await fetch('/api/push-subscription', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-User-ID': user.id.toString()
        },
        body: JSON.stringify({
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subscription.getKey('p256dh') ? btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('p256dh')!))) : '',
            auth: subscription.getKey('auth') ? btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('auth')!))) : ''
          }
        })
      });

      if (response.ok) {
        setIsEnabled(true);
        localStorage.setItem('notificationPermissionGranted', 'true');
        console.log('✅ Push notifications enabled successfully');
      } else {
        throw new Error('Failed to save subscription');
      }
    } catch (error) {
      console.error('Failed to enable push notifications:', error);
      alert('푸시 알림 설정에 실패했습니다.');
    }
    setIsLoading(false);
  };

  const disablePushNotifications = async () => {
    setIsLoading(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        await subscription.unsubscribe();
        
        // Remove from server
        await fetch('/api/push-subscription', {
          method: 'DELETE',
          headers: { 
            'Content-Type': 'application/json',
            'X-User-ID': user?.id.toString() || ''
          },
          body: JSON.stringify({
            endpoint: subscription.endpoint
          })
        });
      }

      setIsEnabled(false);
      localStorage.setItem('notificationPermissionGranted', 'false');
      console.log('🔕 Push notifications disabled');
    } catch (error) {
      console.error('Failed to disable push notifications:', error);
    }
    setIsLoading(false);
  };

  const handleToggle = async (enabled: boolean) => {
    if (enabled) {
      await enablePushNotifications();
    } else {
      await disablePushNotifications();
    }
  };

  if (!isSupported) {
    return (
      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center space-x-3">
          <BellOff className="h-5 w-5 text-gray-400" />
          <div>
            <p className="font-medium text-gray-900">푸시 알림</p>
            <p className="text-sm text-gray-500">이 브라우저는 푸시 알림을 지원하지 않습니다</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between p-4 bg-white rounded-lg border">
      <div className="flex items-center space-x-3">
        <Bell className="h-5 w-5 text-blue-500" />
        <div>
          <p className="font-medium text-gray-900">푸시 알림</p>
          <p className="text-sm text-gray-500">새 메시지 알림을 받고 앱 뱃지를 표시합니다</p>
        </div>
      </div>
      <div className="flex items-center space-x-2">
        {isLoading ? (
          <Button disabled size="sm">
            설정 중...
          </Button>
        ) : (
          <Switch
            checked={isEnabled}
            onCheckedChange={handleToggle}
            disabled={isLoading}
          />
        )}
      </div>
    </div>
  );
}