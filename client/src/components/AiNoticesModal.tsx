import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { Bell, Calendar, Clock, AlertCircle, CheckCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";

interface AiNotice {
  id: number;
  chatRoomId: number;
  messageId: number;
  userId: number;
  noticeType: string;
  content: string;
  metadata: any;
  isRead: boolean;
  createdAt: string;
}

interface AiNoticesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chatRoomId: number;
  onNoticeClick?: (messageId: number) => void;
}

export default function AiNoticesModal({ open, onOpenChange, chatRoomId, onNoticeClick }: AiNoticesModalProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: notices = [], isLoading } = useQuery<AiNotice[]>({
    queryKey: ["/api/chat-rooms", chatRoomId, "ai-notices"],
    enabled: open && !!user,
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (noticeId: number) => {
      await apiRequest(`/api/ai-notices/${noticeId}/read`, "POST");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat-rooms", chatRoomId, "ai-notices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ai-notices/unread-count"] });
    },
  });

  const handleNoticeClick = (notice: AiNotice) => {
    if (!notice.isRead) {
      markAsReadMutation.mutate(notice.id);
    }
    if (onNoticeClick) {
      onNoticeClick(notice.messageId);
    }
  };

  const getNoticeIcon = (type: string) => {
    switch (type) {
      case 'appointment':
        return <Calendar className="h-5 w-5 text-blue-600" />;
      case 'schedule':
        return <Clock className="h-5 w-5 text-purple-600" />;
      case 'important':
        return <AlertCircle className="h-5 w-5 text-orange-600" />;
      default:
        return <Bell className="h-5 w-5 text-gray-600" />;
    }
  };

  const getNoticeTypeLabel = (type: string) => {
    switch (type) {
      case 'appointment':
        return '약속';
      case 'schedule':
        return '일정';
      case 'important':
        return '중요';
      default:
        return '알림';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Bell className="h-5 w-5 text-purple-600" />
            <span>AI 스마트 알림</span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-3 pr-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            </div>
          ) : notices.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Bell className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p className="text-sm">알림이 없습니다</p>
              <p className="text-xs mt-1 text-gray-400">
                AI가 약속, 일정, 중요한 정보를 자동으로 감지합니다
              </p>
            </div>
          ) : (
            notices.map((notice) => (
              <div
                key={notice.id}
                data-testid={`ai-notice-${notice.id}`}
                onClick={() => handleNoticeClick(notice)}
                className={cn(
                  "p-4 rounded-lg border transition-all cursor-pointer hover:shadow-md",
                  notice.isRead
                    ? "bg-white border-gray-200"
                    : "bg-purple-50 border-purple-200 shadow-sm"
                )}
              >
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 mt-0.5">
                    {getNoticeIcon(notice.noticeType)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className={cn(
                        "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
                        notice.noticeType === 'appointment' && "bg-blue-100 text-blue-800",
                        notice.noticeType === 'schedule' && "bg-purple-100 text-purple-800",
                        notice.noticeType === 'important' && "bg-orange-100 text-orange-800",
                        !['appointment', 'schedule', 'important'].includes(notice.noticeType) && "bg-gray-100 text-gray-800"
                      )}>
                        {getNoticeTypeLabel(notice.noticeType)}
                      </span>
                      {!notice.isRead && (
                        <span className="w-2 h-2 bg-purple-600 rounded-full"></span>
                      )}
                    </div>
                    <p className="text-sm text-gray-900 leading-relaxed mb-1">
                      {notice.content}
                    </p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-gray-500">
                        {formatDistanceToNow(new Date(notice.createdAt), { 
                          addSuffix: true,
                          locale: ko 
                        })}
                      </span>
                      {notice.isRead && (
                        <CheckCircle className="h-3 w-3 text-green-600" />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="flex justify-end pt-3 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            data-testid="button-close-ai-notices"
          >
            닫기
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
