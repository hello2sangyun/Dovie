import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, Download, File, FileText, FileImage, FileVideo, FileAudio, FileCode } from 'lucide-react';

interface FilePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileUrl: string;
  fileName: string;
  fileSize?: number;
}

export const FilePreviewModal: React.FC<FilePreviewModalProps> = ({
  isOpen,
  onClose,
  fileUrl,
  fileName,
  fileSize
}) => {
  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '알 수 없음';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = () => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(extension || '')) {
      return <FileImage className="h-16 w-16 text-purple-600" />;
    }
    if (['mp4', 'avi', 'mov', 'wmv', 'webm'].includes(extension || '')) {
      return <FileVideo className="h-16 w-16 text-purple-600" />;
    }
    if (['mp3', 'wav', 'ogg', 'm4a'].includes(extension || '')) {
      return <FileAudio className="h-16 w-16 text-purple-600" />;
    }
    if (['txt', 'md', 'doc', 'docx', 'pdf'].includes(extension || '')) {
      return <FileText className="h-16 w-16 text-purple-600" />;
    }
    if (['js', 'ts', 'jsx', 'tsx', 'py', 'java', 'cpp', 'c', 'html', 'css'].includes(extension || '')) {
      return <FileCode className="h-16 w-16 text-purple-600" />;
    }
    return <File className="h-16 w-16 text-purple-600" />;
  };

  const getFileType = () => {
    const extension = fileName.split('.').pop()?.toUpperCase();
    return extension || '파일';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <div className="flex flex-col space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">파일 정보</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0"
              data-testid="button-close-file-preview"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* File Icon */}
          <div className="flex flex-col items-center justify-center space-y-4 py-6 bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-lg">
            {getFileIcon()}
            <div className="text-center">
              <div className="inline-block px-3 py-1 bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 rounded-full text-xs font-medium mb-2">
                {getFileType()}
              </div>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 break-all px-4">
                {fileName}
              </p>
            </div>
          </div>

          {/* File Details */}
          <div className="space-y-2 bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">파일 크기</span>
              <span className="font-medium text-gray-900 dark:text-gray-100" data-testid="file-size">
                {formatFileSize(fileSize)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">파일 이름</span>
              <span className="font-medium text-gray-900 dark:text-gray-100 truncate max-w-[200px]" title={fileName}>
                {fileName}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-2">
            <Button
              onClick={handleDownload}
              className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
              data-testid="button-download-file"
            >
              <Download className="h-4 w-4 mr-2" />
              다운로드
            </Button>
            <Button
              variant="outline"
              onClick={() => window.open(fileUrl, '_blank')}
              className="flex-1"
              data-testid="button-open-file"
            >
              <File className="h-4 w-4 mr-2" />
              새 창에서 열기
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
