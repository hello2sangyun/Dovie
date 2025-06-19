import { useEffect, useRef, useCallback, useState } from "react";

interface ImageCacheEntry {
  blob: Blob;
  objectUrl: string;
  timestamp: number;
  preloaded: boolean;
}

interface InstantImageCache {
  preloadAllImages: () => Promise<void>;
  getInstantImage: (url: string) => string | null;
  isImageReady: (url: string) => boolean;
  getCacheSize: () => number;
  clearCache: () => void;
}

// 전역 이미지 캐시 - 앱 전체에서 공유
const globalImageCache = new Map<string, ImageCacheEntry>();
const preloadingUrls = new Set<string>();

export function useInstantImageCache(): InstantImageCache {
  const [cacheSize, setCacheSize] = useState(0);
  const abortController = useRef<AbortController | null>(null);

  // 이미지를 Blob으로 변환하여 즉시 사용 가능한 ObjectURL 생성
  const preloadImageAsBlob = useCallback(async (url: string): Promise<void> => {
    if (globalImageCache.has(url) || preloadingUrls.has(url)) {
      return;
    }

    preloadingUrls.add(url);

    try {
      const response = await fetch(url, {
        signal: abortController.current?.signal
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);

      globalImageCache.set(url, {
        blob,
        objectUrl,
        timestamp: Date.now(),
        preloaded: true
      });

      setCacheSize(globalImageCache.size);
    } catch (error) {
      console.log(`Image preload failed for ${url}:`, error);
    } finally {
      preloadingUrls.delete(url);
    }
  }, []);

  // 모든 프로필 이미지를 한 번에 미리 다운로드
  const preloadAllImages = useCallback(async (): Promise<void> => {
    try {
      // 사용자 정보에서 모든 프로필 이미지 URL 수집
      const contactsResponse = await fetch("/api/contacts", {
        headers: { "x-user-id": localStorage.getItem("userId") || "" },
      });
      
      const chatRoomsResponse = await fetch("/api/chat-rooms", {
        headers: { "x-user-id": localStorage.getItem("userId") || "" },
      });

      const imageUrls = new Set<string>();

      // 연락처에서 프로필 이미지 수집
      if (contactsResponse.ok) {
        const contactsData = await contactsResponse.json();
        contactsData.contacts?.forEach((contact: any) => {
          if (contact.contactUser?.profilePicture) {
            // 기존 /uploads/ URL을 최적화된 /api/profile-images/ URL로 변환
            const originalUrl = contact.contactUser.profilePicture;
            const filename = originalUrl.split('/').pop();
            if (filename) {
              imageUrls.add(`/api/profile-images/${filename}`);
            }
          }
        });
      }

      // 채팅방에서 프로필 이미지 수집
      if (chatRoomsResponse.ok) {
        const chatRoomsData = await chatRoomsResponse.json();
        chatRoomsData.chatRooms?.forEach((room: any) => {
          if (room.groupImage) {
            const originalUrl = room.groupImage;
            const filename = originalUrl.split('/').pop();
            if (filename) {
              imageUrls.add(`/api/profile-images/${filename}`);
            }
          }
          room.participants?.forEach((participant: any) => {
            if (participant.profilePicture) {
              const originalUrl = participant.profilePicture;
              const filename = originalUrl.split('/').pop();
              if (filename) {
                imageUrls.add(`/api/profile-images/${filename}`);
              }
            }
          });
        });
      }

      // 현재 사용자 프로필 이미지
      const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
      if (currentUser.profilePicture) {
        const originalUrl = currentUser.profilePicture;
        const filename = originalUrl.split('/').pop();
        if (filename) {
          imageUrls.add(`/api/profile-images/${filename}`);
        }
      }

      console.log(`Preloading ${imageUrls.size} profile images...`);

      // 모든 이미지를 병렬로 다운로드 (배치 처리로 서버 부하 방지)
      const urlArray = Array.from(imageUrls);
      const batchSize = 5;
      
      for (let i = 0; i < urlArray.length; i += batchSize) {
        const batch = urlArray.slice(i, i + batchSize);
        await Promise.allSettled(
          batch.map(url => preloadImageAsBlob(url))
        );
        
        // 배치 간 50ms 딜레이로 서버 부하 방지
        if (i + batchSize < urlArray.length) {
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }

      console.log(`Preloaded ${globalImageCache.size} images successfully`);
    } catch (error) {
      console.error("Failed to preload all images:", error);
    }
  }, [preloadImageAsBlob]);

  // 즉시 사용 가능한 이미지 ObjectURL 반환
  const getInstantImage = useCallback((url: string): string | null => {
    const cached = globalImageCache.get(url);
    return cached?.objectUrl || null;
  }, []);

  // 이미지가 캐시에 준비되어 있는지 확인
  const isImageReady = useCallback((url: string): boolean => {
    return globalImageCache.has(url);
  }, []);

  // 캐시 크기 반환
  const getCacheSize = useCallback((): number => {
    return globalImageCache.size;
  }, []);

  // 캐시 정리
  const clearCache = useCallback((): void => {
    globalImageCache.forEach(entry => {
      URL.revokeObjectURL(entry.objectUrl);
    });
    globalImageCache.clear();
    setCacheSize(0);
  }, []);

  // 컴포넌트 마운트 시 AbortController 초기화
  useEffect(() => {
    abortController.current = new AbortController();
    
    return () => {
      if (abortController.current) {
        abortController.current.abort();
      }
    };
  }, []);

  // 30분마다 오래된 캐시 정리
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      const now = Date.now();
      const thirtyMinutes = 30 * 60 * 1000;
      
      const entries = Array.from(globalImageCache.entries());
      for (const [url, entry] of entries) {
        if (now - entry.timestamp > thirtyMinutes) {
          URL.revokeObjectURL(entry.objectUrl);
          globalImageCache.delete(url);
        }
      }
      
      setCacheSize(globalImageCache.size);
    }, 5 * 60 * 1000); // 5분마다 정리 작업 실행

    return () => clearInterval(cleanupInterval);
  }, []);

  return {
    preloadAllImages,
    getInstantImage,
    isImageReady,
    getCacheSize,
    clearCache
  };
}