// Chrome PWA 최적화 Service Worker
const CACHE_NAME = 'dovie-chrome-pwa-v3';
const STATIC_CACHE_NAME = 'dovie-static-chrome-v3';
const DYNAMIC_CACHE_NAME = 'dovie-dynamic-chrome-v3';

// Chrome PWA에 최적화된 정적 자산
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/icons/icon-72x72.png',
  '/icons/icon-96x96.png'
];

// API 캐싱 패턴 - Chrome PWA 최적화
const API_CACHE_PATTERNS = [
  /\/api\/auth\/me/,
  /\/api\/contacts/,
  /\/api\/chat-rooms/,
  /\/api\/profile-images\//
];

// Chrome PWA Install 이벤트
self.addEventListener('install', (event) => {
  console.log('[Chrome SW] 🚀 Chrome PWA Service Worker 설치 중...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then((cache) => {
        console.log('[Chrome SW] 📦 Chrome PWA 정적 자산 캐싱');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('[Chrome SW] ✅ Chrome PWA 정적 자산 캐시 완료');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[Chrome SW] ❌ Chrome PWA 캐시 실패:', error);
      })
  );
});

// Chrome PWA Activate 이벤트
self.addEventListener('activate', (event) => {
  console.log('[Chrome SW] 🔄 Chrome PWA Service Worker 활성화');
  
  event.waitUntil(
    Promise.all([
      // 이전 캐시 정리
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => {
              return cacheName !== STATIC_CACHE_NAME && 
                     cacheName !== DYNAMIC_CACHE_NAME &&
                     cacheName.startsWith('dovie-');
            })
            .map((cacheName) => {
              console.log('[Chrome SW] 🗑️ 이전 캐시 삭제:', cacheName);
              return caches.delete(cacheName);
            })
        );
      }),
      // 모든 클라이언트 제어 시작
      self.clients.claim()
    ]).then(() => {
      console.log('[Chrome SW] ✅ Chrome PWA Service Worker 활성화 완료');
    })
  );
});

// Chrome PWA Fetch 이벤트 - 네트워크 우선 전략
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // API 요청 처리 - Chrome PWA 최적화
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // 성공적인 응답만 캐시
          if (response.ok && API_CACHE_PATTERNS.some(pattern => pattern.test(url.pathname))) {
            const responseClone = response.clone();
            caches.open(DYNAMIC_CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // 네트워크 실패 시 캐시에서 응답
          return caches.match(request);
        })
    );
    return;
  }

  // 정적 자산 처리 - Chrome PWA 최적화
  if (request.destination === 'document' || 
      request.destination === 'script' || 
      request.destination === 'style' ||
      request.destination === 'image') {
    
    event.respondWith(
      caches.match(request)
        .then((cachedResponse) => {
          return cachedResponse || fetch(request)
            .then((response) => {
              if (response.ok) {
                const responseClone = response.clone();
                caches.open(STATIC_CACHE_NAME).then((cache) => {
                  cache.put(request, responseClone);
                });
              }
              return response;
            });
        })
        .catch(() => {
          // 오프라인 폴백
          if (request.destination === 'document') {
            return caches.match('/');
          }
        })
    );
  }
});

// Chrome PWA 푸시 알림 이벤트 - 최적화
self.addEventListener('push', (event) => {
  console.log('[Chrome SW] 🔔 Chrome PWA 푸시 알림 수신:', event);
  
  let notificationData = {};
  if (event.data) {
    try {
      notificationData = event.data.json();
      console.log('[Chrome SW] 📋 알림 데이터 파싱 완료:', notificationData);
    } catch (e) {
      console.error('[Chrome SW] ❌ 알림 데이터 파싱 실패:', e);
      notificationData = { 
        title: 'Dovie Messenger',
        body: event.data ? event.data.text() : '새 메시지가 도착했습니다.'
      };
    }
  } else {
    notificationData = {
      title: 'Dovie Messenger',
      body: '새 메시지가 도착했습니다.'
    };
  }
  
  // Chrome PWA 최적화된 알림 옵션
  const options = {
    body: notificationData.body || '새 메시지가 도착했습니다.',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    tag: 'dovie-chrome-message-' + Date.now(),
    data: {
      url: notificationData.data?.url || '/',
      type: notificationData.data?.type || 'message',
      timestamp: Date.now(),
      chatRoomId: notificationData.data?.chatRoomId,
      messageId: notificationData.data?.messageId,
      ...notificationData.data
    },
    // Chrome PWA 특화 설정
    requireInteraction: false,
    silent: false,
    vibrate: [200, 100, 200],
    timestamp: Date.now(),
    renotify: true,
    dir: 'auto',
    lang: 'ko-KR',
    // Chrome 특화 액션 버튼
    actions: [
      {
        action: 'reply',
        title: '답장',
        icon: '/icons/icon-72x72.png'
      },
      {
        action: 'view',
        title: '보기',
        icon: '/icons/icon-72x72.png'
      }
    ]
  };
  
  console.log('[Chrome SW] 🔔 Chrome PWA 알림 표시:', options);
  
  event.waitUntil(
    Promise.all([
      // 알림 표시
      self.registration.showNotification(
        notificationData.title || 'Dovie Messenger', 
        options
      ).then(() => {
        console.log('[Chrome SW] ✅ Chrome PWA 알림 표시 성공');
        return updateChromeBadge(notificationData.unreadCount || 1);
      }).catch((error) => {
        console.error('[Chrome SW] ❌ Chrome PWA 알림 실패:', error);
        // Chrome 폴백 알림
        return self.registration.showNotification('새 메시지', {
          body: '메시지를 확인하세요',
          icon: '/icons/icon-192x192.png',
          silent: false
        });
      }),
      // Chrome 뱃지 업데이트
      updateChromeBadge(notificationData.unreadCount || 1)
    ]).then(() => {
      console.log('[Chrome SW] 🔔 Chrome PWA 알림 및 뱃지 업데이트 완료');
    })
  );
});

// Chrome PWA 뱃지 업데이트 함수
async function updateChromeBadge(count) {
  try {
    console.log('[Chrome SW] 🏷️ Chrome PWA 뱃지 업데이트 시도:', count);
    
    // Chrome PWA Navigator Badge API (최우선)
    if ('setAppBadge' in navigator) {
      await navigator.setAppBadge(count);
      console.log('[Chrome SW] ✅ Chrome Navigator Badge API 성공:', count);
      return;
    }
    
    // Chrome PWA ServiceWorkerRegistration Badge API
    if (self.registration && 'setAppBadge' in self.registration) {
      await self.registration.setAppBadge(count);
      console.log('[Chrome SW] ✅ Chrome Registration Badge API 성공:', count);
      return;
    }
    
    // Chrome PWA 클라이언트 메시지 전송
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'BADGE_UPDATE',
        count: count
      });
    });
    
    console.log('[Chrome SW] 📤 Chrome PWA 클라이언트 뱃지 메시지 전송:', count);
    
  } catch (error) {
    console.error('[Chrome SW] ❌ Chrome PWA 뱃지 업데이트 실패:', error);
  }
}

// Chrome PWA 알림 클릭 이벤트
self.addEventListener('notificationclick', (event) => {
  console.log('[Chrome SW] 👆 Chrome PWA 알림 클릭:', event);
  
  event.notification.close();
  
  const urlToOpen = event.notification.data?.url || '/';
  const action = event.action;
  
  console.log('[Chrome SW] 🎯 Chrome PWA 알림 액션:', action, 'URL:', urlToOpen);
  
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // 기존 창이 있으면 포커스
        for (const client of clientList) {
          if (client.url.includes(urlToOpen.split('?')[0]) && 'focus' in client) {
            console.log('[Chrome SW] 🔍 Chrome PWA 기존 창 포커스');
            return client.focus();
          }
        }
        
        // 새 창 열기
        if (self.clients.openWindow) {
          console.log('[Chrome SW] 🆕 Chrome PWA 새 창 열기:', urlToOpen);
          return self.clients.openWindow(urlToOpen);
        }
      })
      .then(() => {
        // 뱃지 클리어 (알림 확인 시)
        return updateChromeBadge(0);
      })
  );
});

// Chrome PWA 클라이언트 메시지 처리
self.addEventListener('message', (event) => {
  console.log('[Chrome SW] 📨 Chrome PWA 클라이언트 메시지:', event.data);
  
  if (event.data && event.data.type === 'BADGE_UPDATE') {
    updateChromeBadge(event.data.count);
  }
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Chrome PWA 동기화 이벤트 (백그라운드 동기화)
self.addEventListener('sync', (event) => {
  console.log('[Chrome SW] 🔄 Chrome PWA 백그라운드 동기화:', event.tag);
  
  if (event.tag === 'background-sync') {
    event.waitUntil(
      // 백그라운드에서 새 메시지 확인
      fetch('/api/chat-rooms/unread-count')
        .then(response => response.json())
        .then(data => {
          if (data.unreadCount > 0) {
            updateChromeBadge(data.unreadCount);
          }
        })
        .catch(error => {
          console.error('[Chrome SW] ❌ 백그라운드 동기화 실패:', error);
        })
    );
  }
});

console.log('[Chrome SW] 🚀 Chrome PWA Service Worker 로드 완료');