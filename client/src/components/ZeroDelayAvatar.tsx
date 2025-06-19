import { useState, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getGlobalCachedImage, preloadGlobalImage } from '@/hooks/useImagePreloader';

interface ZeroDelayAvatarProps {
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

export default function ZeroDelayAvatar({ 
  src, 
  alt = "Profile", 
  fallbackText = "U",
  size = 'md',
  className = "",
  showOnlineStatus = false,
  isOnline = false
}: ZeroDelayAvatarProps) {
  const [displaySrc, setDisplaySrc] = useState<string | null>(null);

  useEffect(() => {
    if (!src || src === 'null' || src === 'undefined' || src.trim() === '') {
      setDisplaySrc(null);
      return;
    }

    // 먼저 캐시에서 확인
    const cachedImage = getGlobalCachedImage(src);
    if (cachedImage) {
      setDisplaySrc(cachedImage);
      return;
    }

    // 캐시에 없으면 백그라운드에서 로딩 (표시는 fallback으로)
    preloadGlobalImage(src).then(blobUrl => {
      if (blobUrl) {
        setDisplaySrc(blobUrl);
      }
    }).catch(() => {
      setDisplaySrc(null);
    });
  }, [src]);

  return (
    <div className={`relative ${className}`}>
      <Avatar className={`${sizeClasses[size]} ${showOnlineStatus ? 'ring-2 ring-white' : ''}`}>
        {displaySrc ? (
          <AvatarImage 
            src={displaySrc} 
            alt={alt}
            className="object-cover"
            style={{
              transition: 'none', // 전환 효과 제거로 즉시 표시
            }}
          />
        ) : null}
        <AvatarFallback className="bg-purple-100 text-purple-600 font-medium">
          {fallbackText.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      
      {showOnlineStatus && (
        <div 
          className={`absolute -bottom-0.5 -right-0.5 rounded-full border-2 border-white ${
            isOnline ? 'bg-green-500' : 'bg-gray-400'
          }`}
          style={{
            width: size === 'sm' ? '8px' : size === 'md' ? '10px' : size === 'lg' ? '12px' : '14px',
            height: size === 'sm' ? '8px' : size === 'md' ? '10px' : size === 'lg' ? '12px' : '14px'
          }}
        />
      )}
    </div>
  );
}