import { useState, useEffect, useRef } from 'react';

interface ImageCache {
  [key: string]: string; // URL -> blob URL
}

interface ImagePreloaderHook {
  preloadedImages: ImageCache;
  isLoading: boolean;
  preloadImage: (url: string) => Promise<string>;
  clearCache: () => void;
  getCachedImage: (url: string) => string | null;
}

// 전역 캐시 - 앱 전체에서 공유
const globalImageCache: ImageCache = {};
const loadingPromises = new Map<string, Promise<string>>();

export function useImagePreloader(): ImagePreloaderHook {
  const [preloadedImages, setPreloadedImages] = useState<ImageCache>(globalImageCache);
  const [isLoading, setIsLoading] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const preloadImage = async (url: string): Promise<string> => {
    if (!url || url === 'null' || url === 'undefined') {
      return '';
    }

    // 이미 캐시된 경우 즉시 반환
    if (globalImageCache[url]) {
      return globalImageCache[url];
    }

    // 이미 로딩 중인 경우 기존 Promise 반환
    if (loadingPromises.has(url)) {
      return loadingPromises.get(url)!;
    }

    // 새로운 이미지 로딩 시작
    const loadPromise = new Promise<string>(async (resolve, reject) => {
      try {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Failed to load image: ${response.status}`);
        }

        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        
        // 전역 캐시에 저장
        globalImageCache[url] = blobUrl;
        
        if (mountedRef.current) {
          setPreloadedImages({ ...globalImageCache });
        }
        
        resolve(blobUrl);
      } catch (error) {
        console.error('Failed to preload image:', url, error);
        reject(error);
      } finally {
        loadingPromises.delete(url);
      }
    });

    loadingPromises.set(url, loadPromise);
    return loadPromise;
  };

  const getCachedImage = (url: string): string | null => {
    if (!url || url === 'null' || url === 'undefined') {
      return null;
    }
    return globalImageCache[url] || null;
  };

  const clearCache = () => {
    // Blob URLs 해제
    Object.values(globalImageCache).forEach(blobUrl => {
      if (blobUrl.startsWith('blob:')) {
        URL.revokeObjectURL(blobUrl);
      }
    });
    
    // 캐시 초기화
    Object.keys(globalImageCache).forEach(key => {
      delete globalImageCache[key];
    });
    
    loadingPromises.clear();
    
    if (mountedRef.current) {
      setPreloadedImages({});
    }
  };

  return {
    preloadedImages,
    isLoading,
    preloadImage,
    clearCache,
    getCachedImage
  };
}

// 전역 함수들 - 다른 컴포넌트에서 직접 사용 가능
export const getGlobalCachedImage = (url: string): string | null => {
  if (!url || url === 'null' || url === 'undefined') {
    return null;
  }
  return globalImageCache[url] || null;
};

export const preloadGlobalImage = async (url: string): Promise<string> => {
  if (!url || url === 'null' || url === 'undefined') {
    return '';
  }

  if (globalImageCache[url]) {
    return globalImageCache[url];
  }

  if (loadingPromises.has(url)) {
    return loadingPromises.get(url)!;
  }

  const loadPromise = fetch(url)
    .then(response => {
      if (!response.ok) {
        throw new Error(`Failed to load image: ${response.status}`);
      }
      return response.blob();
    })
    .then(blob => {
      const blobUrl = URL.createObjectURL(blob);
      globalImageCache[url] = blobUrl;
      return blobUrl;
    })
    .catch(error => {
      console.error('Failed to preload image:', url, error);
      return '';
    })
    .finally(() => {
      loadingPromises.delete(url);
    });

  loadingPromises.set(url, loadPromise);
  return loadPromise;
};