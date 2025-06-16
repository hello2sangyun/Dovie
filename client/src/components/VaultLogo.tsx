import { cn } from "@/lib/utils";
import dovieLogo from "@assets/dovie_logo_transparent.png";

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
    <img
      src={dovieLogo}
      alt="Dovie Messenger"
      className={cn(
        sizeClasses[size],
        "object-contain",
        animated && "animate-pulse",
        className
      )}
    />
  );
}
