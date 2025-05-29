import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { getInitials, getAvatarColor } from "@/lib/utils";
import { cn } from "@/lib/utils";

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
  
  // 현재 사용자인 경우 Auth 컨텍스트에서 최신 정보 사용
  const user = providedUser || (userId === currentUser?.id ? currentUser : null);
  
  if (!user) return null;

  const avatarColor = getAvatarColor(user.displayName);
  const imageUrl = user.profilePicture ? `${user.profilePicture}?t=${Date.now()}` : undefined;

  console.log("UserAvatar rendering for user:", user.id, "displayName:", user.displayName, "imageUrl:", imageUrl);

  return (
    <div className="relative">
      <Avatar className={cn(sizeMap[size], className)}>
        <AvatarImage 
          src={imageUrl}
          alt={user.displayName}
          onLoad={() => {
            console.log("✅ UserAvatar image loaded successfully for user:", user.id, "URL:", imageUrl);
          }}
          onError={(e) => {
            console.error("❌ UserAvatar image load error for user:", user.id, "URL:", imageUrl, "Error:", e);
          }}
        />
        <AvatarFallback 
          className={cn(
            "font-semibold text-white",
            avatarColor,
            size === "sm" && "text-xs",
            size === "md" && "text-sm", 
            size === "lg" && "text-base",
            size === "xl" && "text-lg",
            fallbackClassName
          )}
        >
          {getInitials(user.displayName)}
        </AvatarFallback>
      </Avatar>
      
      {showOnlineStatus && (
        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
      )}
    </div>
  );
}