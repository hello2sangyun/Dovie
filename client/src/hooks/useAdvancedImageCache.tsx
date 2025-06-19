import { useState, useEffect, useRef, useCallback } from 'react';

interface CachedImage {
  url: string;
  blob: Blob;
  objectUrl: string;
  timestamp: number;
  priority: number;
}

interface ImageMetrics {
  loadTime: number;
  size: number;
  fromCache: boolean;
}

// 고급 이미지 캐시 (IndexedDB + Memory)
class AdvancedImageCache {
  private memoryCache = new Map<string, CachedImage>();
  private dbName = 'DovieImageCache';
  private dbVersion = 1;
  private db: IDBDatabase | null = null;
  private maxMemorySize = 50 * 1024 * 1024; // 50MB
  private currentMemorySize = 0;
  private metrics = new Map<string, ImageMetrics>();

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };
      
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('images')) {
          const store = db.createObjectStore('images', { keyPath: 'url' });
          store.createIndex('timestamp', 'timestamp');
          store.createIndex('priority', 'priority');
        }
      };
    });
  }

  async preloadImage(url: string, priority: number = 1): Promise<string> {
    const startTime = performance.now();
    
    // 1. 메모리 캐시 확인
    const memoryImage = this.memoryCache.get(url);
    if (memoryImage) {
      this.recordMetrics(url, performance.now() - startTime, memoryImage.blob.size, true);
      return memoryImage.objectUrl;
    }

    // 2. IndexedDB 캐시 확인
    const dbImage = await this.getFromDB(url);
    if (dbImage) {
      const objectUrl = URL.createObjectURL(dbImage.blob);
      this.addToMemoryCache(url, dbImage.blob, priority);
      this.recordMetrics(url, performance.now() - startTime, dbImage.blob.size, true);
      return objectUrl;
    }

    // 3. 네트워크에서 로드
    try {
      const response = await fetch(url, {
        cache: 'force-cache',
        headers: {
          'Cache-Control': 'public, max-age=31536000'
        }
      });
      
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      
      // 캐시에 저장
      await this.saveToCache(url, blob, priority);
      
      this.recordMetrics(url, performance.now() - startTime, blob.size, false);
      return objectUrl;
    } catch (error) {
      console.warn('Failed to preload image:', url, error);
      throw error;
    }
  }

  private async getFromDB(url: string): Promise<CachedImage | null> {
    if (!this.db) return null;
    
    return new Promise((resolve) => {
      const transaction = this.db!.transaction(['images'], 'readonly');
      const store = transaction.objectStore('images');
      const request = store.get(url);
      
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => resolve(null);
    });
  }

  private async saveToCache(url: string, blob: Blob, priority: number): Promise<void> {
    const cachedImage: CachedImage = {
      url,
      blob,
      objectUrl: URL.createObjectURL(blob),
      timestamp: Date.now(),
      priority
    };

    // 메모리 캐시에 추가
    this.addToMemoryCache(url, blob, priority);

    // IndexedDB에 저장
    if (this.db) {
      const transaction = this.db.transaction(['images'], 'readwrite');
      const store = transaction.objectStore('images');
      store.put(cachedImage);
    }
  }

  private addToMemoryCache(url: string, blob: Blob, priority: number): void {
    // 메모리 제한 확인
    if (this.currentMemorySize + blob.size > this.maxMemorySize) {
      this.evictLowPriorityImages();
    }

    const objectUrl = URL.createObjectURL(blob);
    const cachedImage: CachedImage = {
      url,
      blob,
      objectUrl,
      timestamp: Date.now(),
      priority
    };

    this.memoryCache.set(url, cachedImage);
    this.currentMemorySize += blob.size;
  }

  private evictLowPriorityImages(): void {
    const entries = Array.from(this.memoryCache.entries())
      .sort(([,a], [,b]) => a.priority - b.priority || a.timestamp - b.timestamp);

    let freedSpace = 0;
    const targetSpace = this.maxMemorySize * 0.3; // 30% 정리

    for (const [url, image] of entries) {
      if (freedSpace >= targetSpace) break;
      
      URL.revokeObjectURL(image.objectUrl);
      this.memoryCache.delete(url);
      freedSpace += image.blob.size;
      this.currentMemorySize -= image.blob.size;
    }
  }

  private recordMetrics(url: string, loadTime: number, size: number, fromCache: boolean): void {
    this.metrics.set(url, { loadTime, size, fromCache });
  }

  getMetrics(url: string): ImageMetrics | undefined {
    return this.metrics.get(url);
  }

  getCacheHitRate(): number {
    const total = this.metrics.size;
    if (total === 0) return 0;
    
    const hits = Array.from(this.metrics.values()).filter(m => m.fromCache).length;
    return hits / total;
  }

  getAverageLoadTime(): number {
    const times = Array.from(this.metrics.values()).map(m => m.loadTime);
    return times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0;
  }
}

// 전역 캐시 인스턴스
const globalImageCache = new AdvancedImageCache();

export function useAdvancedImageCache() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [loadingImages, setLoadingImages] = useState(new Set<string>());
  const [loadedImages, setLoadedImages] = useState(new Set<string>());
  const preloadQueueRef = useRef<Array<{url: string, priority: number}>>([]);
  const isProcessingRef = useRef(false);

  useEffect(() => {
    globalImageCache.init().then(() => {
      setIsInitialized(true);
      processQueue();
    });
  }, []);

  const processQueue = useCallback(async () => {
    if (isProcessingRef.current || !isInitialized) return;
    
    isProcessingRef.current = true;
    
    // 우선순위 순으로 정렬
    preloadQueueRef.current.sort((a, b) => b.priority - a.priority);
    
    const batch = preloadQueueRef.current.splice(0, 5); // 동시에 5개씩 처리
    
    await Promise.allSettled(
      batch.map(async ({ url, priority }) => {
        if (loadedImages.has(url)) return;
        
        setLoadingImages(prev => new Set(prev).add(url));
        
        try {
          await globalImageCache.preloadImage(url, priority);
          setLoadedImages(prev => new Set(prev).add(url));
        } catch (error) {
          console.warn('Preload failed:', url);
        } finally {
          setLoadingImages(prev => {
            const newSet = new Set(prev);
            newSet.delete(url);
            return newSet;
          });
        }
      })
    );
    
    isProcessingRef.current = false;
    
    // 큐에 더 있으면 계속 처리
    if (preloadQueueRef.current.length > 0) {
      setTimeout(processQueue, 10);
    }
  }, [isInitialized, loadedImages]);

  const preloadImages = useCallback((urls: string[], priority: number = 1) => {
    if (!urls.length) return;
    
    const newUrls = urls
      .filter(url => url && !loadedImages.has(url) && !loadingImages.has(url))
      .map(url => ({ url, priority }));
    
    preloadQueueRef.current.push(...newUrls);
    
    if (isInitialized) {
      processQueue();
    }
  }, [isInitialized, loadedImages, loadingImages, processQueue]);

  const preloadUserImages = useCallback((users: any[], priority: number = 1) => {
    const imageUrls = users
      .map(user => user.profilePicture)
      .filter(Boolean);
    
    preloadImages(imageUrls, priority);
  }, [preloadImages]);

  const isImageReady = useCallback((url: string): boolean => {
    return loadedImages.has(url);
  }, [loadedImages]);

  const getImageSrc = useCallback(async (url: string): Promise<string> => {
    try {
      return await globalImageCache.preloadImage(url, 1);
    } catch {
      return url; // 실패시 원본 URL 반환
    }
  }, []);

  const getCacheStats = useCallback(() => {
    return {
      hitRate: globalImageCache.getCacheHitRate(),
      averageLoadTime: globalImageCache.getAverageLoadTime(),
      loadedCount: loadedImages.size,
      loadingCount: loadingImages.size
    };
  }, [loadedImages.size, loadingImages.size]);

  return {
    preloadImages,
    preloadUserImages,
    isImageReady,
    getImageSrc,
    getCacheStats,
    isInitialized,
    loadingImages,
    loadedImages
  };
}