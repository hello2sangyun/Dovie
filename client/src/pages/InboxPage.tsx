import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { useDebounce } from "@/hooks/useDebounce";
import { formatDistanceToNow, format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isSameDay, parseISO } from "date-fns";
import { ko } from "date-fns/locale";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter, DrawerClose } from "@/components/ui/drawer";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import {
  Calendar,
  Clock,
  AlertCircle,
  Bell,
  Info,
  MessageCircle,
  Trash2,
  Filter,
  Search,
  TrendingUp,
  X,
  Reply,
  MoreVertical,
  ChevronDown,
  Inbox as InboxIcon,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  Moon,
  Send,
} from "lucide-react";

interface AiNotice {
  id: number;
  chatRoomId: number;
  messageId: number | null;
  userId: number;
  noticeType: string;
  content: string;
  metadata: any;
  isRead: boolean;
  createdAt: string;
  priority: string | null;
  snoozedUntil: string | null;
  chatRoom?: {
    name: string;
    isGroup: boolean;
  };
  senderName?: string | null;
  senderUsername?: string | null;
  senderId?: number | null;
  senderProfilePicture?: string | null;
  originalMessage?: string | null;
  messageType?: string | null;
}

type ViewMode = "list" | "stats" | "calendar";
type NoticeType = "all" | "appointment" | "schedule" | "deadline" | "reminder" | "important_info" | "unanswered_message";
type PriorityFilter = "all" | "high" | "medium" | "low";

const NOTICE_TYPE_CONFIG = {
  appointment: { icon: Calendar, color: "text-purple-600", bg: "bg-purple-50", label: "약속" },
  schedule: { icon: Clock, color: "text-blue-600", bg: "bg-blue-50", label: "일정" },
  deadline: { icon: AlertCircle, color: "text-red-600", bg: "bg-red-50", label: "마감" },
  reminder: { icon: Bell, color: "text-orange-600", bg: "bg-orange-50", label: "리마인더" },
  important_info: { icon: Info, color: "text-green-600", bg: "bg-green-50", label: "중요정보" },
  unanswered_message: { icon: MessageCircle, color: "text-yellow-600", bg: "bg-yellow-50", label: "답장대기" },
};

export default function InboxPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [showSnoozed, setShowSnoozed] = useState(false);
  const [typeFilter, setTypeFilter] = useState<NoticeType>("all");
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  
  const [clearAllDialog, setClearAllDialog] = useState(false);
  const [quickReplyNotice, setQuickReplyNotice] = useState<AiNotice | null>(null);
  const [quickReplyText, setQuickReplyText] = useState("");
  
  // Multi-select states
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedNotices, setSelectedNotices] = useState<Set<number>>(new Set());
  
  // Message preview dialog
  const [previewNotice, setPreviewNotice] = useState<AiNotice | null>(null);
  
  // Detail drawer for reminder
  const [detailDrawerNotice, setDetailDrawerNotice] = useState<AiNotice | null>(null);

  // Swipe to delete states
  const [swipedNoticeId, setSwipedNoticeId] = useState<number | null>(null);
  const [lockedOpenNoticeId, setLockedOpenNoticeId] = useState<number | null>(null);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchCurrent, setTouchCurrent] = useState<number | null>(null);

  const debouncedSearch = useDebounce(searchTerm, 500);

  // Fetch all AI notices
  const { data: noticesData, isLoading } = useQuery<AiNotice[]>({
    queryKey: ["/api/ai-notices"],
    enabled: !!user,
  });

  // Search notices
  const { data: searchResults } = useQuery<AiNotice[]>({
    queryKey: ["/api/ai-notices/search", debouncedSearch],
    queryFn: async () => {
      if (!debouncedSearch) return [];
      const response = await apiRequest(`/api/ai-notices/search?q=${encodeURIComponent(debouncedSearch)}`, "GET");
      return response.json();
    },
    enabled: !!user && debouncedSearch.length > 0,
  });

  // Filter and process notices
  const { activeNotices, snoozedNotices, filteredNotices, calendarNotices } = useMemo(() => {
    const now = new Date();
    const notices = searchTerm ? (searchResults || []) : (noticesData || []);

    const active = notices.filter(n => !n.snoozedUntil || new Date(n.snoozedUntil) <= now);
    const snoozed = notices.filter(n => n.snoozedUntil && new Date(n.snoozedUntil) > now);

    let filtered = showSnoozed ? snoozed : active;

    // Type filter
    if (typeFilter !== "all") {
      filtered = filtered.filter(n => n.noticeType === typeFilter);
    }

    // Priority filter
    if (priorityFilter !== "all") {
      filtered = filtered.filter(n => n.priority === priorityFilter);
    }

    // Calendar notices (only appointment, schedule, deadline)
    const calendar = active.filter(n => 
      ["appointment", "schedule", "deadline"].includes(n.noticeType)
    );

    return {
      activeNotices: active,
      snoozedNotices: snoozed,
      filteredNotices: filtered,
      calendarNotices: calendar,
    };
  }, [noticesData, searchResults, searchTerm, showSnoozed, typeFilter, priorityFilter]);

  // Statistics
  const stats = useMemo(() => {
    const now = new Date();
    const weekStart = startOfWeek(now, { locale: ko });
    const weekEnd = endOfWeek(now, { locale: ko });
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    const thisWeek = activeNotices.filter(n => {
      const date = new Date(n.createdAt);
      return date >= weekStart && date <= weekEnd;
    }).length;

    const thisMonth = activeNotices.filter(n => {
      const date = new Date(n.createdAt);
      return date >= monthStart && date <= monthEnd;
    }).length;

    const unanswered = activeNotices.filter(n => n.noticeType === "unanswered_message").length;

    const byType = Object.keys(NOTICE_TYPE_CONFIG).reduce((acc, type) => {
      acc[type] = activeNotices.filter(n => n.noticeType === type).length;
      return acc;
    }, {} as Record<string, number>);

    return { thisWeek, thisMonth, unanswered, byType };
  }, [activeNotices]);

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async (noticeId: number) => {
      await apiRequest(`/api/ai-notices/${noticeId}/read`, "POST");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ai-notices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ai-notices/search"], exact: false });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (noticeId: number) => {
      await apiRequest(`/api/ai-notices/${noticeId}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ai-notices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ai-notices/search"], exact: false });
    },
  });

  // Bulk delete mutation
  const bulkDeleteMutation = useMutation({
    mutationFn: async (noticeIds: number[]) => {
      await Promise.all(
        noticeIds.map(id => apiRequest(`/api/ai-notices/${id}`, "DELETE"))
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ai-notices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ai-notices/search"], exact: false });
      setSelectedNotices(new Set());
      setSelectionMode(false);
    },
  });

  // Clear all mutation
  const clearAllMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("/api/ai-notices", "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ai-notices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ai-notices/search"], exact: false });
      setClearAllDialog(false);
    },
  });

  // Snooze mutation
  const snoozeMutation = useMutation({
    mutationFn: async ({ noticeId, minutes }: { noticeId: number; minutes: number }) => {
      await apiRequest(`/api/ai-notices/${noticeId}/snooze`, "PUT", { minutes });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ai-notices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ai-notices/search"], exact: false });
    },
  });

  // Quick reply mutation
  const quickReplyMutation = useMutation({
    mutationFn: async ({ chatRoomId, content, noticeId }: { chatRoomId: number; content: string; noticeId: number }) => {
      await apiRequest(`/api/chat-rooms/${chatRoomId}/messages`, "POST", {
        content,
        messageType: "text",
      });
      await apiRequest(`/api/ai-notices/${noticeId}/read`, "POST");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ai-notices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ai-notices/search"], exact: false });
      setQuickReplyNotice(null);
      setQuickReplyText("");
    },
  });

  const handleNoticeClick = (notice: AiNotice) => {
    if (selectionMode) {
      toggleNoticeSelection(notice.id);
    } else {
      // Mark as read when opening drawer (preserves original behavior)
      if (!notice.isRead) {
        markAsReadMutation.mutate(notice.id);
      }
      
      // Open detail drawer for more information
      setDetailDrawerNotice(notice);
    }
  };
  
  const handleGoToChat = (notice: AiNotice) => {
    // Close drawer
    setDetailDrawerNotice(null);
    
    // Navigate to chat room with message highlight
    if (notice.messageId) {
      setLocation(`/chat-rooms/${notice.chatRoomId}?highlight=${notice.messageId}`);
    } else {
      // If no specific message, just navigate to chat room
      setLocation(`/chat-rooms/${notice.chatRoomId}`);
    }
  };

  const toggleNoticeSelection = (noticeId: number) => {
    setSelectedNotices(prev => {
      const newSet = new Set(prev);
      if (newSet.has(noticeId)) {
        newSet.delete(noticeId);
      } else {
        newSet.add(noticeId);
      }
      return newSet;
    });
  };

  const toggleAllSelection = () => {
    if (selectedNotices.size === filteredNotices.length) {
      setSelectedNotices(new Set());
    } else {
      setSelectedNotices(new Set(filteredNotices.map(n => n.id)));
    }
  };

  const handleBulkDelete = () => {
    if (selectedNotices.size === 0) return;
    bulkDeleteMutation.mutate(Array.from(selectedNotices));
  };

  const handleSnooze = (noticeId: number, minutes: number) => {
    snoozeMutation.mutate({ noticeId, minutes });
  };

  const handleQuickReply = () => {
    if (!quickReplyNotice || !quickReplyText.trim()) return;
    quickReplyMutation.mutate({
      chatRoomId: quickReplyNotice.chatRoomId,
      content: quickReplyText,
      noticeId: quickReplyNotice.id,
    });
  };

  const getNoticeIcon = (type: string) => {
    const config = NOTICE_TYPE_CONFIG[type as keyof typeof NOTICE_TYPE_CONFIG];
    if (!config) return NOTICE_TYPE_CONFIG.reminder;
    return config;
  };

  const activeFilterCount = [
    typeFilter !== "all" ? 1 : 0,
    priorityFilter !== "all" ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  // Handle swipe gestures
  const handleTouchStart = (e: React.TouchEvent, noticeId: number) => {
    // Close any other open notice
    if (lockedOpenNoticeId !== null && lockedOpenNoticeId !== noticeId) {
      setLockedOpenNoticeId(null);
    }
    
    const touch = e.touches[0];
    setTouchStart(touch.clientX);
    setTouchCurrent(touch.clientX);
    setSwipedNoticeId(noticeId);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStart === null) return;
    const touch = e.touches[0];
    setTouchCurrent(touch.clientX);
  };

  const handleTouchEnd = () => {
    if (touchStart === null || touchCurrent === null || swipedNoticeId === null) return;
    
    const diff = touchStart - touchCurrent;
    
    // If swiped left more than 80px, lock the delete button open
    if (diff > 80) {
      setLockedOpenNoticeId(swipedNoticeId);
    } else {
      // Reset swipe if not enough distance
      setLockedOpenNoticeId(null);
    }
    
    setTouchStart(null);
    setTouchCurrent(null);
    setSwipedNoticeId(null);
  };

  const getSwipeTransform = (noticeId: number) => {
    // If this notice is locked open, show full swipe distance
    if (lockedOpenNoticeId === noticeId) return 100;
    
    // If currently swiping this notice, calculate transform
    if (swipedNoticeId === noticeId && touchStart !== null && touchCurrent !== null) {
      const diff = touchStart - touchCurrent;
      // Limit swipe distance to 100px
      return Math.min(Math.max(diff, 0), 100);
    }
    
    return 0;
  };

  // Render notice item - Compact version
  const renderNoticeItem = (notice: AiNotice) => {
    const config = getNoticeIcon(notice.noticeType);
    const Icon = config.icon;
    const senderDisplayName = notice.senderName || notice.senderUsername || "알 수 없음";
    const swipeDistance = getSwipeTransform(notice.id);
    const isSwipedFully = swipedNoticeId === notice.id && swipeDistance >= 80;

    return (
      <div
        key={notice.id}
        className="relative overflow-hidden rounded-lg"
        data-testid={`notice-container-${notice.id}`}
      >
        {/* Delete button revealed by swipe */}
        <div className="absolute right-0 top-0 bottom-0 w-[100px] bg-red-500 flex items-center justify-center rounded-lg">
          <button
            onClick={(e) => {
              e.stopPropagation();
              deleteMutation.mutate(notice.id);
              setLockedOpenNoticeId(null);
              setSwipedNoticeId(null);
            }}
            className="text-white font-semibold px-4"
            data-testid={`swipe-delete-${notice.id}`}
          >
            삭제
          </button>
        </div>

        <Card
          data-testid={`notice-${notice.id}`}
          className={cn(
            "p-2.5 transition-all hover:shadow-sm cursor-pointer relative overflow-hidden",
            !notice.isRead && "bg-gradient-to-r from-purple-50 via-purple-50/80 to-transparent border-purple-200 shadow-sm",
            !notice.isRead && "before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-purple-100/30 before:to-transparent before:animate-shimmer",
            selectedNotices.has(notice.id) && "border-purple-400 bg-purple-100"
          )}
          style={{
            transform: `translateX(-${swipeDistance}px)`,
            transition: touchStart === null ? 'transform 0.3s ease' : 'none',
            ...(notice.isRead ? {} : {
              boxShadow: "0 0 0 1px rgba(168, 85, 247, 0.1), 0 1px 3px rgba(168, 85, 247, 0.1)"
            })
          }}
          onClick={() => handleNoticeClick(notice)}
          onTouchStart={(e) => handleTouchStart(e, notice.id)}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div className="flex items-start gap-2">
          {selectionMode && (
            <input
              type="checkbox"
              checked={selectedNotices.has(notice.id)}
              onChange={() => toggleNoticeSelection(notice.id)}
              onClick={(e) => e.stopPropagation()}
              className="mt-1 h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              data-testid={`notice-checkbox-${notice.id}`}
            />
          )}
          
          <div className={cn("p-1.5 rounded-md flex-shrink-0", config.bg)}>
            <Icon className={cn("h-3.5 w-3.5", config.color)} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">
                {config.label}
              </Badge>
              {!notice.isRead && (
                <div className="w-1.5 h-1.5 bg-purple-600 rounded-full" />
              )}
            </div>

            <p className={cn("text-xs leading-snug mb-0.5", !notice.isRead && "font-semibold")}>
              {notice.content}
            </p>

            <div className="flex items-center justify-between mt-1">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-purple-600 font-medium">
                  {senderDisplayName}님
                </span>
                <span className="text-[10px] text-muted-foreground">
                  • {formatDistanceToNow(new Date(notice.createdAt), {
                    addSuffix: true,
                    locale: ko,
                  })}
                </span>
              </div>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 flex-shrink-0"
                data-testid={`notice-menu-${notice.id}`}
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  setPreviewNotice(notice);
                }}
                data-testid={`preview-notice-${notice.id}`}
              >
                <Info className="h-4 w-4 mr-2" />
                자세히 보기
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  setQuickReplyNotice(notice);
                }}
                data-testid={`quick-reply-${notice.id}`}
              >
                <Reply className="h-4 w-4 mr-2" />
                빠른 답장
              </DropdownMenuItem>

              <Separator className="my-1" />

              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  handleSnooze(notice.id, 30);
                }}
                data-testid={`snooze-30-${notice.id}`}
              >
                <Moon className="h-4 w-4 mr-2" />
                30분 후
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  handleSnooze(notice.id, 60);
                }}
                data-testid={`snooze-60-${notice.id}`}
              >
                <Moon className="h-4 w-4 mr-2" />
                1시간 후
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  handleSnooze(notice.id, 1440);
                }}
                data-testid={`snooze-tomorrow-${notice.id}`}
              >
                <Moon className="h-4 w-4 mr-2" />
                내일
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  handleSnooze(notice.id, 10080);
                }}
                data-testid={`snooze-next-week-${notice.id}`}
              >
                <Moon className="h-4 w-4 mr-2" />
                다음주
              </DropdownMenuItem>

              <Separator className="my-1" />

              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  deleteMutation.mutate(notice.id);
                }}
                className="text-red-600"
                data-testid={`delete-${notice.id}`}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                삭제
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </Card>
      </div>
    );
  };

  // Render stats view
  const renderStatsView = () => {
    const maxCount = Math.max(...Object.values(stats.byType));

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-100 rounded-lg">
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">이번 주</p>
                <p className="text-2xl font-bold">{stats.thisWeek}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 rounded-lg">
                <CalendarDays className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">이번 달</p>
                <p className="text-2xl font-bold">{stats.thisMonth}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-yellow-100 rounded-lg">
                <MessageCircle className="h-6 w-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">답장 대기</p>
                <p className="text-2xl font-bold">{stats.unanswered}</p>
              </div>
            </div>
          </Card>
        </div>

        <Card className="p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            유형별 분석
          </h3>
          <div className="space-y-3">
            {Object.entries(NOTICE_TYPE_CONFIG).map(([type, config]) => {
              const count = stats.byType[type] || 0;
              const percentage = maxCount > 0 ? (count / maxCount) * 100 : 0;
              const Icon = config.icon;

              return (
                <div key={type} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Icon className={cn("h-4 w-4", config.color)} />
                      <span>{config.label}</span>
                    </div>
                    <span className="font-semibold">{count}</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={cn("h-full transition-all duration-300", config.bg.replace("50", "300"))}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    );
  };

  // Render calendar view
  const renderCalendarView = () => {
    const dateNotices = selectedDate
      ? calendarNotices.filter(n => isSameDay(new Date(n.createdAt), selectedDate))
      : [];

    const datesWithNotices = calendarNotices.map(n => new Date(n.createdAt));

    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <CalendarComponent
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            locale={ko}
            modifiers={{
              hasNotice: datesWithNotices,
            }}
            modifiersClassNames={{
              hasNotice: "bg-purple-100 text-purple-900 font-semibold",
            }}
            className="rounded-md border"
          />
        </Card>

        <Card className="p-6">
          <h3 className="font-semibold mb-4">
            {selectedDate ? format(selectedDate, "yyyy년 M월 d일", { locale: ko }) : "날짜를 선택하세요"}
          </h3>
          <ScrollArea className="h-[400px]">
            {dateNotices.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CalendarDays className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p className="text-sm">
                  {selectedDate ? "이 날짜에 알림이 없습니다" : "달력에서 날짜를 선택하세요"}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {dateNotices.map(renderNoticeItem)}
              </div>
            )}
          </ScrollArea>
        </Card>
      </div>
    );
  };

  if (!user) {
    return null;
  }

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="flex-shrink-0 px-4 pt-[calc(1.7rem+env(safe-area-inset-top))] pb-3 border-b bg-white">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-gray-900">Smart Inbox</h2>
            <Badge variant="secondary" className="text-xs">
              {activeNotices.length}
            </Badge>
          </div>
          
          <div className="flex items-center gap-1.5">
            {/* View Mode Tabs */}
            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("list")}
              className="h-8 w-8 p-0"
              data-testid="tab-list"
            >
              <InboxIcon className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "stats" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("stats")}
              className="h-8 w-8 p-0"
              data-testid="tab-stats"
            >
              <BarChart3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "calendar" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("calendar")}
              className="h-8 w-8 p-0"
              data-testid="tab-calendar"
            >
              <CalendarDays className="h-4 w-4" />
            </Button>
            
            <Separator orientation="vertical" className="h-5 mx-1" />
            
            {/* Selection Mode Toggle */}
            <Button
              variant={selectionMode ? "default" : "ghost"}
              size="sm"
              onClick={() => {
                setSelectionMode(!selectionMode);
                if (selectionMode) setSelectedNotices(new Set());
              }}
              disabled={filteredNotices.length === 0}
              className="h-8 w-8 p-0"
              data-testid="button-selection-mode"
            >
              <CheckCircle2 className="h-4 w-4" />
            </Button>

            {/* Bulk Delete - Only show in selection mode */}
            {selectionMode && (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleBulkDelete}
                disabled={selectedNotices.size === 0}
                className="h-8 px-2"
                data-testid="button-bulk-delete"
              >
                <Trash2 className="h-4 w-4" />
                {selectedNotices.size > 0 && (
                  <span className="ml-1 text-xs">{selectedNotices.size}</span>
                )}
              </Button>
            )}
            
            {/* Clear All */}
            {!selectionMode && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setClearAllDialog(true)}
                disabled={activeNotices.length === 0}
                className="h-8 w-8 p-0"
                data-testid="button-clear-all"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
        
        {/* Search & Filters Row */}
        {viewMode === "list" && (
          <div className="flex items-center gap-2 mt-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                data-testid="input-search"
              />
            </div>
            
            <Button
              variant={showSnoozed ? "default" : "outline"}
              size="sm"
              onClick={() => setShowSnoozed(!showSnoozed)}
              className="h-8 w-8 p-0"
              data-testid="button-show-snoozed"
            >
              <Moon className="h-4 w-4" />
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 w-8 p-0" data-testid="filter-type">
                  <Filter className="h-4 w-4" />
                  {typeFilter !== "all" && <Badge className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-xs" variant="destructive">1</Badge>}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setTypeFilter("all")}>전체</DropdownMenuItem>
                {Object.entries(NOTICE_TYPE_CONFIG).map(([type, config]) => (
                  <DropdownMenuItem key={type} onClick={() => setTypeFilter(type as NoticeType)}>
                    {config.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            
            {activeFilterCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setTypeFilter("all");
                  setPriorityFilter("all");
                }}
                className="h-8 w-8 p-0"
                data-testid="button-clear-filters"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Main Content Area - Maximized */}
      <div className="flex-1 overflow-hidden">
        {viewMode === "list" && (
          <ScrollArea className="h-full">
            <div className="p-3">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" />
                </div>
              ) : filteredNotices.length === 0 ? (
                <div className="text-center py-12">
                  <InboxIcon className="h-12 w-12 mx-auto mb-3 text-purple-300" />
                  <h3 className="font-semibold text-sm mb-1">
                    {showSnoozed ? "스누즈된 알림이 없습니다" : "알림함이 비어있습니다"}
                  </h3>
                  <p className="text-muted-foreground text-xs">
                    AI가 중요한 정보를 감지하면 알려드립니다
                  </p>
                </div>
              ) : (
                <div className="space-y-2" data-testid="notices-list">
                  {filteredNotices.map(renderNoticeItem)}
                </div>
              )}
            </div>
          </ScrollArea>
        )}

        {viewMode === "stats" && (
          <ScrollArea className="h-full">
            <div className="p-3">
              {renderStatsView()}
            </div>
          </ScrollArea>
        )}

        {viewMode === "calendar" && (
          <ScrollArea className="h-full">
            <div className="p-3">
              {renderCalendarView()}
            </div>
          </ScrollArea>
        )}
      </div>

      {/* Clear All Confirmation Dialog */}
      <Dialog open={clearAllDialog} onOpenChange={setClearAllDialog}>
        <DialogContent data-testid="dialog-clear-all">
          <DialogHeader>
            <DialogTitle>모든 알림 삭제</DialogTitle>
            <DialogDescription>
              정말로 모든 알림을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setClearAllDialog(false)}
              data-testid="button-cancel-clear"
            >
              취소
            </Button>
            <Button
              variant="destructive"
              onClick={() => clearAllMutation.mutate()}
              disabled={clearAllMutation.isPending}
              data-testid="button-confirm-clear"
            >
              {clearAllMutation.isPending ? "삭제 중..." : "삭제"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quick Reply Dialog */}
      <Dialog open={!!quickReplyNotice} onOpenChange={() => setQuickReplyNotice(null)}>
        <DialogContent data-testid="dialog-quick-reply">
          <DialogHeader>
            <DialogTitle>빠른 답장</DialogTitle>
          </DialogHeader>

          {quickReplyNotice && (
            <div className="space-y-4">
              <Card className="p-4 bg-muted">
                <p className="text-sm">{quickReplyNotice.content}</p>
                {quickReplyNotice.chatRoom && (
                  <p className="text-xs text-muted-foreground mt-2">
                    {quickReplyNotice.chatRoom.name || "개인 채팅"}
                  </p>
                )}
              </Card>

              <Textarea
                placeholder="메시지를 입력하세요..."
                value={quickReplyText}
                onChange={(e) => setQuickReplyText(e.target.value)}
                rows={4}
                data-testid="textarea-quick-reply"
              />

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setQuickReplyNotice(null)}
                  data-testid="button-cancel-reply"
                >
                  취소
                </Button>
                <Button
                  onClick={handleQuickReply}
                  disabled={!quickReplyText.trim() || quickReplyMutation.isPending}
                  data-testid="button-send-reply"
                >
                  <Send className="h-4 w-4 mr-2" />
                  {quickReplyMutation.isPending ? "전송 중..." : "전송"}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Message Preview Dialog - Simplified */}
      <Dialog open={!!previewNotice} onOpenChange={() => setPreviewNotice(null)}>
        <DialogContent className="max-w-md p-0 gap-0" data-testid="dialog-message-preview">
          {previewNotice && (() => {
            const senderName = previewNotice.senderName || previewNotice.senderUsername || "";
            const displayName = senderName.trim() || "알 수 없음";
            const initial = senderName.trim() ? senderName.trim().charAt(0).toUpperCase() : "?";
            
            return (
              <>
                {/* Message Content */}
                <div className="p-6">
                  {/* Sender Info */}
                  <div className="flex items-center gap-3 mb-4">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={previewNotice.senderProfilePicture || undefined} />
                      <AvatarFallback className="bg-purple-100 text-purple-700 font-semibold">
                        {initial}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <h3 className="font-semibold text-base">
                        {displayName}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(previewNotice.createdAt), {
                          addSuffix: true,
                          locale: ko,
                        })}
                      </p>
                    </div>
                  </div>

                {/* Message */}
                {previewNotice.originalMessage && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">
                      {previewNotice.originalMessage}
                    </p>
                  </div>
                )}
              </div>

              {/* Action Bar */}
              <div className="border-t bg-gray-50 px-4 py-3 flex items-center justify-around">
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex flex-col items-center gap-1 h-auto py-2 border-0"
                  onClick={() => {
                    setPreviewNotice(null);
                    setLocation(`/chat-rooms/${previewNotice.chatRoomId}`, {
                      state: { messageId: previewNotice.messageId },
                    });
                  }}
                  data-testid="button-goto-chat"
                >
                  <MessageCircle className="h-5 w-5" />
                  <span className="text-xs">채팅방</span>
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex flex-col items-center gap-1 h-auto py-2"
                      data-testid="button-snooze-preview"
                    >
                      <Clock className="h-5 w-5" />
                      <span className="text-xs">나중에</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem
                      onClick={() => {
                        handleSnooze(previewNotice.id, 30);
                        setPreviewNotice(null);
                      }}
                    >
                      30분 후
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        handleSnooze(previewNotice.id, 60);
                        setPreviewNotice(null);
                      }}
                    >
                      1시간 후
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        handleSnooze(previewNotice.id, 1440);
                        setPreviewNotice(null);
                      }}
                    >
                      내일
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        handleSnooze(previewNotice.id, 10080);
                        setPreviewNotice(null);
                      }}
                    >
                      다음주
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <Button
                  variant="ghost"
                  size="sm"
                  className="flex flex-col items-center gap-1 h-auto py-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={() => {
                    deleteMutation.mutate(previewNotice.id);
                    setPreviewNotice(null);
                  }}
                  data-testid="button-delete-preview"
                >
                  <Trash2 className="h-5 w-5" />
                  <span className="text-xs">알림삭제</span>
                </Button>
              </div>
            </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Reminder Detail Drawer */}
      <Drawer open={!!detailDrawerNotice} onOpenChange={(open) => !open && setDetailDrawerNotice(null)}>
        <DrawerContent className="max-h-[85vh]">
          {detailDrawerNotice && (() => {
            const config = NOTICE_TYPE_CONFIG[detailDrawerNotice.noticeType as keyof typeof NOTICE_TYPE_CONFIG] || {
              icon: Bell,
              color: "text-gray-600",
              bg: "bg-gray-50",
              label: "알림",
            };
            const Icon = config.icon;
            
            const senderDisplayName = detailDrawerNotice.senderName || 
                                      detailDrawerNotice.senderUsername || 
                                      "알 수 없음";

            return (
              <>
                {/* Header */}
                <DrawerHeader className="pb-2 pt-safe">
                  <div className="flex items-center gap-3">
                    <div className={cn("p-2.5 rounded-lg flex-shrink-0", config.bg)}>
                      <Icon className={cn("h-5 w-5", config.color)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <Badge variant="outline" className="text-xs mb-1">
                        {config.label}
                      </Badge>
                      <DrawerTitle className="text-base font-semibold text-left line-clamp-2">
                        {detailDrawerNotice.content.length > 50 
                          ? detailDrawerNotice.content.substring(0, 50) + "..."
                          : detailDrawerNotice.content}
                      </DrawerTitle>
                    </div>
                    <DrawerClose asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-11 w-11 rounded-full flex-shrink-0"
                        data-testid="button-close-drawer"
                        aria-label="닫기"
                      >
                        <X className="h-5 w-5" />
                      </Button>
                    </DrawerClose>
                  </div>
                </DrawerHeader>

                {/* Content */}
                <ScrollArea className="flex-1 overflow-y-auto">
                  <div className="space-y-4 px-4 pb-4" style={{ paddingTop: 'max(1rem, env(safe-area-inset-top, 0px))' }}>
                    {/* Reminder Content */}
                    <div>
                      <h4 className="text-xs font-medium text-muted-foreground mb-2">내용</h4>
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">
                        {detailDrawerNotice.content}
                      </p>
                    </div>

                    <Separator />

                    {/* Chat Room Info */}
                    {detailDrawerNotice.chatRoom && (
                      <div>
                        <h4 className="text-xs font-medium text-muted-foreground mb-2">채팅방</h4>
                        <div className="flex items-center gap-2">
                          <div className="p-2 bg-purple-50 rounded-lg">
                            <MessageCircle className="h-4 w-4 text-purple-600" />
                          </div>
                          <span className="text-sm font-medium">
                            {detailDrawerNotice.chatRoom.name}
                          </span>
                        </div>
                      </div>
                    )}

                    <Separator />

                    {/* Sender Info */}
                    <div>
                      <h4 className="text-xs font-medium text-muted-foreground mb-2">발신자</h4>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={detailDrawerNotice.senderProfilePicture || undefined} />
                          <AvatarFallback className="bg-gradient-to-br from-purple-400 to-purple-600 text-white text-sm">
                            {senderDisplayName.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">{senderDisplayName}</p>
                          {detailDrawerNotice.senderUsername && (
                            <p className="text-xs text-muted-foreground">@{detailDrawerNotice.senderUsername}</p>
                          )}
                        </div>
                      </div>
                    </div>

                    <Separator />

                    {/* Time Info */}
                    <div>
                      <h4 className="text-xs font-medium text-muted-foreground mb-2">생성 시간</h4>
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span>
                          {format(new Date(detailDrawerNotice.createdAt), "yyyy년 M월 d일 HH:mm", { locale: ko })}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(detailDrawerNotice.createdAt), {
                          addSuffix: true,
                          locale: ko,
                        })}
                      </p>
                    </div>

                    {/* Original Message */}
                    {detailDrawerNotice.originalMessage && (
                      <>
                        <Separator />
                        <div>
                          <h4 className="text-xs font-medium text-muted-foreground mb-2">원본 메시지</h4>
                          <div className="bg-gray-50 rounded-lg p-3">
                            <p className="text-sm whitespace-pre-wrap leading-relaxed text-gray-700">
                              {detailDrawerNotice.originalMessage}
                            </p>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </ScrollArea>

                {/* Footer */}
                <DrawerFooter className="pt-3 pb-safe">
                  <Button
                    className="w-full h-12 text-base font-medium"
                    onClick={() => handleGoToChat(detailDrawerNotice)}
                    data-testid="button-goto-chat-drawer"
                  >
                    <MessageCircle className="h-5 w-5 mr-2" />
                    채팅방으로 이동
                  </Button>
                  
                  <Button
                    variant="outline"
                    className="w-full h-11 text-red-600 hover:text-red-700 hover:bg-red-50 mt-2"
                    onClick={() => {
                      deleteMutation.mutate(detailDrawerNotice.id);
                      setDetailDrawerNotice(null);
                    }}
                    data-testid="button-delete-drawer"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    알림 삭제
                  </Button>
                </DrawerFooter>
              </>
            );
          })()}
        </DrawerContent>
      </Drawer>
    </div>
  );
}
