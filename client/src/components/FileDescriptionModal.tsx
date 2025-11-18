import { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Image, Video, Music, FileText, File } from 'lucide-react';

interface FileDescriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSend: (description: string) => Promise<void>;
  selectedFiles: FileList | null;
  previewUrls: (string | null)[];
}

export const FileDescriptionModal: React.FC<FileDescriptionModalProps> = ({
  isOpen,
  onClose,
  onSend,
  selectedFiles,
  previewUrls
}) => {
  const [description, setDescription] = useState<string>('');

  useEffect(() => {
    if (!isOpen) {
      setDescription('');
    }
  }, [isOpen]);

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) {
      return <Image className="h-6 w-6 text-blue-500" />;
    }
    if (file.type.startsWith('video/')) {
      return <Video className="h-6 w-6 text-purple-500" />;
    }
    if (file.type.startsWith('audio/')) {
      return <Music className="h-6 w-6 text-green-500" />;
    }
    if (file.type.includes('pdf') || file.type.includes('text')) {
      return <FileText className="h-6 w-6 text-red-500" />;
    }
    return <File className="h-6 w-6 text-gray-500" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleSend = async () => {
    if (!selectedFiles) return;

    // 백그라운드로 전송 (모달 닫기 전에!)
    try {
      await onSend(description.trim());
    } catch (error) {
      console.error('Send error:', error);
    }
  };

  const handleClose = () => {
    setDescription('');
    onClose();
  };

  if (!selectedFiles || selectedFiles.length === 0) return null;

  const firstFile = selectedFiles[0];
  const isImage = firstFile.type.startsWith('image/');
  const thumbnail = isImage && previewUrls[0] ? previewUrls[0] : null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent 
        className="w-[90vw] max-w-md p-0 gap-0 border-0 shadow-2xl bg-white dark:bg-gray-900 rounded-2xl overflow-hidden"
        overlayClassName="bg-black/60 backdrop-blur-sm"
      >
        {/* 파일 정보 */}
        <div className="p-5 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center space-x-3">
            {thumbnail ? (
              <img 
                src={thumbnail} 
                alt={firstFile.name}
                className="w-14 h-14 rounded-lg object-cover"
              />
            ) : (
              <div className="w-14 h-14 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                {getFileIcon(firstFile)}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {firstFile.name}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {formatFileSize(firstFile.size)}
                {selectedFiles.length > 1 && ` 외 ${selectedFiles.length - 1}개`}
              </p>
            </div>
          </div>
        </div>

        {/* 설명 입력 */}
        <div className="p-5">
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onKeyDown={(e) => {
              if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && selectedFiles) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="이 파일에 대한 설명을 입력하세요..."
            className="w-full min-h-[120px] resize-none border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-purple-500 focus:border-transparent rounded-xl text-sm bg-gray-50 dark:bg-gray-800"
            maxLength={500}
            autoFocus
          />
        </div>

        {/* 버튼 */}
        <div className="flex border-t border-gray-100 dark:border-gray-800">
          <Button
            variant="ghost"
            onClick={handleClose}
            className="flex-1 h-14 rounded-none text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 font-medium"
            data-testid="button-cancel-file-description"
          >
            취소
          </Button>
          <div className="w-px bg-gray-100 dark:bg-gray-800" />
          <Button
            onClick={handleSend}
            disabled={!selectedFiles}
            className="flex-1 h-14 rounded-none bg-transparent hover:bg-purple-50 dark:hover:bg-purple-900/20 text-purple-600 dark:text-purple-400 font-semibold"
            data-testid="button-send-file"
          >
            전송
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
