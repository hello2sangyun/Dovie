import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface PrismAvatarProps {
  src?: string;
  alt?: string;
  fallback: string;
  hasNewPost?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function PrismAvatar({ 
  src, 
  alt, 
  fallback, 
  hasNewPost = false, 
  size = 'md',
  className = '' 
}: PrismAvatarProps) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16'
  };

  const prismSize = {
    sm: 'w-10 h-10',
    md: 'w-14 h-14', 
    lg: 'w-18 h-18'
  };

  return (
    <div className="relative">
      {hasNewPost && (
        <div 
          className={`absolute -inset-1 ${prismSize[size]} rounded-full prism-border`}
        />
      )}
      <Avatar className={`${sizeClasses[size]} ${className} relative z-10 border-2 border-white`}>
        <AvatarImage src={src} alt={alt} />
        <AvatarFallback className="bg-gray-100 text-gray-700 font-semibold text-sm">
          {fallback}
        </AvatarFallback>
      </Avatar>
    </div>
  );
}