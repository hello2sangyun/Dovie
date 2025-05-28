import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { BarChart3, Clock, Users } from "lucide-react";
import { cn } from "@/lib/utils";

interface PollBannerProps {
  pollData: {
    question: string;
    options: string[];
    duration: number;
    createdAt: string;
    expiresAt: string;
  };
  voteResults?: { [key: number]: number };
  totalParticipants?: number;
  userVote?: number | null;
  onClick: () => void;
}

export default function PollBanner({ 
  pollData, 
  voteResults = {}, 
  totalParticipants = 1,
  userVote,
  onClick 
}: PollBannerProps) {
  const totalVotes = Object.values(voteResults).reduce((sum, count) => sum + count, 0);
  const isExpired = new Date() > new Date(pollData.expiresAt);
  const hasVoted = userVote !== null && userVote !== undefined;
  const participationRate = Math.round((totalVotes / totalParticipants) * 100);

  const getTimeRemaining = () => {
    const now = new Date();
    const expires = new Date(pollData.expiresAt);
    const diff = expires.getTime() - now.getTime();
    
    if (diff <= 0) return "종료";
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}일 ${hours % 24}시간`;
    if (hours > 0) return `${hours}시간`;
    return "1시간 미만";
  };

  const getStatusColor = () => {
    if (isExpired) return "bg-gray-100 border-gray-200";
    if (participationRate === 100) return "bg-green-50 border-green-200";
    if (hasVoted) return "bg-blue-50 border-blue-200";
    return "bg-purple-50 border-purple-200";
  };

  const getStatusIcon = () => {
    if (isExpired) return "text-gray-500";
    if (participationRate === 100) return "text-green-600";
    if (hasVoted) return "text-blue-600";
    return "text-purple-600";
  };

  return (
    <Button
      variant="ghost"
      className={cn(
        "w-full p-4 h-auto border-2 rounded-lg cursor-pointer hover:shadow-md transition-all",
        getStatusColor()
      )}
      onClick={onClick}
    >
      <div className="w-full space-y-3">
        {/* 헤더 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <BarChart3 className={cn("h-4 w-4", getStatusIcon())} />
            <span className="font-medium text-gray-900 text-left">
              {pollData.question}
            </span>
          </div>
          <div className="flex items-center space-x-3 text-xs text-gray-500">
            <div className="flex items-center space-x-1">
              <Users className="h-3 w-3" />
              <span>{participationRate}%</span>
            </div>
            <div className="flex items-center space-x-1">
              <Clock className="h-3 w-3" />
              <span>{getTimeRemaining()}</span>
            </div>
          </div>
        </div>

        {/* 진행률 바 */}
        <div className="space-y-1">
          <Progress value={participationRate} className="h-2" />
          <div className="flex justify-between text-xs text-gray-500">
            <span>{totalVotes}/{totalParticipants}명 참여</span>
            <span>
              {hasVoted ? "✓ 투표 완료" : isExpired ? "종료됨" : "투표 필요"}
            </span>
          </div>
        </div>
      </div>
    </Button>
  );
}