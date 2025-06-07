import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { usePerformanceMonitor } from "@/hooks/usePerformanceMonitor";
import { Activity, Zap, Clock, HardDrive } from "lucide-react";

interface PerformanceMonitorProps {
  showDetailed?: boolean;
}

export default function PerformanceMonitor({ showDetailed = false }: PerformanceMonitorProps) {
  const metrics = usePerformanceMonitor();
  const [bundleSize, setBundleSize] = useState(0);

  useEffect(() => {
    // 번들 크기 추정
    if ('navigator' in window && 'connection' in navigator) {
      const connection = (navigator as any).connection;
      if (connection) {
        setBundleSize(connection.downlink || 0);
      }
    }
  }, []);

  const getPerformanceLevel = (fps: number) => {
    if (fps >= 55) return { level: "최적", color: "bg-green-500" };
    if (fps >= 30) return { level: "양호", color: "bg-yellow-500" };
    return { level: "개선필요", color: "bg-red-500" };
  };

  const getMemoryUsage = () => {
    const mb = metrics.memoryUsage / (1024 * 1024);
    return mb.toFixed(1);
  };

  if (!showDetailed) {
    const { level, color } = getPerformanceLevel(metrics.fps);
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Card className="w-48 shadow-lg">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Activity className="h-4 w-4 text-gray-600" />
                <span className="text-sm font-medium">성능</span>
              </div>
              <Badge className={`${color} text-white`}>
                {level}
              </Badge>
            </div>
            <div className="mt-2 space-y-1">
              <div className="flex justify-between text-xs">
                <span>FPS</span>
                <span>{metrics.fps}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span>메모리</span>
                <span>{getMemoryUsage()}MB</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Zap className="h-5 w-5" />
            <span>실시간 성능 모니터</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* FPS 모니터링 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">프레임 레이트 (FPS)</span>
              <span className="text-lg font-bold">{metrics.fps}</span>
            </div>
            <Progress value={Math.min(metrics.fps, 60)} className="h-2" />
            <div className="flex justify-between text-xs text-gray-500">
              <span>0</span>
              <span>30</span>
              <span>60</span>
            </div>
          </div>

          {/* 메모리 사용량 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium flex items-center">
                <HardDrive className="h-4 w-4 mr-1" />
                메모리 사용량
              </span>
              <span className="text-lg font-bold">{getMemoryUsage()}MB</span>
            </div>
            <Progress value={Math.min((metrics.memoryUsage / (1024 * 1024 * 100)) * 100, 100)} className="h-2" />
          </div>

          {/* 로드 시간 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium flex items-center">
                <Clock className="h-4 w-4 mr-1" />
                페이지 로드 시간
              </span>
              <span className="text-lg font-bold">{(metrics.loadTime / 1000).toFixed(2)}s</span>
            </div>
            <Progress value={Math.min((metrics.loadTime / 5000) * 100, 100)} className="h-2" />
          </div>

          {/* 성능 등급 */}
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <span className="text-sm font-medium">전체 성능 등급</span>
            <Badge className={`${getPerformanceLevel(metrics.fps).color} text-white`}>
              {getPerformanceLevel(metrics.fps).level}
            </Badge>
          </div>

          {/* 최적화 제안 */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium">최적화 제안</h4>
            <div className="space-y-1 text-xs text-gray-600">
              {metrics.fps < 30 && (
                <div className="p-2 bg-red-50 rounded text-red-700">
                  • 프레임 레이트가 낮습니다. 애니메이션을 줄이거나 하드웨어 가속을 확인하세요.
                </div>
              )}
              {metrics.memoryUsage > 50 * 1024 * 1024 && (
                <div className="p-2 bg-yellow-50 rounded text-yellow-700">
                  • 메모리 사용량이 높습니다. 불필요한 데이터를 정리하세요.
                </div>
              )}
              {metrics.loadTime > 3000 && (
                <div className="p-2 bg-orange-50 rounded text-orange-700">
                  • 로드 시간이 깁니다. 이미지 최적화나 코드 분할을 고려하세요.
                </div>
              )}
              {metrics.fps >= 55 && metrics.memoryUsage < 30 * 1024 * 1024 && (
                <div className="p-2 bg-green-50 rounded text-green-700">
                  • 성능이 최적 상태입니다!
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}