// iOS 16 PWA 전용 Service Worker
const CACHE_NAME = 'dovie-ios16-v1';

// iOS 16 호환 설치
self.addEventListener('install', (event) => {
  console.log('[iOS16 SW] 설치 중...');
  event.waitUntil(
    Promise.resolve().then(() => {
      console.log('[iOS16 SW] 설치 완료');
      return self.skipWaiting();
    })
  );
});

// iOS 16 호환 활성화
self.addEventListener('activate', (event) => {
  console.log('[iOS16 SW] 활성화 중...');
  event.waitUntil(
    Promise.resolve().then(() => {
      console.log('[iOS16 SW] 활성화 완료');
      return self.clients.claim();
    })
  );
});

// iOS 16 PWA 푸시 알림 처리
self.addEventListener('push', (event) => {
  console.log('[iOS16 SW] 푸시 알림 수신:', event);

  let notificationData = {};
  if (event.data) {
    try {
      notificationData = event.data.json();
    } catch (e) {
      notificationData = { 
        title: 'Dovie Messenger',
        body: event.data.text() || '새 메시지가 도착했습니다.'
      };
    }
  } else {
    notificationData = {
      title: 'Dovie Messenger',
      body: '새 메시지가 도착했습니다.'
    };
  }

  // iOS 16 PWA 최적화 옵션
  const options = {
    body: notificationData.body || '새 메시지가 도착했습니다.',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    tag: 'dovie-ios16-' + Date.now(),
    data: notificationData.data || {},
    requireInteraction: false,
    silent: false,
    vibrate: [200, 100, 200],
    timestamp: Date.now(),
    renotify: true,
    dir: 'auto',
    lang: 'ko-KR'
  };

  console.log('[iOS16 SW] 알림 표시:', notificationData.title, options);

  event.waitUntil(
    self.registration.showNotification(
      notificationData.title || 'Dovie Messenger', 
      options
    ).then(() => {
      console.log('[iOS16 SW] 알림 표시 완료');
      // iOS 16 앱 배지 업데이트
      if ('setAppBadge' in navigator) {
        navigator.setAppBadge(notificationData.unreadCount || 1);
      }
    }).catch((error) => {
      console.error('[iOS16 SW] 알림 표시 실패:', error);
    })
  );
});

// iOS 16 알림 클릭 처리
self.addEventListener('notificationclick', (event) => {
  console.log('[iOS16 SW] 알림 클릭됨');
  event.notification.close();

  // 앱 배지 클리어
  if ('clearAppBadge' in navigator) {
    navigator.clearAppBadge();
  }

  const urlToOpen = event.notification.data?.url || '/';
  
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // 기존 창 포커스 시도
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            return client.focus();
          }
        }
        // 새 창 열기
        return self.clients.openWindow(urlToOpen);
      })
  );
});