import { useState, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitials, getAvatarColor } from "@/lib/utils";
import { useImagePreloader } from "@/hooks/useImagePreloader";

interface OptimizedAvatarProps {
  src?: string | null;
  name: string;
  className?: string;
  fallbackClassName?: string;
  onClick?: () => void;
}

export function OptimizedAvatar({ 
  src, 
  name, 
  className = "", 
  fallbackClassName = "" 
}: OptimizedAvatarProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const { addToPreloadQueue, isImageLoaded } = useImagePreloader();

  useEffect(() => {
    if (src) {
      // 이미지 미리 로드
      addToPreloadQueue([src]);
      
      // 캐시에서 이미 로드된 이미지인지 확인
      if (isImageLoaded(src)) {
        setImageLoaded(true);
      }
    }
  }, [src, addToPreloadQueue, isImageLoaded]);

  const handleImageLoad = () => {
    setImageLoaded(true);
    setImageError(false);
  };

  const handleImageError = () => {
    setImageError(true);
    setImageLoaded(false);
  };

  return (
    <Avatar className={className}>
      {src && !imageError && (
        <AvatarImage 
          src={src} 
          alt={name}
          onLoad={handleImageLoad}
          onError={handleImageError}
          className={`transition-opacity duration-200 ${
            imageLoaded ? 'opacity-100' : 'opacity-0'
          }`}
        />
      )}
      <AvatarFallback 
        className={`${getAvatarColor(name)} text-white font-bold ${fallbackClassName} ${
          imageLoaded && !imageError ? 'opacity-0' : 'opacity-100'
        } transition-opacity duration-200`}
      >
        {getInitials(name)}
      </AvatarFallback>
    </Avatar>
  );
}