import dovieLogo from "@assets/dovie_logo_transparent.png";
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
    <div className={cn(
      "flex items-center justify-center",
      sizeClasses[size],
      animated && "animate-pulse",
      className
    )}>
      <img 
        src={dovieLogo} 
        alt="Dovie Messenger" 
        className="w-full h-full object-contain"
      />
    </div>
  );
}
