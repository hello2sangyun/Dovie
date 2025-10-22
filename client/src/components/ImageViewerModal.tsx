import { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, Download, ZoomIn, ZoomOut } from 'lucide-react';

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
  const [zoom, setZoom] = useState(100);

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = fileName || 'image';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 25, 200));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 25, 50));
  };

  const handleClose = () => {
    setZoom(100);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 bg-black/90 border-0 overflow-hidden">
        <div className="relative w-full h-full flex flex-col">
          {/* 헤더 */}
          <div className="flex items-center justify-between p-4 bg-black/50">
            <h3 className="text-white font-medium truncate">
              {fileName || '이미지'}
            </h3>
            <div className="flex items-center gap-2">
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
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDownload}
                className="text-white hover:bg-white/20"
                data-testid="button-download-image"
              >
                <Download className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClose}
                className="text-white hover:bg-white/20"
                data-testid="button-close-viewer"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* 이미지 */}
          <div className="flex-1 flex items-center justify-center p-4 overflow-auto">
            <img
              src={imageUrl}
              alt={fileName || '이미지'}
              className="max-w-full max-h-full object-contain transition-transform duration-200"
              style={{ 
                maxHeight: 'calc(90vh - 80px)',
                transform: `scale(${zoom / 100})`
              }}
              data-testid="image-preview"
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};