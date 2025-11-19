import { useEffect, useRef } from 'react';

/**
 * 독립적 배지 시스템 - 앱 실행 없이도 배지 업데이트 가능
 * PWA 앱이 완전히 종료된 상태에서도 Service Worker가 배지를 관리
 */
export function useIndependentBadge() {
  const isInitialized = useRef(false);

  useEffect(() => {
    if (isInitialized.current) return;
    isInitialized.current = true;

    const initializeIndependentBadge = async () => {
      try {
        // Service Worker 등록 확인
        if (!('serviceWorker' in navigator)) {
          console.log('[Badge] Service Worker not supported');
          return;
        }

        // Service Worker 활성화 대기
        await navigator.serviceWorker.ready;

        // 앱 시작 시 저장된 배지 정보 복원
        await restoreSavedBadge();

        // 백그라운드 배지 새로고침 활성화
        enableBackgroundBadgeRefresh();

        // 앱 포커스 시 배지 동기화
        setupAppFocusSync();

        console.log('[Badge] Independent badge system initialized');
      } catch (error) {
        console.error('[Badge] Failed to initialize independent badge system:', error);
      }
    };

    initializeIndependentBadge();
  }, []);

  // 저장된 배지 정보 복원
  const restoreSavedBadge = async () => {
    try {
      const request = indexedDB.open('DovieBadgeDB', 1);
      
      request.onupgradeneeded = (event) => {
        if (event.target) {
          const db = (event.target as IDBOpenDBRequest).result;
          if (!db.objectStoreNames.contains('badgeStore')) {
            db.createObjectStore('badgeStore');
          }
        }
      };

      return new Promise((resolve) => {
        request.onsuccess = (event) => {
          if (event.target) {
            const db = (event.target as IDBOpenDBRequest).result;
            const transaction = db.transaction(['badgeStore'], 'readonly');
            const store = transaction.objectStore('badgeStore');
            const getRequest = store.get('currentBadge');

            getRequest.onsuccess = () => {
              const savedBadge = getRequest.result;
              if (savedBadge && savedBadge.count > 0) {
                // 저장된 배지 정보로 복원
                navigator.serviceWorker.controller?.postMessage({
                  type: 'TELEGRAM_STYLE_BADGE',
                  count: savedBadge.count,
                  source: 'restored'
                });
                console.log('[Badge] Restored saved badge:', savedBadge.count);
              }
              resolve(null);
            };

            getRequest.onerror = () => resolve(null);
          } else {
            resolve(null);
          }
        };

        request.onerror = () => resolve(null);
      });
    } catch (error) {
      console.error('[Badge] Failed to restore saved badge:', error);
    }
  };

  // 백그라운드 배지 새로고침 활성화
  const enableBackgroundBadgeRefresh = () => {
    // 앱이 백그라운드로 이동할 때 자동 새로고침 활성화
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        // 앱이 백그라운드로 이동 - Service Worker에 자동 새로고침 신호
        navigator.serviceWorker.controller?.postMessage({
          type: 'ENABLE_BACKGROUND_REFRESH',
          interval: 300000 // 5분마다
        });
      }
    });
  };

  // 앱 포커스 시 배지 동기화
  const setupAppFocusSync = () => {
    const syncBadgeOnFocus = () => {
      // 앱이 활성화될 때 서버에서 최신 배지 정보 가져오기
      fetch('/api/unread-counts', {
        headers: {
          'x-user-id': localStorage.getItem('userId') || '',
          'Content-Type': 'application/json'
        }
      })
      .then(response => response.json())
      .then(data => {
        const totalUnread = data.unreadCounts ? 
          data.unreadCounts.reduce((sum: number, room: any) => sum + (room.unreadCount || 0), 0) : 0;
        
        navigator.serviceWorker.controller?.postMessage({
          type: 'TELEGRAM_STYLE_BADGE',
          count: totalUnread,
          source: 'app_focus_sync'
        });
      })
      .catch(error => {
        console.log('[Badge] Focus sync failed:', error);
      });
    };

    window.addEventListener('focus', syncBadgeOnFocus);
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        syncBadgeOnFocus();
      }
    });
  };

  return {
    // 수동으로 배지 강제 새로고침
    forceBadgeRefresh: () => {
      navigator.serviceWorker.controller?.postMessage({
        type: 'FORCE_BADGE_REFRESH'
      });
    },

    // 배지 초기화
    clearBadge: () => {
      navigator.serviceWorker.controller?.postMessage({
        type: 'TELEGRAM_STYLE_BADGE',
        count: 0,
        source: 'manual_clear'
      });
    }
  };
}