import { memo, useState, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useInstantImageCache } from '@/hooks/useInstantImageCache';

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
  const [showFallback, setShowFallback] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const { getInstantImage } = useInstantImageCache();

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
      return;
    }

    // 기존 /uploads/ URL을 최적화된 /api/profile-images/ URL로 변환
    let optimizedSrc = src;
    if (src.startsWith('/uploads/')) {
      const filename = src.split('/').pop();
      if (filename && filename.startsWith('profile_')) {
        optimizedSrc = `/api/profile-images/${filename}`;
      }
    }
    
    // 배포 환경에서 cache busting을 위한 타임스탬프 추가
    if (optimizedSrc.includes('/api/profile-images/') && !optimizedSrc.includes('?')) {
      optimizedSrc += `?t=${Date.now()}`;
    }

    // 즉시 캐시된 이미지 확인
    const cachedImage = getInstantImage(optimizedSrc);
    if (cachedImage) {
      setDisplaySrc(cachedImage);
      setShowFallback(false);
      return;
    }

    // 배포 환경에서 직접 로딩 시도
    const testImage = new Image();
    testImage.onload = () => {
      setDisplaySrc(optimizedSrc);
      setShowFallback(false);
    };
    testImage.onerror = () => {
      // 프로필 이미지 로딩 실패 시 원본 URL 시도
      if (optimizedSrc !== src) {
        setDisplaySrc(src);
        setShowFallback(false);
      } else {
        setShowFallback(true);
      }
    };
    testImage.src = optimizedSrc;
  }, [src, getInstantImage, forceUpdate]);

  // 프로필 이미지 업데이트 이벤트 리스너
  useEffect(() => {
    const handleProfileImageUpdate = (event: CustomEvent) => {
      const { newUrl } = event.detail;
      // 현재 src와 새 URL이 관련된 경우 강제로 다시 렌더링
      if (src && (src.includes('profile_') || newUrl.includes('profile_'))) {
        setForceUpdate(prev => prev + 1);
      }
    };

    window.addEventListener('profileImageUpdated', handleProfileImageUpdate as EventListener);
    
    return () => {
      window.removeEventListener('profileImageUpdated', handleProfileImageUpdate as EventListener);
    };
  }, [src]);

  return (
    <div className="relative">
      <Avatar className={cn(sizeClasses[size], className)}>
        {displaySrc && !showFallback ? (
          <AvatarImage 
            src={displaySrc + (retryCount > 0 ? `?retry=${retryCount}` : '')} 
            alt={alt}
            className="object-cover"
            onError={(error) => {
              console.error(`프로필 이미지 로딩 실패: ${displaySrc}`, {
                retryCount,
                originalSrc: src,
                error: error,
                timestamp: new Date().toISOString()
              });
              if (retryCount < 2) {
                // 재시도 (최대 2회)
                setTimeout(() => {
                  setRetryCount(prev => prev + 1);
                }, 1000 * (retryCount + 1)); // 점진적 지연
              } else {
                // 최종 실패 시 fallback 표시
                console.error(`프로필 이미지 최종 실패 - fallback 표시: ${src}`);
                setShowFallback(true);
              }
            }}
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

InstantAvatar.displayName = 'InstantAvatar';

export default InstantAvatar;