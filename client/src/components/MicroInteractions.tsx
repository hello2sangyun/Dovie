import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface MicroInteractionProps {
  children: React.ReactNode;
  type?: 'hover' | 'press' | 'focus' | 'loading';
  intensity?: 'subtle' | 'moderate' | 'strong';
  disabled?: boolean;
  accessibilityMode?: boolean;
  hapticFeedback?: boolean;
  soundFeedback?: boolean;
  className?: string;
}

// Enhanced Button with Micro-interactions (simplified without motion effects)
export function InteractiveButton({ 
  children, 
  type = 'hover',
  intensity = 'moderate',
  disabled = false,
  accessibilityMode = false,
  hapticFeedback = true,
  soundFeedback = false,
  className,
  onClick,
  ...props
}: MicroInteractionProps & { onClick?: () => void }) {
  const [isPressed, setIsPressed] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const buttonRef = useRef<HTMLButtonElement>(null);

  // Haptic feedback for mobile devices
  const triggerHapticFeedback = () => {
    if (hapticFeedback && 'vibrate' in navigator) {
      navigator.vibrate(intensity === 'subtle' ? 10 : intensity === 'moderate' ? 20 : 30);
    }
  };

  const handleClick = () => {
    if (!disabled) {
      triggerHapticFeedback();
      onClick?.();
    }
  };

  const getTransformClasses = () => {
    if (disabled || accessibilityMode) return '';
    
    const baseTransforms = 'transition-all duration-150 ease-out';
    
    if (isPressed) {
      return cn(baseTransforms, {
        'scale-95': intensity === 'subtle',
        'scale-90': intensity === 'moderate',
        'scale-85': intensity === 'strong'
      });
    }
    
    if (isHovered) {
      return cn(baseTransforms, {
        'scale-102': intensity === 'subtle',
        'scale-105': intensity === 'moderate',
        'scale-110': intensity === 'strong'
      });
    }
    
    return baseTransforms;
  };

  const getOpacityClasses = () => {
    if (disabled) return 'opacity-50 cursor-not-allowed';
    return isPressed ? 'opacity-80' : 'opacity-100';
  };

  return (
    <button
      ref={buttonRef}
      className={cn(
        'relative overflow-hidden focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2',
        getTransformClasses(),
        getOpacityClasses(),
        className
      )}
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      onMouseLeave={() => {
        setIsPressed(false);
        setIsHovered(false);
      }}
      onMouseEnter={() => setIsHovered(true)}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      onClick={handleClick}
      disabled={disabled}
      {...props}
    >
      {children}
      
      {/* Focus ring for accessibility */}
      {isFocused && !accessibilityMode && (
        <div className="absolute inset-0 rounded-inherit ring-2 ring-purple-500 ring-opacity-50 pointer-events-none" />
      )}
    </button>
  );
}

// Simplified Ripple Effect without motion
export function RippleEffect({ 
  children, 
  disabled = false,
  className 
}: { 
  children: React.ReactNode; 
  disabled?: boolean;
  className?: string;
}) {
  const [ripples, setRipples] = useState<Array<{ id: number; x: number; y: number }>>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  const createRipple = (event: React.MouseEvent) => {
    if (disabled) return;
    
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    const newRipple = {
      id: Date.now(),
      x,
      y
    };
    
    setRipples(prev => [...prev, newRipple]);
    
    setTimeout(() => {
      setRipples(prev => prev.filter(ripple => ripple.id !== newRipple.id));
    }, 600);
  };

  return (
    <div 
      ref={containerRef}
      className={cn("relative overflow-hidden", className)}
      onMouseDown={createRipple}
    >
      {children}
      
      {/* Static ripple effects */}
      {ripples.map(ripple => (
        <div
          key={ripple.id}
          className="absolute pointer-events-none bg-white opacity-30 rounded-full animate-ping"
          style={{
            left: ripple.x - 10,
            top: ripple.y - 10,
            width: 20,
            height: 20,
          }}
        />
      ))}
    </div>
  );
}

// Loading Spinner without motion effects
export function LoadingSpinner({ 
  size = 'medium',
  color = 'purple'
}: {
  size?: 'small' | 'medium' | 'large';
  color?: 'purple' | 'blue' | 'gray';
}) {
  const sizeClasses = {
    small: 'w-4 h-4',
    medium: 'w-6 h-6', 
    large: 'w-8 h-8'
  };
  
  const colorClasses = {
    purple: 'text-purple-600',
    blue: 'text-blue-600',
    gray: 'text-gray-600'
  };

  return (
    <div className={cn('animate-spin', sizeClasses[size], colorClasses[color])}>
      <svg fill="none" viewBox="0 0 24 24">
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
    </div>
  );
}

export default InteractiveButton;