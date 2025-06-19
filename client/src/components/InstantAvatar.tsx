import React, { useState, useEffect, memo } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn, getInitials, getAvatarColor } from "@/lib/utils";
import { useInstantImageCache } from "@/hooks/useInstantImageCache";

interface InstantAvatarProps {
  src?: string | null;
  alt?: string;
  fallbackText?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showOnlineStatus?: boolean;
  isOnline?: boolean;
}

const sizeClasses = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm', 
  lg: 'h-12 w-12 text-base',
  xl: 'h-16 w-16 text-lg'
};

const InstantAvatar = memo(({ 
  src, 
  alt = '', 
  fallbackText = '',
  size = 'md',
  className,
  showOnlineStatus = false,
  isOnline = false
}: InstantAvatarProps) => {
  const [imageReady, setImageReady] = useState(false);
  const [instantSrc, setInstantSrc] = useState<string | null>(null);
  const { getInstantImage, isImageReady } = useInstantImageCache();

  // 이미지 URL이 변경되면 즉시 캐시에서 확인
  useEffect(() => {
    if (!src) {
      setImageReady(false);
      setInstantSrc(null);
      return;
    }

    // 캐시에서 즉시 사용 가능한 이미지 확인
    if (isImageReady(src)) {
      const cachedUrl = getInstantImage(src);
      if (cachedUrl) {
        setInstantSrc(cachedUrl);
        setImageReady(true);
        return;
      }
    }

    // 캐시에 없으면 원본 URL 시도 (폴백)
    setInstantSrc(src);
    setImageReady(false);
  }, [src, isImageReady, getInstantImage]);

  // 이미지 로드 성공시 상태 업데이트
  const handleImageLoad = () => {
    setImageReady(true);
  };

  // 이미지 로드 실패시 폴백 표시
  const handleImageError = () => {
    setImageReady(false);
    setInstantSrc(null);
  };

  return (
    <div className="relative">
      <Avatar className={cn(sizeClasses[size], className)}>
        {/* 캐시된 이미지 또는 원본 이미지 */}
        {instantSrc && (
          <AvatarImage 
            src={instantSrc}
            alt={alt}
            className={cn(
              "transition-opacity duration-75",
              imageReady ? "opacity-100" : "opacity-90"
            )}
            onLoad={handleImageLoad}
            onError={handleImageError}
          />
        )}
        
        {/* 폴백 아바타 - 이미지가 없거나 로딩 실패시 항상 표시 */}
        <AvatarFallback 
          className={cn(
            "transition-opacity duration-75 font-medium",
            imageReady && instantSrc ? "opacity-0" : "opacity-100",
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
    </div>
  );
});

InstantAvatar.displayName = 'InstantAvatar';

export default InstantAvatar;