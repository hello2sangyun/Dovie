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
    if (!notice.isRead) {
      markAsReadMutation.mutate(notice.id);
    }
    setLocation(`/chat-rooms/${notice.chatRoomId}`, {
      state: { messageId: notice.messageId },
    });
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

  // Render notice item
  const renderNoticeItem = (notice: AiNotice) => {
    const config = getNoticeIcon(notice.noticeType);
    const Icon = config.icon;

    return (
      <Card
        key={notice.id}
        data-testid={`notice-${notice.id}`}
        className={cn(
          "p-4 transition-all hover:shadow-md cursor-pointer",
          !notice.isRead && "bg-purple-50 border-purple-200"
        )}
      >
        <div className="flex items-start gap-3">
          <div className={cn("p-2 rounded-lg flex-shrink-0", config.bg)}>
            <Icon className={cn("h-5 w-5", config.color)} />
          </div>

          <div className="flex-1 min-w-0" onClick={() => handleNoticeClick(notice)}>
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className="text-xs">
                {config.label}
              </Badge>
              {notice.priority && (
                <Badge
                  variant={notice.priority === "high" ? "destructive" : "secondary"}
                  className="text-xs"
                >
                  {notice.priority === "high" ? "높음" : notice.priority === "medium" ? "중간" : "낮음"}
                </Badge>
              )}
              {!notice.isRead && (
                <div className="w-2 h-2 bg-purple-600 rounded-full" />
              )}
            </div>

            <p className={cn("text-sm leading-relaxed", !notice.isRead && "font-semibold")}>
              {notice.content}
            </p>

            {notice.chatRoom && (
              <p className="text-xs text-muted-foreground mt-1">
                {notice.chatRoom.name || "개인 채팅"}
              </p>
            )}

            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(notice.createdAt), {
                  addSuffix: true,
                  locale: ko,
                })}
              </span>
              {notice.isRead && <CheckCircle2 className="h-3 w-3 text-green-600" />}
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 flex-shrink-0"
                data-testid={`notice-menu-${notice.id}`}
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="h-4 w-4" />
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
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">로그인이 필요합니다</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl">
                <InboxIcon className="h-8 w-8 text-white" />
              </div>
              AI 인박스
            </h1>
            <p className="text-muted-foreground mt-1">
              스마트 알림 {activeNotices.length}개
              {snoozedNotices.length > 0 && ` · 스누즈 ${snoozedNotices.length}개`}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setClearAllDialog(true)}
              disabled={activeNotices.length === 0}
              data-testid="button-clear-all"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              전체 삭제
            </Button>
          </div>
        </div>

        {/* View Tabs */}
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="list" data-testid="tab-list">
              <InboxIcon className="h-4 w-4 mr-2" />
              목록
            </TabsTrigger>
            <TabsTrigger value="stats" data-testid="tab-stats">
              <BarChart3 className="h-4 w-4 mr-2" />
              통계
            </TabsTrigger>
            <TabsTrigger value="calendar" data-testid="tab-calendar">
              <CalendarDays className="h-4 w-4 mr-2" />
              캘린더
            </TabsTrigger>
          </TabsList>

          {/* List View */}
          <TabsContent value="list" className="space-y-4">
            {/* Search and Filters */}
            <Card className="p-4">
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="알림 검색..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                    data-testid="input-search"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant={showSnoozed ? "default" : "outline"}
                    size="sm"
                    onClick={() => setShowSnoozed(!showSnoozed)}
                    data-testid="button-show-snoozed"
                  >
                    <Moon className="h-4 w-4 mr-2" />
                    스누즈
                    {snoozedNotices.length > 0 && (
                      <Badge variant="secondary" className="ml-2">
                        {snoozedNotices.length}
                      </Badge>
                    )}
                  </Button>

                  <Separator orientation="vertical" className="h-6" />

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" data-testid="filter-type">
                        <Filter className="h-4 w-4 mr-2" />
                        유형
                        {typeFilter !== "all" && (
                          <Badge variant="secondary" className="ml-2">1</Badge>
                        )}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => setTypeFilter("all")}>
                        전체
                      </DropdownMenuItem>
                      {Object.entries(NOTICE_TYPE_CONFIG).map(([type, config]) => (
                        <DropdownMenuItem key={type} onClick={() => setTypeFilter(type as NoticeType)}>
                          {config.label}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" data-testid="filter-priority">
                        우선순위
                        {priorityFilter !== "all" && (
                          <Badge variant="secondary" className="ml-2">1</Badge>
                        )}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => setPriorityFilter("all")}>
                        전체
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setPriorityFilter("high")}>
                        높음
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setPriorityFilter("medium")}>
                        중간
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setPriorityFilter("low")}>
                        낮음
                      </DropdownMenuItem>
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
                      data-testid="button-clear-filters"
                    >
                      <X className="h-4 w-4 mr-2" />
                      필터 초기화 ({activeFilterCount})
                    </Button>
                  )}
                </div>

                {searchTerm && (
                  <p className="text-sm text-muted-foreground">
                    검색 결과: {filteredNotices.length}개
                  </p>
                )}
              </div>
            </Card>

            {/* Notices List */}
            <ScrollArea className="h-[600px]">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" />
                </div>
              ) : filteredNotices.length === 0 ? (
                <Card className="p-12">
                  <div className="text-center">
                    <div className="p-4 bg-purple-100 rounded-full w-fit mx-auto mb-4">
                      <InboxIcon className="h-12 w-12 text-purple-600" />
                    </div>
                    <h3 className="font-semibold text-lg mb-2">
                      {showSnoozed ? "스누즈된 알림이 없습니다" : "알림함이 비어있습니다"}
                    </h3>
                    <p className="text-muted-foreground text-sm">
                      AI가 약속, 일정, 중요한 정보를 자동으로 감지하여<br />
                      스마트 알림을 생성합니다
                    </p>
                  </div>
                </Card>
              ) : (
                <div className="space-y-3" data-testid="notices-list">
                  {filteredNotices.map(renderNoticeItem)}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          {/* Stats View */}
          <TabsContent value="stats">
            {renderStatsView()}
          </TabsContent>

          {/* Calendar View */}
          <TabsContent value="calendar">
            {renderCalendarView()}
          </TabsContent>
        </Tabs>
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
    </div>
  );
}
