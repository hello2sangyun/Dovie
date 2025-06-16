import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { UserAvatar } from "./UserAvatar";

interface TypingUser {
  id: number;
  displayName: string;
  profilePicture?: string;
  typingStyle?: 'dots' | 'wave' | 'pulse' | 'bounce';
  typingSpeed?: 'slow' | 'normal' | 'fast';
}

interface TypingIndicatorProps {
  typingUsers: TypingUser[];
  className?: string;
  compact?: boolean;
  showUserNames?: boolean;
  animationStyle?: 'minimal' | 'standard' | 'enhanced';
  accessibilityMode?: boolean;
}

export default function TypingIndicator({ 
  typingUsers, 
  className,
  compact = false,
  showUserNames = true,
  animationStyle = 'standard',
  accessibilityMode = false
}: TypingIndicatorProps) {
  const [visibleUsers, setVisibleUsers] = useState<TypingUser[]>([]);
  
  useEffect(() => {
    // Stagger appearance of typing users for smooth transition
    if (typingUsers.length > 0) {
      setVisibleUsers([]);
      typingUsers.forEach((user, index) => {
        setTimeout(() => {
          setVisibleUsers(prev => [...prev, user]);
        }, index * 200);
      });
    } else {
      setVisibleUsers([]);
    }
  }, [typingUsers]);

  if (typingUsers.length === 0) return null;

  const getAnimationClass = (user: TypingUser) => {
    const style = user.typingStyle || 'dots';
    const speed = user.typingSpeed || 'normal';
    
    if (accessibilityMode) {
      return 'opacity-70'; // Reduced motion for accessibility
    }
    
    const speedClass = {
      slow: 'animation-duration-1000',
      normal: 'animation-duration-600', 
      fast: 'animation-duration-300'
    }[speed];
    
    switch (style) {
      case 'wave':
        return `animate-pulse ${speedClass}`;
      case 'pulse':
        return `animate-ping ${speedClass}`;
      case 'bounce':
        return `animate-bounce ${speedClass}`;
      default:
        return `animate-pulse ${speedClass}`;
    }
  };

  const getDotAnimation = (user: TypingUser, dotIndex: number) => {
    if (accessibilityMode) return '';
    
    const baseDelay = dotIndex * 200;
    const userDelay = visibleUsers.indexOf(user) * 100;
    const totalDelay = baseDelay + userDelay;
    
    return {
      animationDelay: `${totalDelay}ms`
    };
  };

  const getTypingText = () => {
    const count = typingUsers.length;
    if (count === 1) {
      return showUserNames ? `${typingUsers[0].displayName}님이 입력 중...` : '입력 중...';
    } else if (count === 2) {
      return showUserNames 
        ? `${typingUsers[0].displayName}님과 ${typingUsers[1].displayName}님이 입력 중...`
        : '2명이 입력 중...';
    } else {
      return `${count}명이 입력 중...`;
    }
  };

  if (compact) {
    return (
      <div 
        className={cn("flex items-center space-x-1 text-gray-500 text-xs px-4 py-1", className)}
        role="status"
        aria-live="polite"
        aria-label={getTypingText()}
      >
        <div className="flex space-x-1">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={cn(
                "w-1 h-1 bg-gray-400 rounded-full",
                accessibilityMode ? '' : 'animate-pulse'
              )}
              style={accessibilityMode ? {} : { animationDelay: `${i * 200}ms` }}
            />
          ))}
        </div>
        <span className="sr-only">{getTypingText()}</span>
      </div>
    );
  }

  return (
    <div 
      className={cn(
        "flex items-start space-x-3 px-4 py-2 bg-gray-50 rounded-lg mx-4 mb-2 transition-all duration-300",
        animationStyle === 'enhanced' && 'shadow-sm border border-gray-100',
        className
      )}
      role="status"
      aria-live="polite"
      aria-label={getTypingText()}
    >
      {/* User Avatars */}
      <div className="flex -space-x-1">
        {visibleUsers.slice(0, 3).map((user, index) => (
          <div
            key={user.id}
            className={cn(
              "relative transition-all duration-300 transform",
              accessibilityMode ? '' : 'animate-fadeIn'
            )}
            style={{ 
              zIndex: 10 - index,
              animationDelay: `${index * 200}ms`
            }}
          >
            <UserAvatar
              user={user}
              size="sm"
              className={cn(
                "border-2 border-white ring-2 ring-blue-200",
                getAnimationClass(user)
              )}
            />
            {animationStyle === 'enhanced' && (
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse" />
            )}
          </div>
        ))}
        {typingUsers.length > 3 && (
          <div className="flex items-center justify-center w-8 h-8 bg-gray-200 rounded-full border-2 border-white text-xs font-medium text-gray-600">
            +{typingUsers.length - 3}
          </div>
        )}
      </div>

      {/* Typing Animation and Text */}
      <div className="flex-1 flex items-center space-x-2">
        <div className="flex items-center space-x-1">
          {/* Personalized Typing Dots */}
          {visibleUsers.slice(0, 1).map((user) => (
            <div key={user.id} className="flex space-x-1">
              {[0, 1, 2].map((dotIndex) => (
                <div
                  key={dotIndex}
                  className={cn(
                    "w-2 h-2 rounded-full transition-all duration-200",
                    user.typingStyle === 'pulse' ? 'bg-blue-500' :
                    user.typingStyle === 'wave' ? 'bg-purple-500' :
                    user.typingStyle === 'bounce' ? 'bg-green-500' :
                    'bg-gray-400',
                    accessibilityMode ? '' : getAnimationClass(user)
                  )}
                  style={getDotAnimation(user, dotIndex) as React.CSSProperties}
                  aria-hidden="true"
                />
              ))}
            </div>
          ))}
        </div>

        {/* Typing Text */}
        <div className="flex flex-col">
          <span className="text-sm text-gray-600 font-medium">
            {getTypingText()}
          </span>
          {animationStyle === 'enhanced' && typingUsers.length === 1 && (
            <span className="text-xs text-gray-400">
              {typingUsers[0].typingSpeed === 'fast' ? '빠르게 입력 중' :
               typingUsers[0].typingSpeed === 'slow' ? '천천히 입력 중' :
               '입력 중'}
            </span>
          )}
        </div>
      </div>

      {/* Accessibility Enhancement - Screen Reader Info */}
      <div className="sr-only">
        {typingUsers.map(user => user.displayName).join(', ')}님이 메시지를 입력하고 있습니다.
      </div>
    </div>
  );
}

// Typing Context Hook for managing typing state
export function useTypingIndicator() {
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(null);

  const addTypingUser = (user: TypingUser) => {
    setTypingUsers(prev => {
      const existing = prev.find(u => u.id === user.id);
      if (existing) return prev;
      return [...prev, user];
    });

    // Auto-remove after 3 seconds of inactivity
    if (typingTimeout) clearTimeout(typingTimeout);
    const timeout = setTimeout(() => {
      removeTypingUser(user.id);
    }, 3000);
    setTypingTimeout(timeout);
  };

  const removeTypingUser = (userId: number) => {
    setTypingUsers(prev => prev.filter(u => u.id !== userId));
  };

  const clearAllTyping = () => {
    setTypingUsers([]);
    if (typingTimeout) {
      clearTimeout(typingTimeout);
      setTypingTimeout(null);
    }
  };

  return {
    typingUsers,
    addTypingUser,
    removeTypingUser,
    clearAllTyping
  };
}