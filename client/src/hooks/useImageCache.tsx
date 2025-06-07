import { useState, useEffect, useCallback } from "react";

interface ImageCacheEntry {
  blob: Blob;
  url: string;
  timestamp: number;
}

class ImageCache {
  private cache = new Map<string, ImageCacheEntry>();
  private maxCacheSize = 50; // 최대 50개 이미지 캐시
  private maxAge = 1000 * 60 * 30; // 30분

  async get(src: string): Promise<string | null> {
    const entry = this.cache.get(src);
    
    if (!entry) return null;
    
    // 만료된 캐시 제거
    if (Date.now() - entry.timestamp > this.maxAge) {
      this.cache.delete(src);
      URL.revokeObjectURL(entry.url);
      return null;
    }
    
    return entry.url;
  }

  async set(src: string, blob: Blob): Promise<string> {
    // 캐시 크기 제한
    if (this.cache.size >= this.maxCacheSize) {
      const oldestKey = this.cache.keys().next().value;
      const oldEntry = this.cache.get(oldestKey);
      if (oldEntry) {
        URL.revokeObjectURL(oldEntry.url);
        this.cache.delete(oldestKey);
      }
    }

    const url = URL.createObjectURL(blob);
    this.cache.set(src, {
      blob,
      url,
      timestamp: Date.now(),
    });

    return url;
  }

  clear() {
    this.cache.forEach(entry => {
      URL.revokeObjectURL(entry.url);
    });
    this.cache.clear();
  }
}

const imageCache = new ImageCache();

export function useImageCache() {
  const [cachedImages, setCachedImages] = useState<Map<string, string>>(new Map());

  const loadImage = useCallback(async (src: string): Promise<string> => {
    // 이미 로드된 이미지인지 확인
    const cached = cachedImages.get(src);
    if (cached) return cached;

    // 캐시에서 확인
    const cachedUrl = await imageCache.get(src);
    if (cachedUrl) {
      setCachedImages(prev => new Map(prev).set(src, cachedUrl));
      return cachedUrl;
    }

    // 새로 로드
    try {
      const response = await fetch(src);
      const blob = await response.blob();
      const url = await imageCache.set(src, blob);
      
      setCachedImages(prev => new Map(prev).set(src, url));
      return url;
    } catch (error) {
      console.error('Failed to load image:', error);
      return src; // 원본 URL 반환
    }
  }, [cachedImages]);

  const preloadImages = useCallback(async (srcs: string[]) => {
    const promises = srcs.map(src => loadImage(src));
    await Promise.allSettled(promises);
  }, [loadImage]);

  const clearCache = useCallback(() => {
    imageCache.clear();
    setCachedImages(new Map());
  }, []);

  return {
    loadImage,
    preloadImages,
    clearCache,
    cacheSize: cachedImages.size,
  };
}