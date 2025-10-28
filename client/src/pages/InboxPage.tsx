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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

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
      // Show preview dialog instead of navigating
      if (!notice.isRead) {
        markAsReadMutation.mutate(notice.id);
      }
      setPreviewNotice(notice);
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

  // Render notice item - Compact version
  const renderNoticeItem = (notice: AiNotice) => {
    const config = getNoticeIcon(notice.noticeType);
    const Icon = config.icon;
    const senderDisplayName = notice.senderName || notice.senderUsername || "알 수 없음";

    return (
      <Card
        key={notice.id}
        data-testid={`notice-${notice.id}`}
        className={cn(
          "p-2.5 transition-all hover:shadow-sm cursor-pointer",
          !notice.isRead && "bg-purple-50 border-purple-200",
          selectedNotices.has(notice.id) && "border-purple-400 bg-purple-100"
        )}
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

          <div className="flex-1 min-w-0" onClick={() => handleNoticeClick(notice)}>
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
                  setQuickReplyNotice(notice);
                }}
                data-testid={`quick-reply-${notice.id}`}
              >
                <Reply className="h-4 w-4 mr-2" />
                빠른 답장
              </DropdownMenuItem>

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
      {/* Compact Header */}
      <div className="flex-shrink-0 px-3 py-2.5 border-b bg-gradient-to-r from-purple-50 to-blue-50">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-purple-900">Smart Inbox</h2>
            <Badge variant="secondary" className="text-xs">
              {activeNotices.length}
            </Badge>
          </div>
          
          <div className="flex items-center gap-1">
            {/* View Mode Tabs - Icon Only */}
            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("list")}
              className="h-7 px-2"
              data-testid="tab-list"
            >
              <InboxIcon className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant={viewMode === "stats" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("stats")}
              className="h-7 px-2"
              data-testid="tab-stats"
            >
              <BarChart3 className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant={viewMode === "calendar" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("calendar")}
              className="h-7 px-2"
              data-testid="tab-calendar"
            >
              <CalendarDays className="h-3.5 w-3.5" />
            </Button>
            
            <Separator orientation="vertical" className="h-4 mx-1" />
            
            {/* Selection Mode Toggle */}
            <Button
              variant={selectionMode ? "default" : "ghost"}
              size="sm"
              onClick={() => {
                setSelectionMode(!selectionMode);
                if (selectionMode) setSelectedNotices(new Set());
              }}
              disabled={filteredNotices.length === 0}
              className="h-7 px-2"
              data-testid="button-selection-mode"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
            </Button>

            {/* Bulk Delete - Only show in selection mode */}
            {selectionMode && (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleBulkDelete}
                disabled={selectedNotices.size === 0}
                className="h-7 px-2"
                data-testid="button-bulk-delete"
              >
                <Trash2 className="h-3.5 w-3.5" />
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
                className="h-7 px-2"
                data-testid="button-clear-all"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
        
        {/* Compact Search & Filters Row */}
        {viewMode === "list" && (
          <div className="flex items-center gap-1.5 mt-2">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
              <Input
                placeholder="검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-7 pl-7 pr-2 text-xs"
                data-testid="input-search"
              />
            </div>
            
            <Button
              variant={showSnoozed ? "default" : "outline"}
              size="sm"
              onClick={() => setShowSnoozed(!showSnoozed)}
              className="h-7 px-2"
              data-testid="button-show-snoozed"
            >
              <Moon className="h-3 w-3" />
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-7 px-2" data-testid="filter-type">
                  <Filter className="h-3 w-3" />
                  {typeFilter !== "all" && <span className="ml-1 text-xs">1</span>}
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
                className="h-7 px-2"
                data-testid="button-clear-filters"
              >
                <X className="h-3 w-3" />
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

      {/* Message Preview Dialog */}
      <Dialog open={!!previewNotice} onOpenChange={() => setPreviewNotice(null)}>
        <DialogContent className="max-w-lg" data-testid="dialog-message-preview">
          <DialogHeader>
            <DialogTitle>메시지 미리보기</DialogTitle>
            <DialogDescription>
              {previewNotice?.senderName || previewNotice?.senderUsername || "알 수 없음"}님의 메시지
            </DialogDescription>
          </DialogHeader>

          {previewNotice && (
            <div className="space-y-4">
              {/* AI Notice */}
              <Card className="p-4 bg-purple-50 border-purple-200">
                <div className="flex items-start gap-2 mb-2">
                  <Badge variant="outline" className="text-xs">
                    {getNoticeIcon(previewNotice.noticeType).label}
                  </Badge>
                </div>
                <p className="text-sm font-semibold">{previewNotice.content}</p>
                <p className="text-xs text-muted-foreground mt-2">
                  {formatDistanceToNow(new Date(previewNotice.createdAt), {
                    addSuffix: true,
                    locale: ko,
                  })}
                </p>
              </Card>

              {/* Original Message */}
              {previewNotice.originalMessage && (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold">원본 메시지</h4>
                  <Card className="p-4 bg-muted">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-medium text-purple-600">
                        {previewNotice.senderName || previewNotice.senderUsername}님
                      </span>
                      {previewNotice.messageType && (
                        <Badge variant="secondary" className="text-xs">
                          {previewNotice.messageType === 'voice' ? '음성' : 
                           previewNotice.messageType === 'image' ? '이미지' : 
                           previewNotice.messageType === 'file' ? '파일' : '텍스트'}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{previewNotice.originalMessage}</p>
                  </Card>
                </div>
              )}

              {/* Metadata */}
              {previewNotice.metadata && Object.keys(previewNotice.metadata).length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold">상세 정보</h4>
                  <Card className="p-3">
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {previewNotice.metadata.date && (
                        <div>
                          <span className="text-muted-foreground">날짜:</span>
                          <span className="ml-1 font-medium">{previewNotice.metadata.date}</span>
                        </div>
                      )}
                      {previewNotice.metadata.time && (
                        <div>
                          <span className="text-muted-foreground">시간:</span>
                          <span className="ml-1 font-medium">{previewNotice.metadata.time}</span>
                        </div>
                      )}
                      {previewNotice.metadata.location && (
                        <div className="col-span-2">
                          <span className="text-muted-foreground">장소:</span>
                          <span className="ml-1 font-medium">{previewNotice.metadata.location}</span>
                        </div>
                      )}
                      {previewNotice.metadata.amount && (
                        <div>
                          <span className="text-muted-foreground">금액:</span>
                          <span className="ml-1 font-medium">{previewNotice.metadata.amount}</span>
                        </div>
                      )}
                      {previewNotice.metadata.frequency && (
                        <div>
                          <span className="text-muted-foreground">반복:</span>
                          <span className="ml-1 font-medium">{previewNotice.metadata.frequency}</span>
                        </div>
                      )}
                    </div>
                  </Card>
                </div>
              )}

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setPreviewNotice(null)}
                  data-testid="button-close-preview"
                >
                  닫기
                </Button>
                <Button
                  onClick={() => {
                    setPreviewNotice(null);
                    setLocation(`/chat-rooms/${previewNotice.chatRoomId}`, {
                      state: { messageId: previewNotice.messageId },
                    });
                  }}
                  data-testid="button-goto-chat"
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  채팅방으로 이동
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
