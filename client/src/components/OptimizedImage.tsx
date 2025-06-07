import { useState, useRef, useEffect } from "react";
import { useLazyLoading } from "@/hooks/useIntersectionObserver";

interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  placeholder?: string;
  onLoad?: () => void;
  onError?: () => void;
  quality?: number;
}

export function OptimizedImage({
  src,
  alt,
  className = "",
  placeholder = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20viewBox='0%200%20100%20100'%3e%3crect%20width='100'%20height='100'%20fill='%23f3f4f6'/%3e%3c/svg%3e",
  onLoad,
  onError,
  quality = 80
}: OptimizedImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const { ref, isIntersecting } = useLazyLoading();

  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  const handleError = () => {
    setHasError(true);
    onError?.();
  };

  return (
    <div ref={ref} className={`overflow-hidden ${className}`}>
      {isIntersecting && !hasError ? (
        <img
          src={src}
          alt={alt}
          className={`transition-opacity duration-300 ${
            isLoaded ? "opacity-100" : "opacity-0"
          } w-full h-full object-cover`}
          onLoad={handleLoad}
          onError={handleError}
          loading="lazy"
          decoding="async"
        />
      ) : (
        <div
          className="w-full h-full bg-gray-200 animate-pulse flex items-center justify-center"
          style={{
            backgroundImage: `url(${placeholder})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          {hasError && (
            <span className="text-gray-500 text-sm">이미지 로드 실패</span>
          )}
        </div>
      )}
    </div>
  );
}

// WebP 지원 여부 확인
export function supportsWebP(): Promise<boolean> {
  return new Promise((resolve) => {
    const webP = new Image();
    webP.onload = webP.onerror = () => {
      resolve(webP.height === 2);
    };
    webP.src = "data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACyAgCdASoCAAIALmk0mk0iIiIiIgBoSygABc6WWgAA/veff/0PP8bA//LwYAAA";
  });
}