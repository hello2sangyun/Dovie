import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Bell, BellOff, Smartphone, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface PushNotificationManagerProps {
  className?: string;
}

export function PushNotificationManager({ className }: PushNotificationManagerProps) {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    checkPushSupport();
    checkSubscriptionStatus();
  }, []);

  const checkPushSupport = () => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      setIsSupported(true);
      setPermission(Notification.permission);
    }
  };

  const checkSubscriptionStatus = async () => {
    if (!('serviceWorker' in navigator)) return;

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      setIsSubscribed(!!subscription);
    } catch (error) {
      console.error('Failed to check subscription status:', error);
    }
  };

  const requestPermission = async () => {
    if (!isSupported) {
      toast({
        title: "지원되지 않음",
        description: "이 브라우저는 푸시 알림을 지원하지 않습니다.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    try {
      const permission = await Notification.requestPermission();
      setPermission(permission);

      if (permission === 'granted') {
        await subscribeToPushNotifications();
        toast({
          title: "알림 허용됨",
          description: "푸시 알림이 성공적으로 설정되었습니다.",
        });
      } else {
        toast({
          title: "알림 거부됨",
          description: "알림을 받으려면 브라우저 설정에서 허용해주세요.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Permission request failed:', error);
      toast({
        title: "설정 실패",
        description: "알림 설정 중 오류가 발생했습니다.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const subscribeToPushNotifications = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      
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

      // Get VAPID public key from server
      const vapidResponse = await fetch('/api/vapid-public-key');
      if (!vapidResponse.ok) {
        throw new Error('Failed to get VAPID public key');
      }
      const { publicKey: vapidPublicKey } = await vapidResponse.json();

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
      });

      // Send subscription to server
      const userId = localStorage.getItem('userId');
      if (!userId) {
        throw new Error('사용자 로그인이 필요합니다');
      }

      console.log('Sending push subscription to server:', {
        endpoint: subscription.endpoint,
        userId: userId
      });

      const response = await fetch('/api/push-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': userId
        },
        body: JSON.stringify({
          endpoint: subscription.endpoint,
          p256dh: arrayBufferToBase64(subscription.getKey('p256dh')),
          auth: arrayBufferToBase64(subscription.getKey('auth')),
          userAgent: navigator.userAgent
        })
      });

      if (response.ok) {
        setIsSubscribed(true);
      } else {
        throw new Error('Failed to save subscription');
      }
    } catch (error) {
      console.error('Push subscription failed:', error);
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      throw error;
    }
  };

  const unsubscribeFromPushNotifications = async () => {
    setIsLoading(true);

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        // Unsubscribe from browser
        await subscription.unsubscribe();

        // Remove from server
        await fetch('/api/push-subscription', {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'X-User-ID': localStorage.getItem('userId') || ''
          },
          body: JSON.stringify({ endpoint: subscription.endpoint })
        });
      }

      setIsSubscribed(false);
      toast({
        title: "알림 해제됨",
        description: "푸시 알림이 비활성화되었습니다.",
      });
    } catch (error) {
      console.error('Unsubscribe failed:', error);
      toast({
        title: "해제 실패",
        description: "알림 해제 중 오류가 발생했습니다.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

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

  const getStatusInfo = () => {
    if (!isSupported) {
      return {
        icon: AlertCircle,
        title: "지원되지 않음",
        description: "이 브라우저는 푸시 알림을 지원하지 않습니다.",
        color: "text-gray-500"
      };
    }

    if (permission === 'denied') {
      return {
        icon: BellOff,
        title: "알림 차단됨",
        description: "브라우저 설정에서 알림을 허용해주세요.",
        color: "text-red-500"
      };
    }

    if (isSubscribed) {
      return {
        icon: Bell,
        title: "알림 활성화됨",
        description: "새 메시지 알림을 받고 있습니다.",
        color: "text-green-500"
      };
    }

    return {
      icon: BellOff,
      title: "알림 비활성화됨",
      description: "푸시 알림을 설정하여 메시지를 놓치지 마세요.",
      color: "text-orange-500"
    };
  };

  const statusInfo = getStatusInfo();
  const StatusIcon = statusInfo.icon;

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Smartphone className="h-5 w-5" />
          푸시 알림 관리
        </CardTitle>
        <CardDescription>
          모바일에서 새 메시지 알림을 받으세요
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div className="flex items-center gap-3">
            <StatusIcon className={`h-5 w-5 ${statusInfo.color}`} />
            <div>
              <p className="font-medium">{statusInfo.title}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {statusInfo.description}
              </p>
            </div>
          </div>
        </div>

        {isSupported && permission !== 'denied' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="push-notifications" className="text-sm font-medium">
                푸시 알림 받기
              </Label>
              <Switch
                id="push-notifications"
                checked={isSubscribed}
                onCheckedChange={(checked) => {
                  if (checked) {
                    requestPermission();
                  } else {
                    unsubscribeFromPushNotifications();
                  }
                }}
                disabled={isLoading}
              />
            </div>

            {isSubscribed && (
              <div className="text-xs text-gray-600 dark:text-gray-400 p-2 bg-blue-50 dark:bg-blue-900/20 rounded">
                ✓ 앱이 백그라운드에 있을 때도 새 메시지 알림을 받습니다
                <br />
                ✓ 알림 소리와 진동으로 즉시 확인할 수 있습니다
                <br />
                ✓ 앱 아이콘에 읽지 않은 메시지 수가 표시됩니다
              </div>
            )}
          </div>
        )}

        {permission === 'denied' && (
          <div className="text-sm text-gray-600 dark:text-gray-400 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
            <p className="font-medium mb-1">알림을 활성화하려면:</p>
            <ol className="list-decimal list-inside space-y-1 text-xs">
              <li>브라우저 주소창 옆의 자물쇠 아이콘을 클릭</li>
              <li>"알림" 설정을 "허용"으로 변경</li>
              <li>페이지를 새로고침</li>
            </ol>
          </div>
        )}

        {!isSupported && (
          <div className="text-sm text-gray-600 dark:text-gray-400 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            최신 브라우저(Chrome, Firefox, Safari)에서 푸시 알림을 사용할 수 있습니다.
          </div>
        )}
      </CardContent>
    </Card>
  );
}