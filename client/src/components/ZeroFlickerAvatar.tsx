import React, { useState, useEffect, memo } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn, getInitials, getAvatarColor } from "@/lib/utils";
import { useGlobalImageCache } from "@/hooks/useGlobalImageCache";

interface ZeroFlickerAvatarProps {
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

const ZeroFlickerAvatar = memo(({ 
  src, 
  alt = '', 
  fallbackText = '',
  size = 'md',
  className,
  showOnlineStatus = false,
  isOnline = false
}: ZeroFlickerAvatarProps) => {
  const [displaySrc, setDisplaySrc] = useState<string | null>(null);
  const [showFallback, setShowFallback] = useState(true);
  const { getCachedImageUrl, isImageCached, loadImage } = useGlobalImageCache();

  useEffect(() => {
    if (!src) {
      setDisplaySrc(null);
      setShowFallback(true);
      return;
    }

    // 캐시에서 즉시 확인
    const cachedUrl = getCachedImageUrl(src);
    if (cachedUrl) {
      setDisplaySrc(cachedUrl);
      setShowFallback(false);
      return;
    }

    // 캐시에 없으면 로드 시작 (백그라운드에서)
    if (!isImageCached(src)) {
      loadImage(src).then((objectUrl) => {
        setDisplaySrc(objectUrl);
        setShowFallback(false);
      }).catch((error) => {
        console.warn('Failed to load avatar image:', error);
        setShowFallback(true);
      });
    }
  }, [src, getCachedImageUrl, isImageCached, loadImage]);

  const initials = getInitials(fallbackText);
  const colorClass = getAvatarColor(fallbackText);

  return (
    <div className="relative">
      <Avatar className={cn(sizeClasses[size], className)}>
        {displaySrc && !showFallback ? (
          <AvatarImage 
            src={displaySrc} 
            alt={alt}
            className="object-cover"
            onError={() => setShowFallback(true)}
          />
        ) : (
          <AvatarFallback className={cn(
            "font-medium text-white",
            colorClass
          )}>
            {initials}
          </AvatarFallback>
        )}
      </Avatar>
      
      {showOnlineStatus && (
        <div className={cn(
          "absolute -bottom-0.5 -right-0.5 rounded-full border-2 border-white",
          isOnline ? "bg-green-500" : "bg-gray-400",
          size === 'sm' ? "h-2.5 w-2.5" : size === 'md' ? "h-3 w-3" : "h-3.5 w-3.5"
        )} />
      )}
    </div>
  );
});

ZeroFlickerAvatar.displayName = 'ZeroFlickerAvatar';

export default ZeroFlickerAvatar;