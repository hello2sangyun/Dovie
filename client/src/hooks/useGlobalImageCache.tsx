import { useEffect, useRef, useCallback, useState } from "react";

interface CachedImage {
  objectUrl: string;
  timestamp: number;
  isLoaded: boolean;
}

// 전역 캐시 - 앱이 시작될 때 한 번만 생성
const globalCache = new Map<string, CachedImage>();
const loadingPromises = new Map<string, Promise<string>>();
let isInitialized = false;

// 디버깅을 위한 로그 함수
const debugLog = (message: string, data?: any) => {
  console.log(`[ImageCache] ${message}`, data || '');
};

export function useGlobalImageCache() {
  const [cacheReady, setCacheReady] = useState(false);
  const abortControllerRef = useRef<AbortController>();

  // 단일 이미지를 캐시에 로드
  const loadImageToCache = useCallback(async (imageUrl: string): Promise<string> => {
    // 이미 캐시에 있으면 즉시 반환
    if (globalCache.has(imageUrl)) {
      const cached = globalCache.get(imageUrl)!;
      if (cached.isLoaded) {
        debugLog('Cache hit', imageUrl);
        return cached.objectUrl;
      }
    }

    // 이미 로딩 중이면 해당 Promise 반환
    if (loadingPromises.has(imageUrl)) {
      debugLog('Loading in progress', imageUrl);
      return loadingPromises.get(imageUrl)!;
    }

    // 새로 로드 시작
    const loadPromise = (async (): Promise<string> => {
      try {
        debugLog('Starting download', imageUrl);
        
        const response = await fetch(imageUrl, {
          signal: abortControllerRef.current?.signal,
          cache: 'force-cache' // 브라우저 캐시 활용
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch image: ${response.status}`);
        }

        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);

        // 캐시에 저장
        globalCache.set(imageUrl, {
          objectUrl,
          timestamp: Date.now(),
          isLoaded: true
        });

        debugLog('Image cached successfully', imageUrl);
        return objectUrl;

      } catch (error) {
        debugLog('Image load failed', `${imageUrl}: ${error}`);
        loadingPromises.delete(imageUrl);
        throw error;
      } finally {
        loadingPromises.delete(imageUrl);
      }
    })();

    loadingPromises.set(imageUrl, loadPromise);
    return loadPromise;
  }, []);

  // 모든 프로필 이미지를 미리 로드
  const preloadAllImages = useCallback(async () => {
    if (isInitialized) {
      debugLog('Cache already initialized');
      setCacheReady(true);
      return;
    }

    debugLog('Starting image preload');
    abortControllerRef.current = new AbortController();

    try {
      // 사용자 목록 가져오기
      const response = await fetch('/api/users/all-profile-images', {
        signal: abortControllerRef.current.signal
      });

      if (!response.ok) {
        throw new Error('Failed to fetch user images');
      }

      const { images } = await response.json();
      debugLog('Found images to preload', images.length);

      // 모든 이미지를 병렬로 로드 (배치 처리)
      const batchSize = 5; // 한 번에 5개씩 처리
      for (let i = 0; i < images.length; i += batchSize) {
        const batch = images.slice(i, i + batchSize);
        
        await Promise.allSettled(
          batch.map((imageUrl: string) => loadImageToCache(imageUrl))
        );
        
        // UI 업데이트를 위한 짧은 대기
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      isInitialized = true;
      setCacheReady(true);
      debugLog('All images preloaded successfully', globalCache.size);

    } catch (error) {
      debugLog('Preload failed', error);
      setCacheReady(true); // 실패해도 개별 로딩은 가능하도록
    }
  }, [loadImageToCache]);

  // 캐시된 이미지 URL 가져오기
  const getCachedImageUrl = useCallback((imageUrl: string | null | undefined): string | null => {
    if (!imageUrl) return null;
    
    const cached = globalCache.get(imageUrl);
    if (cached && cached.isLoaded) {
      return cached.objectUrl;
    }
    
    return null;
  }, []);

  // 이미지가 캐시에 있는지 확인
  const isImageCached = useCallback((imageUrl: string | null | undefined): boolean => {
    if (!imageUrl) return false;
    
    const cached = globalCache.get(imageUrl);
    return cached ? cached.isLoaded : false;
  }, []);

  // 개별 이미지 로드 (캐시에 없을 때)
  const loadImage = useCallback(async (imageUrl: string): Promise<string> => {
    return loadImageToCache(imageUrl);
  }, [loadImageToCache]);

  // 캐시 정리 (30분 후 만료)
  useEffect(() => {
    const cleanup = () => {
      const now = Date.now();
      const thirtyMinutes = 30 * 60 * 1000;
      
      const entries = Array.from(globalCache.entries());
      for (const [url, cached] of entries) {
        if (now - cached.timestamp > thirtyMinutes) {
          URL.revokeObjectURL(cached.objectUrl);
          globalCache.delete(url);
          debugLog('Cache entry expired', url);
        }
      }
    };

    const interval = setInterval(cleanup, 10 * 60 * 1000); // 10분마다 정리
    return () => clearInterval(interval);
  }, []);

  // 컴포넌트 언마운트 시 AbortController 정리
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    preloadAllImages,
    getCachedImageUrl,
    isImageCached,
    loadImage,
    cacheReady,
    cacheSize: globalCache.size
  };
}