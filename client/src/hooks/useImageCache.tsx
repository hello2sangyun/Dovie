import { useState, useEffect, useRef } from "react";

interface ImageCacheEntry {
  url: string;
  blob: string;
  timestamp: number;
}

const CACHE_DURATION = 30 * 60 * 1000; // 30분
const MAX_CACHE_SIZE = 50; // 최대 50개 이미지 캐싱

class ImageCache {
  private cache = new Map<string, ImageCacheEntry>();
  private loadingImages = new Set<string>();

  async getImage(url: string): Promise<string | null> {
    // 캐시에서 확인
    const cached = this.cache.get(url);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.blob;
    }

    // 이미 로딩 중인 경우 대기
    if (this.loadingImages.has(url)) {
      return new Promise((resolve) => {
        const checkInterval = setInterval(() => {
          const entry = this.cache.get(url);
          if (entry || !this.loadingImages.has(url)) {
            clearInterval(checkInterval);
            resolve(entry?.blob || null);
          }
        }, 50);
      });
    }

    // 새로운 이미지 로딩
    this.loadingImages.add(url);
    
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error('Network response was not ok');
      
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      
      // 캐시 크기 관리
      if (this.cache.size >= MAX_CACHE_SIZE) {
        const oldestKey = Array.from(this.cache.keys())[0];
        const oldEntry = this.cache.get(oldestKey);
        if (oldEntry) {
          URL.revokeObjectURL(oldEntry.blob);
          this.cache.delete(oldestKey);
        }
      }
      
      this.cache.set(url, {
        url,
        blob: blobUrl,
        timestamp: Date.now()
      });
      
      return blobUrl;
    } catch (error) {
      console.error('Failed to load image:', error);
      return null;
    } finally {
      this.loadingImages.delete(url);
    }
  }

  clearExpired() {
    const now = Date.now();
    const entries = Array.from(this.cache.entries());
    for (const [key, entry] of entries) {
      if (now - entry.timestamp > CACHE_DURATION) {
        URL.revokeObjectURL(entry.blob);
        this.cache.delete(key);
      }
    }
  }

  clear() {
    const entries = Array.from(this.cache.values());
    for (const entry of entries) {
      URL.revokeObjectURL(entry.blob);
    }
    this.cache.clear();
  }
}

const imageCache = new ImageCache();

// 주기적으로 만료된 캐시 정리
setInterval(() => {
  imageCache.clearExpired();
}, 5 * 60 * 1000); // 5분마다

export function useImageCache(url?: string) {
  const [cachedUrl, setCachedUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!url) {
      setCachedUrl(null);
      setIsLoading(false);
      setError(false);
      return;
    }

    setIsLoading(true);
    setError(false);

    imageCache.getImage(url)
      .then((result) => {
        if (isMountedRef.current) {
          setCachedUrl(result);
          setIsLoading(false);
          setError(!result);
        }
      })
      .catch(() => {
        if (isMountedRef.current) {
          setError(true);
          setIsLoading(false);
        }
      });
  }, [url]);

  return { cachedUrl, isLoading, error };
}