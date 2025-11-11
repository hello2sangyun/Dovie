import { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, Download, File, FileText, FileImage, FileVideo, FileAudio, FileCode, ZoomIn, ZoomOut, Share2, Send } from 'lucide-react';
import { Share } from '@capacitor/share';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';
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
}

export const FilePreviewModal: React.FC<FilePreviewModalProps> = ({
  isOpen,
  onClose,
  fileUrl,
  fileName,
  fileSize,
  fileType,
  messageId,
  onForward
}) => {
  const [zoom, setZoom] = useState(100);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const isNative = Capacitor.isNativePlatform();
  const extension = fileName.split('.').pop()?.toLowerCase();
  const mimeType = fileType || getFileTypeFromExtension(extension);
  const isImage = mimeType.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(extension || '');
  const isPDF = mimeType === 'application/pdf' || extension === 'pdf';

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

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 25, 200));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 25, 50));

  const handleClose = () => {
    setZoom(100);
    onClose();
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
          const file = new (File as any)([blob], fileName, { type: mimeType });
          
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

  const handleDownload = handleSaveToDevice;

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

  const renderFileContent = () => {
    if (isImage) {
      return (
        <div className="flex-1 flex items-center justify-center p-4 overflow-auto bg-black/5 dark:bg-black/20">
          <img
            src={fileUrl}
            alt={fileName}
            className="max-w-full max-h-full object-contain transition-transform duration-200"
            style={{ 
              maxHeight: 'calc(90vh - 180px)',
              transform: `scale(${zoom / 100})`
            }}
            data-testid="image-preview"
          />
        </div>
      );
    } else if (isPDF) {
      return (
        <div className="flex-1 overflow-auto p-4 bg-gray-50 dark:bg-gray-900">
          <iframe
            src={fileUrl}
            className="w-full h-full min-h-[60vh] border-0 rounded"
            title={fileName}
            data-testid="pdf-preview"
          />
        </div>
      );
    } else {
      return (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <div className="bg-purple-100 dark:bg-purple-900/30 p-6 rounded-full mb-4">
            {getFileIcon()}
          </div>
          <h3 className="text-lg font-semibold mb-2 break-all px-4">{fileName}</h3>
          <p className="text-sm text-muted-foreground mb-1">
            파일 크기: {formatFileSize(fileSize)}
          </p>
          <p className="text-sm text-muted-foreground mb-6">
            이 파일 형식은 미리보기를 지원하지 않습니다.
          </p>
          <Button 
            onClick={() => window.open(fileUrl, '_blank')}
            className="bg-purple-600 hover:bg-purple-700"
            data-testid="button-open-external"
          >
            <FileText className="h-4 w-4 mr-2" />
            외부 앱으로 열기
          </Button>
        </div>
      );
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 bg-white dark:bg-gray-900 border-0 overflow-hidden">
        <div className="relative w-full h-full flex flex-col">
          {/* 헤더 */}
          <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-600 to-purple-700 dark:from-purple-800 dark:to-purple-900">
            <h3 className="text-white font-medium truncate max-w-[60%]">
              {fileName}
            </h3>
            <div className="flex items-center gap-2">
              {isImage && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleZoomOut}
                    disabled={zoom <= 50}
                    className="text-white hover:bg-white/20 h-8 w-8 p-0"
                    data-testid="button-zoom-out"
                  >
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                  <span className="text-white text-sm min-w-[4rem] text-center">
                    {zoom}%
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleZoomIn}
                    disabled={zoom >= 200}
                    className="text-white hover:bg-white/20 h-8 w-8 p-0"
                    data-testid="button-zoom-in"
                  >
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                  <div className="w-px h-6 bg-white/30 mx-1" />
                </>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClose}
                className="text-white hover:bg-white/20"
                data-testid="button-close-file-preview"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* 파일 콘텐츠 */}
          {renderFileContent()}

          {/* 액션 버튼들 */}
          <div className="flex items-center justify-around p-4 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleShare}
              disabled={isLoading}
              className="flex flex-col items-center gap-1 h-auto py-2 px-4"
              data-testid="button-share-file"
            >
              <Share2 className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              <span className="text-xs">공유</span>
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSaveToDevice}
              disabled={isLoading}
              className="flex flex-col items-center gap-1 h-auto py-2 px-4"
              data-testid="button-save-file"
            >
              <Download className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              <span className="text-xs">저장</span>
            </Button>
            
            {onForward && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onForward}
                disabled={isLoading}
                className="flex flex-col items-center gap-1 h-auto py-2 px-4"
                data-testid="button-forward-file"
              >
                <Send className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                <span className="text-xs">전달</span>
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
