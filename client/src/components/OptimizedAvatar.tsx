import { useState, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitials, getAvatarColor } from "@/lib/utils";
import { useImagePreloader } from "@/hooks/useImagePreloader";
import { useImageCache } from "@/hooks/useImageCache";

interface OptimizedAvatarProps {
  src?: string | null;
  name: string;
  className?: string;
  fallbackClassName?: string;
  onClick?: (e?: React.MouseEvent) => void;
}

export function OptimizedAvatar({ 
  src, 
  name, 
  className = "", 
  fallbackClassName = "",
  onClick
}: OptimizedAvatarProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const { addToPreloadQueue, isImageLoaded } = useImagePreloader();
  const { cachedUrl, isLoading: cacheLoading, error: cacheError } = useImageCache(src || undefined);

  // 캐시된 이미지 URL이나 원본 URL 사용
  const displaySrc = cachedUrl || src;

  useEffect(() => {
    if (src) {
      // 이미지 미리 로드 큐에 추가
      addToPreloadQueue([src]);
      
      // 캐시에서 이미 로드된 이미지인지 확인
      if (isImageLoaded(src) || cachedUrl) {
        setImageLoaded(true);
        setImageError(false);
      }
    }
  }, [src, addToPreloadQueue, isImageLoaded, cachedUrl]);

  const handleImageLoad = () => {
    setImageLoaded(true);
    setImageError(false);
  };

  const handleImageError = () => {
    setImageError(true);
    setImageLoaded(false);
  };

  // 캐시 로딩 중이거나 에러가 있으면 폴백 표시
  const shouldShowFallback = !displaySrc || imageError || cacheError || (cacheLoading && !cachedUrl);

  return (
    <Avatar className={className} onClick={onClick}>
      {displaySrc && !shouldShowFallback && (
        <AvatarImage 
          src={displaySrc} 
          alt={name}
          onLoad={handleImageLoad}
          onError={handleImageError}
          loading="lazy"
          className={`transition-opacity duration-200 ${
            imageLoaded ? 'opacity-100' : 'opacity-0'
          }`}
        />
      )}
      <AvatarFallback 
        className={`${getAvatarColor(name)} text-white font-bold ${fallbackClassName} ${
          imageLoaded && !shouldShowFallback ? 'opacity-0' : 'opacity-100'
        } transition-opacity duration-200 ${cacheLoading ? 'animate-pulse' : ''}`}
      >
        {getInitials(name)}
      </AvatarFallback>
    </Avatar>
  );
}