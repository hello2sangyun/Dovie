import { useState, useEffect, useRef } from 'react';

interface ImageCache {
  [url: string]: {
    loaded: boolean;
    loading: boolean;
    element: HTMLImageElement | null;
  };
}

class ImagePreloader {
  private static instance: ImagePreloader;
  private cache: ImageCache = {};
  private loadingQueue: Set<string> = new Set();

  static getInstance(): ImagePreloader {
    if (!ImagePreloader.instance) {
      ImagePreloader.instance = new ImagePreloader();
    }
    return ImagePreloader.instance;
  }

  preloadImage(url: string): Promise<boolean> {
    return new Promise((resolve) => {
      // 이미 로드된 경우
      if (this.cache[url]?.loaded) {
        resolve(true);
        return;
      }

      // 이미 로딩 중인 경우
      if (this.cache[url]?.loading) {
        // 기존 이미지 요소에 리스너 추가
        const existingImg = this.cache[url].element;
        if (existingImg) {
          const onLoad = () => {
            resolve(true);
            existingImg.removeEventListener('load', onLoad);
            existingImg.removeEventListener('error', onError);
          };
          const onError = () => {
            resolve(false);
            existingImg.removeEventListener('load', onLoad);
            existingImg.removeEventListener('error', onError);
          };
          existingImg.addEventListener('load', onLoad);
          existingImg.addEventListener('error', onError);
        }
        return;
      }

      // 새로운 이미지 로드
      const img = new Image();
      this.cache[url] = {
        loaded: false,
        loading: true,
        element: img
      };

      img.onload = () => {
        this.cache[url].loaded = true;
        this.cache[url].loading = false;
        this.loadingQueue.delete(url);
        resolve(true);
      };

      img.onerror = () => {
        this.cache[url].loading = false;
        this.loadingQueue.delete(url);
        resolve(false);
      };

      this.loadingQueue.add(url);
      img.src = url;
    });
  }

  isLoaded(url: string): boolean {
    return this.cache[url]?.loaded || false;
  }

  isLoading(url: string): boolean {
    return this.cache[url]?.loading || false;
  }

  preloadMultiple(urls: string[]): Promise<boolean[]> {
    return Promise.all(urls.map(url => this.preloadImage(url)));
  }

  clearCache(): void {
    this.cache = {};
    this.loadingQueue.clear();
  }
}

export function useImagePreloader() {
  const preloader = useRef(ImagePreloader.getInstance());
  
  const preloadImage = (url: string) => {
    return preloader.current.preloadImage(url);
  };

  const preloadImages = (urls: string[]) => {
    return preloader.current.preloadMultiple(urls);
  };

  const isImageLoaded = (url: string) => {
    return preloader.current.isLoaded(url);
  };

  const isImageLoading = (url: string) => {
    return preloader.current.isLoading(url);
  };

  return {
    preloadImage,
    preloadImages,
    isImageLoaded,
    isImageLoading
  };
}

export function usePreloadedImage(url: string | null) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { preloadImage, isImageLoaded, isImageLoading } = useImagePreloader();

  useEffect(() => {
    if (!url) {
      setIsLoaded(false);
      setIsLoading(false);
      return;
    }

    // 이미 로드된 경우
    if (isImageLoaded(url)) {
      setIsLoaded(true);
      setIsLoading(false);
      return;
    }

    // 이미 로딩 중인 경우
    if (isImageLoading(url)) {
      setIsLoading(true);
      setIsLoaded(false);
      return;
    }

    // 새로운 이미지 로드
    setIsLoading(true);
    setIsLoaded(false);

    preloadImage(url).then((success) => {
      setIsLoading(false);
      setIsLoaded(success);
    });
  }, [url, preloadImage, isImageLoaded, isImageLoading]);

  return { isLoaded, isLoading };
}