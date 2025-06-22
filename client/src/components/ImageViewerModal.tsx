import React from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, Download } from 'lucide-react';

interface ImageViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  fileName?: string;
}

export const ImageViewerModal: React.FC<ImageViewerModalProps> = ({
  isOpen,
  onClose,
  imageUrl,
  fileName
}) => {
  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = fileName || 'image';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 bg-black/90 border-0">
        <div className="relative w-full h-full flex flex-col">
          {/* 헤더 */}
          <div className="flex items-center justify-between p-4 bg-black/50">
            <h3 className="text-white font-medium truncate">
              {fileName || '이미지'}
            </h3>
            <div className="flex space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDownload}
                className="text-white hover:bg-white/20"
              >
                <Download className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="text-white hover:bg-white/20"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* 이미지 */}
          <div className="flex-1 flex items-center justify-center p-4">
            <img
              src={imageUrl}
              alt={fileName || '이미지'}
              className="max-w-full max-h-full object-contain"
              style={{ maxHeight: 'calc(90vh - 80px)' }}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};