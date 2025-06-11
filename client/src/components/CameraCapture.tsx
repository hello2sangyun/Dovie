import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Camera, X, RotateCcw, Check, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CameraCaptureProps {
  onCapture: (file: File) => void | Promise<void>;
  onClose: () => void;
  isOpen: boolean;
}

export default function CameraCapture({ onCapture, onClose, isOpen }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen, facingMode]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setIsStreaming(true);
      }
    } catch (error) {
      console.error('Camera access failed:', error);
      toast({
        variant: "destructive",
        title: "카메라 접근 실패",
        description: "카메라에 접근할 수 없습니다. 권한을 확인해주세요.",
      });
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsStreaming(false);
    setCapturedImage(null);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Get image data URL
    const imageDataUrl = canvas.toDataURL('image/jpeg', 0.9);
    setCapturedImage(imageDataUrl);
  };

  const confirmCapture = () => {
    if (!capturedImage || !canvasRef.current) return;

    canvasRef.current.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `business-card-${Date.now()}.jpg`, {
          type: 'image/jpeg',
          lastModified: Date.now(),
        });
        onCapture(file);
        onClose();
      }
    }, 'image/jpeg', 0.9);
  };

  const retakePhoto = () => {
    setCapturedImage(null);
  };

  const switchCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
    setCapturedImage(null);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      onCapture(file);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-black/50 p-4 flex justify-between items-center">
        <h2 className="text-white font-semibold">명함 스캔</h2>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={switchCamera}
            className="text-white hover:bg-white/20"
          >
            <RotateCcw className="w-5 h-5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-white hover:bg-white/20"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Camera View */}
      <div className="relative w-full h-full">
        {!capturedImage ? (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            
            {/* Overlay guide */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="border-2 border-white border-dashed rounded-lg w-80 h-48 flex items-center justify-center">
                <p className="text-white text-sm text-center">
                  명함을 이 영역에 맞춰주세요
                </p>
              </div>
            </div>
          </>
        ) : (
          <img
            src={capturedImage}
            alt="Captured business card"
            className="w-full h-full object-contain bg-black"
          />
        )}
        
        <canvas ref={canvasRef} className="hidden" />
      </div>

      {/* Bottom Controls */}
      <div className="absolute bottom-0 left-0 right-0 p-6 bg-black/50">
        {!capturedImage ? (
          <div className="flex justify-center items-center gap-8">
            {/* File Upload */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
            <Button
              variant="ghost"
              size="lg"
              onClick={() => fileInputRef.current?.click()}
              className="text-white hover:bg-white/20 p-4"
            >
              <Upload className="w-6 h-6" />
            </Button>

            {/* Capture Button */}
            <Button
              onClick={capturePhoto}
              disabled={!isStreaming}
              className="w-16 h-16 rounded-full bg-white hover:bg-gray-200 flex items-center justify-center"
            >
              <Camera className="w-8 h-8 text-black" />
            </Button>

            <div className="w-12"></div>
          </div>
        ) : (
          <div className="flex justify-center items-center gap-8">
            <Button
              variant="ghost"
              size="lg"
              onClick={retakePhoto}
              className="text-white hover:bg-white/20 px-6 py-3"
            >
              <RotateCcw className="w-5 h-5 mr-2" />
              다시 찍기
            </Button>

            <Button
              onClick={confirmCapture}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3"
            >
              <Check className="w-5 h-5 mr-2" />
              사용하기
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}