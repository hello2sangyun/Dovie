import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { X, Download, File, FileText, FileImage, FileVideo, FileAudio, FileCode, Share2, Send, ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import { isNativePlatform, loadShare, loadFilesystem } from '@/lib/nativeBridge';
import { useToast } from '@/hooks/use-toast';

interface FilePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileUrl: string;
  fileName: string;
  fileSize?: number;
  fileType?: string;
  messageId?: number;
  onForward?: () => void;
  onNavigate?: (direction: 'prev' | 'next') => void;
  canNavigatePrev?: boolean;
  canNavigateNext?: boolean;
  currentIndex?: number;
  totalFiles?: number;
}

export const FilePreviewModal: React.FC<FilePreviewModalProps> = ({
  isOpen,
  onClose,
  fileUrl,
  fileName,
  fileSize,
  fileType,
  messageId,
  onForward,
  onNavigate,
  canNavigatePrev = false,
  canNavigateNext = false,
  currentIndex,
  totalFiles
}) => {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [showUI, setShowUI] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastTouchDistance = useRef<number>(0);
  const lastTouchPos = useRef({ x: 0, y: 0 });
  const isDragging = useRef(false);
  const uiTimeoutRef = useRef<NodeJS.Timeout>();
  const lastTapRef = useRef<number>(0);
  const swipeStartX = useRef<number>(0);
  const swipeStartY = useRef<number>(0);
  const swipeCurrentX = useRef<number>(0);
  const swipeCurrentY = useRef<number>(0);
  const swipeDirection = useRef<'horizontal' | 'vertical' | null>(null);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [swipeOffsetX, setSwipeOffsetX] = useState(0);

  const isNative = isNativePlatform();
  const extension = fileName.split('.').pop()?.toLowerCase();
  const mimeType = fileType || getFileTypeFromExtension(extension);
  const isImage = mimeType.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(extension || '');
  const isPDF = mimeType === 'application/pdf' || extension === 'pdf';
  const isVideo = mimeType.startsWith('video/') || ['mp4', 'webm', 'ogg', 'mov'].includes(extension || '');

  function getFileTypeFromExtension(ext?: string): string {
    if (!ext) return 'application/octet-stream';
    const types: Record<string, string> = {
      'jpg': 'image/jpeg', 'jpeg': 'image/jpeg', 'png': 'image/png', 'gif': 'image/gif',
      'webp': 'image/webp', 'svg': 'image/svg+xml', 'pdf': 'application/pdf',
      'doc': 'application/msword', 'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'xls': 'application/vnd.ms-excel', 'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'ppt': 'application/vnd.ms-powerpoint', 'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'txt': 'text/plain', 'mp4': 'video/mp4', 'mp3': 'audio/mpeg'
    };
    return types[ext] || 'application/octet-stream';
  }

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setScale(1);
      setPosition({ x: 0, y: 0 });
      setShowUI(true);
      setSwipeOffset(0);
      setSwipeOffsetX(0);
      swipeDirection.current = null;
      resetUITimeout();
    }
  }, [isOpen]);

  // Auto-hide UI after 3 seconds
  const resetUITimeout = () => {
    if (uiTimeoutRef.current) {
      clearTimeout(uiTimeoutRef.current);
    }
    setShowUI(true);
    uiTimeoutRef.current = setTimeout(() => {
      if (isImage || isVideo) {
        setShowUI(false);
      }
    }, 3000);
  };

  useEffect(() => {
    return () => {
      if (uiTimeoutRef.current) {
        clearTimeout(uiTimeoutRef.current);
      }
    };
  }, []);

  const handleClose = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
    onClose();
  };

  // Calculate distance between two touch points
  const getTouchDistance = (touches: React.TouchList) => {
    if (touches.length < 2) return 0;
    const touch1 = touches[0];
    const touch2 = touches[1];
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  // Get center point between two touches
  const getTouchCenter = (touches: React.TouchList) => {
    if (touches.length < 2) return { x: 0, y: 0 };
    return {
      x: (touches[0].clientX + touches[1].clientX) / 2,
      y: (touches[0].clientY + touches[1].clientY) / 2
    };
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!isImage && !isVideo) return;
    
    const now = Date.now();
    const timeSinceLastTap = now - lastTapRef.current;
    
    // Double tap to reset
    if (timeSinceLastTap < 300 && timeSinceLastTap > 0) {
      e.preventDefault();
      setScale(1);
      setPosition({ x: 0, y: 0 });
      resetUITimeout();
      return;
    }
    lastTapRef.current = now;

    if (e.touches.length === 2) {
      // Pinch zoom
      e.preventDefault();
      lastTouchDistance.current = getTouchDistance(e.touches);
    } else if (e.touches.length === 1) {
      // Pan or swipe to dismiss/navigate
      const touch = e.touches[0];
      lastTouchPos.current = {
        x: touch.clientX,
        y: touch.clientY
      };
      swipeStartX.current = touch.clientX;
      swipeStartY.current = touch.clientY;
      swipeCurrentX.current = touch.clientX;
      swipeCurrentY.current = touch.clientY;
      swipeDirection.current = null;
      isDragging.current = scale > 1;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isImage && !isVideo) return;

    if (e.touches.length === 2) {
      // Pinch zoom
      e.preventDefault();
      const distance = getTouchDistance(e.touches);
      if (lastTouchDistance.current > 0) {
        const delta = distance / lastTouchDistance.current;
        const newScale = Math.min(Math.max(scale * delta, 0.5), 5);
        setScale(newScale);
      }
      lastTouchDistance.current = distance;
      resetUITimeout();
    } else if (e.touches.length === 1) {
      const touch = e.touches[0];
      const deltaX = touch.clientX - lastTouchPos.current.x;
      const deltaY = touch.clientY - lastTouchPos.current.y;
      
      if (isDragging.current && scale > 1) {
        // Pan while zoomed
        e.preventDefault();
        setPosition(prev => ({
          x: prev.x + deltaX,
          y: prev.y + deltaY
        }));
        
        lastTouchPos.current = {
          x: touch.clientX,
          y: touch.clientY
        };
        resetUITimeout();
      } else if (scale === 1) {
        // Determine swipe direction on first significant movement
        swipeCurrentX.current = touch.clientX;
        swipeCurrentY.current = touch.clientY;
        const totalDeltaX = swipeCurrentX.current - swipeStartX.current;
        const totalDeltaY = swipeCurrentY.current - swipeStartY.current;
        
        if (swipeDirection.current === null && (Math.abs(totalDeltaX) > 10 || Math.abs(totalDeltaY) > 10)) {
          // Determine direction based on initial movement
          if (Math.abs(totalDeltaX) > Math.abs(totalDeltaY)) {
            swipeDirection.current = 'horizontal';
          } else {
            swipeDirection.current = 'vertical';
          }
        }
        
        // Handle horizontal swipe for navigation
        if (swipeDirection.current === 'horizontal' && onNavigate && (canNavigatePrev || canNavigateNext)) {
          e.preventDefault();
          const swipeDeltaX = totalDeltaX;
          
          // Only allow swipes in available directions
          if ((swipeDeltaX > 0 && canNavigatePrev) || (swipeDeltaX < 0 && canNavigateNext)) {
            setSwipeOffsetX(swipeDeltaX);
          }
          resetUITimeout();
        } 
        // Handle vertical swipe to dismiss
        else if (swipeDirection.current === 'vertical') {
          const swipeDeltaY = totalDeltaY;
          
          // Only allow downward swipes
          if (swipeDeltaY > 0) {
            e.preventDefault();
            setSwipeOffset(swipeDeltaY);
            resetUITimeout();
          }
        }
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!isImage && !isVideo) return;
    
    // Check horizontal swipe for navigation
    const swipeDeltaX = swipeCurrentX.current - swipeStartX.current;
    const swipeDeltaY = swipeCurrentY.current - swipeStartY.current;
    
    if (scale === 1 && swipeDirection.current === 'horizontal' && onNavigate) {
      // Navigate if swipe was far enough (threshold: 100px)
      if (Math.abs(swipeDeltaX) > 100) {
        if (swipeDeltaX > 0 && canNavigatePrev) {
          onNavigate('prev');
        } else if (swipeDeltaX < 0 && canNavigateNext) {
          onNavigate('next');
        }
      }
      // Reset horizontal offset
      setSwipeOffsetX(0);
    } 
    // Check vertical swipe to close
    else if (scale === 1 && swipeDirection.current === 'vertical' && swipeDeltaY > 150) {
      handleClose();
    } else {
      // Reset all offsets
      setSwipeOffset(0);
      setSwipeOffsetX(0);
    }
    
    swipeDirection.current = null;
    isDragging.current = false;
    if (e.touches.length === 0) {
      lastTouchDistance.current = 0;
    }
  };

  // Toggle UI on tap (when not zoomed)
  const handleImageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (scale === 1) {
      // If navigation is enabled, divide the image into 3 zones
      if (onNavigate && (canNavigatePrev || canNavigateNext)) {
        const rect = e.currentTarget.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const width = rect.width;
        
        // Left third - previous file
        if (clickX < width / 3 && canNavigatePrev) {
          onNavigate('prev');
          return;
        }
        
        // Right third - next file
        if (clickX > (width * 2) / 3 && canNavigateNext) {
          onNavigate('next');
          return;
        }
        
        // Middle third - toggle UI (fall through)
      }
      
      // Toggle UI (default behavior for middle or when no navigation)
      setShowUI(prev => !prev);
      if (!showUI) {
        resetUITimeout();
      }
    }
  };

  const handleShare = async () => {
    try {
      setIsLoading(true);
      
      if (isNative) {
        await Share.share({
          title: fileName,
          url: fileUrl,
          dialogTitle: '공유하기'
        });
      } else {
        if (navigator.share) {
          const response = await fetch(fileUrl);
          const blob = await response.blob();
          const file = new (window as any).File([blob], fileName, { type: mimeType });
          
          await navigator.share({
            files: [file],
            title: fileName
          });
        } else {
          toast({
            title: "공유 불가",
            description: "이 브라우저는 공유 기능을 지원하지 않습니다.",
            variant: "destructive"
          });
        }
      }
    } catch (error: any) {
      if (error?.message !== 'Share canceled') {
        console.error('Share error:', error);
        toast({
          title: "공유 실패",
          description: "파일 공유 중 오류가 발생했습니다.",
          variant: "destructive"
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveToDevice = async () => {
    try {
      setIsLoading(true);

      if (isNative) {
        const response = await fetch(fileUrl);
        const blob = await response.blob();
        const reader = new FileReader();
        
        reader.onloadend = async () => {
          const base64 = reader.result as string;
          const base64Data = base64.split(',')[1];
          
          try {
            await Filesystem.writeFile({
              path: fileName,
              data: base64Data,
              directory: Directory.Documents
            });
            
            toast({
              title: "저장 완료",
              description: "파일이 Documents 폴더에 저장되었습니다."
            });
          } catch (fsError) {
            console.error('Filesystem error:', fsError);
            toast({
              title: "저장 실패",
              description: "파일 저장 중 오류가 발생했습니다.",
              variant: "destructive"
            });
          }
        };
        
        reader.readAsDataURL(blob);
      } else {
        const link = document.createElement('a');
        link.href = fileUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        toast({
          title: "다운로드 시작",
          description: "파일 다운로드를 시작했습니다."
        });
      }
    } catch (error) {
      console.error('Save error:', error);
      toast({
        title: "저장 실패",
        description: "파일 저장 중 오류가 발생했습니다.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '알 수 없음';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = () => {
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(extension || '')) {
      return <FileImage className="h-16 w-16 text-purple-600 dark:text-purple-400" />;
    }
    if (['mp4', 'avi', 'mov', 'wmv', 'webm'].includes(extension || '')) {
      return <FileVideo className="h-16 w-16 text-purple-600 dark:text-purple-400" />;
    }
    if (['mp3', 'wav', 'ogg', 'm4a'].includes(extension || '')) {
      return <FileAudio className="h-16 w-16 text-purple-600 dark:text-purple-400" />;
    }
    if (['txt', 'md', 'doc', 'docx', 'pdf'].includes(extension || '')) {
      return <FileText className="h-16 w-16 text-purple-600 dark:text-purple-400" />;
    }
    if (['js', 'ts', 'jsx', 'tsx', 'py', 'java', 'cpp', 'c', 'html', 'css'].includes(extension || '')) {
      return <FileCode className="h-16 w-16 text-purple-600 dark:text-purple-400" />;
    }
    return <File className="h-16 w-16 text-purple-600 dark:text-purple-400" />;
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[9999] bg-black transition-opacity duration-300"
      ref={containerRef}
      style={{
        opacity: swipeOffset > 0 ? Math.max(0, 1 - swipeOffset / 300) : 1
      }}
    >
      {/* Top overlay - Back and Close buttons */}
      <div 
        className={`absolute top-0 left-0 right-0 z-10 transition-opacity duration-300 ${
          showUI ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="flex items-center justify-between p-4 bg-gradient-to-b from-black/80 to-transparent">
          {/* Back button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            className="text-white hover:bg-white/20 h-10 w-10 p-0 rounded-full"
            data-testid="button-back-file-preview"
          >
            <ArrowLeft className="h-6 w-6" />
          </Button>
          
          {/* File name */}
          <h3 className="text-white font-medium truncate max-w-[50%] text-sm absolute left-1/2 transform -translate-x-1/2">
            {fileName}
          </h3>
          
          {/* Close button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            className="text-white hover:bg-white/20 h-10 w-10 p-0 rounded-full"
            data-testid="button-close-file-preview"
          >
            <X className="h-6 w-6" />
          </Button>
        </div>
      </div>

      {/* Navigation buttons - Left and Right */}
      {onNavigate && (isImage || isVideo) && (
        <>
          {/* Left navigation button */}
          {canNavigatePrev && (
            <div 
              className={`absolute left-4 top-1/2 -translate-y-1/2 z-10 transition-opacity duration-300 ${
                showUI ? 'opacity-100' : 'opacity-0 pointer-events-none'
              }`}
            >
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onNavigate('prev')}
                className="text-white hover:bg-white/20 h-12 w-12 p-0 rounded-full bg-black/40 backdrop-blur-sm"
                data-testid="button-prev-file"
              >
                <ChevronLeft className="h-8 w-8" />
              </Button>
            </div>
          )}
          
          {/* Right navigation button */}
          {canNavigateNext && (
            <div 
              className={`absolute right-4 top-1/2 -translate-y-1/2 z-10 transition-opacity duration-300 ${
                showUI ? 'opacity-100' : 'opacity-0 pointer-events-none'
              }`}
            >
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onNavigate('next')}
                className="text-white hover:bg-white/20 h-12 w-12 p-0 rounded-full bg-black/40 backdrop-blur-sm"
                data-testid="button-next-file"
              >
                <ChevronRight className="h-8 w-8" />
              </Button>
            </div>
          )}

          {/* File counter */}
          {currentIndex !== undefined && totalFiles && (
            <div 
              className={`absolute top-20 left-1/2 -translate-x-1/2 z-10 transition-opacity duration-300 ${
                showUI ? 'opacity-100' : 'opacity-0 pointer-events-none'
              }`}
            >
              <div className="bg-black/60 backdrop-blur-sm text-white px-3 py-1 rounded-full text-sm">
                {currentIndex} / {totalFiles}
              </div>
            </div>
          )}
        </>
      )}

      {/* Main content */}
      <div className="absolute inset-0 flex items-center justify-center">
        {isImage ? (
          <div 
            className="relative w-full h-full flex items-center justify-center overflow-hidden"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onClick={handleImageClick}
          >
            <img
              ref={imageRef}
              src={fileUrl}
              alt={fileName}
              className="max-w-full max-h-full object-contain select-none"
              style={{ 
                transform: `scale(${scale}) translate(${(position.x + swipeOffsetX) / scale}px, ${(position.y + swipeOffset) / scale}px)`,
                touchAction: 'none',
                transition: (swipeOffset === 0 && swipeOffsetX === 0) ? 'transform 0.2s ease-out' : 'none'
              }}
              draggable={false}
              data-testid="image-preview"
            />
          </div>
        ) : isVideo ? (
          <div 
            className="relative w-full h-full flex items-center justify-center bg-black overflow-hidden"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onClick={handleImageClick}
          >
            <div
              style={{
                transform: `translate(${swipeOffsetX}px, ${swipeOffset}px)`,
                transition: (swipeOffset === 0 && swipeOffsetX === 0) ? 'transform 0.2s ease-out' : 'none'
              }}
            >
              <video
                src={fileUrl}
                className="max-w-full max-h-full object-contain"
                controls
                playsInline
                autoPlay={false}
                data-testid="video-preview"
              />
            </div>
          </div>
        ) : isPDF ? (
          <iframe
            src={fileUrl}
            className="w-full h-full border-0"
            title={fileName}
            data-testid="pdf-preview"
          />
        ) : (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <div className="bg-purple-100 dark:bg-purple-900/30 p-8 rounded-full mb-6">
              {getFileIcon()}
            </div>
            <h3 className="text-white text-xl font-semibold mb-3 break-all px-4 max-w-md">
              {fileName}
            </h3>
            <p className="text-gray-300 text-sm mb-2">
              파일 크기: {formatFileSize(fileSize)}
            </p>
            <p className="text-gray-400 text-sm mb-8">
              이 파일 형식은 미리보기를 지원하지 않습니다.
            </p>
            <Button 
              onClick={() => window.open(fileUrl, '_blank')}
              className="bg-purple-600 hover:bg-purple-700 text-white"
              data-testid="button-open-external"
            >
              <FileText className="h-4 w-4 mr-2" />
              외부 앱으로 열기
            </Button>
          </div>
        )}
      </div>

      {/* Bottom overlay - Action buttons */}
      <div 
        className={`absolute bottom-0 left-0 right-0 z-10 transition-opacity duration-300 ${
          showUI ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="flex items-center justify-around p-6 bg-gradient-to-t from-black/80 to-transparent">
          <button
            onClick={handleShare}
            disabled={isLoading}
            className="flex flex-col items-center gap-1 text-white hover:text-purple-400 transition-colors disabled:opacity-50"
            data-testid="button-share-file"
          >
            <div className="bg-white/10 hover:bg-white/20 rounded-full p-3 transition-colors">
              <Share2 className="h-6 w-6" />
            </div>
            <span className="text-xs">공유</span>
          </button>
          
          <button
            onClick={handleSaveToDevice}
            disabled={isLoading}
            className="flex flex-col items-center gap-1 text-white hover:text-purple-400 transition-colors disabled:opacity-50"
            data-testid="button-save-file"
          >
            <div className="bg-white/10 hover:bg-white/20 rounded-full p-3 transition-colors">
              <Download className="h-6 w-6" />
            </div>
            <span className="text-xs">저장</span>
          </button>
          
          {onForward && (
            <button
              onClick={onForward}
              disabled={isLoading}
              className="flex flex-col items-center gap-1 text-white hover:text-purple-400 transition-colors disabled:opacity-50"
              data-testid="button-forward-file"
            >
              <div className="bg-white/10 hover:bg-white/20 rounded-full p-3 transition-colors">
                <Send className="h-6 w-6" />
              </div>
              <span className="text-xs">전달</span>
            </button>
          )}
        </div>
      </div>

      {/* Zoom indicator (only show when zoomed) */}
      {isImage && scale !== 1 && showUI && (
        <div className="absolute top-20 left-1/2 transform -translate-x-1/2 bg-black/60 text-white px-4 py-2 rounded-full text-sm z-20">
          {Math.round(scale * 100)}%
        </div>
      )}
    </div>
  );
};
