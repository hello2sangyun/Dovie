import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Play, Search, X } from "lucide-react";

interface YouTubeVideo {
  videoId: string;
  title: string;
  channelTitle: string;
  thumbnailUrl: string;
  description: string;
  publishedAt: string;
  duration?: string;
  viewCount?: string;
}

interface YoutubeSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (video: YouTubeVideo) => void;
  initialQuery: string;
}

export default function YoutubeSelectionModal({ 
  isOpen, 
  onClose, 
  onSelect, 
  initialQuery 
}: YoutubeSelectionModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [videos, setVideos] = useState<YouTubeVideo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 모달이 열릴 때 초기 검색 쿼리 설정 및 검색 실행
  useEffect(() => {
    if (isOpen) {
      setSearchQuery(initialQuery);
      if (initialQuery.trim()) {
        console.log('🎥 YouTube 모달 열림, 초기 검색:', initialQuery);
        performSearch(initialQuery);
      }
    } else {
      // 모달이 닫힐 때 상태 초기화
      setVideos([]);
      setError(null);
      setSearchQuery("");
    }
  }, [isOpen, initialQuery]);

  const performSearch = async (query: string) => {
    if (!query.trim()) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/youtube/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, maxResults: 8 })
      });
      
      if (!response.ok) {
        throw new Error('YouTube 검색 실패');
      }
      
      const data = await response.json();
      
      if (data.success && data.videos) {
        setVideos(data.videos);
      } else {
        setError('검색 결과를 찾을 수 없습니다.');
        setVideos([]);
      }
    } catch (error) {
      console.error('YouTube 검색 오류:', error);
      setError('검색 중 오류가 발생했습니다.');
      setVideos([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = () => {
    performSearch(searchQuery);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const formatDuration = (duration: string) => {
    // PT4M13S 형식을 4:13으로 변환
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return '';
    
    const hours = parseInt(match[1] || '0');
    const minutes = parseInt(match[2] || '0');
    const seconds = parseInt(match[3] || '0');
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    } else {
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
  };

  const formatViewCount = (count: string) => {
    const num = parseInt(count);
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M회`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K회`;
    } else {
      return `${num}회`;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>YouTube 영상 선택</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* 검색 입력 */}
          <div className="flex gap-2">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="YouTube에서 검색할 내용을 입력하세요..."
              className="flex-1"
            />
            <Button onClick={handleSearch} disabled={isLoading}>
              <Search className="h-4 w-4 mr-2" />
              검색
            </Button>
          </div>

          {/* 로딩 상태 */}
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
              <span className="ml-2">검색 중...</span>
            </div>
          )}

          {/* 오류 메시지 */}
          {error && (
            <div className="text-center py-8 text-red-500">
              {error}
            </div>
          )}

          {/* 검색 결과 */}
          {!isLoading && !error && videos.length > 0 && (
            <ScrollArea className="h-96">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pr-4">
                {videos.map((video, index) => (
                  <div
                    key={video.videoId}
                    className="border rounded-lg p-3 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors"
                    onClick={() => onSelect(video)}
                  >
                    <div className="relative">
                      <img
                        src={video.thumbnailUrl}
                        alt={video.title}
                        className="w-full h-32 object-cover rounded"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-20 rounded hover:bg-opacity-40 transition-all">
                        <Play className="h-8 w-8 text-white" />
                      </div>
                      {video.duration && (
                        <div className="absolute bottom-1 right-1 bg-black bg-opacity-75 text-white text-xs px-1 rounded">
                          {formatDuration(video.duration)}
                        </div>
                      )}
                    </div>
                    
                    <div className="mt-2 space-y-1">
                      <h3 className="font-medium text-sm line-clamp-2" title={video.title}>
                        {video.title}
                      </h3>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {video.channelTitle}
                      </p>
                      {video.viewCount && (
                        <p className="text-xs text-gray-500">
                          조회수 {formatViewCount(video.viewCount)}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}

          {/* 검색 결과 없음 */}
          {!isLoading && !error && videos.length === 0 && searchQuery && (
            <div className="text-center py-8 text-gray-500">
              검색 결과가 없습니다.
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}