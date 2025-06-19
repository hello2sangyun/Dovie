import { memo, useState, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useGlobalBlobCache } from '@/hooks/useGlobalBlobCache';

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
  const [showFallback, setShowFallback] = useState(false);
  const { getInstantImage, loadImageAsBlob } = useGlobalBlobCache();

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

    // 즉시 캐시된 이미지 확인
    const cachedImage = getInstantImage(src);
    if (cachedImage) {
      setDisplaySrc(cachedImage);
      setShowFallback(false);
      return;
    }

    // 캐시에 없으면 비동기 로딩
    setShowFallback(true);
    loadImageAsBlob(src)
      .then(objectUrl => {
        setDisplaySrc(objectUrl);
        setShowFallback(false);
      })
      .catch(error => {
        console.error('InstantAvatar: Failed to load image', src, error);
        setShowFallback(true);
      });
  }, [src, getInstantImage, loadImageAsBlob]);

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