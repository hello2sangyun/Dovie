import { useEffect, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";

interface PreloadedImage {
  objectUrl: string;
  timestamp: number;
  isReady: boolean;
}

// 전역 이미지 캐시 - 앱 전체에서 공유
const globalImageCache = new Map<string, PreloadedImage>();
const preloadingSet = new Set<string>();

export function useBackgroundImagePreloader() {
  const preloadingRef = useRef<boolean>(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // 연락처 데이터 가져오기
  const { data: contactsData } = useQuery({
    queryKey: ["/api/contacts"],
    staleTime: 5 * 60 * 1000, // 5분
  });

  // 채팅방 데이터 가져오기
  const { data: chatRoomsData } = useQuery({
    queryKey: ["/api/chat-rooms"],
    staleTime: 5 * 60 * 1000, // 5분
  });

  // 단일 이미지 미리 로딩
  const preloadSingleImage = useCallback(async (imageUrl: string): Promise<void> => {
    if (!imageUrl || globalImageCache.has(imageUrl) || preloadingSet.has(imageUrl)) {
      return;
    }

    preloadingSet.add(imageUrl);

    try {
      const response = await fetch(imageUrl, {
        signal: abortControllerRef.current?.signal,
        cache: 'force-cache'
      });

      if (!response.ok) {
        throw new Error(`Failed to load image: ${response.status}`);
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);

      globalImageCache.set(imageUrl, {
        objectUrl,
        timestamp: Date.now(),
        isReady: true
      });

      console.log(`[BackgroundPreloader] Image cached: ${imageUrl}`);
    } catch (error) {
      console.warn(`[BackgroundPreloader] Failed to preload: ${imageUrl}`, error);
    } finally {
      preloadingSet.delete(imageUrl);
    }
  }, []);

  // 모든 프로필 이미지 수집
  const collectAllProfileImages = useCallback((): string[] => {
    const imageUrls = new Set<string>();

    // 연락처의 프로필 이미지
    if (contactsData?.contacts) {
      contactsData.contacts.forEach((contact: any) => {
        if (contact.contactUser?.profilePicture) {
          imageUrls.add(contact.contactUser.profilePicture);
        }
      });
    }

    // 채팅방 참가자의 프로필 이미지
    if (chatRoomsData?.chatRooms) {
      chatRoomsData.chatRooms.forEach((room: any) => {
        if (room.participants) {
          room.participants.forEach((participant: any) => {
            if (participant.profilePicture) {
              imageUrls.add(participant.profilePicture);
            }
          });
        }
      });
    }

    return Array.from(imageUrls).filter(Boolean);
  }, [contactsData, chatRoomsData]);

  // 백그라운드에서 이미지 미리 로딩 시작
  const startBackgroundPreloading = useCallback(async () => {
    if (preloadingRef.current) {
      return;
    }

    preloadingRef.current = true;
    abortControllerRef.current = new AbortController();

    const imageUrls = collectAllProfileImages();
    console.log(`[BackgroundPreloader] Starting preload of ${imageUrls.length} images`);

    // 배치로 처리하여 서버 부하 분산
    const batchSize = 3;
    for (let i = 0; i < imageUrls.length; i += batchSize) {
      const batch = imageUrls.slice(i, i + batchSize);
      
      // 각 배치를 병렬로 처리
      await Promise.allSettled(
        batch.map(url => preloadSingleImage(url))
      );

      // 배치 간 짧은 대기 (서버 부하 방지)
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`[BackgroundPreloader] Completed preloading, cache size: ${globalImageCache.size}`);
    preloadingRef.current = false;
  }, [collectAllProfileImages, preloadSingleImage]);

  // 캐시된 이미지 URL 가져오기
  const getCachedImageUrl = useCallback((imageUrl: string | null | undefined): string | null => {
    if (!imageUrl) return null;
    
    const cached = globalImageCache.get(imageUrl);
    return cached?.isReady ? cached.objectUrl : null;
  }, []);

  // 이미지가 캐시에 준비되어 있는지 확인
  const isImageReady = useCallback((imageUrl: string | null | undefined): boolean => {
    if (!imageUrl) return false;
    
    const cached = globalImageCache.get(imageUrl);
    return cached?.isReady || false;
  }, []);

  // 데이터가 로드되면 백그라운드 미리 로딩 시작
  useEffect(() => {
    if ((contactsData || chatRoomsData) && !preloadingRef.current) {
      // 사용자가 다른 작업을 하는 동안 백그라운드에서 실행
      const timeoutId = setTimeout(() => {
        startBackgroundPreloading();
      }, 1000); // 1초 후 시작

      return () => clearTimeout(timeoutId);
    }
  }, [contactsData, chatRoomsData, startBackgroundPreloading]);

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // 30분마다 캐시 정리
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      const now = Date.now();
      const thirtyMinutes = 30 * 60 * 1000;
      
      const entries = Array.from(globalImageCache.entries());
      for (const [url, cached] of entries) {
        if (now - cached.timestamp > thirtyMinutes) {
          URL.revokeObjectURL(cached.objectUrl);
          globalImageCache.delete(url);
        }
      }
    }, 10 * 60 * 1000); // 10분마다 정리 실행

    return () => clearInterval(cleanupInterval);
  }, []);

  return {
    getCachedImageUrl,
    isImageReady,
    startBackgroundPreloading,
    cacheSize: globalImageCache.size
  };
}