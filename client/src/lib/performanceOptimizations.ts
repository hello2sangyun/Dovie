// React Query 최적화 설정
export const queryConfig = {
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5분
      cacheTime: 1000 * 60 * 30, // 30분
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: 'always' as const,
      retry: (failureCount: number, error: any) => {
        if (error?.status === 404) return false;
        return failureCount < 3;
      },
    },
    mutations: {
      retry: 1,
    },
  },
};

// 이미지 최적화 설정
export const imageOptimizations = {
  // WebP 변환 함수
  convertToWebP: (canvas: HTMLCanvasElement, quality = 0.8): string => {
    return canvas.toDataURL('image/webp', quality);
  },
  
  // 이미지 리사이징
  resizeImage: (file: File, maxWidth: number, maxHeight: number): Promise<string> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      const img = new Image();
      
      img.onload = () => {
        const { width, height } = img;
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        
        canvas.width = width * ratio;
        canvas.height = height * ratio;
        
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/webp', 0.8));
      };
      
      img.src = URL.createObjectURL(file);
    });
  },
};

// 번들 사이즈 최적화를 위한 동적 임포트
export const lazyImports = {
  // 대용량 라이브러리들을 지연 로딩
  loadChartLibrary: () => import('recharts'),
  loadQRScanner: () => import('qr-scanner'),
  loadCropper: () => import('react-image-crop'),
};

// 메모리 관리
export const memoryOptimizations = {
  // WeakMap을 사용한 캐시
  cache: new WeakMap(),
  
  // 메모리 정리
  cleanup: () => {
    if ('gc' in window && typeof (window as any).gc === 'function') {
      (window as any).gc();
    }
  },
  
  // 큰 객체 해제
  releaseResources: (refs: React.RefObject<any>[]) => {
    refs.forEach(ref => {
      if (ref.current) {
        ref.current = null;
      }
    });
  },
};

// 네트워크 최적화
export const networkOptimizations = {
  // 요청 중복 제거
  requestCache: new Map<string, Promise<any>>(),
  
  // 디바운스된 API 호출
  debouncedRequest: (key: string, fn: () => Promise<any>, delay = 300) => {
    if (networkOptimizations.requestCache.has(key)) {
      return networkOptimizations.requestCache.get(key)!;
    }
    
    const promise = new Promise(resolve => {
      setTimeout(async () => {
        const result = await fn();
        networkOptimizations.requestCache.delete(key);
        resolve(result);
      }, delay);
    });
    
    networkOptimizations.requestCache.set(key, promise);
    return promise;
  },
};