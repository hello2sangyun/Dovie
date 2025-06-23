import { useState } from "react";
import { Smile, ThumbsUp, Heart, Reply, Send } from "lucide-react";
import { cn } from "@/lib/utils";

interface QuickReplyOption {
  id: string;
  emoji: string;
  text: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
}

interface GestureQuickReplyProps {
  messageId: number;
  onQuickReply: (messageId: number, content: string, type: 'reaction' | 'text') => void;
  onSwipeReply: (messageId: number) => void;
  children: React.ReactNode;
  className?: string;
}

const quickReplyOptions: QuickReplyOption[] = [
  {
    id: 'thumbsup',
    emoji: '👍',
    text: '좋아요',
    icon: ThumbsUp,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100'
  },
  {
    id: 'heart',
    emoji: '❤️',
    text: '사랑해요',
    icon: Heart,
    color: 'text-red-600',
    bgColor: 'bg-red-100'
  },
  {
    id: 'smile',
    emoji: '😊',
    text: '웃어요',
    icon: Smile,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100'
  }
];

const quickTextReplies = [
  "네, 알겠습니다",
  "감사합니다",
  "좋은 생각이에요",
  "괜찮습니다",
  "나중에 얘기해요"
];

export default function GestureQuickReply({
  messageId,
  onQuickReply,
  onSwipeReply,
  children,
  className
}: GestureQuickReplyProps) {
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [selectedReply, setSelectedReply] = useState<string | null>(null);

  const handleQuickReply = (content: string, type: 'reaction' | 'text') => {
    onQuickReply(messageId, content, type);
    setShowQuickReplies(false);
    setSelectedReply(null);
  };

  const handleReplyClick = () => {
    onSwipeReply(messageId);
  };

  return (
    <div className={cn("relative", className)}>
      <div className="flex items-center gap-2">
        {children}
        
        {/* Quick action buttons - simplified without animations */}
        <div className="flex gap-1 opacity-0 hover:opacity-100 transition-opacity">
          <button
            onClick={() => setShowQuickReplies(!showQuickReplies)}
            className="p-1 rounded-full hover:bg-gray-100 transition-colors"
            title="빠른 답변"
          >
            <Smile className="h-4 w-4 text-gray-500" />
          </button>
          <button
            onClick={handleReplyClick}
            className="p-1 rounded-full hover:bg-gray-100 transition-colors"
            title="답장"
          >
            <Reply className="h-4 w-4 text-gray-500" />
          </button>
        </div>
      </div>

      {/* Quick replies panel - simplified without motion effects */}
      {showQuickReplies && (
        <div className="absolute top-0 right-0 bg-white rounded-lg shadow-lg border p-2 z-10 min-w-48">
          <div className="space-y-2">
            {/* Reaction options */}
            <div className="flex gap-1">
              {quickReplyOptions.map((option) => (
                <button
                  key={option.id}
                  onClick={() => handleQuickReply(option.emoji, 'reaction')}
                  className={cn(
                    "flex items-center gap-1 px-2 py-1 rounded-md text-xs transition-colors",
                    option.bgColor,
                    option.color,
                    "hover:opacity-80"
                  )}
                >
                  <option.icon className="h-3 w-3" />
                  <span>{option.emoji}</span>
                </button>
              ))}
            </div>

            {/* Text reply options */}
            <div className="space-y-1 pt-2 border-t">
              {quickTextReplies.slice(0, 3).map((reply, index) => (
                <button
                  key={index}
                  onClick={() => handleQuickReply(reply, 'text')}
                  className="block w-full text-left px-2 py-1 text-xs rounded-md hover:bg-gray-100 transition-colors"
                >
                  {reply}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}