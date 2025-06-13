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
  const [cropArea, setCropArea] = useState<CropArea>({ x: 0, y: 0, width: 0, height: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imageLoaded, setImageLoaded] = useState(false);

  useEffect(() => {
    if (imageLoaded && canvasRef.current && imageRef.current) {
      // Initialize crop area if not set
      if (cropArea.width === 0 || cropArea.height === 0) {
        const canvas = canvasRef.current;
        const container = canvas.parentElement;
        if (container) {
          const containerRect = container.getBoundingClientRect();
          const canvasWidth = containerRect.width;
          const canvasHeight = (containerRect.width * imageRef.current.height) / imageRef.current.width;
          
          // Set initial crop area to center 80% of the image
          const margin = 0.1;
          setCropArea({
            x: canvasWidth * margin,
            y: canvasHeight * margin,
            width: canvasWidth * 0.8,
            height: canvasHeight * 0.8
          });
        }
      } else {
        drawCanvas();
      }
    }
  }, [cropArea, imageLoaded]);

  const drawCanvas = () => {
    const canvas = canvasRef.current;
    const image = imageRef.current;
    if (!canvas || !image) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size to match container size
    const container = canvas.parentElement;
    if (container) {
      const containerRect = container.getBoundingClientRect();
      canvas.width = containerRect.width;
      canvas.height = (containerRect.width * image.height) / image.width;
    }

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw image
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

    // Draw dark overlay everywhere except crop area
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Use globalCompositeOperation to create transparent crop area
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillRect(cropArea.x, cropArea.y, cropArea.width, cropArea.height);
    ctx.restore();

    // Draw crop border with glow effect
    ctx.strokeStyle = '#8b5cf6';
    ctx.lineWidth = 3;
    ctx.shadowColor = '#8b5cf6';
    ctx.shadowBlur = 8;
    ctx.strokeRect(cropArea.x, cropArea.y, cropArea.width, cropArea.height);
    ctx.shadowBlur = 0;

    // Draw corner handles
    const handleSize = 16;
    ctx.fillStyle = '#8b5cf6';
    ctx.strokeStyle = '#ffffff';
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

    // Convert to canvas coordinates
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    setCropArea(prev => ({
      ...prev,
      x: Math.max(0, Math.min(prev.x + (deltaX * scaleX), canvas.width - prev.width)),
      y: Math.max(0, Math.min(prev.y + (deltaY * scaleY), canvas.height - prev.height))
    }));

    setDragStart(position);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Unified touch/mouse handling function
  const getEventPosition = (e: React.TouchEvent | React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    let clientX: number, clientY: number;

    if ('touches' in e) {
      if (e.touches.length === 0) return null;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    // Use canvas display size instead of internal size for better scaling
    return { x, y };
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const position = getEventPosition(e);
    if (!position) return;

    console.log('Touch start:', position);
    setIsDragging(true);
    setDragStart(position);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!isDragging) return;
    
    const position = getEventPosition(e);
    if (!position) return;

    const deltaX = position.x - dragStart.x;
    const deltaY = position.y - dragStart.y;

    console.log('Touch move delta:', { deltaX, deltaY });

    const canvas = canvasRef.current;
    if (!canvas) return;

    // Convert to canvas coordinates
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    setCropArea(prev => {
      const newX = Math.max(0, Math.min(prev.x + (deltaX * scaleX), canvas.width - prev.width));
      const newY = Math.max(0, Math.min(prev.y + (deltaY * scaleY), canvas.height - prev.height));
      
      console.log('Updating crop area:', { 
        oldX: prev.x, 
        oldY: prev.y, 
        newX, 
        newY, 
        deltaX: deltaX * scaleX, 
        deltaY: deltaY * scaleY 
      });
      
      return {
        ...prev,
        x: newX,
        y: newY
      };
    });

    setDragStart(position);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('Touch end');
    setIsDragging(false);
  };

  const handleCrop = async () => {
    const canvas = canvasRef.current;
    const image = imageRef.current;
    if (!canvas || !image) return;

    // Create a new canvas for the cropped image
    const cropCanvas = document.createElement('canvas');
    const cropCtx = cropCanvas.getContext('2d');
    if (!cropCtx) return;

    // Calculate the actual image dimensions vs canvas dimensions
    const scaleX = image.naturalWidth / canvas.width;
    const scaleY = image.naturalHeight / canvas.height;

    // Set crop canvas size
    cropCanvas.width = cropArea.width * scaleX;
    cropCanvas.height = cropArea.height * scaleY;

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

    // Convert to blob with high quality to preserve image details
    cropCanvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], 'cropped-business-card.jpg', { type: 'image/jpeg' });
        onCrop(file);
      }
    }, 'image/jpeg', 0.98);
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
        <div className="relative mb-4">
          <img
            ref={imageRef}
            src={imageUrl}
            alt="Business card to crop"
            className="w-full h-auto opacity-0 absolute"
            onLoad={() => setImageLoaded(true)}
          />
          <canvas
            ref={canvasRef}
            className="w-full h-auto border border-gray-200 rounded-lg cursor-move"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onTouchCancel={handleTouchEnd}
            style={{ 
              maxHeight: '400px',
              touchAction: 'none',
              userSelect: 'none',
              WebkitUserSelect: 'none',
              MozUserSelect: 'none',
              msUserSelect: 'none'
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