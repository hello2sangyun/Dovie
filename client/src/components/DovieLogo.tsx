import { cn } from "@/lib/utils";
import dovieLogoPath from "../assets/dovie-logo.png";
import dovieLogoTextPath from "../assets/dovie-logo-text.png";

interface DovieLogoProps {
  size?: "sm" | "md" | "lg" | "xl" | "2xl";
  className?: string;
  animated?: boolean;
  withText?: boolean;
}

export default function DovieLogo({ size = "md", className, animated = false, withText = false }: DovieLogoProps) {
  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-12 h-12", 
    lg: "w-16 h-16",
    xl: "w-24 h-24",
    "2xl": "w-32 h-32"
  };

  const logoSrc = withText ? dovieLogoTextPath : dovieLogoPath;

  return (
    <div className={cn(
      "flex items-center justify-center",
      withText ? "w-auto h-auto" : sizeClasses[size],
      animated && "animate-pulse",
      className
    )}>
      <img 
        src={logoSrc} 
        alt="Dovie Logo" 
        className={withText ? "h-20 w-auto object-contain" : "w-full h-full object-contain"}
      />
    </div>
  );
}
