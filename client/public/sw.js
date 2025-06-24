const CACHE_NAME = 'dovie-chrome-pwa-v2';
const STATIC_CACHE_NAME = 'dovie-static-chrome-v2';
const DYNAMIC_CACHE_NAME = 'dovie-dynamic-chrome-v2';

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
                     cacheName !== DYNAMIC_CACHE_NAME;
            })
            .map((cacheName) => {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            })
        );
      })
      .then(() => {
        console.log('[SW] Service worker activated');
        return self.clients.claim();
      })
  );
});

// Fetch event - serve from cache or network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Handle different types of requests
  if (request.method === 'GET') {
    if (url.pathname.startsWith('/api/')) {
      // API requests - network first with cache fallback
      event.respondWith(handleApiRequest(request));
    } else if (url.pathname.startsWith('/uploads/') || url.pathname.startsWith('/icons/')) {
      // Media files - cache first
      event.respondWith(handleMediaRequest(request));
    } else {
      // Static assets - cache first with network fallback
      event.respondWith(handleStaticRequest(request));
    }
  }
});

// Handle API requests - network first strategy
async function handleApiRequest(request) {
  const url = new URL(request.url);
  
  try {
    // Try network first
    const networkResponse = await fetch(request.clone());
    
    // Cache successful responses for offline access
    if (networkResponse.ok && shouldCacheApiResponse(url.pathname)) {
      const cache = await caches.open(DYNAMIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[SW] Network failed for API request, trying cache:', url.pathname);
    
    // Network failed, try cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline response for critical APIs
    if (url.pathname === '/api/auth/me') {
      return new Response(JSON.stringify({ error: 'offline' }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    throw error;
  }
}

// Handle media requests - cache first strategy
async function handleMediaRequest(request) {
  try {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[SW] Failed to load media:', request.url);
    throw error;
  }
}

// Handle static requests - cache first with network fallback
async function handleStaticRequest(request) {
  try {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    // For navigation requests, return cached index.html
    if (request.destination === 'document') {
      const cachedIndex = await caches.match('/');
      if (cachedIndex) {
        return cachedIndex;
      }
    }
    
    throw error;
  }
}

// Determine which API responses should be cached
function shouldCacheApiResponse(pathname) {
  return API_CACHE_PATTERNS.some(pattern => pattern.test(pathname));
}

// Handle background sync for offline messages
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync triggered:', event.tag);
  
  if (event.tag === 'background-sync-messages') {
    event.waitUntil(syncOfflineMessages());
  } else if (event.tag === 'background-sync') {
    event.waitUntil(syncOfflineMessages());
  }
});

// Sync offline messages when connection is restored
async function syncOfflineMessages() {
  try {
    // Get pending messages from IndexedDB or localStorage
    const pendingMessages = await getPendingMessages();
    
    for (const message of pendingMessages) {
      try {
        await fetch('/api/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(message)
        });
        
        // Remove from pending queue on success
        await removePendingMessage(message.id);
      } catch (error) {
        console.error('[SW] Failed to sync message:', error);
      }
    }
  } catch (error) {
    console.error('[SW] Background sync failed:', error);
  }
}

// Helper functions for offline message queue
async function getPendingMessages() {
  // This would typically use IndexedDB
  // For now, return empty array
  return [];
}

async function removePendingMessage(messageId) {
  // This would typically remove from IndexedDB
  console.log('[SW] Would remove pending message:', messageId);
}

// Handle push notifications - iPhone & Android PWA optimized
self.addEventListener('push', (event) => {
  console.log('[SW] 🔔 PWA Push notification received:', event);
  console.log('[SW] 🔔 User Agent:', navigator.userAgent);
  console.log('[SW] 🔔 Service Worker registration:', self.registration);
  
  // Detect device type for PWA optimization
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
               (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isAndroid = /Android/.test(navigator.userAgent);
  
  console.log('[SW] 🔔 Device detection - iOS:', isIOS, 'Android:', isAndroid);
  
  let notificationData = {};
  if (event.data) {
    try {
      notificationData = event.data.json();
      console.log('[SW] 🔔 Notification data parsed:', notificationData);
    } catch (e) {
      console.error('[SW] 🔔 Failed to parse notification data:', e);
      // Fallback for PWA
      const textData = event.data.text();
      console.log('[SW] 🔔 Raw notification text:', textData);
      notificationData = { 
        title: 'Dovie Messenger',
        body: textData || '새 메시지가 도착했습니다.'
      };
    }
  } else {
    console.log('[SW] 🔔 No notification data provided - using default');
    notificationData = {
      title: 'Dovie Messenger',
      body: '새 메시지가 도착했습니다.'
    };
  }
  
  // PWA critical notification options - optimized for iOS Safari & Android Chrome
  const options = {
    body: notificationData.body || '새 메시지가 도착했습니다.',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png', 
    tag: 'dovie-message-' + Date.now(), // Unique tag for PWA
    data: {
      url: notificationData.data?.url || '/',
      type: notificationData.data?.type || 'message',
      timestamp: Date.now(),
      chatRoomId: notificationData.data?.chatRoomId,
      messageId: notificationData.data?.messageId,
      ...notificationData.data
    },
    // PWA optimized settings - critical for iOS & Android
    requireInteraction: false, // Allow auto-dismiss
    silent: false, // Enable sound
    vibrate: isIOS ? [200, 100, 200] : [200, 100, 200, 100, 200], // iOS vs Android vibration
    timestamp: Date.now(),
    renotify: true, // Force new notification
    // Device specific
    dir: 'auto',
    lang: 'ko-KR',
    // Android specific optimization
    ...(isAndroid && {
      priority: 'high',
      urgency: 'high'
    }),
    // iOS specific optimization  
    ...(isIOS && {
      actions: [] // iOS PWA needs empty actions array
    })
  };
  
  console.log('[SW] 🔔 PWA showing notification with options:', options);
  console.log('[SW] 🔔 Notification title:', notificationData.title || 'Dovie Messenger');
  
  event.waitUntil(
    Promise.all([
      // Critical: Show notification with enhanced error handling for PWA
      self.registration.showNotification(
        notificationData.title || 'Dovie Messenger', 
        options
      ).then(() => {
        console.log('[SW] ✅ PWA notification shown successfully');
        // Force badge update immediately after showing notification
        return updateAppBadge(notificationData.unreadCount || 1);
      }).catch((error) => {
        console.error('[SW] ❌ PWA notification failed:', error);
        console.error('[SW] ❌ Error details:', error.message, error.stack);
        // Try simple notification as fallback
        return self.registration.showNotification('새 메시지', {
          body: '메시지를 확인하세요',
          icon: '/icons/icon-192x192.png',
          silent: false
        }).catch((fallbackError) => {
          console.error('[SW] ❌ Fallback notification also failed:', fallbackError);
          // Last resort - minimal notification
          return self.registration.showNotification('Dovie');
        });
      }),
      // Update app badge with enhanced PWA support
      updateAppBadge(notificationData.unreadCount || 1)
    ]).then(() => {
      console.log('[SW] 🔔 PWA notification process completed');
    }).catch((error) => {
      console.error('[SW] 🔔 PWA notification process failed:', error);
    })
  );
});

// iOS 16+ PWA 배지 기능 (단순화된 방식)
async function updateAppBadge(unreadCount) {
  console.log('[SW] 배지 업데이트 요청:', unreadCount);
  
  try {
    // 방법 1: Service Worker registration setAppBadge
    if ('setAppBadge' in self.registration) {
      if (unreadCount && unreadCount > 0) {
        await self.registration.setAppBadge(unreadCount);
        console.log('[SW] registration.setAppBadge 성공:', unreadCount);
        return;
      } else {
        await self.registration.clearAppBadge();
        console.log('[SW] registration.clearAppBadge 성공');
        return;
      }
    }
  } catch (error) {
    console.log('[SW] registration.setAppBadge 실패:', error);
  }

  try {
    // 방법 2: navigator setAppBadge (fallback)
    if ('setAppBadge' in navigator) {
      if (unreadCount && unreadCount > 0) {
        await navigator.setAppBadge(unreadCount);
        console.log('[SW] navigator.setAppBadge 성공:', unreadCount);
      } else {
        await navigator.clearAppBadge();
        console.log('[SW] navigator.clearAppBadge 성공');
      }
    }
  } catch (error) {
    console.log('[SW] navigator.setAppBadge 실패:', error);
  }
}

// Clear app badge when app becomes visible
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CLEAR_BADGE') {
    updateAppBadge(0);
  }
  if (event.data && event.data.type === 'UPDATE_BADGE') {
    updateAppBadge(event.data.count);
  }
});

// Handle notification clicks - iPhone PWA optimized
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] 📱 iPhone PWA notification clicked:', event.action);
  console.log('[SW] 📱 Notification data:', event.notification.data);
  
  event.notification.close();
  
  // Clear app badge when notification is clicked (iPhone PWA critical)
  updateAppBadge(0);
  
  // iPhone PWA optimized window handling
  const urlToOpen = event.notification.data?.url || '/';
  const chatRoomId = event.notification.data?.chatRoomId;
  const finalUrl = chatRoomId ? `/?chat=${chatRoomId}` : urlToOpen;
  
  console.log('[SW] 📱 Opening URL:', finalUrl);
  
  event.waitUntil(
    self.clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then((clientList) => {
      // iPhone PWA: Try to focus existing window first
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          console.log('[SW] 📱 Focusing existing window');
          client.postMessage({
            type: 'NOTIFICATION_CLICKED',
            url: finalUrl,
            chatRoomId: chatRoomId
          });
          return client.focus();
        }
      }
      // If no existing window, open new one
      console.log('[SW] 📱 Opening new window');
      return self.clients.openWindow(finalUrl);
    }).catch((error) => {
      console.error('[SW] 📱 Failed to handle notification click:', error);
      // Fallback: just try to open window
      return self.clients.openWindow(finalUrl);
    })
  );
});

// Handle notification close
self.addEventListener('notificationclose', (event) => {
  console.log('[SW] Notification closed:', event.notification.tag);
});

// Handle app visibility change to update badge
self.addEventListener('focus', () => {
  updateAppBadge(0);
});