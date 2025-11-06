import { cn } from "@/lib/utils";

interface GestureQuickReplyProps {
  messageId: number;
  onQuickReply: (messageId: number, content: string, type: 'reaction' | 'text') => void;
  onSwipeReply: (messageId: number) => void;
  children: React.ReactNode;
  className?: string;
}

export default function GestureQuickReply({
  children,
  className
}: GestureQuickReplyProps) {
  return (
    <div className={cn("relative", className)}>
      {children}
    </div>
  );
}
