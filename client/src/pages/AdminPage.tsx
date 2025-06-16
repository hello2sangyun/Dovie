import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  RefreshCw
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
  dailyStats: Array<{ date: string; users: number; messages: number; }>;
  locationStats: Array<{ region: string; users: number; }>;
}

export default function AdminPage() {
  const [, setLocation] = useLocation();
  const { user, setUser } = useAuth();
  const [refreshInterval, setRefreshInterval] = useState(30000); // 30초

  // PC 환경 체크
  useEffect(() => {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if (isMobile) {
      setLocation("/app");
      return;
    }
  }, [setLocation]);

  // 관리자 권한 체크
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

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem("userId");
    localStorage.removeItem("keepLoggedIn");
    localStorage.removeItem("userToken");
    setLocation("/");
  };

  const handleRefresh = () => {
    refetch();
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
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
            <Button variant="outline" size="sm" onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4 mr-2" />
              새로고침
            </Button>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              로그아웃
            </Button>
          </div>
        </div>
      </div>

      <div className="p-6">
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">개요</TabsTrigger>
            <TabsTrigger value="apis">API 상태</TabsTrigger>
            <TabsTrigger value="system">시스템</TabsTrigger>
            <TabsTrigger value="analytics">분석</TabsTrigger>
          </TabsList>

          {/* 개요 탭 */}
          <TabsContent value="overview" className="space-y-6">
            {/* 주요 지표 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">총 사용자</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalUsers.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">
                    활성: {stats.activeUsers.toLocaleString()}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">총 메시지</CardTitle>
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalMessages.toLocaleString()}</div>
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
                  <div className="text-2xl font-bold">{stats.totalChatRooms.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">
                    활성 채팅방
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">시스템 상태</CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">정상</div>
                  <p className="text-xs text-muted-foreground">
                    가동시간: {Math.floor(stats.systemHealth.uptime / 3600)}시간
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* 사용자 분포 차트 */}
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

          {/* API 상태 탭 */}
          <TabsContent value="apis" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* OpenAI API */}
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
                    <Badge variant={stats.apiStatus.openai.status === 'online' ? 'default' : 'destructive'}>
                      {stats.apiStatus.openai.status === 'online' ? '정상' : '오류'}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">사용량</span>
                    <span className="text-sm font-medium">
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

              {/* Weather API */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <div className={getStatusColor(stats.apiStatus.weather.status)}>
                      {getStatusIcon(stats.apiStatus.weather.status)}
                    </div>
                    <span>Weather API</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">상태</span>
                    <Badge variant={stats.apiStatus.weather.status === 'online' ? 'default' : 'destructive'}>
                      {stats.apiStatus.weather.status === 'online' ? '정상' : '오류'}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">오늘 호출</span>
                    <span className="text-sm font-medium">{stats.apiStatus.weather.calls.toLocaleString()}</span>
                  </div>
                  <div className="text-xs text-gray-500">
                    마지막 체크: {new Date(stats.apiStatus.weather.lastCheck).toLocaleTimeString()}
                  </div>
                </CardContent>
              </Card>

              {/* Database */}
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
                    <Badge variant={stats.apiStatus.database.status === 'online' ? 'default' : 'destructive'}>
                      {stats.apiStatus.database.status === 'online' ? '정상' : '오류'}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">응답시간</span>
                    <span className="text-sm font-medium">{stats.apiStatus.database.responseTime}ms</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* 시스템 탭 */}
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
                  <div className="text-3xl font-bold mb-2">{stats.systemHealth.cpuUsage.toFixed(1)}%</div>
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
                  <div className="text-3xl font-bold mb-2">{stats.systemHealth.memoryUsage.toFixed(1)}%</div>
                  <Progress value={stats.systemHealth.memoryUsage} className="h-2" />
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
                  <div className="text-3xl font-bold mb-2">{stats.systemHealth.diskUsage.toFixed(1)}%</div>
                  <Progress value={stats.systemHealth.diskUsage} className="h-2" />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* 분석 탭 */}
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
                      <Bar dataKey="users" fill="#8b5cf6" />
                      <Bar dataKey="messages" fill="#06b6d4" />
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
                      <div key={index} className="flex items-center justify-between gap-2 min-w-0">
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
                  <CardTitle>일별 신규 사용자</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {stats.dailyStats.slice(-7).map((day: any, index: number) => (
                      <div key={index} className="flex items-center justify-between gap-2">
                        <span className="text-sm text-gray-600 w-16">{day.date}</span>
                        <div className="flex items-center space-x-2 flex-1">
                          <div className="flex-1 bg-gray-200 rounded-full h-2 max-w-[100px]">
                            <div 
                              className="bg-green-600 h-2 rounded-full transition-all duration-300" 
                              style={{ width: `${Math.min((day.newUsers / Math.max(...stats.dailyStats.map((d: any) => d.newUsers))) * 100, 100)}%` }}
                            ></div>
                          </div>
                          <span className="text-sm font-medium w-8 text-right">{day.newUsers}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}