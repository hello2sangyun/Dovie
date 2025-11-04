import React, { useState } from 'react';
import { Heart } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { cn } from '@/lib/utils';

interface MessageLikeButtonProps {
  messageId: number;
  chatRoomId: number;
  isLiked: boolean;
  likeCount: number;
  className?: string;
}

export const MessageLikeButton: React.FC<MessageLikeButtonProps> = ({
  messageId,
  chatRoomId,
  isLiked,
  likeCount,
  className = ''
}) => {
  const queryClient = useQueryClient();
  const [optimisticLiked, setOptimisticLiked] = useState(isLiked);
  const [optimisticCount, setOptimisticCount] = useState(likeCount);

  const likeMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest(`/api/messages/${messageId}/like`, "POST");
      return response.json();
    },
    onMutate: () => {
      // Optimistic update
      setOptimisticLiked(!optimisticLiked);
      setOptimisticCount(prev => optimisticLiked ? prev - 1 : prev + 1);
    },
    onSuccess: () => {
      // Invalidate messages to get updated like status
      queryClient.invalidateQueries({ 
        queryKey: [`/api/chat-rooms/${chatRoomId}/messages`] 
      });
    },
    onError: () => {
      // Revert optimistic update on error
      setOptimisticLiked(isLiked);
      setOptimisticCount(likeCount);
    }
  });

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    likeMutation.mutate();
  };

  return (
    <button
      onClick={handleLike}
      disabled={likeMutation.isPending}
      className={cn(
        "flex items-center gap-1 px-2 py-1 rounded-full text-xs transition-all duration-200",
        "hover:bg-gray-100 dark:hover:bg-gray-700",
        optimisticLiked 
          ? "text-red-500 bg-red-50 dark:bg-red-900/20" 
          : "text-gray-500 hover:text-red-500",
        likeMutation.isPending && "opacity-70",
        className
      )}
    >
      <Heart 
        className={cn(
          "h-3 w-3 transition-transform duration-200",
          optimisticLiked ? "fill-current scale-110" : "hover:scale-110"
        )} 
      />
      {optimisticCount > 0 && (
        <span className="font-medium">
          {optimisticCount}
        </span>
      )}
    </button>
  );
};

export default MessageLikeButton;