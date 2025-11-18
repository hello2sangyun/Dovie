import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import {
  Activity,
  Users,
  MessageSquare,
  Database,
  Cpu,
  HardDrive,
  Wifi,
  AlertTriangle,
  CheckCircle,
  XCircle,
  TrendingUp,
  Calendar,
  Clock,
  Globe,
  Shield,
  LogOut,
  RefreshCw,
  Ban,
  Trash2,
  Send,
  Eye,
  Server
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from "recharts";

interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  totalMessages: number;
  totalChatRooms: number;
  apiStatus: {
    openai: { status: 'online' | 'offline' | 'degraded', lastCheck: string, usage: number, limit: number };
    weather: { status: 'online' | 'offline' | 'degraded', lastCheck: string, calls: number };
    database: { status: 'online' | 'offline', responseTime: number };
  };
  systemHealth: {
    cpuUsage: number;
    memoryUsage: number;
    diskUsage: number;
    uptime: number;
  };
  dailyStats: Array<{ date: string; users: number; messages: number; newUsers?: number }>;
  locationStats: Array<{ region: string; users: number; }>;
}

interface UserWithActivity {
  id: number;
  username: string;
  displayName: string;
  email: string;
  phoneNumber?: string;
  isBanned: boolean;
  bannedReason?: string;
  createdAt: string;
  lastActivity: string | null;
  messageCount: number;
  chatRoomCount: number;
}

interface CountryStats {
  country: string;
  countryCode: string;
  userCount: number;
}

interface SystemInfo {
  onlineUsers: number;
  totalConnections: number;
  memoryUsage: {
    rss: number;
    heapUsed: number;
    heapTotal: number;
    external: number;
  };
  cpuUsage: {
    user: number;
    system: number;
  };
  uptime: number;
  nodeVersion: string;
  platform: string;
}

interface DatabaseStats {
  tableStats: Array<{
    table: string;
    rowCount: number;
    sizeInBytes: number;
  }>;
}

export default function AdminPage() {
  const [, setLocation] = useLocation();
  const { user, setUser } = useAuth();
  const { toast } = useToast();
  const [refreshInterval, setRefreshInterval] = useState(30000);
  const [selectedUser, setSelectedUser] = useState<UserWithActivity | null>(null);
  const [showUserDetail, setShowUserDetail] = useState(false);
  const [showBroadcast, setShowBroadcast] = useState(false);
  const [broadcastTitle, setBroadcastTitle] = useState("");
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [banReason, setBanReason] = useState("");

  useEffect(() => {
    if (!user || user.email !== "master@master.com") {
      setLocation("/");
      return;
    }
  }, [user, setLocation]);

  const { data: adminStats, isLoading, refetch } = useQuery({
    queryKey: ['/api/admin/stats'],
    refetchInterval: refreshInterval,
    enabled: user?.email === "master@master.com"
  });

  const { data: usersData } = useQuery<{ users: UserWithActivity[] }>({
    queryKey: ['/api/admin/users'],
    enabled: user?.email === "master@master.com"
  });

  const { data: countryData } = useQuery<{ countries: CountryStats[] }>({
    queryKey: ['/api/admin/countries'],
    enabled: user?.email === "master@master.com"
  });

  const { data: systemInfo } = useQuery<SystemInfo>({
    queryKey: ['/api/admin/system'],
    refetchInterval: 5000,
    enabled: user?.email === "master@master.com"
  });

  const { data: dbStats } = useQuery<DatabaseStats>({
    queryKey: ['/api/admin/database'],
    enabled: user?.email === "master@master.com"
  });

  const banUserMutation = useMutation({
    mutationFn: async ({ userId, reason }: { userId: number; reason: string }) => {
      return await apiRequest(`/api/admin/users/${userId}/ban`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
        headers: { 'Content-Type': 'application/json' }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      toast({ title: "사용자가 차단되었습니다" });
      setShowUserDetail(false);
      setBanReason("");
    },
    onError: () => {
      toast({ title: "사용자 차단 실패", variant: "destructive" });
    }
  });

  const unbanUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      return await apiRequest(`/api/admin/users/${userId}/unban`, {
        method: 'POST'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      toast({ title: "차단이 해제되었습니다" });
      setShowUserDetail(false);
    },
    onError: () => {
      toast({ title: "차단 해제 실패", variant: "destructive" });
    }
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      return await apiRequest(`/api/admin/users/${userId}`, {
        method: 'DELETE'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      toast({ title: "사용자가 삭제되었습니다" });
      setShowUserDetail(false);
    },
    onError: () => {
      toast({ title: "사용자 삭제 실패", variant: "destructive" });
    }
  });

  const broadcastMutation = useMutation({
    mutationFn: async ({ title, message }: { title: string; message: string }) => {
      return await apiRequest('/api/admin/broadcast', {
        method: 'POST',
        body: JSON.stringify({ title, message }),
        headers: { 'Content-Type': 'application/json' }
      });
    },
    onSuccess: (data: any) => {
      toast({
        title: "브로드캐스트 전송 완료",
        description: `${data.sentCount}명에게 전송, ${data.failedCount}건 실패`
      });
      setShowBroadcast(false);
      setBroadcastTitle("");
      setBroadcastMessage("");
    },
    onError: () => {
      toast({ title: "브로드캐스트 전송 실패", variant: "destructive" });
    }
  });

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem("userId");
    localStorage.removeItem("keepLoggedIn");
    localStorage.removeItem("userToken");
    setLocation("/");
  };

  const handleRefresh = () => {
    refetch();
    queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
    queryClient.invalidateQueries({ queryKey: ['/api/admin/countries'] });
    queryClient.invalidateQueries({ queryKey: ['/api/admin/system'] });
    queryClient.invalidateQueries({ queryKey: ['/api/admin/database'] });
  };

  const handleBanUser = () => {
    if (selectedUser && banReason.trim()) {
      banUserMutation.mutate({ userId: selectedUser.id, reason: banReason });
    }
  };

  const handleDeleteUser = () => {
    if (selectedUser && window.confirm(`정말 ${selectedUser.displayName} 사용자를 삭제하시겠습니까?`)) {
      deleteUserMutation.mutate(selectedUser.id);
    }
  };

  const handleBroadcast = () => {
    if (broadcastTitle.trim() && broadcastMessage.trim()) {
      if (window.confirm('모든 사용자에게 푸시 알림을 전송하시겠습니까?')) {
        broadcastMutation.mutate({ title: broadcastTitle, message: broadcastMessage });
      }
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'text-green-600';
      case 'offline': return 'text-red-600';
      case 'degraded': return 'text-yellow-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online': return <CheckCircle className="h-4 w-4" />;
      case 'offline': return <XCircle className="h-4 w-4" />;
      case 'degraded': return <AlertTriangle className="h-4 w-4" />;
      default: return <RefreshCw className="h-4 w-4" />;
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-purple-600" />
          <p className="text-gray-600">관리자 데이터를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  const stats = adminStats || {
    totalUsers: 0,
    activeUsers: 0,
    totalMessages: 0,
    totalChatRooms: 0,
    apiStatus: {
      openai: { status: 'offline', lastCheck: new Date().toISOString(), usage: 0, limit: 0 },
      weather: { status: 'offline', lastCheck: new Date().toISOString(), calls: 0 },
      database: { status: 'offline', responseTime: 0 }
    },
    systemHealth: { cpuUsage: 0, memoryUsage: 0, diskUsage: 0, uptime: 0 },
    dailyStats: [],
    locationStats: []
  };

  const pieData = [
    { name: '활성 사용자', value: stats.activeUsers, color: '#8b5cf6' },
    { name: '비활성 사용자', value: stats.totalUsers - stats.activeUsers, color: '#e5e7eb' }
  ];

  const totalDbSize = dbStats?.tableStats.reduce((sum, t) => sum + t.sizeInBytes, 0) || 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Shield className="h-8 w-8 text-purple-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Dovie 관리자 대시보드</h1>
              <p className="text-sm text-gray-500">시스템 모니터링 및 관리</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Button variant="outline" size="sm" onClick={() => setShowBroadcast(true)} data-testid="button-broadcast">
              <Send className="h-4 w-4 mr-2" />
              전체 푸시
            </Button>
            <Button variant="outline" size="sm" onClick={handleRefresh} data-testid="button-refresh">
              <RefreshCw className="h-4 w-4 mr-2" />
              새로고침
            </Button>
            <Button variant="outline" size="sm" onClick={handleLogout} data-testid="button-logout">
              <LogOut className="h-4 w-4 mr-2" />
              로그아웃
            </Button>
          </div>
        </div>
      </div>

      <div className="p-6">
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="overview" data-testid="tab-overview">개요</TabsTrigger>
            <TabsTrigger value="users" data-testid="tab-users">사용자</TabsTrigger>
            <TabsTrigger value="apis" data-testid="tab-apis">API 상태</TabsTrigger>
            <TabsTrigger value="system" data-testid="tab-system">시스템</TabsTrigger>
            <TabsTrigger value="database" data-testid="tab-database">데이터베이스</TabsTrigger>
            <TabsTrigger value="performance" data-testid="tab-performance">성능</TabsTrigger>
            <TabsTrigger value="analytics" data-testid="tab-analytics">분석</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">총 사용자</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="text-total-users">{stats.totalUsers.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">
                    활성: {stats.activeUsers.toLocaleString()}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">동시 접속자</CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600" data-testid="text-online-users">
                    {systemInfo?.onlineUsers || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    연결: {systemInfo?.totalConnections || 0}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">총 메시지</CardTitle>
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="text-total-messages">{stats.totalMessages.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">
                    오늘: {stats.dailyStats[stats.dailyStats.length - 1]?.messages || 0}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">채팅방</CardTitle>
                  <Database className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="text-total-chatrooms">{stats.totalChatRooms.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">활성 채팅방</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>사용자 활동 분포</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>일별 메시지 통계</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={stats.dailyStats}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="messages" stroke="#8b5cf6" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="users" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>사용자 목록</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {usersData?.users.map((u) => (
                    <div 
                      key={u.id} 
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer"
                      onClick={() => { setSelectedUser(u); setShowUserDetail(true); }}
                      data-testid={`user-item-${u.id}`}
                    >
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">{u.displayName}</span>
                          <span className="text-sm text-gray-500">@{u.username}</span>
                          {u.isBanned && <Badge variant="destructive">차단됨</Badge>}
                        </div>
                        <p className="text-xs text-gray-500">
                          메시지: {u.messageCount} | 채팅방: {u.chatRoomCount} | 
                          가입: {new Date(u.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <Button variant="ghost" size="sm" data-testid={`button-view-user-${u.id}`}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="apis" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <div className={getStatusColor(stats.apiStatus.openai.status)}>
                      {getStatusIcon(stats.apiStatus.openai.status)}
                    </div>
                    <span>OpenAI API</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">상태</span>
                    <Badge variant={stats.apiStatus.openai.status === 'online' ? 'default' : 'destructive'} data-testid="badge-openai-status">
                      {stats.apiStatus.openai.status === 'online' ? '정상' : '오류'}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">사용량</span>
                    <span className="text-sm font-medium" data-testid="text-openai-usage">
                      {stats.apiStatus.openai.usage.toLocaleString()} / {stats.apiStatus.openai.limit.toLocaleString()}
                    </span>
                  </div>
                  <Progress 
                    value={(stats.apiStatus.openai.usage / stats.apiStatus.openai.limit) * 100} 
                    className="h-2"
                  />
                  <div className="text-xs text-gray-500">
                    마지막 체크: {new Date(stats.apiStatus.openai.lastCheck).toLocaleTimeString()}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <div className={getStatusColor(stats.apiStatus.database.status)}>
                      {getStatusIcon(stats.apiStatus.database.status)}
                    </div>
                    <span>Database</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">상태</span>
                    <Badge variant={stats.apiStatus.database.status === 'online' ? 'default' : 'destructive'} data-testid="badge-db-status">
                      {stats.apiStatus.database.status === 'online' ? '정상' : '오류'}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">응답시간</span>
                    <span className="text-sm font-medium" data-testid="text-db-response">{stats.apiStatus.database.responseTime}ms</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Server className="h-5 w-5" />
                    <span>서버 상태</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">가동시간</span>
                    <span className="text-sm font-medium">
                      {Math.floor((systemInfo?.uptime || 0) / 3600)}시간
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">플랫폼</span>
                    <span className="text-sm font-medium">{systemInfo?.platform}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Node.js</span>
                    <span className="text-sm font-medium">{systemInfo?.nodeVersion}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="system" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Cpu className="h-5 w-5" />
                    <span>CPU 사용률</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold mb-2" data-testid="text-cpu-usage">{stats.systemHealth.cpuUsage.toFixed(1)}%</div>
                  <Progress value={stats.systemHealth.cpuUsage} className="h-2" />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Activity className="h-5 w-5" />
                    <span>메모리 사용률</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold mb-2">
                    {systemInfo?.memoryUsage.heapUsed || 0} MB
                  </div>
                  <div className="text-sm text-gray-500">
                    / {systemInfo?.memoryUsage.heapTotal || 0} MB
                  </div>
                  <Progress 
                    value={((systemInfo?.memoryUsage.heapUsed || 0) / (systemInfo?.memoryUsage.heapTotal || 1)) * 100} 
                    className="h-2 mt-2"
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <HardDrive className="h-5 w-5" />
                    <span>디스크 사용률</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold mb-2" data-testid="text-disk-usage">{stats.systemHealth.diskUsage.toFixed(1)}%</div>
                  <Progress value={stats.systemHealth.diskUsage} className="h-2" />
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>실시간 서버 상태</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 bg-green-50 rounded-lg">
                    <div className="text-sm text-gray-600">동시 접속자</div>
                    <div className="text-2xl font-bold text-green-600" data-testid="text-online-count">
                      {systemInfo?.onlineUsers || 0}
                    </div>
                  </div>
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <div className="text-sm text-gray-600">총 연결</div>
                    <div className="text-2xl font-bold text-blue-600">
                      {systemInfo?.totalConnections || 0}
                    </div>
                  </div>
                  <div className="p-4 bg-purple-50 rounded-lg">
                    <div className="text-sm text-gray-600">RSS 메모리</div>
                    <div className="text-2xl font-bold text-purple-600">
                      {systemInfo?.memoryUsage.rss || 0} MB
                    </div>
                  </div>
                  <div className="p-4 bg-orange-50 rounded-lg">
                    <div className="text-sm text-gray-600">가동시간</div>
                    <div className="text-2xl font-bold text-orange-600">
                      {Math.floor((systemInfo?.uptime || 0) / 3600)}h
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="database" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>데이터베이스 통계</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <div className="text-sm text-gray-600">총 데이터베이스 크기</div>
                  <div className="text-3xl font-bold text-purple-600" data-testid="text-db-size">
                    {formatBytes(totalDbSize)}
                  </div>
                </div>
                <div className="space-y-2">
                  {dbStats?.tableStats.map((table) => (
                    <div key={table.table} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg" data-testid={`db-table-${table.table}`}>
                      <div className="flex-1">
                        <div className="font-medium">{table.table}</div>
                        <div className="text-sm text-gray-500">
                          {table.rowCount.toLocaleString()} rows
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold" data-testid={`db-table-size-${table.table}`}>
                          {formatBytes(table.sizeInBytes)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="performance" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>성능 최적화 제안</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <h4 className="font-medium text-blue-900">✓ 구현된 최적화</h4>
                    <ul className="text-sm text-blue-700 mt-2 space-y-1">
                      <li>• React Query 캐싱 최적화</li>
                      <li>• 이미지 지연 로딩 및 캐싱</li>
                      <li>• 컴포넌트 지연 로딩</li>
                      <li>• 검색 디바운싱</li>
                      <li>• 스크롤 가상화</li>
                    </ul>
                  </div>
                  
                  <div className="p-3 bg-green-50 rounded-lg">
                    <h4 className="font-medium text-green-900">추가 최적화 가능</h4>
                    <ul className="text-sm text-green-700 mt-2 space-y-1">
                      <li>• 서비스 워커 캐싱</li>
                      <li>• WebP 이미지 포맷 사용</li>
                      <li>• CDN 활용</li>
                      <li>• 번들 크기 최적화</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>캐시 관리</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">React Query 캐시</span>
                    <Button variant="outline" size="sm" onClick={() => queryClient.clear()} data-testid="button-clear-cache">
                      캐시 지우기
                    </Button>
                  </div>
                  
                  <div className="p-3 bg-yellow-50 rounded-lg">
                    <p className="text-sm text-yellow-700">
                      정기적인 캐시 정리로 메모리 사용량을 최적화하세요.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>일별 활동 추이</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={stats.dailyStats}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="users" fill="#8b5cf6" name="사용자" />
                      <Bar dataKey="messages" fill="#06b6d4" name="메시지" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>지역별 사용자 분포</CardTitle>
                </CardHeader>
                <CardContent className="overflow-hidden">
                  <div className="space-y-3 max-w-full">
                    {stats.locationStats.map((location: any, index: number) => (
                      <div key={index} className="flex items-center justify-between gap-2 min-w-0" data-testid={`location-${location.region}`}>
                        <span className="text-sm text-gray-600 truncate flex-shrink-0 max-w-[120px]">{location.region}</span>
                        <div className="flex items-center space-x-2 flex-1 min-w-0">
                          <div className="flex-1 bg-gray-200 rounded-full h-2 min-w-[60px] max-w-[120px]">
                            <div 
                              className="bg-purple-600 h-2 rounded-full transition-all duration-300" 
                              style={{ width: `${Math.min((location.users / stats.totalUsers) * 100, 100)}%` }}
                            ></div>
                          </div>
                          <span className="text-sm font-medium flex-shrink-0 w-8 text-right">{location.users}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>국가별 사용자 분포</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {countryData?.countries.map((country) => (
                      <div key={country.countryCode} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg" data-testid={`country-${country.countryCode}`}>
                        <div className="flex items-center space-x-2">
                          <Globe className="h-4 w-4 text-gray-500" />
                          <span className="font-medium">{country.country}</span>
                          <span className="text-sm text-gray-500">{country.countryCode}</span>
                        </div>
                        <span className="font-bold text-purple-600" data-testid={`country-count-${country.countryCode}`}>
                          {country.userCount}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* 사용자 상세 다이얼로그 */}
      <Dialog open={showUserDetail} onOpenChange={setShowUserDetail}>
        <DialogContent data-testid="dialog-user-detail">
          <DialogHeader>
            <DialogTitle>사용자 상세 정보</DialogTitle>
            <DialogDescription>
              {selectedUser && (
                <div className="mt-4 space-y-3">
                  <div>
                    <span className="font-medium">이름:</span> {selectedUser.displayName}
                  </div>
                  <div>
                    <span className="font-medium">사용자명:</span> @{selectedUser.username}
                  </div>
                  <div>
                    <span className="font-medium">이메일:</span> {selectedUser.email}
                  </div>
                  {selectedUser.phoneNumber && (
                    <div>
                      <span className="font-medium">전화번호:</span> {selectedUser.phoneNumber}
                    </div>
                  )}
                  <div>
                    <span className="font-medium">메시지 수:</span> {selectedUser.messageCount}
                  </div>
                  <div>
                    <span className="font-medium">참여 채팅방:</span> {selectedUser.chatRoomCount}
                  </div>
                  <div>
                    <span className="font-medium">가입일:</span> {new Date(selectedUser.createdAt).toLocaleString()}
                  </div>
                  {selectedUser.lastActivity && (
                    <div>
                      <span className="font-medium">마지막 활동:</span> {new Date(selectedUser.lastActivity).toLocaleString()}
                    </div>
                  )}
                  {selectedUser.isBanned && (
                    <div className="p-3 bg-red-50 rounded-lg">
                      <span className="font-medium text-red-900">차단 사유:</span>
                      <p className="text-sm text-red-700 mt-1">{selectedUser.bannedReason}</p>
                    </div>
                  )}
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            {selectedUser && !selectedUser.isBanned && (
              <div className="w-full space-y-2">
                <Input
                  placeholder="차단 사유 입력..."
                  value={banReason}
                  onChange={(e) => setBanReason(e.target.value)}
                  data-testid="input-ban-reason"
                />
                <Button 
                  variant="destructive" 
                  className="w-full" 
                  onClick={handleBanUser}
                  disabled={!banReason.trim() || banUserMutation.isPending}
                  data-testid="button-ban-user"
                >
                  <Ban className="h-4 w-4 mr-2" />
                  사용자 차단
                </Button>
              </div>
            )}
            {selectedUser?.isBanned && (
              <Button 
                variant="default" 
                className="w-full" 
                onClick={() => unbanUserMutation.mutate(selectedUser.id)}
                disabled={unbanUserMutation.isPending}
                data-testid="button-unban-user"
              >
                차단 해제
              </Button>
            )}
            <Button 
              variant="destructive" 
              className="w-full" 
              onClick={handleDeleteUser}
              disabled={deleteUserMutation.isPending}
              data-testid="button-delete-user"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              사용자 삭제
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 브로드캐스트 다이얼로그 */}
      <Dialog open={showBroadcast} onOpenChange={setShowBroadcast}>
        <DialogContent data-testid="dialog-broadcast">
          <DialogHeader>
            <DialogTitle>전체 푸시 알림 전송</DialogTitle>
            <DialogDescription>
              모든 사용자에게 푸시 알림을 전송합니다.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">제목</label>
              <Input
                placeholder="알림 제목..."
                value={broadcastTitle}
                onChange={(e) => setBroadcastTitle(e.target.value)}
                data-testid="input-broadcast-title"
              />
            </div>
            <div>
              <label className="text-sm font-medium">메시지</label>
              <Textarea
                placeholder="알림 내용..."
                value={broadcastMessage}
                onChange={(e) => setBroadcastMessage(e.target.value)}
                rows={4}
                data-testid="input-broadcast-message"
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              onClick={handleBroadcast}
              disabled={!broadcastTitle.trim() || !broadcastMessage.trim() || broadcastMutation.isPending}
              data-testid="button-send-broadcast"
            >
              <Send className="h-4 w-4 mr-2" />
              전송
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
