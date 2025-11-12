import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Heart, Smile, ThumbsUp, Laugh, Frown, Angry } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";

interface MessageReaction {
  id: number;
  messageId: number;
  userId: number;
  emoji: string;
  emojiName: string;
  createdAt: string;
}

interface EmojiSuggestion {
  emoji: string;
  name: string;
  confidence: number;
}

interface MessageReactionButtonProps {
  messageId: number;
  chatRoomId: number;
  currentUserId: number;
  className?: string;
}

const defaultEmojis = [
  { emoji: "😊", name: "smile", icon: Smile },
  { emoji: "👍", name: "thumbs_up", icon: ThumbsUp },
  { emoji: "😂", name: "laugh", icon: Laugh },
  { emoji: "😢", name: "sad", icon: Frown },
  { emoji: "😠", name: "angry", icon: Angry },
];

export const MessageReactionButton: React.FC<MessageReactionButtonProps> = ({
  messageId,
  chatRoomId,
  currentUserId,
  className = ''
}) => {
  const queryClient = useQueryClient();
  const [showReactions, setShowReactions] = useState(false);
  const [suggestedEmojis, setSuggestedEmojis] = useState<EmojiSuggestion[]>([]);

  // Fetch existing reactions for this message
  const { data: reactionsData } = useQuery({
    queryKey: [`/api/messages/${messageId}/reactions`],
    enabled: true,
  });

  // Fetch AI-powered emoji suggestions
  const { data: suggestionsData } = useQuery({
    queryKey: [`/api/messages/${messageId}/reaction-suggestions`],
    enabled: showReactions,
  });

  const reactions: MessageReaction[] = reactionsData?.reactions || [];
  
  // Group reactions by emoji
  const reactionGroups = reactions.reduce((groups, reaction) => {
    if (!groups[reaction.emoji]) {
      groups[reaction.emoji] = [];
    }
    groups[reaction.emoji].push(reaction);
    return groups;
  }, {} as Record<string, MessageReaction[]>);

  // Check if current user has reacted with specific emoji
  const getUserReaction = (emoji: string) => {
    return reactions.find(r => r.userId === currentUserId && r.emoji === emoji);
  };

  // Add reaction mutation
  const addReactionMutation = useMutation({
    mutationFn: async ({ emoji, emojiName }: { emoji: string; emojiName: string }) => {
      const response = await apiRequest(`/api/messages/${messageId}/react`, "POST", {
        emoji,
        emojiName
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: [`/api/messages/${messageId}/reactions`] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ["/api/chat-rooms", chatRoomId, "messages"] 
      });
    }
  });

  // Remove reaction mutation
  const removeReactionMutation = useMutation({
    mutationFn: async (emoji: string) => {
      const response = await apiRequest(`/api/messages/${messageId}/react`, "DELETE", {
        emoji
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: [`/api/messages/${messageId}/reactions`] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ["/api/chat-rooms", chatRoomId, "messages"] 
      });
    }
  });

  // Update suggested emojis when suggestions data changes
  useEffect(() => {
    if (suggestionsData?.suggestions) {
      setSuggestedEmojis(suggestionsData.suggestions);
    }
  }, [suggestionsData]);

  const handleReactionClick = (emoji: string, emojiName: string) => {
    const existingReaction = getUserReaction(emoji);
    
    if (existingReaction) {
      removeReactionMutation.mutate(emoji);
    } else {
      addReactionMutation.mutate({ emoji, emojiName });
    }
  };

  const handleToggleReactions = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowReactions(!showReactions);
  };

  // Combine suggested emojis with default emojis, prioritizing suggestions
  const availableEmojis = suggestedEmojis.length > 0 
    ? [...suggestedEmojis.slice(0, 3), ...defaultEmojis.slice(0, 3)]
    : defaultEmojis;

  const totalReactions = reactions.length;
  const hasUserReacted = reactions.some(r => r.userId === currentUserId);

  return (
    <div className={cn("relative", className)}>
      {/* Main reaction button */}
      <button
        onClick={handleToggleReactions}
        className={cn(
          "flex items-center gap-1 px-2 py-1 rounded-full text-xs transition-all duration-200",
          "hover:bg-gray-100 dark:hover:bg-gray-700",
          hasUserReacted 
            ? "text-purple-500 bg-purple-50 dark:bg-purple-900/20" 
            : "text-gray-500 hover:text-purple-500",
          (addReactionMutation.isPending || removeReactionMutation.isPending) && "opacity-70"
        )}
      >
        <Heart 
          className={cn(
            "h-3 w-3 transition-transform duration-200",
            hasUserReacted ? "fill-current scale-110" : "hover:scale-110"
          )} 
        />
        {totalReactions > 0 && (
          <span className="font-medium">
            {totalReactions}
          </span>
        )}
      </button>

      {/* Reaction picker popup */}
      {showReactions && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setShowReactions(false)}
          />
          
          {/* Reaction popup */}
          <div className="absolute bottom-full left-0 mb-2 z-50 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-2">
            <div className="flex items-center gap-1">
              {availableEmojis.map((emojiData) => {
                const emoji = 'emoji' in emojiData ? emojiData.emoji : emojiData.emoji;
                const name = 'name' in emojiData ? emojiData.name : emojiData.emojiName || emojiData.name;
                const userReaction = getUserReaction(emoji);
                const reactionCount = reactionGroups[emoji]?.length || 0;
                
                return (
                  <button
                    key={emoji}
                    onClick={() => handleReactionClick(emoji, name)}
                    className={cn(
                      "flex flex-col items-center gap-1 p-2 rounded-lg transition-all duration-200",
                      "hover:bg-gray-100 dark:hover:bg-gray-700",
                      userReaction 
                        ? "bg-purple-50 dark:bg-purple-900/20 ring-1 ring-purple-200 dark:ring-purple-700" 
                        : ""
                    )}
                    title={`${name}${reactionCount > 0 ? ` (${reactionCount})` : ''}`}
                  >
                    <span className="text-lg">{emoji}</span>
                    {reactionCount > 0 && (
                      <span className="text-xs text-gray-500 font-medium">
                        {reactionCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            
            {/* AI suggestion indicator */}
            {suggestedEmojis.length > 0 && (
              <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-600">
                <div className="text-xs text-gray-500 text-center">
                  🤖 AI 추천 반응
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Display active reactions */}
      {Object.keys(reactionGroups).length > 0 && (
        <div className="flex items-center gap-1 mt-1">
          {Object.entries(reactionGroups).slice(0, 3).map(([emoji, reactionList]) => (
            <button
              key={emoji}
              onClick={() => {
                const emojiData = availableEmojis.find(e => 
                  ('emoji' in e ? e.emoji : e.emoji) === emoji
                );
                const name = emojiData ? 
                  ('name' in emojiData ? emojiData.name : emojiData.emojiName || emojiData.name) : 
                  'reaction';
                handleReactionClick(emoji, name);
              }}
              className={cn(
                "flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs",
                "bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600",
                "transition-colors duration-200",
                getUserReaction(emoji) && "ring-1 ring-purple-300 dark:ring-purple-600"
              )}
            >
              <span>{emoji}</span>
              <span className="text-gray-600 dark:text-gray-300 font-medium">
                {reactionList.length}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default MessageReactionButton;