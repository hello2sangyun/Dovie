// iOS 16+ PWA 배지 전용 Service Worker
console.log('[Badge SW] 배지 전용 Service Worker 로드됨');

// Install event
self.addEventListener('install', (event) => {
  console.log('[Badge SW] Installing...');
  self.skipWaiting();
});

// Activate event
self.addEventListener('activate', (event) => {
  console.log('[Badge SW] Activating...');
  event.waitUntil(self.clients.claim());
});

// 배지 업데이트 함수
async function updateAppBadge(count) {
  console.log('[Badge SW] 배지 업데이트 요청:', count);
  
  try {
    // iOS 16+ PWA에서 가장 확실한 방법
    if ('setAppBadge' in self.registration) {
      if (count > 0) {
        await self.registration.setAppBadge(count);
        console.log('[Badge SW] ✅ registration.setAppBadge 성공:', count);
        return;
      } else {
        await self.registration.clearAppBadge();
        console.log('[Badge SW] ✅ registration.clearAppBadge 성공');
        return;
      }
    }
  } catch (error) {
    console.log('[Badge SW] registration.setAppBadge 실패:', error);
  }

  // Fallback for older iOS versions
  try {
    if ('badge' in self.registration) {
      await self.registration.badge.set(count);
      console.log('[Badge SW] ✅ badge.set 성공:', count);
    }
  } catch (error) {
    console.log('[Badge SW] badge.set 실패:', error);
  }
}

// 메시지 리스너
self.addEventListener('message', (event) => {
  console.log('[Badge SW] 메시지 수신:', event.data);
  
  if (event.data && event.data.type === 'SET_BADGE') {
    updateAppBadge(event.data.count || 0);
  }
});

// Push 이벤트에서도 배지 업데이트
self.addEventListener('push', (event) => {
  if (event.data) {
    try {
      const data = event.data.json();
      if (data.unreadCount !== undefined) {
        updateAppBadge(data.unreadCount);
      }
    } catch (e) {
      console.log('[Badge SW] Push 데이터 파싱 실패');
    }
  }
});