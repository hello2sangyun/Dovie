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

  const textSizeClasses = {
    sm: "text-sm",
    md: "text-lg",
    lg: "text-xl", 
    xl: "text-3xl"
  };

  return (
    <div className={cn("relative", sizeClasses[size], className)}>
      <div className={cn(
        "absolute inset-0 purple-gradient rounded-full",
        animated && "animate-pulse-purple"
      )} />
      <div className="absolute inset-2 bg-white rounded-full flex items-center justify-center">
        <span className={cn(
          "font-bold bg-gradient-to-r from-purple-500 to-purple-700 bg-clip-text text-transparent",
          textSizeClasses[size]
        )}>
          V
        </span>
      </div>
    </div>
  );
}
