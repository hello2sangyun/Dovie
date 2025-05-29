import { useRef, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface ImageCropperProps {
  open: boolean;
  onClose: () => void;
  imageSrc: string;
  onCropComplete: (croppedFile: File) => void;
}

export function ImageCropper({ open, onClose, imageSrc, onCropComplete }: ImageCropperProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    if (imageSrc) {
      const img = new Image();
      img.onload = () => setImage(img);
      img.src = imageSrc;
    }
  }, [imageSrc]);

  const cropToSquare = () => {
    if (!image || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 정사각형 크기 결정 (원본 이미지의 작은 쪽 기준)
    const size = Math.min(image.width, image.height);
    canvas.width = 400; // 출력 크기
    canvas.height = 400;

    // 이미지 중앙에서 정사각형으로 크롭
    const sx = (image.width - size) / 2;
    const sy = (image.height - size) / 2;

    ctx.drawImage(
      image,
      sx, sy, size, size, // 소스 영역
      0, 0, 400, 400      // 대상 영역
    );

    // Canvas를 Blob으로 변환 후 File 객체 생성
    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], 'profile-image.jpg', { type: 'image/jpeg' });
        onCropComplete(file);
        onClose();
      }
    }, 'image/jpeg', 0.9);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>프로필 사진 조정</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {image && (
            <div className="flex flex-col items-center space-y-4">
              <div className="relative">
                <img
                  src={imageSrc}
                  alt="원본 이미지"
                  className="max-w-full max-h-64 object-contain border rounded"
                />
              </div>
              
              <div className="text-sm text-gray-600 text-center">
                이미지가 정사각형으로 자동 조정됩니다
              </div>
              
              <canvas
                ref={canvasRef}
                className="hidden"
              />
            </div>
          )}
          
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={onClose}>
              취소
            </Button>
            <Button onClick={cropToSquare}>
              적용하기
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}