import { useState, useEffect } from "react";

interface ScrollIndicatorProps {
  showTopBar?: boolean;
  showCircular?: boolean;
  className?: string;
}

export default function ScrollIndicator({ 
  showTopBar = true, 
  showCircular = true,
  className = ""
}: ScrollIndicatorProps) {
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrollPercent = (scrollTop / docHeight) * 100;
      setScrollProgress(Math.min(scrollPercent, 100));
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className={className}>
      {/* Top progress bar - simplified without motion effects */}
      {showTopBar && (
        <div className="fixed top-0 left-0 right-0 h-1 bg-gray-200 z-50">
          <div 
            className="h-full bg-purple-600 transition-all duration-150 ease-out"
            style={{ width: `${scrollProgress}%` }}
          />
        </div>
      )}

      {/* Circular progress indicator - simplified */}
      {showCircular && scrollProgress > 5 && (
        <div className="fixed bottom-4 right-4 w-12 h-12 bg-white rounded-full shadow-lg border-2 border-gray-200 flex items-center justify-center z-40">
          <div className="w-8 h-8 relative">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 24 24">
              <circle
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="2"
                fill="none"
                className="text-gray-200"
              />
              <circle
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="2"
                fill="none"
                strokeDasharray={`${scrollProgress * 0.628} 62.8`}
                className="text-purple-600 transition-all duration-150 ease-out"
              />
            </svg>
          </div>
        </div>
      )}
    </div>
  );
}