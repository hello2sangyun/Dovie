import { useState, useEffect } from "react";
import { motion } from "framer-motion";

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
      {/* Top Scroll Progress Bar */}
      {showTopBar && (
        <motion.div
          className="fixed top-0 left-0 h-1 bg-gradient-to-r from-purple-500 via-blue-500 to-cyan-500 z-50 shadow-sm"
          initial={{ width: 0 }}
          animate={{ width: `${scrollProgress}%` }}
          transition={{ duration: 0.1, ease: "easeOut" }}
        />
      )}

      {/* Circular Scroll Indicator */}
      {showCircular && (
        <motion.div
          className="fixed bottom-6 right-6 z-40"
          initial={{ opacity: 0, scale: 0 }}
          animate={{ 
            opacity: scrollProgress > 5 ? 1 : 0,
            scale: scrollProgress > 5 ? 1 : 0
          }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        >
          <div className="relative w-12 h-12">
            {/* Background Circle */}
            <div className="absolute inset-0 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 shadow-lg" />
            
            {/* Progress Circle */}
            <svg className="absolute inset-0 w-12 h-12 -rotate-90" viewBox="0 0 48 48">
              <circle
                cx="24"
                cy="24"
                r="20"
                fill="none"
                stroke="rgba(255,255,255,0.2)"
                strokeWidth="2"
              />
              <motion.circle
                cx="24"
                cy="24"
                r="20"
                fill="none"
                stroke="url(#gradient-indicator)"
                strokeWidth="2"
                strokeLinecap="round"
                initial={{ strokeDasharray: "0 125.66" }}
                animate={{ strokeDasharray: `${(scrollProgress / 100) * 125.66} 125.66` }}
                transition={{ duration: 0.1, ease: "easeOut" }}
              />
              <defs>
                <linearGradient id="gradient-indicator" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#8b5cf6" />
                  <stop offset="50%" stopColor="#3b82f6" />
                  <stop offset="100%" stopColor="#06b6d4" />
                </linearGradient>
              </defs>
            </svg>
            
            {/* Center Text */}
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xs font-medium text-white">
                {Math.round(scrollProgress)}%
              </span>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}