import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import CameraCapture from "@/components/CameraCapture";
import { 
  Camera, 
  Upload, 
  ArrowLeft, 
  CheckCircle, 
  AlertCircle,
  FileImage,
  Loader2,
  FolderPlus,
  ImagePlus,
  Edit2,
  Save,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ScanResult {
  name?: string;
  company?: string;
  jobTitle?: string;
  email?: string;
  phone?: string;
  website?: string;
  address?: string;
  fax?: string;
  mobile?: string;
  department?: string;
  title?: string;
  linkedIn?: string;
  twitter?: string;
  instagram?: string;
  facebook?: string;
  skype?: string;
  whatsapp?: string;
  telegram?: string;
  wechat?: string;
  line?: string;
  [key: string]: string | undefined; // Allow any additional fields
}

export default function ScanPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [folderCreated, setFolderCreated] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState<ScanResult>({});
  const [showCropInterface, setShowCropInterface] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [cropArea, setCropArea] = useState({ x: 10, y: 10, width: 80, height: 80 });
  const [originalImageDimensions, setOriginalImageDimensions] = useState({ width: 0, height: 0 });

  // Function to crop image based on crop area
  const cropImage = (file: File, cropArea: { x: number; y: number; width: number; height: number }): Promise<File> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const image = new Image();
      
      image.onload = () => {
        // Calculate actual crop coordinates
        const cropX = (cropArea.x / 100) * image.width;
        const cropY = (cropArea.y / 100) * image.height;
        const cropWidth = (cropArea.width / 100) * image.width;
        const cropHeight = (cropArea.height / 100) * image.height;
        
        // Set canvas size to cropped dimensions
        canvas.width = cropWidth;
        canvas.height = cropHeight;
        
        // Draw cropped image
        ctx?.drawImage(
          image,
          cropX, cropY, cropWidth, cropHeight,
          0, 0, cropWidth, cropHeight
        );
        
        // Convert canvas to blob and create file
        canvas.toBlob((blob) => {
          if (blob) {
            const croppedFile = new File([blob], file.name, {
              type: file.type,
              lastModified: Date.now()
            });
            resolve(croppedFile);
          }
        }, file.type);
      };
      
      image.src = URL.createObjectURL(file);
    });
  };

  // AI scan mutation
  const scanMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('image', file);
      
      const response = await fetch('/api/scan-business-card', {
        method: 'POST',
        headers: {
          'x-user-id': user?.id.toString() || '',
        },
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('명함 스캔에 실패했습니다.');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      setScanResult(data);
      setIsScanning(false);
      setFolderCreated(true); // Mark folder as created since scan endpoint handles it
      queryClient.invalidateQueries({ queryKey: ['/api/person-folders'] });
      queryClient.invalidateQueries({ queryKey: ['/api/contacts'] });
      toast({
        title: "스캔 완료",
        description: `${data.name}님의 폴더가 Cabinet에 추가되었습니다.`,
      });
    },
    onError: (error) => {
      setIsScanning(false);
      toast({
        title: "스캔 실패",
        description: error instanceof Error ? error.message : "명함 스캔 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  // Remove redundant folder creation since scan endpoint handles everything

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast({
          title: "잘못된 파일 형식",
          description: "이미지 파일만 업로드할 수 있습니다.",
          variant: "destructive",
        });
        return;
      }

      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        toast({
          title: "파일 크기 초과",
          description: "10MB 이하의 이미지만 업로드할 수 있습니다.",
          variant: "destructive",
        });
        return;
      }

      setSelectedFile(file);
      setScanResult(null);
      setFolderCreated(false);
      // Create image URL for cropping
      const url = URL.createObjectURL(file);
      setImageUrl(url);
      setShowCropInterface(true);
    }
  };

  const handleScan = async () => {
    if (!selectedFile) return;
    
    setIsScanning(true);
    
    // If crop interface was shown, crop the image first
    let fileToScan = selectedFile;
    if (showCropInterface) {
      try {
        fileToScan = await cropImage(selectedFile, cropArea);
      } catch (error) {
        console.error('Cropping failed:', error);
        toast({
          title: "이미지 처리 실패",
          description: "이미지 자르기에 실패했습니다.",
          variant: "destructive",
        });
        setIsScanning(false);
        return;
      }
    }
    
    scanMutation.mutate(fileToScan);
  };

  const handleStartEdit = () => {
    if (scanResult) {
      setEditedData({ ...scanResult });
      setIsEditing(true);
    }
  };

  const handleSaveEdit = () => {
    setScanResult(editedData);
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditedData({});
    setIsEditing(false);
  };

  const handleEditChange = (field: keyof ScanResult, value: string) => {
    setEditedData(prev => ({ ...prev, [field]: value }));
  };

  // Remove handleCreateFolder since scan endpoint handles folder creation automatically

  const handleReturnToCabinet = () => {
    // Force refresh the person folders cache before navigating
    queryClient.invalidateQueries({ queryKey: ['/api/person-folders'] });
    setLocation('/app?tab=contacts&refresh=true');
  };

  const handleCameraCapture = (file: File) => {
    setSelectedFile(file);
    setScanResult(null);
    setFolderCreated(false);
    setShowCamera(false);
    
    // Show crop interface for camera captured images too
    const url = URL.createObjectURL(file);
    setImageUrl(url);
    setShowCropInterface(true);
    
    // Get image dimensions for proper cropping
    const img = new Image();
    img.onload = () => {
      setOriginalImageDimensions({ width: img.width, height: img.height });
    };
    img.src = url;
    
    // Scroll to top to show crop interface
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 100);
  };

  // Camera component is rendered conditionally with proper props
  const cameraProps = {
    onCapture: handleCameraCapture,
    onClose: () => setShowCamera(false),
    isOpen: showCamera
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="ghost"
            onClick={() => setLocation('/')}
            className="flex items-center"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Cabinet으로 돌아가기
          </Button>
          <h1 className="text-2xl font-bold text-gray-900">명함 스캔</h1>
          <div /> {/* Spacer */}
        </div>

        {/* Crop Interface - Now positioned at top */}
        {showCropInterface && imageUrl && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <Edit2 className="w-5 h-5 text-blue-600" />
                명함 영역 선택
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  명함 부분을 정확히 선택해주세요. 파란색 영역을 드래그하여 조정하거나 모서리를 당겨서 크기를 변경하세요.
                </p>
                
                {/* Image with crop overlay */}
                <div className="relative bg-gray-100 rounded-lg overflow-hidden mx-auto max-w-md">
                  <img 
                    src={imageUrl} 
                    alt="명함 이미지" 
                    className="w-full h-auto object-contain"
                    onLoad={(e) => {
                      const img = e.target as HTMLImageElement;
                      setOriginalImageDimensions({ width: img.naturalWidth, height: img.naturalHeight });
                    }}
                  />
                  {/* Crop overlay */}
                  <div 
                    className="absolute border-2 border-blue-500 bg-blue-500/20 cursor-move select-none touch-manipulation"
                    style={{
                      left: `${cropArea.x}%`,
                      top: `${cropArea.y}%`,
                      width: `${cropArea.width}%`,
                      height: `${cropArea.height}%`
                    }}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const startX = e.clientX;
                      const startY = e.clientY;
                      const startCropX = cropArea.x;
                      const startCropY = cropArea.y;
                      
                      const handleMouseMove = (e: MouseEvent) => {
                        const imgContainer = document.querySelector('.relative');
                        const img = imgContainer?.querySelector('img');
                        if (!img) return;
                        
                        const rect = img.getBoundingClientRect();
                        const deltaX = ((e.clientX - startX) / rect.width) * 100;
                        const deltaY = ((e.clientY - startY) / rect.height) * 100;
                        
                        setCropArea(prev => ({
                          ...prev,
                          x: Math.max(0, Math.min(100 - prev.width, startCropX + deltaX)),
                          y: Math.max(0, Math.min(100 - prev.height, startCropY + deltaY))
                        }));
                      };
                      
                      const handleMouseUp = () => {
                        document.removeEventListener('mousemove', handleMouseMove);
                        document.removeEventListener('mouseup', handleMouseUp);
                      };
                      
                      document.addEventListener('mousemove', handleMouseMove);
                      document.addEventListener('mouseup', handleMouseUp);
                    }}
                    onTouchStart={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const touch = e.touches[0];
                      const startX = touch.clientX;
                      const startY = touch.clientY;
                      const startCropX = cropArea.x;
                      const startCropY = cropArea.y;
                      
                      const handleTouchMove = (e: TouchEvent) => {
                        e.preventDefault();
                        const touch = e.touches[0];
                        const imgContainer = document.querySelector('.relative');
                        const img = imgContainer?.querySelector('img');
                        if (!img) return;
                        
                        const rect = img.getBoundingClientRect();
                        const deltaX = ((touch.clientX - startX) / rect.width) * 100;
                        const deltaY = ((touch.clientY - startY) / rect.height) * 100;
                        
                        setCropArea(prev => ({
                          ...prev,
                          x: Math.max(0, Math.min(100 - prev.width, startCropX + deltaX)),
                          y: Math.max(0, Math.min(100 - prev.height, startCropY + deltaY))
                        }));
                      };
                      
                      const handleTouchEnd = () => {
                        document.removeEventListener('touchmove', handleTouchMove);
                        document.removeEventListener('touchend', handleTouchEnd);
                      };
                      
                      document.addEventListener('touchmove', handleTouchMove, { passive: false });
                      document.addEventListener('touchend', handleTouchEnd);
                    }}
                  >
                    {/* Corner resize handles */}
                    <div 
                      className="absolute -top-2 -left-2 w-6 h-6 bg-blue-500 border-2 border-white cursor-nw-resize rounded-full touch-manipulation flex items-center justify-center"
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        const startX = e.clientX;
                        const startY = e.clientY;
                        const startCrop = { ...cropArea };
                        
                        const handleMouseMove = (e: MouseEvent) => {
                          const imgContainer = document.querySelector('.relative');
                          const img = imgContainer?.querySelector('img');
                          if (!img) return;
                          
                          const rect = img.getBoundingClientRect();
                          const deltaX = ((e.clientX - startX) / rect.width) * 100;
                          const deltaY = ((e.clientY - startY) / rect.height) * 100;
                          
                          const newX = Math.max(0, Math.min(startCrop.x + startCrop.width - 10, startCrop.x + deltaX));
                          const newY = Math.max(0, Math.min(startCrop.y + startCrop.height - 10, startCrop.y + deltaY));
                          const newWidth = startCrop.width - (newX - startCrop.x);
                          const newHeight = startCrop.height - (newY - startCrop.y);
                          
                          setCropArea({
                            x: newX,
                            y: newY,
                            width: Math.max(10, newWidth),
                            height: Math.max(10, newHeight)
                          });
                        };
                        
                        const handleMouseUp = () => {
                          document.removeEventListener('mousemove', handleMouseMove);
                          document.removeEventListener('mouseup', handleMouseUp);
                        };
                        
                        document.addEventListener('mousemove', handleMouseMove);
                        document.addEventListener('mouseup', handleMouseUp);
                      }}
                      onTouchStart={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        const touch = e.touches[0];
                        const startX = touch.clientX;
                        const startY = touch.clientY;
                        const startCrop = { ...cropArea };
                        
                        const handleTouchMove = (e: TouchEvent) => {
                          e.preventDefault();
                          const touch = e.touches[0];
                          const imgContainer = document.querySelector('.relative');
                          const img = imgContainer?.querySelector('img');
                          if (!img) return;
                          
                          const rect = img.getBoundingClientRect();
                          const deltaX = ((touch.clientX - startX) / rect.width) * 100;
                          const deltaY = ((touch.clientY - startY) / rect.height) * 100;
                          
                          const newX = Math.max(0, Math.min(startCrop.x + startCrop.width - 10, startCrop.x + deltaX));
                          const newY = Math.max(0, Math.min(startCrop.y + startCrop.height - 10, startCrop.y + deltaY));
                          const newWidth = startCrop.width - (newX - startCrop.x);
                          const newHeight = startCrop.height - (newY - startCrop.y);
                          
                          setCropArea({
                            x: newX,
                            y: newY,
                            width: Math.max(10, newWidth),
                            height: Math.max(10, newHeight)
                          });
                        };
                        
                        const handleTouchEnd = () => {
                          document.removeEventListener('touchmove', handleTouchMove);
                          document.removeEventListener('touchend', handleTouchEnd);
                        };
                        
                        document.addEventListener('touchmove', handleTouchMove, { passive: false });
                        document.addEventListener('touchend', handleTouchEnd);
                      }}
                    >
                      <div className="w-1 h-1 bg-white rounded-full"></div>
                    </div>
                    <div 
                      className="absolute -top-2 -right-2 w-6 h-6 bg-blue-500 border-2 border-white cursor-ne-resize rounded-full touch-manipulation flex items-center justify-center"
                      onTouchStart={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        const touch = e.touches[0];
                        const startX = touch.clientX;
                        const startY = touch.clientY;
                        const startCrop = { ...cropArea };
                        
                        const handleTouchMove = (e: TouchEvent) => {
                          e.preventDefault();
                          const touch = e.touches[0];
                          const imgContainer = document.querySelector('.relative');
                          const img = imgContainer?.querySelector('img');
                          if (!img) return;
                          
                          const rect = img.getBoundingClientRect();
                          const deltaX = ((touch.clientX - startX) / rect.width) * 100;
                          const deltaY = ((touch.clientY - startY) / rect.height) * 100;
                          
                          const newY = Math.max(0, Math.min(startCrop.y + startCrop.height - 10, startCrop.y + deltaY));
                          const newWidth = Math.max(10, Math.min(100 - startCrop.x, startCrop.width + deltaX));
                          const newHeight = startCrop.height - (newY - startCrop.y);
                          
                          setCropArea({
                            ...startCrop,
                            y: newY,
                            width: newWidth,
                            height: Math.max(10, newHeight)
                          });
                        };
                        
                        const handleTouchEnd = () => {
                          document.removeEventListener('touchmove', handleTouchMove);
                          document.removeEventListener('touchend', handleTouchEnd);
                        };
                        
                        document.addEventListener('touchmove', handleTouchMove, { passive: false });
                        document.addEventListener('touchend', handleTouchEnd);
                      }}
                    >
                      <div className="w-1 h-1 bg-white rounded-full"></div>
                    </div>
                    <div 
                      className="absolute -bottom-2 -left-2 w-6 h-6 bg-blue-500 border-2 border-white cursor-sw-resize rounded-full touch-manipulation flex items-center justify-center"
                      onTouchStart={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        const touch = e.touches[0];
                        const startX = touch.clientX;
                        const startY = touch.clientY;
                        const startCrop = { ...cropArea };
                        
                        const handleTouchMove = (e: TouchEvent) => {
                          e.preventDefault();
                          const touch = e.touches[0];
                          const imgContainer = document.querySelector('.relative');
                          const img = imgContainer?.querySelector('img');
                          if (!img) return;
                          
                          const rect = img.getBoundingClientRect();
                          const deltaX = ((touch.clientX - startX) / rect.width) * 100;
                          const deltaY = ((touch.clientY - startY) / rect.height) * 100;
                          
                          const newX = Math.max(0, Math.min(startCrop.x + startCrop.width - 10, startCrop.x + deltaX));
                          const newWidth = startCrop.width - (newX - startCrop.x);
                          const newHeight = Math.max(10, Math.min(100 - startCrop.y, startCrop.height + deltaY));
                          
                          setCropArea({
                            ...startCrop,
                            x: newX,
                            width: Math.max(10, newWidth),
                            height: newHeight
                          });
                        };
                        
                        const handleTouchEnd = () => {
                          document.removeEventListener('touchmove', handleTouchMove);
                          document.removeEventListener('touchend', handleTouchEnd);
                        };
                        
                        document.addEventListener('touchmove', handleTouchMove, { passive: false });
                        document.addEventListener('touchend', handleTouchEnd);
                      }}
                    >
                      <div className="w-1 h-1 bg-white rounded-full"></div>
                    </div>
                    <div 
                      className="absolute -bottom-2 -right-2 w-6 h-6 bg-blue-500 border-2 border-white cursor-se-resize rounded-full touch-manipulation flex items-center justify-center"
                      onTouchStart={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        const touch = e.touches[0];
                        const startX = touch.clientX;
                        const startY = touch.clientY;
                        const startCrop = { ...cropArea };
                        
                        const handleTouchMove = (e: TouchEvent) => {
                          e.preventDefault();
                          const touch = e.touches[0];
                          const imgContainer = document.querySelector('.relative');
                          const img = imgContainer?.querySelector('img');
                          if (!img) return;
                          
                          const rect = img.getBoundingClientRect();
                          const deltaX = ((touch.clientX - startX) / rect.width) * 100;
                          const deltaY = ((touch.clientY - startY) / rect.height) * 100;
                          
                          const newWidth = Math.max(10, Math.min(100 - startCrop.x, startCrop.width + deltaX));
                          const newHeight = Math.max(10, Math.min(100 - startCrop.y, startCrop.height + deltaY));
                          
                          setCropArea({
                            ...startCrop,
                            width: newWidth,
                            height: newHeight
                          });
                        };
                        
                        const handleTouchEnd = () => {
                          document.removeEventListener('touchmove', handleTouchMove);
                          document.removeEventListener('touchend', handleTouchEnd);
                        };
                        
                        document.addEventListener('touchmove', handleTouchMove, { passive: false });
                        document.addEventListener('touchend', handleTouchEnd);
                      }}
                    >
                      <div className="w-1 h-1 bg-white rounded-full"></div>
                    </div>
                  </div>
                </div>

                {/* Preset crop options */}
                <div className="flex gap-2 justify-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCropArea({ x: 10, y: 10, width: 80, height: 50 })}
                  >
                    전체
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCropArea({ x: 15, y: 20, width: 70, height: 40 })}
                  >
                    중앙
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCropArea({ x: 20, y: 25, width: 60, height: 35 })}
                  >
                    명함만
                  </Button>
                </div>

                {/* Process button */}
                <Button
                  onClick={handleCropAndProcess}
                  disabled={isScanning}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  size="lg"
                >
                  {isScanning ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      AI로 분석 중...
                    </>
                  ) : (
                    <>
                      <Scissors className="w-4 h-4 mr-2" />
                      선택한 영역 처리하기
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Upload Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Camera className="w-5 h-5 mr-2" />
              명함 이미지 업로드
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div
                className={cn(
                  "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
                  selectedFile ? "border-green-300 bg-green-50" : "border-gray-300 hover:border-gray-400"
                )}
              >
                {selectedFile ? (
                  <div className="space-y-4">
                    <FileImage className="w-12 h-12 text-green-600 mx-auto" />
                    <div>
                      <p className="font-medium text-green-900">{selectedFile.name}</p>
                      <p className="text-sm text-green-600">
                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      다른 이미지 선택
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <Camera className="w-12 h-12 text-gray-400 mx-auto" />
                    <div>
                      <p className="text-lg font-medium text-gray-900">
                        명함 이미지를 업로드하세요
                      </p>
                      <p className="text-gray-500">
                        JPG, PNG, WEBP 파일 (최대 10MB)
                      </p>
                    </div>
                    <div className="flex gap-3 justify-center">
                      <Button
                        onClick={() => setShowCamera(true)}
                        className="bg-purple-600 hover:bg-purple-700"
                      >
                        <Camera className="w-4 h-4 mr-2" />
                        카메라로 촬영
                      </Button>
                      <Button
                        onClick={() => fileInputRef.current?.click()}
                        variant="outline"
                        className="border-blue-300 text-blue-600 hover:bg-blue-50"
                      >
                        <ImagePlus className="w-4 h-4 mr-2" />
                        갤러리에서 선택
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />

              {selectedFile && !scanResult && (
                <Button
                  onClick={handleScan}
                  disabled={isScanning}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  size="lg"
                >
                  {isScanning ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      AI로 분석 중...
                    </>
                  ) : (
                    <>
                      <Camera className="w-4 h-4 mr-2" />
                      명함 스캔 시작
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Scan Results */}
        {scanResult && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center">
                <CheckCircle className="w-5 h-5 mr-2 text-green-600" />
                스캔 결과
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {!isEditing && (
                  <div className="flex justify-end">
                    <Button
                      onClick={handleStartEdit}
                      variant="outline"
                      size="sm"
                      className="border-gray-300"
                    >
                      <Edit2 className="w-4 h-4 mr-2" />
                      정보 수정
                    </Button>
                  </div>
                )}

                {isEditing && (
                  <div className="flex justify-end gap-2">
                    <Button
                      onClick={handleCancelEdit}
                      variant="outline"
                      size="sm"
                    >
                      <X className="w-4 h-4 mr-2" />
                      취소
                    </Button>
                    <Button
                      onClick={handleSaveEdit}
                      size="sm"
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      저장
                    </Button>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Ordered field rendering - specific order: 이름, 직책, 전화번호, 이메일, 회사, 주소 */}
                  {(() => {
                    // Define field order and configuration
                    const fieldOrder = ['name', 'jobTitle', 'phone', 'email', 'company', 'address'];
                    const getFieldLabel = (field: string) => {
                      const labels: Record<string, string> = {
                        name: '이름',
                        company: '회사',
                        jobTitle: '직책',
                        title: '직함',
                        department: '부서',
                        email: '이메일',
                        phone: '전화번호',
                        mobile: '휴대폰',
                        fax: '팩스',
                        website: '웹사이트',
                        address: '주소',
                        linkedIn: 'LinkedIn',
                        twitter: 'Twitter',
                        instagram: 'Instagram',
                        facebook: 'Facebook',
                        skype: 'Skype',
                        whatsapp: 'WhatsApp',
                        telegram: 'Telegram',
                        wechat: 'WeChat',
                        line: 'Line'
                      };
                      return labels[field] || field.charAt(0).toUpperCase() + field.slice(1);
                    };

                    const getInputType = (field: string) => {
                      if (field === 'email') return 'email';
                      if (field === 'phone' || field === 'mobile' || field === 'fax') return 'tel';
                      if (field === 'website' || field.includes('url')) return 'url';
                      return 'text';
                    };

                    // First show priority fields in order
                    const priorityFields = fieldOrder.map(key => {
                      const value = scanResult[key];
                      if (!value && !isEditing) return null;
                      
                      const isFullWidth = key === 'address' || key === 'website' || key.includes('url');
                      
                      return (
                        <div key={key} className={isFullWidth ? 'md:col-span-2' : ''}>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            {getFieldLabel(key)}
                          </label>
                          {isEditing ? (
                            <Input
                              value={editedData[key] || ''}
                              onChange={(e) => handleEditChange(key, e.target.value)}
                              placeholder={`${getFieldLabel(key)}을(를) 입력하세요`}
                              type={getInputType(key)}
                            />
                          ) : (
                            key === 'address' && value ? (
                              <button
                                onClick={() => window.open(`https://maps.google.com/maps?q=${encodeURIComponent(value)}`, '_blank')}
                                className="text-blue-600 hover:text-blue-800 underline text-left"
                              >
                                {value}
                              </button>
                            ) : (
                              <p className="text-gray-900">{value}</p>
                            )
                          )}
                        </div>
                      );
                    }).filter(Boolean);

                    // Then show remaining fields
                    const remainingFields = Object.entries(scanResult)
                      .filter(([key]) => !fieldOrder.includes(key))
                      .map(([key, value]) => {
                        if (!value && !isEditing) return null;
                        
                        const isFullWidth = key === 'address' || key === 'website' || key.includes('url');
                        
                        return (
                          <div key={key} className={isFullWidth ? 'md:col-span-2' : ''}>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              {getFieldLabel(key)}
                            </label>
                            {isEditing ? (
                              <Input
                                value={editedData[key] || ''}
                                onChange={(e) => handleEditChange(key, e.target.value)}
                                placeholder={`${getFieldLabel(key)}을(를) 입력하세요`}
                                type={getInputType(key)}
                              />
                            ) : (
                              key === 'address' && value ? (
                                <button
                                  onClick={() => window.open(`https://maps.google.com/maps?q=${encodeURIComponent(value)}`, '_blank')}
                                  className="text-blue-600 hover:text-blue-800 underline text-left"
                                >
                                  {value}
                                </button>
                              ) : (
                                <p className="text-gray-900">{value}</p>
                              )
                            )}
                          </div>
                        );
                      }).filter(Boolean);

                    return [...priorityFields, ...remainingFields];
                  })()}
                </div>

                {/* Folder creation is now handled automatically by scan endpoint */}

                {!folderCreated && isEditing && (
                  <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
                    수정을 완료한 후 저장 버튼을 눌러 Cabinet에 폴더로 저장할 수 있습니다.
                  </div>
                )}

                {folderCreated && (
                  <div className="text-center space-y-4">
                    <div className="flex items-center justify-center text-green-600">
                      <CheckCircle className="w-8 h-8 mr-2" />
                      <span className="text-lg font-medium">폴더 생성 완료!</span>
                    </div>
                    <p className="text-gray-600">
                      {scanResult.name || '새 연락처'}님의 폴더가 Cabinet에 추가되었습니다.
                    </p>
                    <Button
                      onClick={handleReturnToCabinet}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      Cabinet에서 확인하기
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
                
                {/* Image with crop overlay */}
                <div className="relative bg-gray-100 rounded-lg overflow-hidden mx-auto max-w-md">
                  <img 
                    src={imageUrl} 
                    alt="명함 이미지" 
                    className="w-full h-auto object-contain"
                    onLoad={(e) => {
                      const img = e.target as HTMLImageElement;
                      setOriginalImageDimensions({ width: img.naturalWidth, height: img.naturalHeight });
                    }}
                  />
                  {/* Crop overlay */}
                  <div 
                    className="absolute border-2 border-blue-500 bg-blue-500/20 cursor-move select-none touch-manipulation"
                    style={{
                      left: `${cropArea.x}%`,
                      top: `${cropArea.y}%`,
                      width: `${cropArea.width}%`,
                      height: `${cropArea.height}%`
                    }}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const startX = e.clientX;
                      const startY = e.clientY;
                      const startCropX = cropArea.x;
                      const startCropY = cropArea.y;
                      
                      const handleMouseMove = (e: MouseEvent) => {
                        const imgContainer = document.querySelector('.relative');
                        const img = imgContainer?.querySelector('img');
                        if (!img) return;
                        
                        const rect = img.getBoundingClientRect();
                        const deltaX = ((e.clientX - startX) / rect.width) * 100;
                        const deltaY = ((e.clientY - startY) / rect.height) * 100;
                        
                        setCropArea(prev => ({
                          ...prev,
                          x: Math.max(0, Math.min(100 - prev.width, startCropX + deltaX)),
                          y: Math.max(0, Math.min(100 - prev.height, startCropY + deltaY))
                        }));
                      };
                      
                      const handleMouseUp = () => {
                        document.removeEventListener('mousemove', handleMouseMove);
                        document.removeEventListener('mouseup', handleMouseUp);
                      };
                      
                      document.addEventListener('mousemove', handleMouseMove);
                      document.addEventListener('mouseup', handleMouseUp);
                    }}
                    onTouchStart={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const touch = e.touches[0];
                      const startX = touch.clientX;
                      const startY = touch.clientY;
                      const startCropX = cropArea.x;
                      const startCropY = cropArea.y;
                      
                      const handleTouchMove = (e: TouchEvent) => {
                        e.preventDefault();
                        const touch = e.touches[0];
                        const imgContainer = document.querySelector('.relative');
                        const img = imgContainer?.querySelector('img');
                        if (!img) return;
                        
                        const rect = img.getBoundingClientRect();
                        const deltaX = ((touch.clientX - startX) / rect.width) * 100;
                        const deltaY = ((touch.clientY - startY) / rect.height) * 100;
                        
                        setCropArea(prev => ({
                          ...prev,
                          x: Math.max(0, Math.min(100 - prev.width, startCropX + deltaX)),
                          y: Math.max(0, Math.min(100 - prev.height, startCropY + deltaY))
                        }));
                      };
                      
                      const handleTouchEnd = () => {
                        document.removeEventListener('touchmove', handleTouchMove);
                        document.removeEventListener('touchend', handleTouchEnd);
                      };
                      
                      document.addEventListener('touchmove', handleTouchMove, { passive: false });
                      document.addEventListener('touchend', handleTouchEnd);
                    }}
                  >
                    {/* Corner resize handles */}
                    <div 
                      className="absolute -top-2 -left-2 w-6 h-6 bg-blue-500 border-2 border-white cursor-nw-resize rounded-full touch-manipulation flex items-center justify-center"
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        const startX = e.clientX;
                        const startY = e.clientY;
                        const startCrop = { ...cropArea };
                        
                        const handleMouseMove = (e: MouseEvent) => {
                          const imgContainer = document.querySelector('.relative');
                          const img = imgContainer?.querySelector('img');
                          if (!img) return;
                          
                          const rect = img.getBoundingClientRect();
                          const deltaX = ((e.clientX - startX) / rect.width) * 100;
                          const deltaY = ((e.clientY - startY) / rect.height) * 100;
                          
                          const newX = Math.max(0, Math.min(startCrop.x + startCrop.width - 10, startCrop.x + deltaX));
                          const newY = Math.max(0, Math.min(startCrop.y + startCrop.height - 10, startCrop.y + deltaY));
                          const newWidth = startCrop.width - (newX - startCrop.x);
                          const newHeight = startCrop.height - (newY - startCrop.y);
                          
                          setCropArea({
                            x: newX,
                            y: newY,
                            width: Math.max(10, newWidth),
                            height: Math.max(10, newHeight)
                          });
                        };
                        
                        const handleMouseUp = () => {
                          document.removeEventListener('mousemove', handleMouseMove);
                          document.removeEventListener('mouseup', handleMouseUp);
                        };
                        
                        document.addEventListener('mousemove', handleMouseMove);
                        document.addEventListener('mouseup', handleMouseUp);
                      }}
                      onTouchStart={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        const touch = e.touches[0];
                        const startX = touch.clientX;
                        const startY = touch.clientY;
                        const startCrop = { ...cropArea };
                        
                        const handleTouchMove = (e: TouchEvent) => {
                          e.preventDefault();
                          const touch = e.touches[0];
                          const imgContainer = document.querySelector('.relative');
                          const img = imgContainer?.querySelector('img');
                          if (!img) return;
                          
                          const rect = img.getBoundingClientRect();
                          const deltaX = ((touch.clientX - startX) / rect.width) * 100;
                          const deltaY = ((touch.clientY - startY) / rect.height) * 100;
                          
                          const newX = Math.max(0, Math.min(startCrop.x + startCrop.width - 10, startCrop.x + deltaX));
                          const newY = Math.max(0, Math.min(startCrop.y + startCrop.height - 10, startCrop.y + deltaY));
                          const newWidth = startCrop.width - (newX - startCrop.x);
                          const newHeight = startCrop.height - (newY - startCrop.y);
                          
                          setCropArea({
                            x: newX,
                            y: newY,
                            width: Math.max(10, newWidth),
                            height: Math.max(10, newHeight)
                          });
                        };
                        
                        const handleTouchEnd = () => {
                          document.removeEventListener('touchmove', handleTouchMove);
                          document.removeEventListener('touchend', handleTouchEnd);
                        };
                        
                        document.addEventListener('touchmove', handleTouchMove, { passive: false });
                        document.addEventListener('touchend', handleTouchEnd);
                      }}
                    >
                      <div className="w-1 h-1 bg-white rounded-full"></div>
                    </div>
                    <div 
                      className="absolute -top-2 -right-2 w-6 h-6 bg-blue-500 border-2 border-white cursor-ne-resize rounded-full touch-manipulation flex items-center justify-center"
                      onTouchStart={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        const touch = e.touches[0];
                        const startX = touch.clientX;
                        const startY = touch.clientY;
                        const startCrop = { ...cropArea };
                        
                        const handleTouchMove = (e: TouchEvent) => {
                          e.preventDefault();
                          const touch = e.touches[0];
                          const imgContainer = document.querySelector('.relative');
                          const img = imgContainer?.querySelector('img');
                          if (!img) return;
                          
                          const rect = img.getBoundingClientRect();
                          const deltaX = ((touch.clientX - startX) / rect.width) * 100;
                          const deltaY = ((touch.clientY - startY) / rect.height) * 100;
                          
                          const newY = Math.max(0, Math.min(startCrop.y + startCrop.height - 10, startCrop.y + deltaY));
                          const newWidth = Math.max(10, Math.min(100 - startCrop.x, startCrop.width + deltaX));
                          const newHeight = startCrop.height - (newY - startCrop.y);
                          
                          setCropArea({
                            ...startCrop,
                            y: newY,
                            width: newWidth,
                            height: Math.max(10, newHeight)
                          });
                        };
                        
                        const handleTouchEnd = () => {
                          document.removeEventListener('touchmove', handleTouchMove);
                          document.removeEventListener('touchend', handleTouchEnd);
                        };
                        
                        document.addEventListener('touchmove', handleTouchMove, { passive: false });
                        document.addEventListener('touchend', handleTouchEnd);
                      }}
                    >
                      <div className="w-1 h-1 bg-white rounded-full"></div>
                    </div>
                    <div 
                      className="absolute -bottom-2 -left-2 w-6 h-6 bg-blue-500 border-2 border-white cursor-sw-resize rounded-full touch-manipulation flex items-center justify-center"
                      onTouchStart={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        const touch = e.touches[0];
                        const startX = touch.clientX;
                        const startY = touch.clientY;
                        const startCrop = { ...cropArea };
                        
                        const handleTouchMove = (e: TouchEvent) => {
                          e.preventDefault();
                          const touch = e.touches[0];
                          const imgContainer = document.querySelector('.relative');
                          const img = imgContainer?.querySelector('img');
                          if (!img) return;
                          
                          const rect = img.getBoundingClientRect();
                          const deltaX = ((touch.clientX - startX) / rect.width) * 100;
                          const deltaY = ((touch.clientY - startY) / rect.height) * 100;
                          
                          const newX = Math.max(0, Math.min(startCrop.x + startCrop.width - 10, startCrop.x + deltaX));
                          const newWidth = startCrop.width - (newX - startCrop.x);
                          const newHeight = Math.max(10, Math.min(100 - startCrop.y, startCrop.height + deltaY));
                          
                          setCropArea({
                            ...startCrop,
                            x: newX,
                            width: Math.max(10, newWidth),
                            height: newHeight
                          });
                        };
                        
                        const handleTouchEnd = () => {
                          document.removeEventListener('touchmove', handleTouchMove);
                          document.removeEventListener('touchend', handleTouchEnd);
                        };
                        
                        document.addEventListener('touchmove', handleTouchMove, { passive: false });
                        document.addEventListener('touchend', handleTouchEnd);
                      }}
                    >
                      <div className="w-1 h-1 bg-white rounded-full"></div>
                    </div>
                    <div 
                      className="absolute -bottom-2 -right-2 w-6 h-6 bg-blue-500 border-2 border-white cursor-se-resize rounded-full touch-manipulation flex items-center justify-center"
                      onTouchStart={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        const touch = e.touches[0];
                        const startX = touch.clientX;
                        const startY = touch.clientY;
                        const startCrop = { ...cropArea };
                        
                        const handleTouchMove = (e: TouchEvent) => {
                          e.preventDefault();
                          const touch = e.touches[0];
                          const imgContainer = document.querySelector('.relative');
                          const img = imgContainer?.querySelector('img');
                          if (!img) return;
                          
                          const rect = img.getBoundingClientRect();
                          const deltaX = ((touch.clientX - startX) / rect.width) * 100;
                          const deltaY = ((touch.clientY - startY) / rect.height) * 100;
                          
                          const newWidth = Math.max(10, Math.min(100 - startCrop.x, startCrop.width + deltaX));
                          const newHeight = Math.max(10, Math.min(100 - startCrop.y, startCrop.height + deltaY));
                          
                          setCropArea({
                            ...startCrop,
                            width: newWidth,
                            height: newHeight
                          });
                        };
                        
                        const handleTouchEnd = () => {
                          document.removeEventListener('touchmove', handleTouchMove);
                          document.removeEventListener('touchend', handleTouchEnd);
                        };
                        
                        document.addEventListener('touchmove', handleTouchMove, { passive: false });
                        document.addEventListener('touchend', handleTouchEnd);
                      }}
                    >
                      <div className="w-1 h-1 bg-white rounded-full"></div>
                    </div>
                  </div>
                </div>

                {/* Preset crop options */}
                <div className="flex gap-2 justify-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCropArea({ x: 5, y: 5, width: 90, height: 90 })}
                  >
                    전체
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCropArea({ x: 15, y: 25, width: 70, height: 50 })}
                  >
                    명함 크기
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCropArea({ x: 10, y: 10, width: 80, height: 80 })}
                  >
                    정사각형
                  </Button>
                </div>

                <div className="flex gap-3">
                  <Button
                    onClick={() => {
                      setShowCropInterface(false);
                      setImageUrl(null);
                      setSelectedFile(null);
                      setCropArea({ x: 10, y: 10, width: 80, height: 80 });
                    }}
                    variant="outline"
                    className="flex-1"
                  >
                    <X className="w-4 h-4 mr-2" />
                    취소
                  </Button>
                  <Button
                    onClick={() => {
                      // Apply crop and proceed with scan
                      setShowCropInterface(false);
                      if (selectedFile) {
                        handleScan();
                      }
                    }}
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    영역 확정 후 스캔
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <AlertCircle className="w-5 h-5 mr-2 text-blue-600" />
              스캔 팁
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm text-gray-600">
              <div className="flex items-start">
                <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                <p>명함 전체가 선명하게 보이도록 촬영하세요</p>
              </div>
              <div className="flex items-start">
                <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                <p>조명이 밝고 그림자가 없는 곳에서 촬영하세요</p>
              </div>
              <div className="flex items-start">
                <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                <p>명함이 평평하고 왜곡되지 않도록 주의하세요</p>
              </div>
              <div className="flex items-start">
                <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                <p>AI가 자동으로 정보를 추출하여 개인 폴더를 생성합니다</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Camera Component */}
      <CameraCapture
        onCapture={cameraProps.onCapture}
        onClose={cameraProps.onClose}
        isOpen={cameraProps.isOpen}
      />
    </div>
  );
}