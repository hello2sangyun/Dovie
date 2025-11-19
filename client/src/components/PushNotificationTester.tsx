import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Smartphone, Bell, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface PushNotificationTesterProps {
  className?: string;
}

export function PushNotificationTester({ className }: PushNotificationTesterProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [diagnostics, setDiagnostics] = useState<any>(null);
  const { toast } = useToast();

  const runDiagnostics = async () => {
    setIsLoading(true);
    const results: any = {};

    try {
      // Check PWA detection
      results.isPWA = (window.navigator as any).standalone === true || 
                     window.matchMedia('(display-mode: standalone)').matches;
      
      // Check service worker
      results.hasServiceWorker = 'serviceWorker' in navigator;
      
      // Check push manager
      results.hasPushManager = 'PushManager' in window;
      
      // Check notification permission
      results.notificationPermission = Notification.permission;
      
      // Check for active service worker
      if (results.hasServiceWorker) {
        try {
          const registration = await navigator.serviceWorker.ready;
          results.serviceWorkerActive = !!registration.active;
          
          // Check for push subscription
          const subscription = await registration.pushManager.getSubscription();
          results.hasPushSubscription = !!subscription;
          results.subscriptionEndpoint = subscription?.endpoint?.substring(0, 50) + '...' || null;
        } catch (error) {
          results.serviceWorkerError = error instanceof Error ? error.message : 'Unknown error';
        }
      }
      
      // Check server subscription status
      const userId = localStorage.getItem('userId');
      if (userId) {
        try {
          const response = await fetch('/api/push-subscription/status', {
            headers: {
              'X-User-ID': userId
            }
          });
          const data = await response.json();
          results.serverSubscriptionStatus = data;
        } catch (error) {
          results.serverError = error instanceof Error ? error.message : 'Server check failed';
        }
      }

      setDiagnostics(results);
      console.log('📱 iPhone PWA Push Notification Diagnostics:', results);
    } catch (error) {
      console.error('Diagnostics failed:', error);
      toast({
        title: "진단 실패",
        description: "진단 중 오류가 발생했습니다.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const sendTestNotification = async () => {
    setIsLoading(true);
    const userId = localStorage.getItem('userId');
    
    if (!userId) {
      toast({
        title: "로그인 필요",
        description: "테스트 알림을 보내려면 로그인이 필요합니다.",
        variant: "destructive"
      });
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/test-push', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': userId
        }
      });

      const data = await response.json();
      
      if (data.success) {
        toast({
          title: "테스트 알림 전송됨",
          description: "iPhone PWA 푸시 알림이 전송되었습니다.",
        });
      } else {
        toast({
          title: "전송 실패",
          description: data.message || "테스트 알림 전송에 실패했습니다.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Test notification failed:', error);
      toast({
        title: "전송 오류",
        description: "테스트 알림 전송 중 오류가 발생했습니다.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = (status: boolean | undefined) => {
    if (status === undefined) return <AlertCircle className="h-4 w-4 text-gray-400" />;
    return status ? 
      <CheckCircle className="h-4 w-4 text-green-500" /> : 
      <AlertCircle className="h-4 w-4 text-red-500" />;
  };

  const getStatusBadge = (status: boolean | undefined, trueText: string, falseText: string) => {
    if (status === undefined) return <Badge variant="secondary">확인 중</Badge>;
    return status ? 
      <Badge variant="default" className="bg-green-500">{trueText}</Badge> : 
      <Badge variant="destructive">{falseText}</Badge>;
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Smartphone className="h-5 w-5" />
          iPhone PWA 푸시 알림 진단
        </CardTitle>
        <CardDescription>
          iPhone PWA에서 푸시 알림이 정상적으로 작동하는지 확인합니다.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button 
            onClick={runDiagnostics} 
            disabled={isLoading}
            variant="outline"
          >
            {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            진단 실행
          </Button>
          <Button 
            onClick={sendTestNotification} 
            disabled={isLoading}
          >
            {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Bell className="h-4 w-4 mr-2" />}
            테스트 알림 전송
          </Button>
        </div>

        {diagnostics && (
          <div className="space-y-3 mt-4">
            <h4 className="font-semibold text-sm">진단 결과</h4>
            
            <div className="grid grid-cols-1 gap-2 text-sm">
              <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <div className="flex items-center gap-2">
                  {getStatusIcon(diagnostics.isPWA)}
                  PWA 모드
                </div>
                {getStatusBadge(diagnostics.isPWA, "PWA", "브라우저")}
              </div>

              <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <div className="flex items-center gap-2">
                  {getStatusIcon(diagnostics.hasServiceWorker)}
                  Service Worker 지원
                </div>
                {getStatusBadge(diagnostics.hasServiceWorker, "지원됨", "지원 안됨")}
              </div>

              <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <div className="flex items-center gap-2">
                  {getStatusIcon(diagnostics.hasPushManager)}
                  Push Manager 지원
                </div>
                {getStatusBadge(diagnostics.hasPushManager, "지원됨", "지원 안됨")}
              </div>

              <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <div className="flex items-center gap-2">
                  {getStatusIcon(diagnostics.notificationPermission === 'granted')}
                  알림 권한
                </div>
                <Badge variant={diagnostics.notificationPermission === 'granted' ? 'default' : 'destructive'}>
                  {diagnostics.notificationPermission || '확인 중'}
                </Badge>
              </div>

              <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <div className="flex items-center gap-2">
                  {getStatusIcon(diagnostics.serviceWorkerActive)}
                  Service Worker 활성화
                </div>
                {getStatusBadge(diagnostics.serviceWorkerActive, "활성", "비활성")}
              </div>

              <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <div className="flex items-center gap-2">
                  {getStatusIcon(diagnostics.hasPushSubscription)}
                  Push 구독
                </div>
                {getStatusBadge(diagnostics.hasPushSubscription, "구독됨", "구독 안됨")}
              </div>

              {diagnostics.serverSubscriptionStatus && (
                <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(diagnostics.serverSubscriptionStatus.isSubscribed)}
                    서버 구독 상태
                  </div>
                  {getStatusBadge(diagnostics.serverSubscriptionStatus.isSubscribed, "등록됨", "등록 안됨")}
                </div>
              )}

              {diagnostics.subscriptionEndpoint && (
                <div className="p-2 bg-blue-50 rounded">
                  <div className="text-xs text-gray-600">구독 엔드포인트:</div>
                  <div className="text-xs font-mono break-all">{diagnostics.subscriptionEndpoint}</div>
                </div>
              )}

              {(diagnostics.serviceWorkerError || diagnostics.serverError) && (
                <div className="p-2 bg-red-50 rounded">
                  <div className="text-xs text-red-600">오류:</div>
                  <div className="text-xs">{diagnostics.serviceWorkerError || diagnostics.serverError}</div>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}