import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { getInitials, getAvatarColor } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { useImagePreloader } from "@/hooks/useImagePreloader";
import { useState } from "react";

interface UserAvatarProps {
  userId?: number;
  user?: {
    id: number;
    displayName: string;
    profilePicture?: string | null;
  } | null;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  fallbackClassName?: string;
  showOnlineStatus?: boolean;
}

const sizeMap = {
  sm: "w-6 h-6",
  md: "w-8 h-8", 
  lg: "w-12 h-12",
  xl: "w-16 h-16"
};

export function UserAvatar({ 
  userId, 
  user: providedUser, 
  size = "md", 
  className = "",
  fallbackClassName = "",
  showOnlineStatus = false 
}: UserAvatarProps) {
  const { user: currentUser } = useAuth();
  const [imageError, setImageError] = useState(false);
  
  // 현재 사용자인 경우 Auth 컨텍스트에서 최신 정보 사용
  const user = providedUser || (userId === currentUser?.id ? currentUser : null);
  
  if (!user) return null;

  const avatarColor = getAvatarColor(user.displayName);
  
  // 프로필 이미지 URL 생성 (캐시 버스팅을 위해 고정된 버전 사용)
  const profileImageUrl = user.profilePicture && !imageError ? 
    `${user.profilePicture}?v=${user.id}_${user.profilePicture.split('/').pop()}` : null;

  // 이미지 로딩 상태를 단순하게 관리
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  return (
    <div className="relative">
      <Avatar className={cn(sizeMap[size], className)}>
        {profileImageUrl && !imageError ? (
          <AvatarImage 
            src={profileImageUrl}
            alt={user.displayName}
            className="transition-opacity duration-200"
            onLoad={() => setIsLoaded(true)}
            onError={() => {
              setImageError(true);
              setIsLoaded(false);
            }}
          />
        ) : null}
        <AvatarFallback 
          className={cn(
            "font-semibold text-white transition-all duration-200",
            avatarColor,
            size === "sm" && "text-xs",
            size === "md" && "text-sm", 
            size === "lg" && "text-base",
            size === "xl" && "text-lg",
            fallbackClassName,
            // 이미지 로딩 중일 때 약간의 로딩 표시
            isLoading && "animate-pulse"
          )}
        >
          {isLoading ? (
            <div className={cn(
              "rounded-full bg-white/20",
              size === "sm" && "w-4 h-4",
              size === "md" && "w-5 h-5",
              size === "lg" && "w-8 h-8",
              size === "xl" && "w-10 h-10"
            )} />
          ) : (
            getInitials(user.displayName)
          )}
        </AvatarFallback>
      </Avatar>
      
      {showOnlineStatus && (
        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
      )}
    </div>
  );
}