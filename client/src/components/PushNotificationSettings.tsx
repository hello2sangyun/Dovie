import React, { useState, useEffect } from 'react';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Bell, BellOff, Smartphone, Settings } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { getApiUrl } from '@/lib/api-config';

export function PushNotificationSettings() {
  const { user } = useAuth();
  const [isEnabled, setIsEnabled] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Check if push notifications are supported
    const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
    setIsSupported(supported);
    
    if (supported) {
      setPermission(Notification.permission);
      checkSubscriptionStatus();
    }
  }, []);

  const checkSubscriptionStatus = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      setIsEnabled(!!subscription);
    } catch (error) {
      console.error('Failed to check subscription status:', error);
    }
  };

  const requestPermission = async () => {
    if (!isSupported) return;
    
    setIsLoading(true);
    try {
      const permission = await Notification.requestPermission();
      setPermission(permission);
      
      if (permission === 'granted') {
        await enablePushNotifications();
      }
    } catch (error) {
      console.error('Permission request failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const enablePushNotifications = async () => {
    if (!user || !isSupported) return;
    
    setIsLoading(true);
    try {
      // Get VAPID key
      const vapidResponse = await fetch(getApiUrl('/api/vapid-public-key'));
      const { publicKey } = await vapidResponse.json();

      // Get service worker registration
      const registration = await navigator.serviceWorker.ready;
      
      // Subscribe to push notifications
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey)
      });

      // Send subscription to server
      await fetch(getApiUrl('/api/push-subscription'), {
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

      setIsEnabled(true);
      localStorage.setItem('pushNotificationInitialized', 'true');
    } catch (error) {
      console.error('Failed to enable push notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const disablePushNotifications = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        await subscription.unsubscribe();
        
        // Remove from server
        await fetch(getApiUrl('/api/push-subscription'), {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'X-User-ID': user.id.toString()
          },
          body: JSON.stringify({
            endpoint: subscription.endpoint
          })
        });
      }
      
      setIsEnabled(false);
      localStorage.removeItem('pushNotificationInitialized');
    } catch (error) {
      console.error('Failed to disable push notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggle = async (enabled: boolean) => {
    if (enabled) {
      if (permission === 'granted') {
        await enablePushNotifications();
      } else {
        await requestPermission();
      }
    } else {
      await disablePushNotifications();
    }
  };

  const sendTestNotification = async () => {
    if (!user || !isEnabled) return;
    
    try {
      await fetch(getApiUrl('/api/test-push-notification'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': user.id.toString()
        },
        body: JSON.stringify({
          title: 'Dovie Messenger 테스트',
          body: '푸시 알림이 정상적으로 작동합니다!'
        })
      });
    } catch (error) {
      console.error('Test notification failed:', error);
    }
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

  if (!isSupported) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BellOff className="h-5 w-5" />
            푸시 알림
          </CardTitle>
          <CardDescription>
            현재 브라우저에서는 푸시 알림을 지원하지 않습니다.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          푸시 알림 설정
        </CardTitle>
        <CardDescription>
          새 메시지가 도착할 때 알림을 받을 수 있습니다.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Smartphone className="h-5 w-5 text-gray-500" />
            <div>
              <p className="font-medium">푸시 알림 활성화</p>
              <p className="text-sm text-gray-500">
                앱 아이콘에 배지와 함께 알림 표시
              </p>
            </div>
          </div>
          <Switch
            checked={isEnabled}
            onCheckedChange={handleToggle}
            disabled={isLoading || permission === 'denied'}
          />
        </div>

        {permission === 'denied' && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">
              알림 권한이 거부되었습니다. 브라우저 설정에서 알림을 허용해주세요.
            </p>
          </div>
        )}

        {isEnabled && (
          <div className="pt-4 border-t">
            <Button
              variant="outline"
              onClick={sendTestNotification}
              className="w-full"
              disabled={isLoading}
            >
              <Settings className="h-4 w-4 mr-2" />
              테스트 알림 전송
            </Button>
          </div>
        )}

        <div className="text-xs text-gray-500 space-y-1">
          <p>• PWA 모드에서 가장 효과적으로 작동합니다</p>
          <p>• iOS Safari: 홈 화면에 추가 후 사용 권장</p>
          <p>• Android Chrome: 자동으로 PWA 설치 가능</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default PushNotificationSettings;