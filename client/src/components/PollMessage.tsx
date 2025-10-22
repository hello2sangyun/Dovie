import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { BarChart3 } from "lucide-react";

interface PollMessageProps {
  pollData: {
    question: string;
    options: string[];
    duration: number;
    createdAt: string;
    expiresAt: string;
  };
  isMe: boolean;
  onVote?: (optionIndex: number) => void;
  userVote?: number | null;
  voteResults?: { [key: number]: number };
  timestamp?: string;
}

export default function PollMessage({ 
  pollData, 
  isMe, 
  onVote, 
  userVote, 
  voteResults = {},
  timestamp
}: PollMessageProps) {
  const [selectedOption, setSelectedOption] = useState<number | null>(userVote || null);

  const handleVote = (optionIndex: number) => {
    if (selectedOption === optionIndex) {
      // 이미 선택된 옵션을 다시 클릭하면 선택 해제
      setSelectedOption(null);
      onVote?.(optionIndex);
    } else {
      setSelectedOption(optionIndex);
      onVote?.(optionIndex);
    }
  };

  const totalVotes = Object.values(voteResults).reduce((sum, count) => sum + count, 0);
  const isExpired = new Date() > new Date(pollData.expiresAt);

  const getTimeRemaining = () => {
    const now = new Date();
    const expires = new Date(pollData.expiresAt);
    const diff = expires.getTime() - now.getTime();
    
    if (diff <= 0) return "투표 종료";
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}일 ${hours % 24}시간 남음`;
    if (hours > 0) return `${hours}시간 남음`;
    return "1시간 미만 남음";
  };

  return (
    <div className={cn(
      "w-full max-w-sm space-y-3 p-4 rounded-lg border",
      isMe 
        ? "bg-purple-600 text-white border-purple-600" 
        : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
    )}>
      {/* 투표 제목 */}
      <div className="flex items-center space-x-2">
        <BarChart3 className={cn(
          "h-4 w-4",
          isMe ? "text-white" : "text-purple-600"
        )} />
        <h3 className={cn(
          "font-medium text-sm",
          isMe ? "text-white" : "text-gray-900 dark:text-gray-100"
        )}>
          {pollData.question}
        </h3>
      </div>

      {/* 투표 옵션 */}
      <div className="space-y-2">
        {pollData.options.map((option, index) => {
          const voteCount = voteResults[index] || 0;
          const percentage = totalVotes > 0 ? (voteCount / totalVotes) * 100 : 0;
          const isSelected = selectedOption === index;

          return (
            <Button
              key={index}
              variant="ghost"
              className={cn(
                "w-full justify-start p-3 h-auto relative overflow-hidden",
                isMe 
                  ? "text-white hover:bg-white/10" 
                  : "text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700",
                isSelected && !isMe && "bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700",
                isSelected && isMe && "bg-white/20",
                isExpired && "cursor-not-allowed opacity-70"
              )}
              onClick={() => !isExpired && handleVote(index)}
              disabled={isExpired}
            >
              {/* 투표 결과 배경 바 */}
              {totalVotes > 0 && (
                <div 
                  className={cn(
                    "absolute left-0 top-0 h-full transition-all duration-300",
                    isMe ? "bg-white/20" : "bg-purple-100 dark:bg-purple-900/30"
                  )}
                  style={{ width: `${percentage}%` }}
                />
              )}
              
              {/* 선택 표시 */}
              <div className={cn(
                "w-4 h-4 rounded-full border-2 mr-3 flex-shrink-0 relative z-10",
                isSelected 
                  ? (isMe ? "bg-white border-white" : "bg-purple-600 border-purple-600")
                  : (isMe ? "border-white" : "border-gray-300 dark:border-gray-600")
              )}>
                {isSelected && (
                  <div className={cn(
                    "w-2 h-2 rounded-full absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2",
                    isMe ? "bg-purple-600" : "bg-white"
                  )} />
                )}
              </div>
              
              {/* 옵션 텍스트 및 결과 */}
              <div className="flex-1 relative z-10 text-left">
                <div className="flex items-center justify-between">
                  <span className="text-sm">{option}</span>
                  {totalVotes > 0 && (
                    <span className={cn(
                      "text-xs ml-2",
                      isMe ? "text-white/80" : "text-gray-500 dark:text-gray-400"
                    )}>
                      {voteCount}표 ({Math.round(percentage)}%)
                    </span>
                  )}
                </div>
              </div>
            </Button>
          );
        })}
      </div>

      {/* 투표 정보 */}
      <div className={cn(
        "text-xs flex items-center justify-between pt-2 border-t",
        isMe 
          ? "text-white/80 border-white/20" 
          : "text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700"
      )}>
        <span>{totalVotes}명 참여</span>
        <span>{getTimeRemaining()}</span>
      </div>

      {/* 타임스탬프 */}
      {timestamp && (
        <div className={cn(
          "text-[10px] text-right",
          isMe ? "text-white/60" : "text-gray-500"
        )}>
          {timestamp}
        </div>
      )}
    </div>
  );
}