import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bell, Smartphone, AlertCircle, CheckCircle, XCircle } from 'lucide-react';

export function PushDebugPanel() {
  const { user } = useAuth();
  const [debugInfo, setDebugInfo] = useState<any>({});
  const [isLoading, setIsLoading] = useState(false);

  const runDiagnostics = async () => {
    setIsLoading(true);
    const info: any = {
      timestamp: new Date().toISOString(),
      user: user ? { id: user.id, username: user.username } : null,
      browser: {
        userAgent: navigator.userAgent,
        isMobile: /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
        isPWA: window.matchMedia && window.matchMedia('(display-mode: standalone)').matches,
        supportsSW: 'serviceWorker' in navigator,
        supportsPush: 'PushManager' in window,
        supportsNotification: 'Notification' in window,
        supportsBadge: 'setAppBadge' in navigator
      },
      permission: Notification.permission,
      serviceWorker: null,
      subscription: null,
      serverStatus: null,
      vapidKey: null
    };

    try {
      // Check service worker
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        info.serviceWorker = {
          active: !!registration.active,
          scope: registration.scope,
          pushManager: !!registration.pushManager
        };

        // Check subscription
        if (registration.pushManager) {
          const subscription = await registration.pushManager.getSubscription();
          info.subscription = {
            exists: !!subscription,
            endpoint: subscription ? subscription.endpoint.substring(0, 100) + '...' : null
          };
        }
      }

      // Check VAPID key
      try {
        const vapidResponse = await fetch('/api/vapid-public-key');
        if (vapidResponse.ok) {
          const vapidData = await vapidResponse.json();
          info.vapidKey = {
            available: !!vapidData.publicKey,
            keyPrefix: vapidData.publicKey ? vapidData.publicKey.substring(0, 10) + '...' : null
          };
        }
      } catch (error) {
        info.vapidKey = { error: error.message };
      }

      // Check server subscription status
      if (user) {
        try {
          const statusResponse = await fetch('/api/push-subscription/status', {
            headers: { 'X-User-ID': user.id.toString() }
          });
          if (statusResponse.ok) {
            info.serverStatus = await statusResponse.json();
          }
        } catch (error) {
          info.serverStatus = { error: error.message };
        }
      }

    } catch (error) {
      info.error = error.message;
    }

    setDebugInfo(info);
    setIsLoading(false);
  };

  const testPushNotification = async () => {
    if (!user) return;
    
    try {
      const response = await fetch('/api/test-push-notification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': user.id.toString()
        },
        body: JSON.stringify({
          title: 'Debug Test',
          body: '디버그 패널에서 전송된 테스트 알림입니다'
        })
      });

      const result = await response.json();
      console.log('Test notification result:', result);
      
      // Update debug info
      runDiagnostics();
    } catch (error) {
      console.error('Test notification failed:', error);
    }
  };

  const enablePushNotifications = async () => {
    try {
      // Request permission
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') return;

      // Get VAPID key
      const vapidResponse = await fetch('/api/vapid-public-key');
      const { publicKey } = await vapidResponse.json();

      // Get service worker
      const registration = await navigator.serviceWorker.ready;

      // Subscribe
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey)
      });

      // Send to server
      const response = await fetch('/api/push-subscription', {
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
        console.log('Debug: Push subscription registered');
        runDiagnostics();
      }
    } catch (error) {
      console.error('Debug: Enable push failed:', error);
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

  const StatusIcon = ({ status }: { status: boolean | undefined }) => {
    if (status === true) return <CheckCircle className="h-4 w-4 text-green-500" />;
    if (status === false) return <XCircle className="h-4 w-4 text-red-500" />;
    return <AlertCircle className="h-4 w-4 text-yellow-500" />;
  };

  useEffect(() => {
    runDiagnostics();
  }, [user]);

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Smartphone className="h-5 w-5" />
          PWA Push 알림 디버그 패널
        </CardTitle>
        <CardDescription>
          모바일 PWA 푸시 알림 시스템의 상태를 확인하고 테스트합니다.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button onClick={runDiagnostics} disabled={isLoading} size="sm">
            진단 실행
          </Button>
          <Button onClick={testPushNotification} disabled={!user || isLoading} size="sm" variant="outline">
            테스트 알림
          </Button>
          <Button onClick={enablePushNotifications} disabled={!user || isLoading} size="sm" variant="outline">
            푸시 활성화
          </Button>
        </div>

        {debugInfo.timestamp && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <h4 className="font-semibold">브라우저 지원</h4>
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span>Service Worker</span>
                  <StatusIcon status={debugInfo.browser?.supportsSW} />
                </div>
                <div className="flex items-center justify-between">
                  <span>Push Manager</span>
                  <StatusIcon status={debugInfo.browser?.supportsPush} />
                </div>
                <div className="flex items-center justify-between">
                  <span>Notifications</span>
                  <StatusIcon status={debugInfo.browser?.supportsNotification} />
                </div>
                <div className="flex items-center justify-between">
                  <span>App Badge</span>
                  <StatusIcon status={debugInfo.browser?.supportsBadge} />
                </div>
                <div className="flex items-center justify-between">
                  <span>모바일 기기</span>
                  <Badge variant={debugInfo.browser?.isMobile ? "default" : "secondary"}>
                    {debugInfo.browser?.isMobile ? "Yes" : "No"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>PWA 모드</span>
                  <Badge variant={debugInfo.browser?.isPWA ? "default" : "secondary"}>
                    {debugInfo.browser?.isPWA ? "Yes" : "No"}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold">권한 및 구독</h4>
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span>알림 권한</span>
                  <Badge variant={
                    debugInfo.permission === 'granted' ? "default" :
                    debugInfo.permission === 'denied' ? "destructive" : "secondary"
                  }>
                    {debugInfo.permission}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Service Worker 활성</span>
                  <StatusIcon status={debugInfo.serviceWorker?.active} />
                </div>
                <div className="flex items-center justify-between">
                  <span>Push 구독 존재</span>
                  <StatusIcon status={debugInfo.subscription?.exists} />
                </div>
                <div className="flex items-center justify-between">
                  <span>서버 구독 상태</span>
                  <StatusIcon status={debugInfo.serverStatus?.isSubscribed} />
                </div>
                <div className="flex items-center justify-between">
                  <span>VAPID 키</span>
                  <StatusIcon status={debugInfo.vapidKey?.available} />
                </div>
              </div>
            </div>
          </div>
        )}

        {debugInfo.serverStatus && (
          <div className="pt-4 border-t">
            <h4 className="font-semibold mb-2">서버 상태</h4>
            <div className="text-sm space-y-1">
              <p>구독 수: {debugInfo.serverStatus.subscriptionCount || 0}</p>
              {debugInfo.serverStatus.subscriptions?.map((sub: any, index: number) => (
                <p key={index} className="text-xs text-gray-600">
                  {sub.endpoint} ({sub.userAgent})
                </p>
              ))}
            </div>
          </div>
        )}

        <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
          마지막 업데이트: {debugInfo.timestamp}
        </div>
      </CardContent>
    </Card>
  );
}

export default PushDebugPanel;