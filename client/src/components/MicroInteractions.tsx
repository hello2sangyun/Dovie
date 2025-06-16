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

// Enhanced Button with Micro-interactions
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

  const triggerHaptic = () => {
    if (hapticFeedback && !accessibilityMode && 'vibrate' in navigator) {
      navigator.vibrate(10);
    }
  };

  const triggerSound = () => {
    if (soundFeedback && !accessibilityMode) {
      // Subtle click sound
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.1);
    }
  };

  const getTransformClass = () => {
    if (disabled || accessibilityMode) return '';
    
    const intensityMap = {
      subtle: {
        hover: 'hover:scale-105',
        press: 'active:scale-95',
        focus: 'focus:scale-105'
      },
      moderate: {
        hover: 'hover:scale-110',
        press: 'active:scale-90',
        focus: 'focus:scale-105'
      },
      strong: {
        hover: 'hover:scale-115',
        press: 'active:scale-85',
        focus: 'focus:scale-110'
      }
    };

    return `${intensityMap[intensity].hover} ${intensityMap[intensity].press} ${intensityMap[intensity].focus}`;
  };

  const handleClick = () => {
    if (disabled) return;
    
    triggerHaptic();
    triggerSound();
    onClick?.();
  };

  return (
    <button
      ref={buttonRef}
      className={cn(
        "transition-all duration-200 ease-out",
        getTransformClass(),
        isPressed && !accessibilityMode && 'brightness-95',
        isFocused && 'ring-2 ring-blue-500 ring-opacity-50',
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      onClick={handleClick}
      disabled={disabled}
      aria-pressed={isPressed}
      {...props}
    >
      {children}
    </button>
  );
}

// Loading Spinner with Accessibility
export function AccessibleSpinner({ 
  size = 'md',
  accessibilityMode = false,
  label = "로딩 중"
}: {
  size?: 'sm' | 'md' | 'lg';
  accessibilityMode?: boolean;
  label?: string;
}) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6', 
    lg: 'w-8 h-8'
  };

  if (accessibilityMode) {
    return (
      <div 
        className={cn("border-2 border-gray-300 border-t-blue-500 rounded-full", sizeClasses[size])}
        role="status"
        aria-label={label}
      >
        <span className="sr-only">{label}</span>
      </div>
    );
  }

  return (
    <div 
      className={cn(
        "animate-spin border-2 border-gray-300 border-t-blue-500 rounded-full",
        sizeClasses[size]
      )}
      role="status"
      aria-label={label}
    >
      <span className="sr-only">{label}</span>
    </div>
  );
}

// Message Bubble with Entrance Animation
export function AnimatedMessageBubble({
  children,
  isOwn = false,
  isNew = false,
  accessibilityMode = false,
  className
}: {
  children: React.ReactNode;
  isOwn?: boolean;
  isNew?: boolean;
  accessibilityMode?: boolean;
  className?: string;
}) {
  const [isVisible, setIsVisible] = useState(!isNew);

  useEffect(() => {
    if (isNew && !accessibilityMode) {
      const timer = setTimeout(() => setIsVisible(true), 50);
      return () => clearTimeout(timer);
    }
  }, [isNew, accessibilityMode]);

  return (
    <div
      className={cn(
        "transition-all duration-300 ease-out",
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4',
        accessibilityMode && 'opacity-100 translate-y-0',
        className
      )}
      style={{
        animationDelay: accessibilityMode ? '0ms' : '100ms'
      }}
    >
      {children}
    </div>
  );
}

// Ripple Effect Component
export function RippleEffect({ 
  trigger,
  accessibilityMode = false 
}: { 
  trigger: boolean;
  accessibilityMode?: boolean;
}) {
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number }[]>([]);

  useEffect(() => {
    if (trigger && !accessibilityMode) {
      const newRipple = {
        id: Date.now(),
        x: Math.random() * 100,
        y: Math.random() * 100
      };
      setRipples(prev => [...prev, newRipple]);

      setTimeout(() => {
        setRipples(prev => prev.filter(r => r.id !== newRipple.id));
      }, 600);
    }
  }, [trigger, accessibilityMode]);

  if (accessibilityMode) return null;

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {ripples.map(ripple => (
        <div
          key={ripple.id}
          className="absolute w-2 h-2 bg-blue-400 rounded-full animate-ping opacity-75"
          style={{
            left: `${ripple.x}%`,
            top: `${ripple.y}%`,
            animationDuration: '0.6s'
          }}
        />
      ))}
    </div>
  );
}

// Floating Action Button with Enhanced Interactions
export function FloatingActionButton({
  children,
  onClick,
  accessibilityMode = false,
  className,
  label
}: {
  children: React.ReactNode;
  onClick?: () => void;
  accessibilityMode?: boolean;
  className?: string;
  label?: string;
}) {
  const [isPressed, setIsPressed] = useState(false);

  return (
    <InteractiveButton
      type="press"
      intensity="moderate"
      accessibilityMode={accessibilityMode}
      hapticFeedback={true}
      className={cn(
        "fixed bottom-20 right-4 w-14 h-14 bg-purple-600 text-white rounded-full shadow-lg",
        "hover:bg-purple-700 focus:ring-4 focus:ring-purple-300",
        "flex items-center justify-center z-30",
        !accessibilityMode && "hover:shadow-xl",
        className
      )}
      onClick={onClick}
      aria-label={label}
    >
      {children}
      <RippleEffect trigger={isPressed} accessibilityMode={accessibilityMode} />
    </InteractiveButton>
  );
}

// Pulse Animation for Notifications
export function PulseNotification({
  children,
  active = false,
  accessibilityMode = false,
  intensity = 'moderate'
}: {
  children: React.ReactNode;
  active?: boolean;
  accessibilityMode?: boolean;
  intensity?: 'subtle' | 'moderate' | 'strong';
}) {
  const intensityClasses = {
    subtle: 'animate-pulse',
    moderate: 'animate-pulse',
    strong: 'animate-bounce'
  };

  return (
    <div
      className={cn(
        active && !accessibilityMode && intensityClasses[intensity],
        "transition-all duration-300"
      )}
      role={active ? "alert" : undefined}
      aria-live={active ? "polite" : undefined}
    >
      {children}
    </div>
  );
}

// Accessibility Settings Hook
export function useAccessibilitySettings() {
  const [settings, setSettings] = useState({
    reducedMotion: false,
    highContrast: false,
    largeText: false,
    soundEnabled: false,
    hapticEnabled: true
  });

  useEffect(() => {
    // Check for user's motion preferences
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setSettings(prev => ({ ...prev, reducedMotion: mediaQuery.matches }));

    const handleChange = (e: MediaQueryListEvent) => {
      setSettings(prev => ({ ...prev, reducedMotion: e.matches }));
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return { settings, setSettings };
}