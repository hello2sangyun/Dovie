import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
  skeletonClassName?: string;
  onError?: () => void;
  onLoad?: () => void;
}

export function LazyImage({ 
  src, 
  alt, 
  className, 
  skeletonClassName,
  onError,
  onLoad 
}: LazyImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLDivElement>(null);

  // Reset state when src changes (for virtualized lists)
  useEffect(() => {
    setIsLoaded(false);
    setIsInView(false);
    setHasError(false);
  }, [src]);

  useEffect(() => {
    if (!imgRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.unobserve(entry.target);
          }
        });
      },
      {
        rootMargin: '50px', // Start loading 50px before image comes into view
      }
    );

    observer.observe(imgRef.current);

    return () => {
      observer.disconnect();
    };
  }, [src]);

  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  const handleError = () => {
    setHasError(true);
    onError?.();
  };

  return (
    <div ref={imgRef} className={cn("relative overflow-hidden", className)}>
      {/* Show nothing if error, but keep wrapper div for observer */}
      {hasError ? (
        <div className="w-full h-full bg-transparent" />
      ) : (
        <>
          {/* Skeleton placeholder */}
          {!isLoaded && (
            <div 
              className={cn(
                "absolute inset-0 bg-gray-200 dark:bg-gray-700 animate-pulse",
                skeletonClassName
              )}
            />
          )}
          
          {/* Actual image - only load when in view */}
          {isInView && (
            <img
              src={src}
              alt={alt}
              className={cn(
                "w-full h-full object-cover transition-opacity duration-300",
                isLoaded ? "opacity-100" : "opacity-0",
                className
              )}
              onLoad={handleLoad}
              onError={handleError}
              loading="lazy"
            />
          )}
        </>
      )}
    </div>
  );
}
