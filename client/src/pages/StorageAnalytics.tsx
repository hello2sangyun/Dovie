import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { 
  HardDrive, 
  Download, 
  Upload, 
  FileText, 
  Image, 
  Music, 
  Video, 
  Archive,
  Calendar,
  Users,
  BarChart3,
  TrendingUp
} from "lucide-react";

interface FileUploadAnalytics {
  id: number;
  fileName: string;
  originalName: string;
  fileSize: number;
  fileType: string;
  uploadedAt: string;
  chatRoomName: string;
  downloadCount: number;
  totalSize: number;
  typeBreakdown: {
    images: number;
    documents: number;
    audio: number;
    video: number;
    other: number;
  };
  chatRoomBreakdown: {
    roomName: string;
    fileCount: number;
    totalSize: number;
  }[];
  recentDownloads: {
    id: number;
    fileName: string;
    downloaderName: string;
    downloadedAt: string;
    ipAddress: string;
  }[];
}

export default function StorageAnalytics() {
  const { user } = useAuth();
  const [selectedTimeRange, setSelectedTimeRange] = useState<"week" | "month" | "year">("month");

  // Fetch storage analytics data
  const { data: analytics, isLoading } = useQuery({
    queryKey: ["/api/storage/analytics", selectedTimeRange],
    queryFn: async () => {
      const params = new URLSearchParams({ timeRange: selectedTimeRange });
      const response = await apiRequest(`/api/storage/analytics?${params}`, "GET");
      return response.json() as Promise<FileUploadAnalytics>;
    },
    enabled: !!user,
  });

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return <Image className="h-4 w-4" />;
    if (fileType.startsWith('video/')) return <Video className="h-4 w-4" />;
    if (fileType.startsWith('audio/')) return <Music className="h-4 w-4" />;
    if (fileType.includes('zip') || fileType.includes('rar')) return <Archive className="h-4 w-4" />;
    return <FileText className="h-4 w-4" />;
  };

  const getFileTypeColor = (fileType: string) => {
    if (fileType.startsWith('image/')) return 'bg-blue-500';
    if (fileType.startsWith('video/')) return 'bg-red-500';
    if (fileType.startsWith('audio/')) return 'bg-green-500';
    if (fileType.includes('zip') || fileType.includes('rar')) return 'bg-purple-500';
    return 'bg-gray-500';
  };

  if (!user) return null;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">저장소 분석</h1>
          <p className="text-gray-600">업로드한 파일들의 용량과 다운로드 현황을 확인하세요</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={selectedTimeRange === "week" ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedTimeRange("week")}
          >
            최근 1주일
          </Button>
          <Button
            variant={selectedTimeRange === "month" ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedTimeRange("month")}
          >
            최근 1개월
          </Button>
          <Button
            variant={selectedTimeRange === "year" ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedTimeRange("year")}
          >
            최근 1년
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
        </div>
      ) : (
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              전체 현황
            </TabsTrigger>
            <TabsTrigger value="files" className="flex items-center gap-2">
              <HardDrive className="h-4 w-4" />
              파일 목록
            </TabsTrigger>
            <TabsTrigger value="downloads" className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              다운로드 로그
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            {/* Storage Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">총 용량</CardTitle>
                  <HardDrive className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatFileSize(analytics?.totalSize || 0)}</div>
                  <p className="text-xs text-muted-foreground">
                    업로드한 모든 파일
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">파일 수</CardTitle>
                  <Upload className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analytics?.chatRoomBreakdown?.reduce((sum, room) => sum + room.fileCount, 0) || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    업로드한 파일 개수
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">다운로드</CardTitle>
                  <Download className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analytics?.recentDownloads?.length || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    총 다운로드 수
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">채팅방</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analytics?.chatRoomBreakdown?.length || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    파일이 있는 방
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* File Type Breakdown Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  파일 형식별 용량
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {analytics?.typeBreakdown && (
                  <div className="space-y-3">
                    {Object.entries(analytics.typeBreakdown).map(([type, size]) => {
                      const percentage = analytics.totalSize > 0 ? (size / analytics.totalSize) * 100 : 0;
                      const typeLabels: Record<string, string> = {
                        images: '이미지',
                        documents: '문서',
                        audio: '오디오',
                        video: '비디오',
                        other: '기타'
                      };
                      
                      return (
                        <div key={type} className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="flex items-center gap-2">
                              {type === 'images' && <Image className="h-4 w-4 text-blue-500" />}
                              {type === 'video' && <Video className="h-4 w-4 text-red-500" />}
                              {type === 'audio' && <Music className="h-4 w-4 text-green-500" />}
                              {type === 'documents' && <FileText className="h-4 w-4 text-gray-500" />}
                              {type === 'other' && <Archive className="h-4 w-4 text-purple-500" />}
                              {typeLabels[type]}
                            </span>
                            <span>{formatFileSize(size)}</span>
                          </div>
                          <Progress value={percentage} className="h-2" />
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Chat Room Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  채팅방별 파일 현황
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analytics?.chatRoomBreakdown?.map((room, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <h4 className="font-medium">{room.roomName}</h4>
                        <p className="text-sm text-gray-500">
                          {room.fileCount}개 파일 • {formatFileSize(room.totalSize)}
                        </p>
                      </div>
                      <Badge variant="secondary">
                        {((room.totalSize / (analytics.totalSize || 1)) * 100).toFixed(1)}%
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="files" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>업로드한 파일 목록</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analytics?.recentDownloads?.map((file) => (
                    <div key={file.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        {getFileIcon(file.fileName)}
                        <div>
                          <h4 className="font-medium">{file.fileName}</h4>
                          <p className="text-sm text-gray-500">
                            {new Date(file.downloadedAt).toLocaleDateString('ko-KR')}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">
                            <Download className="h-3 w-3 mr-1" />
                            다운로드됨
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="downloads" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="h-5 w-5" />
                  다운로드 로그
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analytics?.recentDownloads?.map((download) => (
                    <div key={download.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                          <Download className="h-4 w-4 text-green-600" />
                        </div>
                        <div>
                          <h4 className="font-medium">{download.fileName}</h4>
                          <p className="text-sm text-gray-500">
                            {download.downloaderName}이 다운로드
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">
                          {new Date(download.downloadedAt).toLocaleString('ko-KR')}
                        </div>
                        <div className="text-xs text-gray-500">
                          {download.ipAddress}
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {(!analytics?.recentDownloads || analytics.recentDownloads.length === 0) && (
                    <div className="text-center py-8 text-gray-500">
                      아직 다운로드 기록이 없습니다
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}