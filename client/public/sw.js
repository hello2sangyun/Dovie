const CACHE_NAME = 'dovie-messenger-v1';
const STATIC_CACHE_NAME = 'dovie-static-v1';
const DYNAMIC_CACHE_NAME = 'dovie-dynamic-v1';

// Static assets to cache
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

// Runtime caching for API responses
const API_CACHE_PATTERNS = [
  /\/api\/auth\/me/,
  /\/api\/contacts/,
  /\/api\/chat-rooms/,
  /\/api\/profile-images\//
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('[SW] Static assets cached successfully');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[SW] Failed to cache static assets:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
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

// Handle push notifications
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received');
  
  let notificationData = {};
  if (event.data) {
    try {
      notificationData = event.data.json();
    } catch (e) {
      notificationData = { body: event.data.text() };
    }
  }
  
  const options = {
    body: notificationData.body || '새 메시지가 도착했습니다.',
    icon: notificationData.icon || '/icons/icon-192x192.png',
    badge: notificationData.badge || '/icons/icon-72x72.png',
    vibrate: notificationData.vibrate || [200, 100, 200],
    sound: notificationData.sound || '/sounds/notification.mp3',
    requireInteraction: notificationData.requireInteraction || false,
    silent: notificationData.silent || false,
    tag: notificationData.tag || 'message',
    data: {
      url: '/',
      chatRoomId: notificationData.data?.chatRoomId,
      timestamp: Date.now(),
      ...notificationData.data
    },
    actions: notificationData.actions || [
      {
        action: 'open',
        title: '열기',
        icon: '/icons/icon-72x72.png'
      },
      {
        action: 'reply',
        title: '답장',
        icon: '/icons/icon-72x72.png'
      }
    ]
  };
  
  event.waitUntil(
    Promise.all([
      // Show notification
      self.registration.showNotification(
        notificationData.title || 'Dovie Messenger', 
        options
      ),
      // Update app badge with unread count
      updateAppBadge(notificationData.unreadCount)
    ])
  );
});

// App badge functionality
async function updateAppBadge(unreadCount) {
  if ('setAppBadge' in navigator) {
    try {
      if (unreadCount && unreadCount > 0) {
        await navigator.setAppBadge(unreadCount);
        console.log('[SW] App badge updated:', unreadCount);
      } else {
        await navigator.clearAppBadge();
        console.log('[SW] App badge cleared');
      }
    } catch (error) {
      console.error('[SW] Failed to update app badge:', error);
    }
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

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.action);
  
  event.notification.close();
  
  // Clear app badge when notification is clicked
  updateAppBadge(0);
  
  if (event.action === 'open' || !event.action) {
    event.waitUntil(
      self.clients.openWindow(event.notification.data?.url || '/')
    );
  } else if (event.action === 'reply') {
    // Handle reply action - open app to specific chat room
    const chatRoomId = event.notification.data?.chatRoomId;
    const url = chatRoomId ? `/?chat=${chatRoomId}` : '/';
    event.waitUntil(
      self.clients.openWindow(url)
    );
  }
});

// Handle notification close
self.addEventListener('notificationclose', (event) => {
  console.log('[SW] Notification closed:', event.notification.tag);
});

// Handle app visibility change to update badge
self.addEventListener('focus', () => {
  updateAppBadge(0);
});

// Background sync for offline notifications
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(syncOfflineMessages());
  }
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  event.waitUntil(
    clients.openWindow(event.notification.data?.url || '/')
  );
});