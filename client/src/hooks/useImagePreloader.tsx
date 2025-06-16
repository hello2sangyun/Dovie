import { useState, useEffect, useRef } from 'react';

interface PreloadedImage {
  url: string;
  loaded: boolean;
  element?: HTMLImageElement;
  timestamp: number;
}

// 전역 이미지 캐시 (컴포넌트 재마운트 시에도 유지)
const globalImageCache = new Map<string, PreloadedImage>();

export function useImagePreloader() {
  const [preloadedImages, setPreloadedImages] = useState<Map<string, PreloadedImage>>(globalImageCache);
  const preloadQueueRef = useRef<string[]>([]);
  const isProcessingRef = useRef(false);

  const preloadImage = (url: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous"; // CORS 지원
      img.onload = () => resolve(img);
      img.onerror = reject;
      // 캐시 활용을 위한 헤더 설정
      img.src = url;
    });
  };

  const processPreloadQueue = async () => {
    if (isProcessingRef.current || preloadQueueRef.current.length === 0) {
      return;
    }

    isProcessingRef.current = true;

    while (preloadQueueRef.current.length > 0) {
      const url = preloadQueueRef.current.shift();
      if (!url) continue;

      // 이미 로드된 이미지는 건너뛰기
      if (preloadedImages.has(url) && preloadedImages.get(url)?.loaded) {
        continue;
      }

      try {
        const img = await preloadImage(url);
        const imageData = {
          url,
          loaded: true,
          element: img,
          timestamp: Date.now()
        };
        globalImageCache.set(url, imageData);
        setPreloadedImages(prev => new Map(prev).set(url, imageData));
      } catch (error) {
        console.warn('Failed to preload image:', url, error);
        const imageData = {
          url,
          loaded: false,
          timestamp: Date.now()
        };
        globalImageCache.set(url, imageData);
        setPreloadedImages(prev => new Map(prev).set(url, imageData));
      }
    }

    isProcessingRef.current = false;
  };

  const addToPreloadQueue = (urls: string[]) => {
    const newUrls = urls.filter(url => 
      url && 
      !preloadedImages.has(url) && 
      !preloadQueueRef.current.includes(url)
    );
    
    preloadQueueRef.current.push(...newUrls);
    
    // 즉시 처리 시작
    processPreloadQueue();
  };

  const isImageLoaded = (url: string): boolean => {
    return preloadedImages.get(url)?.loaded || false;
  };

  const getPreloadedImage = (url: string): HTMLImageElement | undefined => {
    return preloadedImages.get(url)?.element;
  };

  return {
    addToPreloadQueue,
    isImageLoaded,
    getPreloadedImage,
    preloadedImages: preloadedImages
  };
}