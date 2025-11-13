import { useEffect, useState } from 'react';

interface SplashScreenProps {
  onComplete: () => void;
  minDuration?: number;
}

export default function SplashScreen({ onComplete, minDuration = 1500 }: SplashScreenProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onComplete, 300);
    }, minDuration);

    return () => clearTimeout(timer);
  }, [minDuration, onComplete]);

  if (!isVisible) return null;

  return (
    <div 
      className={`fixed inset-0 z-[10000] flex items-center justify-center bg-white transition-opacity duration-300 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
      style={{ 
        touchAction: 'none',
        WebkitTouchCallout: 'none',
        WebkitUserSelect: 'none'
      }}
    >
      <div className="flex items-center justify-center w-full h-full">
        <img 
          src="/dovie-splash.png" 
          alt="Dovie Messenger"
          className="w-auto h-auto max-w-[70%] max-h-[70%] object-contain"
          style={{
            imageRendering: 'crisp-edges',
            WebkitUserSelect: 'none'
          }}
        />
      </div>
    </div>
  );
}
