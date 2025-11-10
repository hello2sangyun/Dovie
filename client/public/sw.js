const CACHE_NAME = 'dovie-messenger-v2';
const STATIC_CACHE_NAME = 'dovie-static-v2';
const DYNAMIC_CACHE_NAME = 'dovie-dynamic-v2';

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
  /\/api\/unread-counts/,
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
      console.log('[SW] Returning cached response for:', url.pathname);
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

// Handle background sync for offline messages and badge refresh
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync triggered:', event.tag);
  
  if (event.tag === 'background-sync-messages') {
    event.waitUntil(syncOfflineMessages());
  } else if (event.tag === 'background-sync') {
    event.waitUntil(syncOfflineMessages());
  } else if (event.tag === 'badge-refresh') {
    // Independent badge refresh when app is closed
    event.waitUntil(refreshBadgeFromServer());
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

// Telegram/WhatsApp-style push notification handler
self.addEventListener('push', (event) => {
  console.log('[SW] Telegram-style push received:', event);
  
  // Device detection for platform-specific optimizations
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
               (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isAndroid = /Android/.test(navigator.userAgent);
  
  let notificationData = {};
  if (event.data) {
    try {
      notificationData = event.data.json();
      console.log('[SW] Parsed notification data:', notificationData);
    } catch (e) {
      console.error('[SW] Failed to parse notification:', e);
      notificationData = { 
        title: '새 메시지',
        body: event.data.text() || '메시지를 확인하세요'
      };
    }
  } else {
    console.log('[SW] No data - using default notification');
    notificationData = {
      title: '새 메시지',
      body: '메시지를 확인하세요'
    };
  }
  
  // Telegram/WhatsApp-style notification options
  const options = {
    body: notificationData.body || '메시지를 확인하세요',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    tag: notificationData.tag || `dovie-chat-${notificationData.data?.chatRoomId || Date.now()}`,
    data: {
      url: notificationData.data?.url || '/',
      type: notificationData.data?.type || 'message',
      timestamp: notificationData.timestamp || Date.now(),
      chatRoomId: notificationData.data?.chatRoomId,
      messageId: notificationData.data?.messageId,
      senderId: notificationData.data?.senderId,
      senderName: notificationData.data?.senderName,
      unreadCount: notificationData.data?.unreadCount || 0,
      ...notificationData.data
    },
    // Telegram/WhatsApp behavior patterns
    requireInteraction: false,
    silent: false,
    vibrate: isIOS ? [200, 100, 200] : [300, 100, 300, 100, 300], // WhatsApp pattern
    timestamp: notificationData.timestamp || Date.now(),
    renotify: true, // Replace previous notifications like Telegram
    dir: 'auto',
    lang: 'ko-KR',
    // Telegram-style actions (when supported)
    actions: isIOS ? [] : [
      {
        action: 'reply',
        title: '답장',
        type: 'text',
        placeholder: '메시지를 입력하세요...'
      },
      {
        action: 'mark_read',
        title: '읽음으로 표시'
      }
    ],
    // Platform-specific optimizations
    ...(isAndroid && {
      priority: 'high',
      urgency: 'high'
    })
  };
  
  console.log('[SW] Showing Telegram-style notification:', {
    title: notificationData.title,
    body: options.body,
    tag: options.tag
  });
  
  event.waitUntil(
    self.registration.showNotification(
      notificationData.title || '새 메시지',
      options
    ).then(() => {
      console.log('[SW] Telegram-style notification displayed');
      
      // Update badge only if unread count is provided (like Telegram)
      if (notificationData.data?.unreadCount > 0) {
        return setTelegramStyleBadge(notificationData.data.unreadCount);
      }
    }).catch((error) => {
      console.error('[SW] Notification failed:', error);
      
      // Telegram-style fallback - simple notification
      return self.registration.showNotification('새 메시지', {
        body: '메시지를 확인하세요',
        icon: '/icons/icon-192x192.png',
        tag: `dovie-fallback-${Date.now()}`,
        silent: false
      });
    })
  );
});

// Enhanced independent badge system - works without app execution
async function setTelegramStyleBadge(count) {
  try {
    const badgeCount = Math.max(0, parseInt(count) || 0);
    console.log('[SW] 📱 Setting independent badge:', badgeCount);
    
    // Store badge count persistently for app startup
    await storeBadgeCount(badgeCount);
    
    if ('setAppBadge' in navigator) {
      if (badgeCount > 0) {
        await navigator.setAppBadge(badgeCount);
        console.log('[SW] ✅ Badge set to:', badgeCount);
      } else {
        await navigator.clearAppBadge();
        console.log('[SW] ✅ Badge cleared (0 unread)');
      }
    } else {
      // Fallback for unsupported browsers
      await updateDocumentTitle(badgeCount);
    }
    
    // Schedule periodic badge refresh to maintain accuracy
    await scheduleBadgeRefresh();
  } catch (error) {
    console.error('[SW] ❌ Badge update failed:', error);
  }
}

// Store badge count in persistent storage
async function storeBadgeCount(count) {
  try {
    // Use IndexedDB for persistent storage across app sessions
    const request = indexedDB.open('DovieBadgeDB', 1);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('badgeStore')) {
        db.createObjectStore('badgeStore');
      }
    };
    
    return new Promise((resolve, reject) => {
      request.onsuccess = (event) => {
        const db = event.target.result;
        const transaction = db.transaction(['badgeStore'], 'readwrite');
        const store = transaction.objectStore('badgeStore');
        
        store.put({
          count: count,
          timestamp: Date.now(),
          lastSync: Date.now()
        }, 'currentBadge');
        
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      };
      
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('[SW] Failed to store badge count:', error);
  }
}

// Document title fallback for badge indication
async function updateDocumentTitle(count) {
  try {
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      if (count > 0) {
        client.postMessage({
          type: 'UPDATE_TITLE_BADGE',
          count: count,
          title: `(${count}) Dovie Messenger`
        });
      } else {
        client.postMessage({
          type: 'UPDATE_TITLE_BADGE', 
          count: 0,
          title: 'Dovie Messenger'
        });
      }
    });
  } catch (error) {
    console.error('[SW] Failed to update document title:', error);
  }
}

// Schedule periodic badge refresh for apps that remain closed
async function scheduleBadgeRefresh() {
  try {
    // Register periodic background sync if available
    if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
      await self.registration.sync.register('badge-refresh');
    }
    
    // Also use setTimeout as fallback
    setTimeout(async () => {
      await refreshBadgeFromServer();
    }, 300000); // 5 minutes
  } catch (error) {
    console.error('[SW] Badge refresh scheduling failed:', error);
  }
}

// Refresh badge count from server when app is closed
async function refreshBadgeFromServer() {
  try {
    console.log('[SW] Refreshing badge from server (app closed)');
    
    // Get stored authentication token (user ID)
    const userId = await getStoredAuthToken();
    if (!userId) {
      console.log('[SW] No auth token - skipping badge refresh');
      return;
    }
    
    // Fetch unread count from server using user ID header
    try {
      const requestUrl = '/api/unread-counts';
      const requestOptions = {
        headers: {
          'x-user-id': userId,
          'Content-Type': 'application/json'
        }
      };
      
      const response = await fetch(requestUrl, requestOptions);
      
      if (response.ok) {
        // Clone response BEFORE consuming it
        const responseClone = response.clone();
        const data = await response.json();
        
        const totalUnread = data.unreadCounts ? 
          data.unreadCounts.reduce((sum, room) => sum + (room.unreadCount || 0), 0) : 0;
        
        console.log('[SW] Server badge refresh - total unread:', totalUnread);
        await setTelegramStyleBadge(totalUnread);
        
        // Cache the cloned response for offline use
        try {
          const cache = await caches.open(DYNAMIC_CACHE_NAME);
          const cacheRequest = new Request(requestUrl, requestOptions);
          await cache.put(cacheRequest, responseClone);
          console.log('[SW] Cached unread counts for offline use');
        } catch (cacheError) {
          console.error('[SW] Failed to cache unread counts:', cacheError);
        }
        
        // Schedule next refresh
        setTimeout(() => refreshBadgeFromServer(), 600000); // 10분 후 재시도
      } else {
        console.log('[SW] Badge refresh failed - status:', response.status);
        // 실패시 더 긴 간격으로 재시도
        setTimeout(() => refreshBadgeFromServer(), 1800000); // 30분 후 재시도
      }
    } catch (networkError) {
      console.log('[SW] Network failed, trying cached unread counts');
      
      // Network failed, try to use cached data
      try {
        const cache = await caches.open(DYNAMIC_CACHE_NAME);
        const cacheRequest = new Request('/api/unread-counts', {
          headers: {
            'x-user-id': userId,
            'Content-Type': 'application/json'
          }
        });
        const cachedResponse = await cache.match(cacheRequest);
        
        if (cachedResponse) {
          const data = await cachedResponse.json();
          const totalUnread = data.unreadCounts ? 
            data.unreadCounts.reduce((sum, room) => sum + (room.unreadCount || 0), 0) : 0;
          
          console.log('[SW] Using cached badge count (offline):', totalUnread);
          await setTelegramStyleBadge(totalUnread);
        } else {
          console.log('[SW] No cached unread counts available');
        }
      } catch (cacheError) {
        console.error('[SW] Failed to retrieve cached unread counts:', cacheError);
      }
      
      // 네트워크 오류시 재시도
      setTimeout(() => refreshBadgeFromServer(), 900000); // 15분 후 재시도
    }
  } catch (error) {
    console.error('[SW] Badge refresh from server failed:', error);
    setTimeout(() => refreshBadgeFromServer(), 900000); // 15분 후 재시도
  }
}

// Get stored authentication token from IndexedDB
async function getStoredAuthToken() {
  try {
    const request = indexedDB.open('DovieAuthDB', 1);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('authStore')) {
        db.createObjectStore('authStore');
      }
    };
    
    return new Promise((resolve, reject) => {
      request.onsuccess = (event) => {
        const db = event.target.result;
        const transaction = db.transaction(['authStore'], 'readonly');
        const store = transaction.objectStore('authStore');
        const getRequest = store.get('authToken');
        
        getRequest.onsuccess = () => {
          const result = getRequest.result;
          resolve(result ? result.token : null);
        };
        
        getRequest.onerror = () => resolve(null);
      };
      
      request.onerror = () => resolve(null);
    });
  } catch (error) {
    console.error('[SW] Failed to get auth token:', error);
    return null;
  }
}

// Store authentication token for badge refresh
async function storeAuthToken(token) {
  try {
    const request = indexedDB.open('DovieAuthDB', 1);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('authStore')) {
        db.createObjectStore('authStore');
      }
    };
    
    return new Promise((resolve, reject) => {
      request.onsuccess = (event) => {
        const db = event.target.result;
        const transaction = db.transaction(['authStore'], 'readwrite');
        const store = transaction.objectStore('authStore');
        
        store.put({
          token: token,
          timestamp: Date.now()
        }, 'authToken');
        
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      };
      
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('[SW] Failed to store auth token:', error);
  }
}

// Legacy badge function for compatibility
async function updateAppBadge(unreadCount) {
  await setTelegramStyleBadge(unreadCount);
}

// Handle messages from main thread - completely independent from push notifications
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);
  
  switch (event.data.type) {
    case 'SET_BADGE_DATABASE_COUNT':
      // Set badge based purely on database unread count, ignore all push notification state
      console.log('[SW] Setting badge to exact database count:', event.data.count);
      updateAppBadge(event.data.count || 0);
      break;
    case 'UPDATE_BADGE_FORCE':
    case 'UPDATE_BADGE':
      // Legacy support - only accept database-sourced updates
      if (event.data.source === 'database' || event.data.source === 'pure_database') {
        console.log('[SW] Updating badge from database source:', event.data.count);
        updateAppBadge(event.data.count || 0);
      } else {
        console.log('[SW] Ignoring non-database badge update from:', event.data.source);
      }
      break;
    case 'CLEAR_BADGE':
      console.log('[SW] Clearing badge (database command)');
      updateAppBadge(0);
      break;
    case 'UPDATE_BADGE_COUNT':
    case 'TELEGRAM_BADGE_UPDATE':
    case 'TELEGRAM_STYLE_BADGE':
      // Set badge exactly like Telegram/WhatsApp
      console.log('[SW] Setting badge count:', event.data.count);
      setTelegramStyleBadge(event.data.count || 0);
      break;
    case 'FORCE_SET_BADGE':
      // Force set badge regardless of push notification state
      console.log('[SW] Force setting badge:', event.data.count);
      updateAppBadge(event.data.count || 0);
      break;
    case 'STORE_AUTH_TOKEN':
      // Store authentication token for independent badge refresh
      console.log('[SW] Storing auth token for badge refresh');
      storeAuthToken(event.data.token);
      break;
    case 'INIT_BADGE_SYSTEM':
      // Initialize badge system independent of push notifications
      console.log('[SW] Badge system initialized - independent mode');
      break;
    case 'APP_FOCUS':
      // App focused - badge stays exactly as database indicates
      console.log('[SW] App focused - badge remains database-accurate');
      break;
    case 'UPDATE_TITLE_BADGE':
      // Handle document title badge updates for unsupported browsers
      if (event.data.count > 0) {
        console.log('[SW] Setting document title badge:', event.data.title);
      }
      break;
    case 'ENABLE_BACKGROUND_REFRESH':
      // Enable periodic badge refresh when app goes to background
      console.log('[SW] Enabling background badge refresh');
      setTimeout(() => refreshBadgeFromServer(), event.data.interval || 300000);
      break;
    case 'FORCE_BADGE_REFRESH':
      // Force immediate badge refresh from server
      console.log('[SW] Force badge refresh requested');
      refreshBadgeFromServer();
      break;
  }
});

// Removed duplicate message listener - handled above

// Telegram/WhatsApp-style notification click handler
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked - Action:', event.action);
  console.log('[SW] Notification data:', event.notification.data);
  
  event.notification.close();
  
  const chatRoomId = event.notification.data?.chatRoomId;
  const messageId = event.notification.data?.messageId;
  const senderId = event.notification.data?.senderId;
  
  // Handle Telegram-style notification actions
  if (event.action === 'reply') {
    console.log('[SW] Reply action triggered');
    event.waitUntil(handleReplyAction(chatRoomId, messageId));
    return;
  }
  
  if (event.action === 'mark_read') {
    console.log('[SW] Mark read action triggered');
    event.waitUntil(handleMarkReadAction(chatRoomId, messageId));
    return;
  }
  
  // Default action - open chat (like Telegram/WhatsApp)
  const urlToOpen = chatRoomId ? `/?chat=${chatRoomId}` : '/';
  
  console.log('[SW] Opening chat:', urlToOpen);
  
  event.waitUntil(
    self.clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then((clientList) => {
      // Try to focus existing window first (like Telegram/WhatsApp)
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          console.log('[SW] Focusing existing window');
          client.postMessage({
            type: 'NOTIFICATION_CLICKED',
            url: urlToOpen,
            chatRoomId: chatRoomId,
            messageId: messageId,
            action: 'open_chat'
          });
          return client.focus();
        }
      }
      // Open new window if none exists
      console.log('[SW] Opening new window');
      return self.clients.openWindow(urlToOpen);
    }).catch((error) => {
      console.error('[SW] Failed to handle notification click:', error);
      return self.clients.openWindow(urlToOpen);
    })
  );
});

// Telegram-style reply action handler
async function handleReplyAction(chatRoomId, messageId) {
  try {
    console.log('[SW] Handling reply action for chat:', chatRoomId);
    
    // Focus app and open reply interface
    const clients = await self.clients.matchAll({ type: 'window' });
    for (const client of clients) {
      if (client.url.includes(self.location.origin)) {
        client.postMessage({
          type: 'QUICK_REPLY',
          chatRoomId: chatRoomId,
          messageId: messageId
        });
        return client.focus();
      }
    }
    
    // Open new window with reply interface
    return self.clients.openWindow(`/?chat=${chatRoomId}&reply=${messageId}`);
  } catch (error) {
    console.error('[SW] Reply action failed:', error);
  }
}

// Telegram-style mark read action handler
async function handleMarkReadAction(chatRoomId, messageId) {
  try {
    console.log('[SW] Marking chat as read:', chatRoomId);
    
    // Send mark read request to API
    const response = await fetch(`/api/chat-rooms/${chatRoomId}/mark-read`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ messageId })
    });
    
    if (response.ok) {
      console.log('[SW] Chat marked as read successfully');
      
      // Update badge count (like Telegram)
      const clients = await self.clients.matchAll({ type: 'window' });
      for (const client of clients) {
        if (client.url.includes(self.location.origin)) {
          client.postMessage({
            type: 'CHAT_MARKED_READ',
            chatRoomId: chatRoomId
          });
        }
      }
    } else {
      console.error('[SW] Failed to mark chat as read');
    }
  } catch (error) {
    console.error('[SW] Mark read action failed:', error);
  }
}

// Handle notification close
self.addEventListener('notificationclose', (event) => {
  console.log('[SW] Notification closed:', event.notification.tag);
});

// Handle app visibility change - removed badge clearing to maintain unread count
self.addEventListener('focus', () => {
  console.log('[SW] App focused - maintaining badge state');
});

// Message listener for badge updates from main app
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);
  
  if (event.data && event.data.type === 'UPDATE_BADGE_COUNT') {
    const unreadCount = event.data.count;
    console.log('[SW] Updating badge count to:', unreadCount);
    updateAppBadge(unreadCount);
  }
});

// Periodic badge sync - fetch current unread count every 30 seconds
setInterval(async () => {
  try {
    console.log('[SW] Syncing badge count with server');
    const response = await fetch('/api/unread-counts');
    if (response.ok) {
      const data = await response.json();
      const totalUnread = data.unreadCounts?.reduce((total, count) => total + count.unreadCount, 0) || 0;
      console.log('[SW] Server badge sync - total unread:', totalUnread);
      await updateAppBadge(totalUnread);
    }
  } catch (error) {
    console.error('[SW] Badge sync failed:', error);
  }
}, 30000);