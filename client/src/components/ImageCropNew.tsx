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
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState<'tl' | 'tr' | 'bl' | 'br' | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imageLoaded, setImageLoaded] = useState(false);
  const [touchActive, setTouchActive] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState(0);

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
    
    // Initialize crop area optimized for business cards (3.5:2 ratio)
    const margin = containerWidth * 0.05;
    const cropWidth = containerWidth - (margin * 2);
    const businessCardRatio = 3.5 / 2; // Standard business card ratio
    const cropHeight = Math.min(cropWidth / businessCardRatio, (containerWidth / aspectRatio) - (margin * 2));
    
    setCropArea({
      x: margin,
      y: ((containerWidth / aspectRatio) - cropHeight) / 2, // Center vertically
      width: cropWidth,
      height: cropHeight
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

  // Check if position is on a resize handle
  const getResizeHandle = (position: { x: number; y: number }) => {
    const handleSize = 20;
    const tolerance = handleSize / 2;

    const corners = {
      tl: { x: cropArea.x, y: cropArea.y },
      tr: { x: cropArea.x + cropArea.width, y: cropArea.y },
      bl: { x: cropArea.x, y: cropArea.y + cropArea.height },
      br: { x: cropArea.x + cropArea.width, y: cropArea.y + cropArea.height }
    };

    for (const [handle, corner] of Object.entries(corners)) {
      if (Math.abs(position.x - corner.x) <= tolerance && 
          Math.abs(position.y - corner.y) <= tolerance) {
        return handle as 'tl' | 'tr' | 'bl' | 'br';
      }
    }

    return null;
  };

  // Check if position is inside crop area for dragging
  const isInsideCropArea = (position: { x: number; y: number }) => {
    return position.x >= cropArea.x && 
           position.x <= cropArea.x + cropArea.width &&
           position.y >= cropArea.y && 
           position.y <= cropArea.y + cropArea.height;
  };

  // Touch start handler
  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    console.log('Touch start detected');
    
    const position = getEventPosition(e);
    if (!position) return;

    // Check if touching a resize handle
    const handle = getResizeHandle(position);
    if (handle) {
      setIsResizing(true);
      setResizeHandle(handle);
      console.log('Starting resize with handle:', handle);
    } else if (isInsideCropArea(position)) {
      setIsDragging(true);
      console.log('Starting drag');
    } else {
      return; // Don't start any interaction if outside crop area
    }

    setTouchActive(true);
    setDragStart(position);
    console.log('Touch start position:', position);
  };

  // Touch move handler - optimized with throttling for smooth performance
  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault();
    
    if ((!isDragging && !isResizing) || !touchActive) return;
    
    const now = Date.now();
    if (now - lastUpdateTime < 16) return; // Throttle to ~60fps
    
    const position = getEventPosition(e);
    if (!position) return;

    const deltaX = position.x - dragStart.x;
    const deltaY = position.y - dragStart.y;

    const canvas = canvasRef.current;
    if (!canvas) return;

    // Direct state update for better performance
    if (isResizing && resizeHandle) {
      // Handle resizing
      setCropArea(prev => {
        let newArea = { ...prev };
        
        switch (resizeHandle) {
          case 'tl':
            newArea.x = Math.max(0, prev.x + deltaX);
            newArea.y = Math.max(0, prev.y + deltaY);
            newArea.width = prev.width - deltaX;
            newArea.height = prev.height - deltaY;
            break;
          case 'tr':
            newArea.y = Math.max(0, prev.y + deltaY);
            newArea.width = prev.width + deltaX;
            newArea.height = prev.height - deltaY;
            break;
          case 'bl':
            newArea.x = Math.max(0, prev.x + deltaX);
            newArea.width = prev.width - deltaX;
            newArea.height = prev.height + deltaY;
            break;
          case 'br':
            newArea.width = prev.width + deltaX;
            newArea.height = prev.height + deltaY;
            break;
        }

        // Ensure minimum size and stay within canvas bounds
        newArea.width = Math.max(50, Math.min(newArea.width, canvas.width - newArea.x));
        newArea.height = Math.max(50, Math.min(newArea.height, canvas.height - newArea.y));

        return newArea;
      });
    } else if (isDragging) {
      // Handle dragging with direct calculation
      setCropArea(prev => {
        const newX = Math.max(0, Math.min(prev.x + deltaX, canvas.width - prev.width));
        const newY = Math.max(0, Math.min(prev.y + deltaY, canvas.height - prev.height));
        
        return {
          ...prev,
          x: newX,
          y: newY
        };
      });
    }

    setDragStart(position);
    setLastUpdateTime(now);
  };

  // Touch end handler
  const handleTouchEnd = (e: React.TouchEvent) => {
    e.preventDefault();
    console.log('Touch end');
    setIsDragging(false);
    setIsResizing(false);
    setResizeHandle(null);
    setTouchActive(false);
  };

  // Mouse handlers (for desktop)
  const handleMouseDown = (e: React.MouseEvent) => {
    const position = getEventPosition(e);
    if (!position) return;

    // Check if clicking on a resize handle
    const handle = getResizeHandle(position);
    if (handle) {
      setIsResizing(true);
      setResizeHandle(handle);
    } else if (isInsideCropArea(position)) {
      setIsDragging(true);
    } else {
      return; // Don't start any interaction if outside crop area
    }

    setDragStart(position);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging && !isResizing) return;

    const position = getEventPosition(e);
    if (!position) return;

    const deltaX = position.x - dragStart.x;
    const deltaY = position.y - dragStart.y;

    const canvas = canvasRef.current;
    if (!canvas) return;

    if (isResizing && resizeHandle) {
      // Handle resizing
      setCropArea(prev => {
        let newArea = { ...prev };
        
        switch (resizeHandle) {
          case 'tl':
            newArea.x = Math.max(0, prev.x + deltaX);
            newArea.y = Math.max(0, prev.y + deltaY);
            newArea.width = prev.width - deltaX;
            newArea.height = prev.height - deltaY;
            break;
          case 'tr':
            newArea.y = Math.max(0, prev.y + deltaY);
            newArea.width = prev.width + deltaX;
            newArea.height = prev.height - deltaY;
            break;
          case 'bl':
            newArea.x = Math.max(0, prev.x + deltaX);
            newArea.width = prev.width - deltaX;
            newArea.height = prev.height + deltaY;
            break;
          case 'br':
            newArea.width = prev.width + deltaX;
            newArea.height = prev.height + deltaY;
            break;
        }

        // Ensure minimum size and stay within canvas bounds
        newArea.width = Math.max(50, Math.min(newArea.width, canvas.width - newArea.x));
        newArea.height = Math.max(50, Math.min(newArea.height, canvas.height - newArea.y));

        return newArea;
      });
    } else if (isDragging) {
      // Handle dragging
      setCropArea(prev => ({
        ...prev,
        x: Math.max(0, Math.min(prev.x + deltaX, canvas.width - prev.width)),
        y: Math.max(0, Math.min(prev.y + deltaY, canvas.height - prev.height))
      }));
    }

    setDragStart(position);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setIsResizing(false);
    setResizeHandle(null);
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
            onMouseMove={(e) => {
              if (!isDragging && !isResizing) {
                const position = getEventPosition(e);
                if (position) {
                  const handle = getResizeHandle(position);
                  if (handle) {
                    e.currentTarget.style.cursor = 
                      (handle === 'tl' || handle === 'br') ? 'nw-resize' : 'ne-resize';
                  } else if (isInsideCropArea(position)) {
                    e.currentTarget.style.cursor = 'grab';
                  } else {
                    e.currentTarget.style.cursor = 'default';
                  }
                }
              }
              handleMouseMove(e);
            }}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            style={{
              touchAction: 'none',
              userSelect: 'none',
              WebkitUserSelect: 'none',
              cursor: isResizing 
                ? (resizeHandle === 'tl' || resizeHandle === 'br' ? 'nw-resize' : 'ne-resize')
                : isDragging 
                ? 'grabbing' 
                : 'grab'
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