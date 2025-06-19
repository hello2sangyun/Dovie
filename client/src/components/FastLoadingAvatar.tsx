import React, { useState, useEffect, useRef, memo } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn, getInitials, getAvatarColor } from "@/lib/utils";
import { useAdvancedImageCache } from "@/hooks/useAdvancedImageCache";

interface FastLoadingAvatarProps {
  src?: string | null;
  alt?: string;
  fallbackText?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  priority?: number;
  showOnlineStatus?: boolean;
  isOnline?: boolean;
  preloadOnHover?: boolean;
}

const sizeClasses = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm', 
  lg: 'h-12 w-12 text-base',
  xl: 'h-16 w-16 text-lg'
};

const FastLoadingAvatar = memo(({ 
  src, 
  alt = '', 
  fallbackText = '',
  size = 'md',
  className,
  priority = 1,
  showOnlineStatus = false,
  isOnline = false,
  preloadOnHover = true
}: FastLoadingAvatarProps) => {
  const [imageState, setImageState] = useState<'loading' | 'loaded' | 'error'>('loading');
  const [optimizedSrc, setOptimizedSrc] = useState<string>('');
  const { isImageReady, getImageSrc, preloadImages } = useAdvancedImageCache();
  const imgRef = useRef<HTMLImageElement>(null);
  const [showImage, setShowImage] = useState(false);

  // 이미지 URL이 있고 캐시에서 준비된 경우 즉시 표시
  useEffect(() => {
    if (!src) {
      setImageState('error');
      return;
    }

    if (isImageReady(src)) {
      // 캐시에서 즉시 로드
      getImageSrc(src).then(optimizedUrl => {
        setOptimizedSrc(optimizedUrl);
        setImageState('loaded');
        setShowImage(true);
      });
    } else {
      // 백그라운드에서 로드
      preloadImages([src], priority);
      
      // 캐시 완료 대기
      const checkInterval = setInterval(() => {
        if (isImageReady(src)) {
          getImageSrc(src).then(optimizedUrl => {
            setOptimizedSrc(optimizedUrl);
            setImageState('loaded');
            
            // 부드러운 페이드인 효과
            setTimeout(() => setShowImage(true), 10);
          });
          clearInterval(checkInterval);
        }
      }, 50);

      // 3초 후 타임아웃
      setTimeout(() => {
        clearInterval(checkInterval);
        if (imageState === 'loading') {
          setImageState('error');
        }
      }, 3000);

      return () => clearInterval(checkInterval);
    }
  }, [src, isImageReady, getImageSrc, preloadImages, priority]);

  // 호버시 미리 로딩
  const handleMouseEnter = () => {
    if (preloadOnHover && src && !isImageReady(src)) {
      preloadImages([src], priority + 1); // 높은 우선순위로 즉시 로드
    }
  };

  // 이미지 로드 에러 핸들링
  const handleImageError = () => {
    setImageState('error');
    setShowImage(false);
  };

  // 이미지 로드 성공
  const handleImageLoad = () => {
    if (imageState === 'loading') {
      setImageState('loaded');
      setShowImage(true);
    }
  };

  return (
    <div className="relative" onMouseEnter={handleMouseEnter}>
      <Avatar className={cn(sizeClasses[size], className)}>
        {/* 최적화된 이미지 표시 */}
        {optimizedSrc && imageState === 'loaded' && (
          <AvatarImage 
            ref={imgRef}
            src={optimizedSrc}
            alt={alt}
            className={cn(
              "transition-opacity duration-200",
              showImage ? "opacity-100" : "opacity-0"
            )}
            onError={handleImageError}
            onLoad={handleImageLoad}
          />
        )}
        
        {/* 원본 이미지 폴백 */}
        {src && imageState === 'loading' && (
          <AvatarImage 
            src={src}
            alt={alt}
            className="opacity-0"
            onError={handleImageError}
            onLoad={handleImageLoad}
          />
        )}
        
        {/* 폴백 아바타 */}
        <AvatarFallback 
          className={cn(
            "transition-all duration-200 font-medium",
            imageState === 'loaded' && showImage ? "opacity-0" : "opacity-100",
            getAvatarColor(fallbackText)
          )}
        >
          {getInitials(fallbackText)}
        </AvatarFallback>
      </Avatar>
      
      {/* 온라인 상태 표시 */}
      {showOnlineStatus && (
        <div className={cn(
          "absolute bottom-0 right-0 rounded-full border-2 border-white",
          size === 'sm' ? "w-2.5 h-2.5" : 
          size === 'md' ? "w-3 h-3" :
          size === 'lg' ? "w-3.5 h-3.5" : "w-4 h-4",
          isOnline ? "bg-green-500" : "bg-gray-400"
        )} />
      )}
      
      {/* 로딩 표시 */}
      {imageState === 'loading' && (
        <div className={cn(
          "absolute inset-0 rounded-full bg-gray-100 animate-pulse",
          "flex items-center justify-center"
        )}>
          <div className={cn(
            "rounded-full bg-gray-200",
            size === 'sm' ? "w-1 h-1" :
            size === 'md' ? "w-1.5 h-1.5" :
            size === 'lg' ? "w-2 h-2" : "w-2.5 h-2.5"
          )} />
        </div>
      )}
    </div>
  );
});

FastLoadingAvatar.displayName = 'FastLoadingAvatar';

export default FastLoadingAvatar;