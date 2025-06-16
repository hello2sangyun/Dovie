import { useState, useEffect, useCallback, useRef } from "react";

interface ImageLoadResult {
  url: string;
  success: boolean;
  blob?: string;
}

const BATCH_SIZE = 5; // 동시에 로드할 이미지 수
const RETRY_ATTEMPTS = 2;

export function useBatchImageLoader() {
  const [loadedImages, setLoadedImages] = useState<Map<string, string>>(new Map());
  const [loadingImages, setLoadingImages] = useState<Set<string>>(new Set());
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());
  const queueRef = useRef<string[]>([]);
  const processingRef = useRef(false);

  const loadImageBlob = useCallback(async (url: string, retryCount = 0): Promise<ImageLoadResult> => {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      
      return { url, success: true, blob: blobUrl };
    } catch (error) {
      if (retryCount < RETRY_ATTEMPTS) {
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retryCount)));
        return loadImageBlob(url, retryCount + 1);
      }
      return { url, success: false };
    }
  }, []);

  const processBatch = useCallback(async () => {
    if (processingRef.current || queueRef.current.length === 0) return;
    
    processingRef.current = true;
    const batch = queueRef.current.splice(0, BATCH_SIZE);
    
    setLoadingImages(prev => {
      const next = new Set(prev);
      batch.forEach(url => next.add(url));
      return next;
    });

    try {
      const results = await Promise.allSettled(
        batch.map(url => loadImageBlob(url))
      );

      const newLoadedImages = new Map<string, string>();
      const newFailedImages = new Set<string>();

      results.forEach((result, index) => {
        const url = batch[index];
        
        if (result.status === 'fulfilled' && result.value.success && result.value.blob) {
          newLoadedImages.set(url, result.value.blob);
        } else {
          newFailedImages.add(url);
        }
      });

      setLoadedImages(prev => {
        const next = new Map(prev);
        newLoadedImages.forEach((blob, url) => next.set(url, blob));
        return next;
      });

      setFailedImages(prev => {
        const next = new Set(prev);
        newFailedImages.forEach(url => next.add(url));
        return next;
      });

      setLoadingImages(prev => {
        const next = new Set(prev);
        batch.forEach(url => next.delete(url));
        return next;
      });
    } catch (error) {
      console.error('Batch image loading error:', error);
      
      setLoadingImages(prev => {
        const next = new Set(prev);
        batch.forEach(url => next.delete(url));
        return next;
      });
      
      setFailedImages(prev => {
        const next = new Set(prev);
        batch.forEach(url => next.add(url));
        return next;
      });
    }

    processingRef.current = false;

    // 큐에 더 있으면 계속 처리
    if (queueRef.current.length > 0) {
      setTimeout(() => processBatch(), 100);
    }
  }, [loadImageBlob]);

  const preloadImages = useCallback((imageUrls: string[]) => {
    const validUrls = imageUrls.filter(url => 
      url && 
      !loadedImages.has(url) && 
      !loadingImages.has(url) && 
      !failedImages.has(url)
    );

    if (validUrls.length === 0) return;

    // 중복 제거하고 큐에 추가
    const uniqueUrls = Array.from(new Set(validUrls));
    queueRef.current.push(...uniqueUrls);

    // 배치 처리 시작
    processBatch();
  }, [loadedImages, loadingImages, failedImages, processBatch]);

  const getImageState = useCallback((url: string) => {
    if (loadedImages.has(url)) {
      return { status: 'loaded' as const, blob: loadedImages.get(url) };
    }
    if (loadingImages.has(url)) {
      return { status: 'loading' as const };
    }
    if (failedImages.has(url)) {
      return { status: 'failed' as const };
    }
    return { status: 'idle' as const };
  }, [loadedImages, loadingImages, failedImages]);

  const clearCache = useCallback(() => {
    // Blob URL 정리
    Array.from(loadedImages.values()).forEach(blob => URL.revokeObjectURL(blob));
    setLoadedImages(new Map());
    setLoadingImages(new Set());
    setFailedImages(new Set());
    queueRef.current = [];
  }, [loadedImages]);

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      Array.from(loadedImages.values()).forEach(blob => URL.revokeObjectURL(blob));
    };
  }, [loadedImages]);

  return {
    preloadImages,
    getImageState,
    clearCache,
    loadedCount: loadedImages.size,
    loadingCount: loadingImages.size,
    failedCount: failedImages.size
  };
}