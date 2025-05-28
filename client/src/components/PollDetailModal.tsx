import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { BarChart3, Clock, Users, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface PollDetailModalProps {
  open: boolean;
  onClose: () => void;
  pollData: {
    question: string;
    options: string[];
    duration: number;
    createdAt: string;
    expiresAt: string;
  };
  userVote?: number | null;
  voteResults?: { [key: number]: number };
  totalParticipants?: number;
  onVote?: (optionIndex: number) => void;
}

export default function PollDetailModal({ 
  open, 
  onClose, 
  pollData, 
  userVote, 
  voteResults = {}, 
  totalParticipants = 1,
  onVote 
}: PollDetailModalProps) {
  const [selectedOption, setSelectedOption] = useState<number | null>(userVote || null);

  const totalVotes = Object.values(voteResults).reduce((sum, count) => sum + count, 0);
  const isExpired = new Date() > new Date(pollData.expiresAt);
  const hasVoted = userVote !== null && userVote !== undefined;

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

  const handleVote = () => {
    if (selectedOption !== null && !hasVoted && !isExpired) {
      onVote?.(selectedOption);
      onClose();
    }
  };

  const getParticipationRate = () => {
    return Math.round((totalVotes / totalParticipants) * 100);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <BarChart3 className="h-5 w-5 text-purple-600" />
            <span>투표 상세</span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* 투표 질문 */}
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {pollData.question}
            </h3>
          </div>

          {/* 투표 상태 정보 */}
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="space-y-1">
              <div className="flex items-center justify-center">
                <Users className="h-4 w-4 text-blue-500 mr-1" />
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">참여율</span>
              </div>
              <div className="text-lg font-bold text-blue-600">{getParticipationRate()}%</div>
              <div className="text-xs text-gray-500">{totalVotes}/{totalParticipants}명</div>
            </div>
            
            <div className="space-y-1">
              <div className="flex items-center justify-center">
                <Clock className="h-4 w-4 text-orange-500 mr-1" />
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">남은 시간</span>
              </div>
              <div className="text-sm font-bold text-orange-600">{getTimeRemaining()}</div>
            </div>
            
            <div className="space-y-1">
              <div className="flex items-center justify-center">
                <CheckCircle className="h-4 w-4 text-green-500 mr-1" />
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">내 투표</span>
              </div>
              <div className="text-sm font-bold text-green-600">
                {hasVoted ? "완료" : "미완료"}
              </div>
            </div>
          </div>

          {/* 투표 옵션들 */}
          <div className="space-y-3">
            <h4 className="font-medium text-gray-900 dark:text-gray-100">투표 옵션</h4>
            {pollData.options.map((option, index) => {
              const voteCount = voteResults[index] || 0;
              const percentage = totalVotes > 0 ? (voteCount / totalVotes) * 100 : 0;
              const isSelected = selectedOption === index;
              const isMyVote = userVote === index;

              return (
                <div key={index} className="space-y-2">
                  <Button
                    variant="ghost"
                    className={cn(
                      "w-full justify-start p-4 h-auto relative",
                      isSelected && !hasVoted && "bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700",
                      isMyVote && "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700",
                      (isExpired || hasVoted) && "cursor-not-allowed"
                    )}
                    onClick={() => !hasVoted && !isExpired && setSelectedOption(index)}
                    disabled={isExpired || hasVoted}
                  >
                    {/* 선택 표시 */}
                    <div className={cn(
                      "w-4 h-4 rounded-full border-2 mr-3 flex-shrink-0",
                      isSelected && !hasVoted 
                        ? "bg-purple-600 border-purple-600" 
                        : isMyVote
                        ? "bg-green-600 border-green-600"
                        : "border-gray-300 dark:border-gray-600"
                    )}>
                      {(isSelected && !hasVoted) || isMyVote ? (
                        <div className="w-2 h-2 rounded-full bg-white absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
                      ) : null}
                    </div>
                    
                    {/* 옵션 텍스트 */}
                    <div className="flex-1 text-left">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{option}</span>
                        {isMyVote && (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                            내 선택
                          </span>
                        )}
                      </div>
                    </div>
                  </Button>
                  
                  {/* 투표 결과 바 */}
                  <div className="px-4">
                    <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                      <span>{voteCount}표</span>
                      <span>{Math.round(percentage)}%</span>
                    </div>
                    <Progress value={percentage} className="h-2" />
                  </div>
                </div>
              );
            })}
          </div>

          {/* 투표 버튼 */}
          {!hasVoted && !isExpired && (
            <Button 
              onClick={handleVote}
              disabled={selectedOption === null}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white"
            >
              투표하기
            </Button>
          )}

          {hasVoted && (
            <div className="text-center text-sm text-green-600 font-medium">
              ✓ 투표가 완료되었습니다
            </div>
          )}

          {isExpired && (
            <div className="text-center text-sm text-gray-500 font-medium">
              투표가 종료되었습니다
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}