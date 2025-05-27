import { cn } from "@/lib/utils";
import dovieLogoPath from "../assets/dovie-logo.png";

interface DovieLogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  animated?: boolean;
}

export default function DovieLogo({ size = "md", className, animated = false }: DovieLogoProps) {
  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-12 h-12", 
    lg: "w-16 h-16",
    xl: "w-24 h-24"
  };

  return (
    <div className={cn(
      "flex items-center justify-center",
      sizeClasses[size],
      animated && "animate-pulse",
      className
    )}>
      <img 
        src={dovieLogoPath} 
        alt="Dovie Logo" 
        className="w-full h-full object-contain"
      />
    </div>
  );
}
