import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Crop, Check, X } from "lucide-react";

interface ImageCropProps {
  imageUrl: string;
  onCrop: (croppedFile: File) => void;
  onCancel: () => void;
}

interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export default function ImageCrop({ imageUrl, onCrop, onCancel }: ImageCropProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [cropArea, setCropArea] = useState<CropArea>({ x: 50, y: 50, width: 200, height: 200 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imageLoaded, setImageLoaded] = useState(false);
  const [touchActive, setTouchActive] = useState(false);

  useEffect(() => {
    if (imageLoaded) {
      setupCanvas();
    }
  }, [imageLoaded]);

  useEffect(() => {
    if (imageLoaded) {
      drawCanvas();
    }
  }, [cropArea, imageLoaded]);

  const setupCanvas = () => {
    const canvas = canvasRef.current;
    const image = imageRef.current;
    const container = containerRef.current;
    
    if (!canvas || !image || !container) return;

    // Set canvas to match container width
    const containerWidth = container.clientWidth;
    const aspectRatio = image.naturalWidth / image.naturalHeight;
    
    canvas.width = containerWidth;
    canvas.height = containerWidth / aspectRatio;
    
    // Initialize crop area to 80% of center
    const margin = containerWidth * 0.1;
    setCropArea({
      x: margin,
      y: margin,
      width: containerWidth - (margin * 2),
      height: (containerWidth / aspectRatio) - (margin * 2)
    });
  };

  const drawCanvas = () => {
    const canvas = canvasRef.current;
    const image = imageRef.current;
    if (!canvas || !image) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw image
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

    // Draw overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Clear crop area
    ctx.clearRect(cropArea.x, cropArea.y, cropArea.width, cropArea.height);

    // Redraw image in crop area
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

    // Draw crop border
    ctx.strokeStyle = '#3B82F6';
    ctx.lineWidth = 3;
    ctx.strokeRect(cropArea.x, cropArea.y, cropArea.width, cropArea.height);

    // Draw corner handles
    const handleSize = 20;
    ctx.fillStyle = '#3B82F6';
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;

    const corners = [
      [cropArea.x, cropArea.y],
      [cropArea.x + cropArea.width, cropArea.y],
      [cropArea.x, cropArea.y + cropArea.height],
      [cropArea.x + cropArea.width, cropArea.y + cropArea.height]
    ];

    corners.forEach(([x, y]) => {
      ctx.fillRect(x - handleSize/2, y - handleSize/2, handleSize, handleSize);
      ctx.strokeRect(x - handleSize/2, y - handleSize/2, handleSize, handleSize);
    });
  };

  // Get touch/mouse position relative to canvas
  const getEventPosition = (e: React.TouchEvent | React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    let clientX: number, clientY: number;

    if ('touches' in e && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else if ('clientX' in e) {
      clientX = e.clientX;
      clientY = e.clientY;
    } else {
      return null;
    }

    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  // Touch start handler
  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    console.log('Touch start detected');
    
    const position = getEventPosition(e);
    if (!position) return;

    setTouchActive(true);
    setIsDragging(true);
    setDragStart(position);
    console.log('Touch start position:', position);
  };

  // Touch move handler
  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault();
    
    if (!isDragging || !touchActive) return;
    
    const position = getEventPosition(e);
    if (!position) return;

    const deltaX = position.x - dragStart.x;
    const deltaY = position.y - dragStart.y;

    console.log('Touch move delta:', { deltaX, deltaY });

    const canvas = canvasRef.current;
    if (!canvas) return;

    setCropArea(prev => {
      const newX = Math.max(0, Math.min(prev.x + deltaX, canvas.width - prev.width));
      const newY = Math.max(0, Math.min(prev.y + deltaY, canvas.height - prev.height));
      
      console.log('New crop position:', { newX, newY });
      
      return {
        ...prev,
        x: newX,
        y: newY
      };
    });

    setDragStart(position);
  };

  // Touch end handler
  const handleTouchEnd = (e: React.TouchEvent) => {
    e.preventDefault();
    console.log('Touch end');
    setIsDragging(false);
    setTouchActive(false);
  };

  // Mouse handlers (for desktop)
  const handleMouseDown = (e: React.MouseEvent) => {
    const position = getEventPosition(e);
    if (!position) return;

    setIsDragging(true);
    setDragStart(position);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;

    const position = getEventPosition(e);
    if (!position) return;

    const deltaX = position.x - dragStart.x;
    const deltaY = position.y - dragStart.y;

    const canvas = canvasRef.current;
    if (!canvas) return;

    setCropArea(prev => ({
      ...prev,
      x: Math.max(0, Math.min(prev.x + deltaX, canvas.width - prev.width)),
      y: Math.max(0, Math.min(prev.y + deltaY, canvas.height - prev.height))
    }));

    setDragStart(position);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Crop handler
  const handleCrop = async () => {
    console.log('Crop button clicked');
    const canvas = canvasRef.current;
    const image = imageRef.current;
    if (!canvas || !image) {
      console.log('Canvas or image not available');
      return;
    }

    console.log('Creating crop canvas with area:', cropArea);

    // Create a new canvas for the cropped image
    const cropCanvas = document.createElement('canvas');
    const cropCtx = cropCanvas.getContext('2d');
    if (!cropCtx) return;

    // Calculate scaling from canvas to original image
    const scaleX = image.naturalWidth / canvas.width;
    const scaleY = image.naturalHeight / canvas.height;

    // Set crop canvas size
    cropCanvas.width = cropArea.width * scaleX;
    cropCanvas.height = cropArea.height * scaleY;

    console.log('Crop canvas size:', { width: cropCanvas.width, height: cropCanvas.height });
    console.log('Scale factors:', { scaleX, scaleY });

    // Draw the cropped portion
    cropCtx.drawImage(
      image,
      cropArea.x * scaleX,
      cropArea.y * scaleY,
      cropArea.width * scaleX,
      cropArea.height * scaleY,
      0,
      0,
      cropCanvas.width,
      cropCanvas.height
    );

    // Convert to blob
    cropCanvas.toBlob((blob) => {
      if (blob) {
        console.log('Crop successful, creating file');
        const file = new File([blob], 'cropped-business-card.jpg', { type: 'image/jpeg' });
        onCrop(file);
      } else {
        console.log('Failed to create blob');
      }
    }, 'image/jpeg', 0.95);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Crop className="w-5 h-5 mr-2 text-blue-600" />
          명함 영역 선택
        </CardTitle>
        <p className="text-sm text-gray-600">
          파란색 영역을 드래그하여 명함 모서리에 맞춰주세요
        </p>
      </CardHeader>
      <CardContent>
        <div ref={containerRef} className="relative mb-4 w-full">
          <img
            ref={imageRef}
            src={imageUrl}
            alt="Business card to crop"
            className="w-full h-auto opacity-0 absolute pointer-events-none"
            onLoad={() => {
              console.log('Image loaded');
              setImageLoaded(true);
            }}
          />
          <canvas
            ref={canvasRef}
            className="w-full h-auto border border-gray-200 rounded-lg"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onTouchCancel={handleTouchEnd}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            style={{
              touchAction: 'none',
              userSelect: 'none',
              WebkitUserSelect: 'none',
              cursor: isDragging ? 'grabbing' : 'grab'
            }}
          />
        </div>

        <div className="flex space-x-3">
          <Button
            onClick={handleCrop}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white"
          >
            <Check className="w-4 h-4 mr-2" />
            영역 확정
          </Button>
          <Button
            onClick={onCancel}
            variant="outline"
            className="flex-1"
          >
            <X className="w-4 h-4 mr-2" />
            취소
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}