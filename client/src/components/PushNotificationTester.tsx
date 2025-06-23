import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bell, Smartphone, CheckCircle, XCircle, AlertCircle, Zap } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function PushNotificationTester() {
  const [testResults, setTestResults] = useState<{
    serviceWorkerSupport: boolean;
    pushManagerSupport: boolean;
    notificationPermission: NotificationPermission;
    subscriptionStatus: boolean;
    vapidKeyValid: boolean;
    subscriptionEndpoint: string | null;
  }>({
    serviceWorkerSupport: false,
    pushManagerSupport: false,
    notificationPermission: 'default',
    subscriptionStatus: false,
    vapidKeyValid: false,
    subscriptionEndpoint: null
  });
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    runDiagnostics();
  }, []);

  const runDiagnostics = async () => {
    setIsLoading(true);
    
    const results = {
      serviceWorkerSupport: 'serviceWorker' in navigator,
      pushManagerSupport: 'PushManager' in window,
      notificationPermission: Notification.permission,
      subscriptionStatus: false,
      vapidKeyValid: false,
      subscriptionEndpoint: null
    };

    // Check current subscription status
    if (results.serviceWorkerSupport && results.pushManagerSupport) {
      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        results.subscriptionStatus = !!subscription;
        results.subscriptionEndpoint = subscription?.endpoint || null;
      } catch (error) {
        console.error('Failed to check subscription:', error);
      }
    }

    // Test VAPID key validity
    try {
      const vapidResponse = await fetch('/api/vapid-public-key');
      results.vapidKeyValid = vapidResponse.ok;
    } catch (error) {
      console.error('VAPID key test failed:', error);
    }

    setTestResults(results);
    setIsLoading(false);
  };

  const requestPermissionAndSubscribe = async () => {
    setIsLoading(true);
    try {
      // Request notification permission
      const permission = await Notification.requestPermission();
      
      if (permission === 'granted') {
        await subscribeToNotifications();
        toast({
          title: "권한 승인됨",
          description: "알림 권한이 승인되고 구독이 등록되었습니다.",
          variant: "default"
        });
      } else {
        toast({
          title: "권한 거부됨",
          description: "알림 권한이 거부되었습니다.",
          variant: "destructive"
        });
      }
      
      await runDiagnostics();
    } catch (error) {
      console.error('Permission request failed:', error);
      toast({
        title: "오류 발생",
        description: "권한 요청 중 오류가 발생했습니다.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const subscribeToNotifications = async () => {
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

    const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY || 'BMqZ8XNhzWqDYHWOWOL3PnQj2pF4ej1dvxE6uKODu2mN5qeECeV6qF4ej1dvxE6uKODu2mN5q';
    
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
    });

    // Send subscription to server
    const userId = localStorage.getItem('userId');
    const response = await fetch('/api/push-subscription', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-ID': userId || ''
      },
      body: JSON.stringify({
        endpoint: subscription.endpoint,
        p256dh: arrayBufferToBase64(subscription.getKey('p256dh')),
        auth: arrayBufferToBase64(subscription.getKey('auth')),
        userAgent: navigator.userAgent
      })
    });

    if (!response.ok) {
      throw new Error('Failed to save subscription to server');
    }
  };

  const sendTestNotification = async () => {
    setIsLoading(true);
    try {
      const userId = localStorage.getItem('userId');
      const response = await fetch('/api/test-push', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': userId || ''
        },
        body: JSON.stringify({
          title: 'Dovie 테스트 알림',
          message: 'iPhone PWA 푸시 알림 테스트입니다. 소리와 앱 배지가 표시되어야 합니다.',
          unreadCount: 1
        })
      });

      if (response.ok) {
        toast({
          title: "테스트 알림 전송됨",
          description: "푸시 알림이 전송되었습니다. iPhone에서 확인해보세요.",
          variant: "default"
        });
      } else {
        throw new Error('Failed to send test notification');
      }
    } catch (error) {
      console.error('Test notification failed:', error);
      toast({
        title: "테스트 실패",
        description: "테스트 알림 전송에 실패했습니다.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = (status: boolean) => {
    return status ? (
      <CheckCircle className="h-4 w-4 text-green-600" />
    ) : (
      <XCircle className="h-4 w-4 text-red-600" />
    );
  };

  const getStatusBadge = (status: boolean, trueText: string, falseText: string) => {
    return (
      <Badge variant={status ? "default" : "destructive"}>
        {status ? trueText : falseText}
      </Badge>
    );
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          푸시 알림 시스템 테스터
        </CardTitle>
        <CardDescription>
          iPhone PWA 푸시 알림 시스템의 상태를 확인하고 테스트합니다.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* System Status */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">시스템 상태</h3>
          
          <div className="grid grid-cols-1 gap-3">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-2">
                {getStatusIcon(testResults.serviceWorkerSupport)}
                <span>Service Worker 지원</span>
              </div>
              {getStatusBadge(testResults.serviceWorkerSupport, "지원됨", "지원 안됨")}
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-2">
                {getStatusIcon(testResults.pushManagerSupport)}
                <span>Push Manager 지원</span>
              </div>
              {getStatusBadge(testResults.pushManagerSupport, "지원됨", "지원 안됨")}
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-2">
                {getStatusIcon(testResults.notificationPermission === 'granted')}
                <span>알림 권한</span>
              </div>
              <Badge variant={
                testResults.notificationPermission === 'granted' ? "default" :
                testResults.notificationPermission === 'denied' ? "destructive" : "secondary"
              }>
                {testResults.notificationPermission === 'granted' ? '승인됨' :
                 testResults.notificationPermission === 'denied' ? '거부됨' : '대기중'}
              </Badge>
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-2">
                {getStatusIcon(testResults.subscriptionStatus)}
                <span>푸시 구독 상태</span>
              </div>
              {getStatusBadge(testResults.subscriptionStatus, "구독됨", "구독 안됨")}
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-2">
                {getStatusIcon(testResults.vapidKeyValid)}
                <span>VAPID 키 유효성</span>
              </div>
              {getStatusBadge(testResults.vapidKeyValid, "유효함", "무효함")}
            </div>
          </div>

          {testResults.subscriptionEndpoint && (
            <div className="p-3 border rounded-lg bg-muted">
              <p className="text-sm font-medium mb-1">구독 엔드포인트:</p>
              <p className="text-xs break-all text-muted-foreground">
                {testResults.subscriptionEndpoint}
              </p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <h3 className="text-lg font-semibold">테스트 액션</h3>
          
          <div className="grid grid-cols-1 gap-3">
            <Button 
              onClick={runDiagnostics} 
              disabled={isLoading}
              variant="outline"
            >
              <AlertCircle className="h-4 w-4 mr-2" />
              시스템 상태 재검사
            </Button>

            {testResults.notificationPermission !== 'granted' && (
              <Button 
                onClick={requestPermissionAndSubscribe} 
                disabled={isLoading}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Bell className="h-4 w-4 mr-2" />
                알림 권한 요청 및 구독
              </Button>
            )}

            {testResults.subscriptionStatus && (
              <Button 
                onClick={sendTestNotification} 
                disabled={isLoading}
                className="bg-green-600 hover:bg-green-700"
              >
                <Zap className="h-4 w-4 mr-2" />
                테스트 푸시 알림 전송
              </Button>
            )}
          </div>
        </div>

        {/* Instructions */}
        <div className="p-4 border rounded-lg bg-blue-50 dark:bg-blue-950">
          <h4 className="font-semibold mb-2 flex items-center gap-2">
            <Smartphone className="h-4 w-4" />
            iPhone PWA 테스트 방법
          </h4>
          <ol className="text-sm space-y-1 list-decimal list-inside">
            <li>Safari에서 이 페이지를 열어주세요</li>
            <li>공유 버튼 → "홈 화면에 추가"를 선택하세요</li>
            <li>홈 화면의 Dovie 앱 아이콘을 터치해서 PWA 모드로 실행하세요</li>
            <li>"알림 권한 요청 및 구독" 버튼을 클릭하세요</li>
            <li>알림 권한을 허용하세요</li>
            <li>"테스트 푸시 알림 전송" 버튼을 클릭하세요</li>
            <li>iPhone에서 소리와 함께 알림이 표시되고 앱 배지가 나타나는지 확인하세요</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
}