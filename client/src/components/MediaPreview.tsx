import { useState, useRef, useEffect } from "react";
import { Play, Pause, Volume2, VolumeX, Download, ExternalLink, Image as ImageIcon, Video, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface MediaPreviewProps {
  fileUrl: string;
  fileName: string;
  fileSize?: number;
  messageContent?: string;
  isMe: boolean;
  className?: string;
}

// URL 패턴 감지 함수
const detectUrlType = (url: string): 'image' | 'video' | 'audio' | 'link' | 'file' => {
  const imageExtensions = /\.(jpg|jpeg|png|gif|webp|svg|bmp|ico)$/i;
  const videoExtensions = /\.(mp4|webm|avi|mov|wmv|flv|mkv|m4v)$/i;
  const audioExtensions = /\.(mp3|wav|ogg|aac|m4a|flac|wma)$/i;
  
  if (imageExtensions.test(url)) return 'image';
  if (videoExtensions.test(url)) return 'video';
  if (audioExtensions.test(url)) return 'audio';
  if (url.startsWith('http')) return 'link';
  return 'file';
};

// 링크에서 도메인 추출
const getDomain = (url: string): string => {
  try {
    return new URL(url).hostname.replace('www.', '');
  } catch {
    return 'link';
  }
};

// 링크 미리보기를 위한 메타데이터 타입
interface LinkMetadata {
  title?: string;
  description?: string;
  image?: string;
  domain: string;
}

// VideoPlayer 컴포넌트
const VideoPlayer = ({ src, fileName, isMe }: { src: string; fileName: string; isMe: boolean }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
      setIsLoading(false);
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (videoRef.current) {
      const rect = e.currentTarget.getBoundingClientRect();
      const pos = (e.clientX - rect.left) / rect.width;
      videoRef.current.currentTime = pos * duration;
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className={cn(
      "relative bg-black rounded-lg overflow-hidden max-w-md",
      isMe ? "ml-auto" : "mr-auto"
    )}>
      <video
        ref={videoRef}
        src={src}
        className="w-full h-auto max-h-80 object-contain"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => setIsPlaying(false)}
        playsInline
      />
      
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="animate-spin w-8 h-8 border-2 border-white border-t-transparent rounded-full"></div>
        </div>
      )}

      {/* Video Controls */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={togglePlay}
            className="text-white hover:bg-white/20 p-1 h-8 w-8"
          >
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
          
          <div 
            className="flex-1 h-1 bg-white/30 rounded-full cursor-pointer"
            onClick={handleSeek}
          >
            <div 
              className="h-full bg-white rounded-full transition-all"
              style={{ width: `${(currentTime / duration) * 100}%` }}
            />
          </div>
          
          <span className="text-white text-xs">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleMute}
            className="text-white hover:bg-white/20 p-1 h-8 w-8"
          >
            {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </Button>
        </div>
      </div>
      
      <div className="absolute top-2 left-2 bg-black/50 rounded px-2 py-1">
        <span className="text-white text-xs">{fileName}</span>
      </div>
    </div>
  );
};

// ImagePreview 컴포넌트
const ImagePreview = ({ src, fileName, isMe }: { src: string; fileName: string; isMe: boolean }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  return (
    <>
      <div className={cn(
        "relative rounded-lg overflow-hidden max-w-md cursor-pointer",
        isMe ? "ml-auto" : "mr-auto"
      )} onClick={() => setIsFullscreen(true)}>
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100 min-h-32">
            <div className="animate-spin w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full"></div>
          </div>
        )}
        
        {hasError ? (
          <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
            <ImageIcon className="h-8 w-8 text-gray-400" />
            <div>
              <p className="text-sm font-medium text-gray-900">{fileName}</p>
              <p className="text-xs text-gray-500">이미지를 불러올 수 없습니다</p>
            </div>
          </div>
        ) : (
          <img
            src={src}
            alt={fileName}
            className="w-full h-auto max-h-80 object-cover"
            onLoad={() => setIsLoading(false)}
            onError={() => {
              setIsLoading(false);
              setHasError(true);
            }}
          />
        )}
        
        {!hasError && !isLoading && (
          <div className="absolute top-2 left-2 bg-black/50 rounded px-2 py-1">
            <span className="text-white text-xs">{fileName}</span>
          </div>
        )}
      </div>

      {/* 전체화면 모달 */}
      {isFullscreen && (
        <div 
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setIsFullscreen(false)}
        >
          <img
            src={src}
            alt={fileName}
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <Button
            variant="ghost"
            size="sm"
            className="absolute top-4 right-4 text-white hover:bg-white/20"
            onClick={() => setIsFullscreen(false)}
          >
            ✕
          </Button>
        </div>
      )}
    </>
  );
};

// LinkPreview 컴포넌트
const LinkPreview = ({ url, isMe }: { url: string; isMe: boolean }) => {
  const [metadata, setMetadata] = useState<LinkMetadata | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const domain = getDomain(url);

  useEffect(() => {
    // 링크 메타데이터 가져오기 (실제 구현에서는 서버에서 처리)
    const fetchMetadata = async () => {
      try {
        // 임시로 도메인 기반 기본 정보 표시
        setMetadata({
          title: `${domain} 링크`,
          description: "링크를 열어서 내용을 확인하세요",
          domain: domain
        });
      } catch (error) {
        console.error('링크 메타데이터 가져오기 실패:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMetadata();
  }, [url, domain]);

  if (isLoading) {
    return (
      <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg animate-pulse max-w-md">
        <div className="w-12 h-12 bg-gray-200 rounded"></div>
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "block border border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition-colors max-w-md",
        isMe ? "ml-auto" : "mr-auto"
      )}
    >
      <div className="flex items-start space-x-3">
        <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
          <ExternalLink className="h-6 w-6 text-blue-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">
            {metadata?.title || domain}
          </p>
          <p className="text-xs text-gray-500 mt-1 line-clamp-2">
            {metadata?.description || url}
          </p>
          <p className="text-xs text-blue-600 mt-1">{domain}</p>
        </div>
      </div>
    </a>
  );
};

export default function MediaPreview({ fileUrl, fileName, fileSize, messageContent, isMe, className }: MediaPreviewProps) {
  // 메시지 내용에서 URL 추출
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const urls = messageContent?.match(urlRegex) || [];
  
  // 파일 URL이 있는 경우 파일 타입 감지
  if (fileUrl) {
    const fileType = detectUrlType(fileUrl);
    
    switch (fileType) {
      case 'image':
        return (
          <div className={className}>
            <ImagePreview src={fileUrl} fileName={fileName} isMe={isMe} />
          </div>
        );
        
      case 'video':
        return (
          <div className={className}>
            <VideoPlayer src={fileUrl} fileName={fileName} isMe={isMe} />
          </div>
        );
        
      default:
        return (
          <div className={cn("flex items-center space-x-3 p-3 bg-gray-50 rounded-lg max-w-md", className)}>
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <FileText className="h-5 w-5 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{fileName}</p>
              {fileSize && (
                <p className="text-xs text-gray-500">{(fileSize / 1024).toFixed(1)} KB</p>
              )}
            </div>
            <Button variant="ghost" size="sm" asChild>
              <a href={fileUrl} download={fileName}>
                <Download className="h-4 w-4" />
              </a>
            </Button>
          </div>
        );
    }
  }
  
  // 메시지 내용에 링크가 있는 경우 링크 미리보기
  if (urls.length > 0) {
    return (
      <div className={cn("space-y-2", className)}>
        {urls.slice(0, 3).map((url, index) => ( // 최대 3개 링크만 미리보기
          <LinkPreview key={index} url={url} isMe={isMe} />
        ))}
      </div>
    );
  }
  
  return null;
}