import { cn } from "@/lib/utils";

interface VaultLogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  animated?: boolean;
}

export default function VaultLogo({ size = "md", className, animated = false }: VaultLogoProps) {
  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-12 h-12", 
    lg: "w-16 h-16",
    xl: "w-24 h-24"
  };

  return (
    <svg
      viewBox="0 0 100 100"
      className={cn(
        sizeClasses[size],
        animated && "animate-pulse",
        className
      )}
    >
      <defs>
        <linearGradient id="whiteGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: '#ffffff', stopOpacity: 1 }} />
          <stop offset="50%" style={{ stopColor: '#f8fafc', stopOpacity: 0.9 }} />
          <stop offset="100%" style={{ stopColor: '#e2e8f0', stopOpacity: 0.8 }} />
        </linearGradient>
      </defs>
      {/* Bird/Dove silhouette */}
      <path
        d="M30 45 Q35 35, 45 40 Q55 35, 65 45 Q70 50, 65 60 Q60 65, 50 65 Q40 65, 35 60 Q30 50, 30 45 Z"
        fill="url(#whiteGradient)"
        stroke="rgba(255,255,255,0.3)"
        strokeWidth="1"
      />
      {/* Wing detail */}
      <path
        d="M35 48 Q45 42, 55 48 Q60 52, 55 58 Q45 62, 35 58 Q30 52, 35 48 Z"
        fill="rgba(255,255,255,0.7)"
      />
      {/* Eye */}
      <circle
        cx="42"
        cy="48"
        r="2"
        fill="rgba(255,255,255,0.9)"
      />
    </svg>
  );
}
