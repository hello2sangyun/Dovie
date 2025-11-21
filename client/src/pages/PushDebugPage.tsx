import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CheckCircle2, XCircle, AlertCircle, RefreshCw } from 'lucide-react';

export default function PushDebugPage() {
  const { user } = useAuth();
  const [status, setStatus] = useState<any>({});
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [loading, setLoading] = useState(false);
  const [serverSubscriptions, setServerSubscriptions] = useState<any[]>([]);

  const checkPushStatus = async () => {
    setLoading(true);
    const newStatus: any = {
      serviceWorkerSupported: 'serviceWorker' in navigator,
      pushManagerSupported: 'PushManager' in window,
      notificationSupported: 'Notification' in window,
      permission: ('Notification' in window) ? Notification.permission : 'unsupported',
      isPWA: window.matchMedia('(display-mode: standalone)').matches,
      isAndroid: /Android/i.test(navigator.userAgent),
      isIOS: /iPhone|iPad|iPod/i.test(navigator.userAgent),
      userAgent: navigator.userAgent,
      userId: user?.id,
      username: user?.username
    };

    if (newStatus.serviceWorkerSupported) {
      try {
        const registration = await navigator.serviceWorker.ready;
        newStatus.serviceWorkerActive = !!registration.active;
        newStatus.serviceWorkerScope = registration.scope;
        newStatus.serviceWorkerState = registration.active?.state;

        if (registration.pushManager) {
          const sub = await registration.pushManager.getSubscription();
          setSubscription(sub);
          newStatus.pushSubscription = !!sub;
          newStatus.endpoint = sub?.endpoint;
        }
      } catch (error: any) {
        newStatus.serviceWorkerError = error.message;
      }
    }

    // Check server-side subscription count
    if (user?.id) {
      try {
        const response = await fetch(`/api/push-subscriptions/${user.id}`, {
          headers: {
            'X-User-ID': user.id.toString()
          }
        });
        if (response.ok) {
          const data = await response.json();
          setServerSubscriptions(data.subscriptions || []);
          newStatus.serverSubscriptionCount = data.subscriptions?.length || 0;
        } else {
          console.error('Failed to fetch subscriptions:', response.status);
          newStatus.serverError = `Failed to fetch subscriptions: ${response.status}`;
        }
      } catch (error: any) {
        console.error('Error fetching subscriptions:', error);
        newStatus.serverError = error.message;
      }
    }

    setStatus(newStatus);
    setLoading(false);
  };

  const requestPermission = async () => {
    if (!('Notification' in window)) {
      alert('이 브라우저는 알림을 지원하지 않습니다.');
      return;
    }
    const permission = await Notification.requestPermission();
    alert(`알림 권한: ${permission}`);
    checkPushStatus();
  };

  const subscribePush = async () => {
    try {
      setLoading(true);

      // Get VAPID key
      const vapidResponse = await fetch('/api/vapid-public-key');
      if (!vapidResponse.ok) {
        throw new Error('VAPID 키 가져오기 실패');
      }
      const { publicKey } = await vapidResponse.json();

      // Subscribe
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey)
      });

      // Send to server
      const response = await fetch('/api/push-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': user!.id.toString()
        },
        body: JSON.stringify({
          endpoint: subscription.endpoint,
          p256dh: arrayBufferToBase64(subscription.getKey('p256dh')),
          auth: arrayBufferToBase64(subscription.getKey('auth')),
          userAgent: navigator.userAgent
        })
      });

      if (response.ok) {
        alert('✅ 푸시 구독 성공!');
      } else {
        alert('❌ 서버 등록 실패');
      }

      checkPushStatus();
    } catch (error: any) {
      alert('❌ 푸시 구독 실패: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const unsubscribePush = async () => {
    try {
      if (subscription) {
        await subscription.unsubscribe();
        await fetch('/api/push-subscription', {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'X-User-ID': user!.id.toString()
          },
          body: JSON.stringify({ endpoint: subscription.endpoint })
        });
        alert('✅ 푸시 구독 해제 성공');
        checkPushStatus();
      }
    } catch (error: any) {
      alert('❌ 구독 해제 실패: ' + error.message);
    }
  };

  const sendTestPush = async () => {
    try {
      const response = await fetch('/api/test-push', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': user!.id.toString()
        },
        body: JSON.stringify({
          title: '테스트 알림',
          body: 'PWA 푸시 알림이 정상 작동합니다! 🎉'
        })
      });

      if (response.ok) {
        alert('✅ 테스트 알림 전송 완료!');
      } else {
        alert('❌ 알림 전송 실패');
      }
    } catch (error: any) {
      alert('❌ 오류: ' + error.message);
    }
  };

  useEffect(() => {
    checkPushStatus();
  }, []);

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-900 dark:to-purple-900 p-4">
      <div className="max-w-2xl mx-auto space-y-4">
        <h1 className="text-2xl font-bold text-purple-900 dark:text-white mb-6">
          PWA 푸시 알림 디버그
        </h1>

        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">시스템 상태</h2>
            <Button
              variant="outline"
              size="sm"
              onClick={checkPushStatus}
              disabled={loading}
              data-testid="button-refresh-status"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              새로고침
            </Button>
          </div>

          <div className="space-y-2 text-sm">
            <StatusItem
              label="Service Worker 지원"
              value={status.serviceWorkerSupported}
            />
            <StatusItem
              label="Push Manager 지원"
              value={status.pushManagerSupported}
            />
            <StatusItem
              label="Notification API 지원"
              value={status.notificationSupported}
            />
            <StatusItem
              label="알림 권한"
              value={status.permission === 'granted'}
              extra={` (${status.permission})`}
            />
            <StatusItem
              label="PWA 모드"
              value={status.isPWA}
            />
            <StatusItem
              label="Android 기기"
              value={status.isAndroid}
            />
            {status.serviceWorkerActive !== undefined && (
              <StatusItem
                label="Service Worker 활성화"
                value={status.serviceWorkerActive}
              />
            )}
            {status.pushSubscription !== undefined && (
              <StatusItem
                label="푸시 구독 상태"
                value={status.pushSubscription}
              />
            )}
          </div>

          {status.endpoint && (
            <div className="mt-4 p-3 bg-gray-100 dark:bg-gray-800 rounded text-xs break-all">
              <strong>구독 endpoint:</strong><br />
              {status.endpoint}
            </div>
          )}

          {status.serviceWorkerScope && (
            <div className="mt-2 p-3 bg-gray-100 dark:bg-gray-800 rounded text-xs">
              <strong>Service Worker Scope:</strong><br />
              {status.serviceWorkerScope}
            </div>
          )}
        </Card>

        <Card className="p-6 space-y-3">
          <h2 className="text-lg font-semibold mb-4">액션</h2>

          {status.permission !== 'granted' && (
            <Button
              onClick={requestPermission}
              className="w-full"
              variant="default"
              data-testid="button-request-permission"
            >
              🔔 알림 권한 요청
            </Button>
          )}

          {status.pushSubscription === false && status.serviceWorkerSupported && (
            <Button
              onClick={subscribePush}
              className="w-full"
              disabled={loading || status.permission !== 'granted'}
              data-testid="button-subscribe-push"
            >
              ✅ 푸시 구독 등록
            </Button>
          )}

          {status.pushSubscription === true && (
            <Button
              onClick={unsubscribePush}
              className="w-full"
              variant="destructive"
              data-testid="button-unsubscribe-push"
            >
              ❌ 푸시 구독 해제
            </Button>
          )}

          {status.pushSubscription === true && (
            <Button
              onClick={sendTestPush}
              className="w-full"
              variant="secondary"
              data-testid="button-send-test-push"
            >
              🚀 테스트 알림 전송
            </Button>
          )}
        </Card>

        {/* 서버 구독 목록 */}
        {serverSubscriptions.length > 0 && (
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">서버 저장된 구독 ({serverSubscriptions.length}개)</h2>
            <div className="space-y-3">
              {serverSubscriptions.map((sub, index) => (
                <div key={index} className="p-3 bg-gray-50 dark:bg-gray-800 rounded text-xs">
                  <div className="font-semibold mb-1">구독 #{index + 1}</div>
                  <div className="space-y-1 text-gray-600 dark:text-gray-400">
                    <div><strong>Endpoint:</strong> {sub.endpoint?.substring(0, 50)}...</div>
                    <div><strong>User Agent:</strong> {sub.userAgent || 'N/A'}</div>
                    <div><strong>등록일:</strong> {new Date(sub.createdAt).toLocaleString('ko-KR')}</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        <Card className="p-4 bg-blue-50 dark:bg-blue-900/20">
          <h3 className="font-semibold text-sm mb-2">📱 Android PWA 테스트 방법</h3>
          <ol className="text-xs space-y-1 list-decimal list-inside text-gray-700 dark:text-gray-300">
            <li>Chrome 브라우저에서 앱 열기</li>
            <li>메뉴 → "홈 화면에 추가" 선택</li>
            <li>홈 화면에서 설치된 PWA 앱 실행</li>
            <li>이 디버그 페이지에서 푸시 구독 등록</li>
            <li>"테스트 알림 전송" 버튼 클릭</li>
          </ol>
        </Card>

        <Card className="p-4">
          <h3 className="font-semibold text-sm mb-3">🔧 사용자 정보</h3>
          <div className="text-xs space-y-1 text-gray-700 dark:text-gray-300">
            <div><strong>User ID:</strong> {status.userId || 'N/A'}</div>
            <div><strong>Username:</strong> {status.username || 'N/A'}</div>
            <div><strong>서버 구독 수:</strong> {status.serverSubscriptionCount || 0}개</div>
          </div>
        </Card>

        <Card className="p-4 text-xs text-gray-600 dark:text-gray-400">
          <strong>User Agent:</strong><br />
          {status.userAgent}
        </Card>
      </div>
    </div>
  );
}

function StatusItem({ label, value, extra }: { label: string; value: boolean | undefined; extra?: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-200 dark:border-gray-700">
      <span className="text-gray-700 dark:text-gray-300">{label}</span>
      <div className="flex items-center gap-2">
        {value === true && <CheckCircle2 className="w-5 h-5 text-green-500" />}
        {value === false && <XCircle className="w-5 h-5 text-red-500" />}
        {value === undefined && <AlertCircle className="w-5 h-5 text-gray-400" />}
        <span className="font-medium">
          {value === true ? '✓' : value === false ? '✗' : '?'}
          {extra}
        </span>
      </div>
    </div>
  );
}
