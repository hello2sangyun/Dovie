import { useState, useRef, useEffect } from "react";
import { motion, PanInfo, useAnimation, AnimatePresence } from "framer-motion";
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
    text: '웃겨요',
    icon: Smile,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100'
  }
];

const quickTextReplies = [
  "네, 알겠습니다",
  "감사합니다",
  "좋아요!",
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
  const [dragOffset, setDragOffset] = useState(0);
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [selectedReply, setSelectedReply] = useState<string | null>(null);
  const constraintsRef = useRef<HTMLDivElement>(null);
  const controls = useAnimation();

  const handleDragStart = () => {
    setShowQuickReplies(false);
  };

  const handleDrag = (_: any, info: PanInfo) => {
    const offset = info.offset.x;
    setDragOffset(offset);
    
    // Show quick replies when dragging left significantly
    if (offset < -60 && !showQuickReplies) {
      setShowQuickReplies(true);
    } else if (offset > -30 && showQuickReplies) {
      setShowQuickReplies(false);
    }
  };

  const handleDragEnd = (_: any, info: PanInfo) => {
    const offset = info.offset.x;
    const velocity = info.velocity.x;
    
    // Swipe left for quick replies
    if (offset < -100 || velocity < -500) {
      setShowQuickReplies(true);
      controls.start({ x: -120 });
    }
    // Swipe right for reply
    else if (offset > 100 || velocity > 500) {
      onSwipeReply(messageId);
      controls.start({ x: 0 });
    }
    // Return to center
    else {
      setShowQuickReplies(false);
      controls.start({ x: 0 });
    }
    
    setDragOffset(0);
  };

  const handleQuickReply = (option: QuickReplyOption) => {
    onQuickReply(messageId, option.emoji, 'reaction');
    setShowQuickReplies(false);
    controls.start({ x: 0 });
  };

  const handleTextReply = (text: string) => {
    onQuickReply(messageId, text, 'text');
    setShowQuickReplies(false);
    controls.start({ x: 0 });
  };

  const opacity = Math.max(0, Math.min(1, Math.abs(dragOffset) / 100));

  return (
    <div ref={constraintsRef} className={cn("relative overflow-hidden", className)}>
      {/* Quick Reply Actions Background */}
      <div className="absolute inset-0 flex items-center justify-end pr-4 space-x-2">
        {/* Reply Icon (Right Swipe) */}
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ 
            scale: dragOffset > 60 ? 1 : 0,
            opacity: dragOffset > 60 ? 1 : 0
          }}
          className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center"
        >
          <Reply className="w-4 h-4 text-purple-600" />
        </motion.div>

        {/* Quick Reaction Options (Left Swipe) */}
        <AnimatePresence>
          {showQuickReplies && (
            <motion.div
              initial={{ x: 100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 100, opacity: 0 }}
              className="flex items-center space-x-1"
            >
              {quickReplyOptions.map((option) => (
                <motion.button
                  key={option.id}
                  onClick={() => handleQuickReply(option)}
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center transition-all hover:scale-110",
                    option.bgColor
                  )}
                  whileTap={{ scale: 0.9 }}
                >
                  <span className="text-sm">{option.emoji}</span>
                </motion.button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Message Content */}
      <motion.div
        drag="x"
        dragConstraints={constraintsRef}
        dragElastic={0.2}
        animate={controls}
        onDragStart={handleDragStart}
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
        className="relative z-10 bg-white"
        style={{
          background: dragOffset !== 0 ? `rgba(255, 255, 255, ${1 - opacity * 0.1})` : undefined
        }}
      >
        {children}
      </motion.div>

      {/* Quick Text Replies Modal */}
      <AnimatePresence>
        {showQuickReplies && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-full left-0 right-0 mb-2 p-3 bg-white rounded-lg shadow-lg border border-gray-200 z-20"
          >
            <div className="flex flex-wrap gap-2">
              {quickTextReplies.map((text, index) => (
                <button
                  key={index}
                  onClick={() => handleTextReply(text)}
                  className="px-3 py-1.5 bg-gray-100 hover:bg-purple-100 rounded-full text-sm text-gray-700 hover:text-purple-700 transition-colors"
                >
                  {text}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}