import { useState, useRef, useCallback, useEffect } from 'react';

interface CachedBlob {
  objectUrl: string;
  timestamp: number;
  size: number;
}

// 전역 캐시 (앱 생명주기 동안 유지)
const globalBlobCache = new Map<string, CachedBlob>();
const loadingPromises = new Map<string, Promise<string>>();

const CACHE_DURATION = 30 * 60 * 1000; // 30분
const MAX_CACHE_SIZE = 50; // 최대 50개 이미지

export function useGlobalBlobCache() {
  const [cacheReady, setCacheReady] = useState(false);
  const [cacheSize, setCacheSize] = useState(0);
  const initRef = useRef(false);

  // 이미지를 Blob으로 다운로드하고 ObjectURL 생성
  const loadImageAsBlob = useCallback(async (imageUrl: string): Promise<string> => {
    // 이미 캐시된 경우
    const cached = globalBlobCache.get(imageUrl);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.objectUrl;
    }

    // 이미 로딩 중인 경우
    const existingPromise = loadingPromises.get(imageUrl);
    if (existingPromise) {
      return existingPromise;
    }

    // 새로운 로딩 시작
    const loadPromise = (async () => {
      try {
        console.log('🔄 Loading image as blob:', imageUrl);
        
        const response = await fetch(imageUrl);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);

        // 기존 ObjectURL 정리
        if (cached?.objectUrl) {
          URL.revokeObjectURL(cached.objectUrl);
        }

        // 캐시 크기 관리
        if (globalBlobCache.size >= MAX_CACHE_SIZE) {
          const oldestEntry = Array.from(globalBlobCache.entries())
            .sort(([,a], [,b]) => a.timestamp - b.timestamp)[0];
          
          if (oldestEntry) {
            URL.revokeObjectURL(oldestEntry[1].objectUrl);
            globalBlobCache.delete(oldestEntry[0]);
          }
        }

        // 캐시에 저장
        globalBlobCache.set(imageUrl, {
          objectUrl,
          timestamp: Date.now(),
          size: blob.size
        });

        console.log('✅ Image cached successfully:', imageUrl);
        setCacheSize(globalBlobCache.size);
        
        return objectUrl;

      } catch (error) {
        console.error('❌ Image load failed:', imageUrl, error);
        throw error;
      } finally {
        loadingPromises.delete(imageUrl);
      }
    })();

    loadingPromises.set(imageUrl, loadPromise);
    return loadPromise;
  }, []);

  // 즉시 사용 가능한 ObjectURL 반환
  const getInstantImage = useCallback((imageUrl: string): string | null => {
    const cached = globalBlobCache.get(imageUrl);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.objectUrl;
    }
    return null;
  }, []);

  // 모든 프로필 이미지 일괄 미리 로딩
  const preloadAllImages = useCallback(async (): Promise<void> => {
    if (initRef.current) return;
    
    console.log('🚀 Starting global image preload...');
    
    try {
      // API 호출하여 모든 이미지 URL 수집
      const [contactsRes, chatRoomsRes] = await Promise.all([
        fetch("/api/contacts", {
          headers: { "x-user-id": localStorage.getItem("userId") || "" },
        }),
        fetch("/api/chat-rooms", {
          headers: { "x-user-id": localStorage.getItem("userId") || "" },
        })
      ]);

      const imageUrls = new Set<string>();

      // 연락처 이미지 수집
      if (contactsRes.ok) {
        const contactsData = await contactsRes.json();
        contactsData.contacts?.forEach((contact: any) => {
          if (contact.contactUser?.profilePicture) {
            imageUrls.add(contact.contactUser.profilePicture);
          }
        });
      }

      // 채팅방 이미지 수집
      if (chatRoomsRes.ok) {
        const chatRoomsData = await chatRoomsRes.json();
        chatRoomsData.chatRooms?.forEach((room: any) => {
          if (room.groupImage) {
            imageUrls.add(room.groupImage);
          }
          room.participants?.forEach((participant: any) => {
            if (participant.profilePicture) {
              imageUrls.add(participant.profilePicture);
            }
          });
        });
      }

      // 현재 사용자 이미지
      const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
      if (currentUser.profilePicture) {
        imageUrls.add(currentUser.profilePicture);
      }

      console.log(`📋 Found ${imageUrls.size} images to preload`);

      // 배치로 이미지 로딩 (동시에 5개씩)
      const urlArray = Array.from(imageUrls);
      const batchSize = 5;
      
      for (let i = 0; i < urlArray.length; i += batchSize) {
        const batch = urlArray.slice(i, i + batchSize);
        await Promise.allSettled(
          batch.map(url => loadImageAsBlob(url))
        );
        
        // 배치 간 짧은 딜레이로 서버 부하 방지
        if (i + batchSize < urlArray.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      initRef.current = true;
      setCacheReady(true);
      console.log(`🎉 Preload complete! ${globalBlobCache.size} images cached`);
      
    } catch (error) {
      console.error('❌ Preload failed:', error);
      setCacheReady(true); // 실패해도 앱 사용은 가능하도록
    }
  }, [loadImageAsBlob]);

  // 캐시 정리
  const clearExpiredCache = useCallback(() => {
    const now = Date.now();
    const expired: string[] = [];
    
    globalBlobCache.forEach((cached, url) => {
      if (now - cached.timestamp > CACHE_DURATION) {
        expired.push(url);
      }
    });

    expired.forEach(url => {
      const cached = globalBlobCache.get(url);
      if (cached) {
        URL.revokeObjectURL(cached.objectUrl);
        globalBlobCache.delete(url);
      }
    });

    if (expired.length > 0) {
      console.log(`🧹 Cleaned up ${expired.length} expired images`);
      setCacheSize(globalBlobCache.size);
    }
  }, []);

  // 30분마다 만료된 캐시 정리
  useEffect(() => {
    const interval = setInterval(clearExpiredCache, 5 * 60 * 1000); // 5분마다 체크
    return () => clearInterval(interval);
  }, [clearExpiredCache]);

  return {
    loadImageAsBlob,
    getInstantImage,
    preloadAllImages,
    cacheReady,
    cacheSize,
    isImageCached: (url: string) => globalBlobCache.has(url)
  };
}