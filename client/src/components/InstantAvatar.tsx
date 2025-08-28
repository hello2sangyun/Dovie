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

    // URL 형태에 따라 최적화된 경로로 변환
    let optimizedSrc = src;
    
    // 이미 완전한 HTTP URL인 경우 (구글, 페이스북 프로필 등)
    if (src.startsWith('http://') || src.startsWith('https://')) {
      optimizedSrc = src;
    }
    // API 경로가 이미 포함된 경우
    else if (src.startsWith('/api/profile-images/')) {
      optimizedSrc = src;
    }
    // uploads 경로인 경우 API 경로로 변환
    else if (src.startsWith('/uploads/')) {
      const filename = src.split('/').pop();
      if (filename) {
        optimizedSrc = `/api/profile-images/${filename}`;
      }
    } 
    // profile_ 으로 시작하는 파일명인 경우
    else if (src.startsWith('profile_')) {
      optimizedSrc = `/api/profile-images/${src}`;
    } 
    // 기타 상대 경로인 경우
    else if (!src.startsWith('/') && !src.includes('://')) {
      optimizedSrc = `/api/profile-images/${src}`;
    }
    // 나머지는 그대로 사용
    else {
      optimizedSrc = src;
    }

    console.log(`InstantAvatar: ${src} → ${optimizedSrc}`);

    // 즉시 캐시된 이미지 확인
    const cachedImage = getInstantImage(optimizedSrc);
    if (cachedImage) {
      setDisplaySrc(cachedImage);
      setShowFallback(false);
      return;
    }

    // 캐시에 없으면 최적화된 URL 사용
    setDisplaySrc(optimizedSrc);
    setShowFallback(false);
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

InstantAvatar.displayName = 'InstantAvatar';

export default InstantAvatar;