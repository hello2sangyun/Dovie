// iOS 16 PWA 강화 Service Worker - 푸시/알림/배지 최적화
const CACHE_NAME = 'dovie-ios16-enhanced-v1';

// iOS 16 PWA 호환 설치
self.addEventListener('install', (event) => {
  console.log('[iOS16 Enhanced SW] 설치 시작...');
  event.waitUntil(
    Promise.resolve().then(() => {
      console.log('[iOS16 Enhanced SW] 설치 완료');
      return self.skipWaiting();
    })
  );
});

// iOS 16 PWA 호환 활성화
self.addEventListener('activate', (event) => {
  console.log('[iOS16 Enhanced SW] 활성화 시작...');
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      // iOS 16 배지 초기화
      updateBadge(0)
    ]).then(() => {
      console.log('[iOS16 Enhanced SW] 활성화 완료');
    })
  );
});

// iOS 16 PWA 푸시 알림 처리 (강화된 배지 지원)
self.addEventListener('push', (event) => {
  console.log('[iOS16 Enhanced SW] 푸시 알림 수신:', event);
  console.log('[iOS16 Enhanced SW] Push data:', event.data ? event.data.text() : 'No data');

  let notificationData = {};
  if (event.data) {
    try {
      notificationData = event.data.json();
      console.log('[iOS16 Enhanced SW] 알림 데이터:', notificationData);
    } catch (e) {
      console.log('[iOS16 Enhanced SW] JSON 파싱 실패, 텍스트 사용');
      notificationData = { 
        title: 'Dovie Messenger',
        body: event.data.text() || '새 메시지가 도착했습니다.',
        unreadCount: 1
      };
    }
  } else {
    notificationData = {
      title: 'Dovie Messenger',
      body: '새 메시지가 도착했습니다.',
      unreadCount: 1
    };
  }

  // iOS 16 PWA 최적화 알림 옵션
  const notificationOptions = {
    body: notificationData.body,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    tag: 'dovie-message',
    renotify: true,
    requireInteraction: false,
    silent: false,
    vibrate: [200, 100, 200],
    data: notificationData.data || {},
    actions: [
      {
        action: 'view',
        title: '보기',
        icon: '/icons/icon-72x72.png'
      }
    ]
  };

  console.log('[iOS16 Enhanced SW] 알림 표시 중:', notificationOptions);

  event.waitUntil(
    Promise.all([
      // 알림 표시
      self.registration.showNotification(notificationData.title || 'Dovie Messenger', notificationOptions),
      // 배지 업데이트
      updateBadge(notificationData.unreadCount || 1)
    ]).then(() => {
      console.log('[iOS16 Enhanced SW] 푸시 알림 표시 완료');
    }).catch(error => {
      console.error('[iOS16 Enhanced SW] 푸시 알림 표시 실패:', error);
    })
  );
});

// iOS 16 강화 배지 업데이트 함수
async function updateBadge(count) {
  console.log('[iOS16 Enhanced SW] 배지 업데이트 시작:', count);
  
  // iOS 16+ 앱 배지 API 사용
  if ('setAppBadge' in navigator) {
    try {
      await navigator.setAppBadge(count > 0 ? count : 0);
      console.log('[iOS16 Enhanced SW] navigator.setAppBadge 성공:', count);
    } catch (error) {
      console.error('[iOS16 Enhanced SW] navigator.setAppBadge 실패:', error);
    }
  }
  
  // Service Worker 레벨 배지 설정 (fallback)
  if ('badge' in self.registration) {
    try {
      await self.registration.badge.set(count > 0 ? count : 0);
      console.log('[iOS16 Enhanced SW] registration.badge.set 성공:', count);
    } catch (error) {
      console.error('[iOS16 Enhanced SW] registration.badge.set 실패:', error);
    }
  }
  
  console.log('[iOS16 Enhanced SW] 배지 업데이트 완료:', count);
}

// 클라이언트에서 배지 업데이트 메시지 처리
self.addEventListener('message', (event) => {
  console.log('[iOS16 Enhanced SW] 메시지 수신:', event.data);
  
  if (event.data && (event.data.type === 'UPDATE_BADGE' || event.data.type === 'FORCE_BADGE_UPDATE')) {
    const count = event.data.count || 0;
    console.log('[iOS16 Enhanced SW] 클라이언트 요청 배지 업데이트:', count);
    updateBadge(count);
  }
});

// 클라이언트에 배지 업데이트 알림
async function notifyClientsOfBadgeUpdate(count) {
  try {
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'BADGE_UPDATE',
        count: count
      });
    });
  } catch (error) {
    console.error('[iOS16 Enhanced SW] 클라이언트 알림 실패:', error);
  }
}

// iOS 16 알림 클릭 처리 (강화)
self.addEventListener('notificationclick', (event) => {
  console.log('[iOS16 Enhanced SW] 알림 클릭:', event.action, event.notification.data);
  
  event.notification.close();

  // 배지 클리어
  updateBadge(0);

  const notificationData = event.notification.data || {};
  let urlToOpen = notificationData.url || '/';

  // 액션별 처리
  if (event.action === 'reply') {
    // 답장 액션
    urlToOpen = notificationData.chatRoomId ? 
      `/?chat=${notificationData.chatRoomId}&action=reply` : '/';
  } else if (event.action === 'view') {
    // 보기 액션
    urlToOpen = notificationData.chatRoomId ? 
      `/?chat=${notificationData.chatRoomId}` : '/';
  } else if (notificationData.chatRoomId) {
    // 기본 클릭
    urlToOpen = `/?chat=${notificationData.chatRoomId}`;
  }

  console.log('[iOS16 Enhanced SW] 열 URL:', urlToOpen);

  event.waitUntil(
    self.clients.matchAll({ 
      type: 'window', 
      includeUncontrolled: true 
    }).then((clientList) => {
      // 기존 창 포커스 시도
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          // 클라이언트에 알림 클릭 이벤트 전송
          client.postMessage({
            type: 'NOTIFICATION_CLICKED',
            url: urlToOpen,
            action: event.action,
            data: notificationData
          });
          return client.focus();
        }
      }
      // 새 창 열기
      return self.clients.openWindow(urlToOpen);
    }).catch((error) => {
      console.error('[iOS16 Enhanced SW] 윈도우 처리 실패:', error);
      return self.clients.openWindow(urlToOpen);
    })
  );
});

// iOS 16 알림 닫기 처리
self.addEventListener('notificationclose', (event) => {
  console.log('[iOS16 Enhanced SW] 알림 닫힘:', event.notification.tag);
  // 알림이 닫혔을 때 배지는 유지 (사용자가 읽지 않았으므로)
});

// 메시지 처리 (배지 관리)
self.addEventListener('message', (event) => {
  console.log('[iOS16 Enhanced SW] 메시지 수신:', event.data);
  
  if (event.data && event.data.type === 'CLEAR_BADGE') {
    updateBadge(0);
  } else if (event.data && event.data.type === 'UPDATE_BADGE') {
    updateBadge(event.data.count || 0);
  } else if (event.data && event.data.type === 'APP_FOCUS') {
    // 앱이 포커스되면 배지 클리어
    updateBadge(0);
  }
});

// 포커스 이벤트 (배지 클리어)
self.addEventListener('focus', () => {
  console.log('[iOS16 Enhanced SW] 앱 포커스됨 - 배지 클리어');
  updateBadge(0);
});

// 백그라운드 동기화 (iOS 16 PWA 지원)
self.addEventListener('sync', (event) => {
  console.log('[iOS16 Enhanced SW] 백그라운드 동기화:', event.tag);
  
  if (event.tag === 'background-sync-messages') {
    event.waitUntil(syncOfflineMessages());
  }
});

// 오프라인 메시지 동기화
async function syncOfflineMessages() {
  try {
    console.log('[iOS16 Enhanced SW] 오프라인 메시지 동기화 시작');
    // 실제 동기화 로직은 IndexedDB와 연동
    // 현재는 로그만 출력
  } catch (error) {
    console.error('[iOS16 Enhanced SW] 동기화 실패:', error);
  }
}