import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

export default function PushNotificationManager() {
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // 알림 권한 상태 확인
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    }

    // 기존 구독 상태 확인
    checkSubscriptionStatus();
  }, []);

  const checkSubscriptionStatus = async () => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        setIsSubscribed(!!subscription);
      } catch (error) {
        console.error('구독 상태 확인 실패:', error);
      }
    }
  };

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      toast({
        title: "알림 지원 안됨",
        description: "이 브라우저에서는 푸시 알림을 지원하지 않습니다.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);

      if (permission === 'granted') {
        await subscribeToPushNotifications();
        toast({
          title: "알림 권한 허용",
          description: "새로운 메시지 알림을 받으실 수 있습니다.",
          variant: "default"
        });
      } else {
        toast({
          title: "알림 권한 거부",
          description: "설정에서 알림 권한을 변경할 수 있습니다.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('알림 권한 요청 실패:', error);
      toast({
        title: "오류 발생",
        description: "알림 권한 요청 중 오류가 발생했습니다.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const subscribeToPushNotifications = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      return;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      
      // VAPID 공개 키 (실제 서비스에서는 환경변수로 관리)
      const vapidPublicKey = 'BMqZ8Q8b5V5N1VqD8rGmQQNGN5H7bV8rCXqW9mFpX4zNb5rT6jU3lKs8wYvP2xR4nQ1mJ7bW9qT3lR6jF2kN8vQ';
      
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
      });

      // 구독 정보를 서버에 전송
      await fetch('/api/push-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(subscription)
      });

      setIsSubscribed(true);
      console.log('푸시 알림 구독 완료:', subscription);
    } catch (error) {
      console.error('푸시 알림 구독 실패:', error);
      toast({
        title: "구독 실패",
        description: "푸시 알림 구독 중 오류가 발생했습니다.",
        variant: "destructive"
      });
    }
  };

  const unsubscribeFromPushNotifications = async () => {
    if (!('serviceWorker' in navigator)) {
      return;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        await subscription.unsubscribe();
        
        // 서버에서 구독 정보 제거
        await fetch('/api/push-subscription', {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ endpoint: subscription.endpoint })
        });

        setIsSubscribed(false);
        toast({
          title: "구독 해제",
          description: "푸시 알림 구독이 해제되었습니다.",
          variant: "default"
        });
      }
    } catch (error) {
      console.error('푸시 알림 구독 해제 실패:', error);
      toast({
        title: "구독 해제 실패",
        description: "구독 해제 중 오류가 발생했습니다.",
        variant: "destructive"
      });
    }
  };

  // VAPID 키를 Uint8Array로 변환하는 헬퍼 함수
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

  if (notificationPermission === 'denied') {
    return (
      <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
        <p className="text-sm text-orange-800">
          알림이 차단되었습니다. 브라우저 설정에서 알림을 허용해주세요.
        </p>
      </div>
    );
  }

  if (notificationPermission === 'granted' && isSubscribed) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-green-800">
            푸시 알림이 활성화되었습니다.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={unsubscribeFromPushNotifications}
          >
            해제
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-blue-900">푸시 알림</h3>
          <p className="text-sm text-blue-700">
            새로운 메시지 알림을 받으시겠습니까?
          </p>
        </div>
        <Button
          onClick={requestNotificationPermission}
          disabled={isLoading}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {isLoading ? '처리 중...' : '허용'}
        </Button>
      </div>
    </div>
  );
}