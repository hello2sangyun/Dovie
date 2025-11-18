import { memo, useState, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useInstantImageCache } from '@/hooks/useInstantImageCache';
import { Skeleton } from "@/components/ui/skeleton";

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

const colorClasses = [
  'bg-red-500',
  'bg-blue-500', 
  'bg-green-500',
  'bg-yellow-500',
  'bg-purple-500',
  'bg-pink-500',
  'bg-indigo-500',
  'bg-teal-500'
];

function getAvatarColor(text: string = ''): string {
  const hash = text.split('').reduce((acc, char) => {
    return char.charCodeAt(0) + ((acc << 5) - acc);
  }, 0);
  return colorClasses[Math.abs(hash) % colorClasses.length];
}

export const InstantAvatar = memo(function InstantAvatar({
  src,
  alt = "Avatar",
  fallbackText = "?",
  size = 'md',
  className = "",
  showOnlineStatus = false,
  isOnline = false
}: InstantAvatarProps) {
  const [displaySrc, setDisplaySrc] = useState<string | null>(null);
  const [forceRefresh, setForceRefresh] = useState(0);
  const [forceUpdate, setForceUpdate] = useState(0);
  const [showFallback, setShowFallback] = useState(!src);
  const [isLoading, setIsLoading] = useState(!!src);
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const { getInstantImage, invalidateUrl } = useInstantImageCache();

  // 이니셜 생성
  const initials = fallbackText
    .split(' ')
    .map(word => word.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const colorClass = getAvatarColor(fallbackText);

  useEffect(() => {
    if (!src) {
      setDisplaySrc(null);
      setShowFallback(true);
      setIsLoading(false);
      setIsImageLoaded(false);
      return;
    }

    // GCS URL은 직접 사용 (캐싱 우회)
    if (src.startsWith('https://storage.googleapis.com/')) {
      setDisplaySrc(src);
      setShowFallback(false);
      setIsLoading(true);
      setIsImageLoaded(false);
      return;
    }

    // URL 형태에 따라 최적화된 경로로 변환
    let optimizedSrc = src;
    if (src.startsWith('/uploads/')) {
      const filename = src.split('/').pop();
      if (filename) {
        optimizedSrc = `/api/profile-images/${filename}`;
      }
    } else if (src.startsWith('profile_')) {
      // 파일명만 있는 경우 API 경로 추가
      optimizedSrc = `/api/profile-images/${src}`;
    } else if (!src.startsWith('http') && !src.startsWith('/api/')) {
      // 상대 경로인 경우 API 경로로 변환
      optimizedSrc = `/api/profile-images/${src}`;
    }

    // 즉시 캐시된 이미지 확인
    const cachedImage = getInstantImage(optimizedSrc);
    if (cachedImage) {
      // 캐시된 이미지도 fade-in 효과를 위해 isImageLoaded를 false로 시작
      setDisplaySrc(cachedImage);
      setShowFallback(false);
      setIsLoading(true);
      setIsImageLoaded(false);
      return;
    }

    // 캐시에 없으면 원본 URL 사용 및 로딩 상태 시작
    setIsLoading(true);
    setIsImageLoaded(false);
    setDisplaySrc(optimizedSrc);
    setShowFallback(false);
  }, [src, getInstantImage, forceUpdate]);

  // 프로필 이미지 업데이트 이벤트 리스너
  useEffect(() => {
    const handleProfileImageUpdate = (event: CustomEvent) => {
      const { newUrl, chatRoomId } = event.detail;
      
      // URL 최적화 함수 (메인 useEffect와 동일한 로직)
      const optimizeUrl = (url: string | null): string | null => {
        if (!url) return null;
        
        if (url.startsWith('/uploads/')) {
          const filename = url.split('/').pop();
          return filename ? `/api/profile-images/${filename}` : null;
        } else if (url.startsWith('profile_')) {
          return `/api/profile-images/${url}`;
        } else if (!url.startsWith('http') && !url.startsWith('/api/')) {
          return `/api/profile-images/${url}`;
        }
        return url;
      };
      
      // 현재 src와 새 URL의 캐시 무효화
      const currentOptimizedUrl = optimizeUrl(src || null);
      const newOptimizedUrl = optimizeUrl(newUrl);
      
      if (currentOptimizedUrl) {
        invalidateUrl(currentOptimizedUrl);
      }
      if (newOptimizedUrl && newOptimizedUrl !== currentOptimizedUrl) {
        invalidateUrl(newOptimizedUrl);
      }
      
      // chatRoomId가 제공된 경우 또는 관련 프로필 이미지인 경우 forceUpdate
      if (chatRoomId || (src && src.includes('profile_')) || (newUrl && newUrl.includes('profile_'))) {
        setForceUpdate(prev => prev + 1);
      }
    };

    window.addEventListener('profileImageUpdated', handleProfileImageUpdate as EventListener);
    
    return () => {
      window.removeEventListener('profileImageUpdated', handleProfileImageUpdate as EventListener);
    };
  }, [src, invalidateUrl]);

  const handleImageLoad = () => {
    setIsLoading(false);
    setIsImageLoaded(true);
  };

  const handleImageError = () => {
    setShowFallback(true);
    setIsLoading(false);
    setIsImageLoaded(false);
  };

  return (
    <div className="relative">
      <Avatar className={cn(sizeClasses[size], className)}>
        {showFallback ? (
          <AvatarFallback className={cn(
            "font-medium text-white",
            colorClass
          )}>
            {initials}
          </AvatarFallback>
        ) : (
          <>
            {isLoading && !isImageLoaded && (
              <Skeleton className={cn("absolute inset-0 rounded-full", sizeClasses[size])} />
            )}
            {displaySrc && (
              <AvatarImage 
                src={displaySrc} 
                alt={alt}
                loading="lazy"
                className={cn(
                  "object-cover transition-opacity duration-200",
                  isImageLoaded ? "opacity-100" : "opacity-0"
                )}
                onLoad={handleImageLoad}
                onError={handleImageError}
              />
            )}
          </>
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

InstantAvatar.displayName = 'InstantAvatar';

export default InstantAvatar;