import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Download, FileText, Code, Quote, Copy, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getInitials, formatFileSize } from "@/lib/utils";

interface PreviewModalProps {
  open: boolean;
  onClose: () => void;
  command: {
    id: number;
    commandName: string;
    savedText?: string;
    fileName?: string;
    fileUrl?: string;
    fileSize?: number;
    createdAt: string;
    originalSender?: {
      id: number;
      displayName: string;
      profilePicture?: string;
    };
  };
}

export default function PreviewModal({ open, onClose, command }: PreviewModalProps) {
  const { toast } = useToast();

  const isFile = !!command.fileUrl;
  const isText = !!command.savedText;

  const getFileIcon = () => {
    if (!command.fileName) return <FileText className="text-green-600" />;
    
    const extension = command.fileName.split('.').pop()?.toLowerCase();
    if (['js', 'ts', 'py', 'java', 'cpp', 'c', 'html', 'css'].includes(extension || '')) {
      return <Code className="text-purple-600" />;
    }
    return <FileText className="text-green-600" />;
  };

  const handleCopyText = () => {
    if (command.savedText) {
      navigator.clipboard.writeText(command.savedText);
      toast({
        title: "복사 완료",
        description: "텍스트가 클립보드에 복사되었습니다.",
      });
    }
  };

  const handleDownloadFile = () => {
    if (command.fileUrl) {
      window.open(command.fileUrl, '_blank');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isImageFile = (fileName: string) => {
    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'];
    const extension = fileName.split('.').pop()?.toLowerCase();
    return imageExtensions.includes(extension || '');
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            {isFile ? getFileIcon() : <Quote className="text-blue-600" />}
            <span className="text-purple-600">#{command.commandName}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* File Preview */}
          {isFile && (
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  {getFileIcon()}
                  <div>
                    <p className="font-medium text-gray-900" title={command.fileName}>
                      {command.fileName}
                    </p>
                    {command.fileSize && (
                      <p className="text-sm text-gray-500">
                        {formatFileSize(command.fileSize)}
                      </p>
                    )}
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadFile}
                  className="flex items-center space-x-2"
                >
                  <Download className="h-4 w-4" />
                  <span>다운로드</span>
                </Button>
              </div>

              {/* Image Preview */}
              {command.fileName && isImageFile(command.fileName) && (
                <div className="mt-3">
                  <img
                    src={command.fileUrl}
                    alt={command.fileName}
                    className="max-w-full h-auto max-h-64 rounded-lg shadow-sm border"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
              )}

              {/* External Link */}
              <div className="mt-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDownloadFile}
                  className="text-purple-600 hover:text-purple-700"
                >
                  <ExternalLink className="h-4 w-4 mr-1" />
                  새 탭에서 열기
                </Button>
              </div>
            </div>
          )}

          {/* Text Preview */}
          {isText && (
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-gray-900">저장된 텍스트</h4>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyText}
                  className="flex items-center space-x-2"
                >
                  <Copy className="h-4 w-4" />
                  <span>복사</span>
                </Button>
              </div>
              <div className="bg-white rounded-md p-3 border max-h-40 overflow-y-auto">
                <pre className="whitespace-pre-wrap text-sm text-gray-800 font-mono">
                  {command.savedText}
                </pre>
              </div>
            </div>
          )}

          {/* Metadata */}
          <div className="border-t pt-4">
            <div className="flex items-center justify-between text-sm text-gray-500">
              <div className="flex items-center space-x-3">
                {command.originalSender && (
                  <div className="flex items-center space-x-2">
                    <Avatar className="w-6 h-6">
                      <AvatarImage 
                        src={command.originalSender.profilePicture} 
                        alt={command.originalSender.displayName} 
                      />
                      <AvatarFallback className="purple-gradient text-white text-xs">
                        {getInitials(command.originalSender.displayName)}
                      </AvatarFallback>
                    </Avatar>
                    <span>{command.originalSender.displayName}</span>
                  </div>
                )}
              </div>
              <span>{formatDate(command.createdAt)}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end pt-4 border-t">
            <Button
              variant="outline"
              onClick={onClose}
            >
              닫기
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}