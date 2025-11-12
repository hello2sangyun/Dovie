import { useState, useRef } from "react";
import { Play, Pause, Volume2, VolumeX, Download, ExternalLink, Image as ImageIcon, Video, FileText, File, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useFileCacheEntry } from "@/hooks/useFileCache";

const truncateFileName = (fileName: string, maxLength: number = 8): string => {
  if (fileName.length <= maxLength) return fileName;
  
  const extension = fileName.split('.').pop() || '';
  const nameWithoutExt = fileName.substring(0, fileName.lastIndexOf('.')) || fileName;
  
  if (extension && nameWithoutExt.length > maxLength - 3) {
    const truncatedName = nameWithoutExt.substring(0, maxLength - 3);
    return `${truncatedName}...${extension}`;
  }
  
  return fileName.substring(0, maxLength) + '...';
};

const formatFileSize = (size?: number) => {
  if (!size) return '';
  if (size < 1024) return `${size}B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(0)}KB`;
  return `${(size / (1024 * 1024)).toFixed(1)}MB`;
};

interface MediaPreviewProps {
  fileUrl: string;
  fileName: string;
  fileSize?: number;
  messageContent?: string;
  isMe: boolean;
  className?: string;
  summary?: string;
  onPreviewRequest?: (fileUrl: string, fileName: string, fileSize?: number, fileType?: string) => void;
}

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

const getDomain = (url: string): string => {
  try {
    return new URL(url).hostname.replace('www.', '');
  } catch {
    return 'link';
  }
};

interface LinkMetadata {
  title?: string;
  description?: string;
  image?: string;
  domain: string;
}

interface DownloadStateOverlayProps {
  status: 'idle' | 'loading' | 'success' | 'error';
  fileName: string;
  fileSize?: number;
  error?: Error | null;
  onRetry: () => void;
}

const DownloadStateOverlay = ({ status, fileName, fileSize, error, onRetry }: DownloadStateOverlayProps) => {
  if (status === 'success') {
    return (
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex flex-col items-center justify-center transition-opacity duration-300 opacity-0 pointer-events-none">
        <div className="text-white text-center px-4">
          <div className="text-sm font-medium">{fileName}</div>
          {fileSize && <div className="text-xs mt-1">{formatFileSize(fileSize)}</div>}
        </div>
      </div>
    );
  }

  if (status === 'loading') {
    return (
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex flex-col items-center justify-center z-10">
        <Loader2 className="h-8 w-8 text-white animate-spin mb-3" />
        <div className="text-white text-center px-4">
          <div className="text-sm font-medium mb-1">다운로드 중...</div>
          <div className="text-xs">{fileName}</div>
          {fileSize && <div className="text-xs mt-1">{formatFileSize(fileSize)}</div>}
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center z-10">
        <div className="text-white text-center px-4">
          <div className="text-sm font-medium mb-2">다운로드 실패</div>
          <div className="text-xs mb-1">{fileName}</div>
          {fileSize && <div className="text-xs mb-3">{formatFileSize(fileSize)}</div>}
          <Button
            variant="secondary"
            size="sm"
            onClick={onRetry}
            className="gap-2 mt-2"
            data-testid="button-retry-download"
          >
            <RefreshCw className="h-4 w-4" />
            다시 시도
          </Button>
        </div>
      </div>
    );
  }

  return null;
};

interface VideoPlayerProps {
  src: string;
  fileName: string;
  isMe: boolean;
  status: 'idle' | 'loading' | 'success' | 'error';
  uri: string | null;
  error: Error | null;
  refetch: () => void;
  fileSize?: number;
  onPreviewRequest?: () => void;
}

const VideoPlayer = ({ src, fileName, isMe, status, uri, error, refetch, fileSize, onPreviewRequest }: VideoPlayerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [metadataLoading, setMetadataLoading] = useState(true);

  const videoSrc = uri || src;

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
      setMetadataLoading(false);
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
    <div 
      className={cn(
        "relative bg-black rounded-lg overflow-hidden max-w-md min-h-[200px] cursor-pointer",
        isMe ? "ml-auto" : "mr-auto"
      )}
      onClick={(e) => {
        e.stopPropagation();
        onPreviewRequest && onPreviewRequest();
      }}
    >
      <video
        ref={videoRef}
        src={videoSrc}
        className="w-full h-auto max-h-80 object-contain"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => setIsPlaying(false)}
        playsInline
      />
      
      <DownloadStateOverlay
        status={status}
        fileName={fileName}
        fileSize={fileSize}
        error={error}
        onRetry={refetch}
      />

      {metadataLoading && status === 'success' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="animate-spin w-8 h-8 border-2 border-white border-t-transparent rounded-full"></div>
        </div>
      )}

      {!metadataLoading && status === 'success' && (
        <>
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  togglePlay();
                }}
                className="text-white hover:bg-white/20 p-1 h-8 w-8"
                data-testid="button-video-play-pause"
              >
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </Button>
              
              <div 
                className="flex-1 h-1 bg-white/30 rounded-full cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  handleSeek(e);
                }}
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
                onClick={(e) => {
                  e.stopPropagation();
                  toggleMute();
                }}
                className="text-white hover:bg-white/20 p-1 h-8 w-8"
                data-testid="button-video-mute"
              >
                {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          
          <div className="absolute top-2 left-2 bg-black/50 rounded px-2 py-1">
            <span className="text-white text-xs">{fileName}</span>
          </div>
          
          <div className="absolute top-2 right-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/20 p-1 h-8 w-8"
              onClick={(e) => {
                e.stopPropagation();
                window.open(videoSrc, '_blank');
              }}
              title="다운로드"
              data-testid="button-video-download"
            >
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </>
      )}
    </div>
  );
};

interface FilePreviewProps {
  fileUrl: string;
  fileName: string;
  fileSize?: number;
  isMe: boolean;
  summary?: string;
  status: 'idle' | 'loading' | 'success' | 'error';
  uri: string | null;
  error: Error | null;
  refetch: () => void;
  onPreviewRequest?: () => void;
}

const FilePreview = ({ fileUrl, fileName, fileSize, isMe, summary, status, uri, error, refetch, onPreviewRequest }: FilePreviewProps) => {
  const getFileIcon = () => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'pdf':
        return <FileText className="h-4 w-4 text-red-600" />;
      case 'doc':
      case 'docx':
        return <FileText className="h-4 w-4 text-blue-600" />;
      case 'xls':
      case 'xlsx':
        return <FileText className="h-4 w-4 text-green-600" />;
      case 'ppt':
      case 'pptx':
        return <FileText className="h-4 w-4 text-orange-600" />;
      case 'zip':
      case 'rar':
      case '7z':
        return <File className="h-4 w-4 text-purple-600" />;
      default:
        return <FileText className="h-4 w-4 text-gray-600" />;
    }
  };

  const handleFileClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (status === 'loading') {
      return;
    }
    
    const targetUrl = uri || fileUrl;
    
    if (onPreviewRequest) {
      onPreviewRequest();
    } else {
      window.open(targetUrl, '_blank');
    }
  };

  return (
    <div className="relative inline-block">
      <div 
        className={cn(
          "inline-flex items-center space-x-2 px-3 py-2 rounded-xl cursor-pointer transition-colors max-w-xs min-w-[150px]",
          isMe 
            ? "bg-blue-500 text-white hover:bg-blue-600" 
            : "bg-gray-100 text-gray-900 hover:bg-gray-200",
          status === 'loading' && "cursor-wait"
        )}
        onClick={handleFileClick}
        data-testid="file-preview-container"
      >
        <div className="flex-shrink-0">
          {getFileIcon()}
        </div>
        <div className="flex-1 min-w-0">
          <div className={cn("text-sm font-medium", isMe ? "text-white" : "text-gray-900")} title={fileName}>
            {summary || truncateFileName(fileName)}
          </div>
          <div className={cn("text-xs", isMe ? "text-blue-100" : "text-gray-500")}>
            {formatFileSize(fileSize)}
          </div>
        </div>
      </div>
      
      {(status === 'loading' || status === 'error') && (
        <DownloadStateOverlay
          status={status}
          fileName={fileName}
          fileSize={fileSize}
          error={error}
          onRetry={refetch}
        />
      )}
    </div>
  );
};

interface ImagePreviewProps {
  src: string;
  fileName: string;
  isMe: boolean;
  status: 'idle' | 'loading' | 'success' | 'error';
  uri: string | null;
  error: Error | null;
  refetch: () => void;
  fileSize?: number;
  onPreviewRequest?: () => void;
}

const ImagePreview = ({ src, fileName, isMe, status, uri, error, refetch, fileSize, onPreviewRequest }: ImagePreviewProps) => {
  const [hasError, setHasError] = useState(false);

  const imageSrc = uri || src;

  return (
    <div className={cn(
      "relative rounded-lg overflow-hidden w-full cursor-pointer min-h-[160px]",
      isMe ? "ml-auto" : "mr-auto"
    )} onClick={(e) => {
      e.stopPropagation();
      onPreviewRequest && onPreviewRequest();
    }}>
      <DownloadStateOverlay
        status={status}
        fileName={fileName}
        fileSize={fileSize}
        error={error}
        onRetry={refetch}
      />
      
      {hasError ? (
        <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
          <ImageIcon className="h-8 w-8 text-gray-400" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-gray-900 truncate">{fileName}</p>
            <p className="text-xs text-gray-500">이미지를 불러올 수 없습니다</p>
          </div>
        </div>
      ) : (
        <>
          {status === 'loading' && (
            <div className="w-full h-40 sm:h-48 bg-gray-100"></div>
          )}
          
          <img
            src={imageSrc}
            alt={fileName}
            className={cn(
              "w-full h-auto max-h-40 sm:max-h-48 object-cover",
              status === 'loading' && "invisible absolute"
            )}
            onLoad={() => {
              console.log(`Image loaded successfully: ${imageSrc}`);
            }}
            onError={(e) => {
              console.error(`Image decode error for ${imageSrc}:`, e);
              setHasError(true);
            }}
            data-testid="image-preview"
          />
        </>
      )}
      
      {!hasError && status === 'success' && (
        <>
          <div className="absolute top-1 left-1 sm:top-2 sm:left-2 bg-black/50 rounded px-1.5 py-0.5 sm:px-2 sm:py-1">
            <span className="text-white text-xs block" title={fileName}>{truncateFileName(fileName)}</span>
          </div>
          <div className="absolute top-1 right-1 sm:top-2 sm:right-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/20 p-1 h-6 w-6 sm:h-8 sm:w-8"
              onClick={(e) => {
                e.stopPropagation();
                window.open(imageSrc, '_blank');
              }}
              title="다운로드"
              data-testid="button-image-download"
            >
              <Download className="h-3 w-3 sm:h-4 sm:w-4" />
            </Button>
          </div>
        </>
      )}
    </div>
  );
};

const LinkPreview = ({ url, isMe }: { url: string; isMe: boolean }) => {
  const [metadata, setMetadata] = useState<LinkMetadata | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const domain = getDomain(url);

  useState(() => {
    const fetchMetadata = async () => {
      try {
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
  });

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

export default function MediaPreview({ fileUrl, fileName, fileSize, messageContent, isMe, className, summary, onPreviewRequest }: MediaPreviewProps) {
  const cacheResult = fileUrl ? useFileCacheEntry(fileUrl) : null;
  const { status = 'idle', uri = null, error = null, refetch = () => {} } = cacheResult || {};

  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const urls = messageContent?.match(urlRegex) || [];
  
  if (fileUrl) {
    const fileType = detectUrlType(fileUrl);
    const handlePreview = () => {
      if (onPreviewRequest) {
        const mimeType = fileType === 'image' ? 'image/jpeg' : 
                        fileType === 'video' ? 'video/mp4' : 
                        'application/octet-stream';
        onPreviewRequest(fileUrl, fileName, fileSize, mimeType);
      }
    };
    
    switch (fileType) {
      case 'image':
        return (
          <div className={className}>
            <ImagePreview 
              src={fileUrl} 
              fileName={fileName} 
              isMe={isMe}
              status={status}
              uri={uri}
              error={error}
              refetch={refetch}
              fileSize={fileSize}
              onPreviewRequest={handlePreview}
            />
          </div>
        );
        
      case 'video':
        return (
          <div className={className}>
            <VideoPlayer 
              src={fileUrl} 
              fileName={fileName} 
              isMe={isMe}
              status={status}
              uri={uri}
              error={error}
              refetch={refetch}
              fileSize={fileSize}
              onPreviewRequest={handlePreview}
            />
          </div>
        );
        
      default:
        return (
          <div className={className}>
            <FilePreview 
              fileUrl={fileUrl} 
              fileName={fileName} 
              fileSize={fileSize} 
              isMe={isMe} 
              summary={summary}
              status={status}
              uri={uri}
              error={error}
              refetch={refetch}
              onPreviewRequest={handlePreview}
            />
          </div>
        );
    }
  }
  
  if (urls.length > 0) {
    return (
      <div className={cn("space-y-2", className)}>
        {urls.slice(0, 3).map((url, index) => (
          <LinkPreview key={index} url={url} isMe={isMe} />
        ))}
      </div>
    );
  }
  
  return null;
}
