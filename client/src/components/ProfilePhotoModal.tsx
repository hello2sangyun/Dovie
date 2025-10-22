import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Upload, Crop, X } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface ProfilePhotoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ProfilePhotoModal({ isOpen, onClose }: ProfilePhotoModalProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [croppedImage, setCroppedImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const queryClient = useQueryClient();

  // 이미지 업로드 뮤테이션
  const uploadProfilePhotoMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/upload-profile-photo', {
        method: 'POST',
        headers: {
          'x-user-id': localStorage.getItem('userId') || '',
        },
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Upload failed');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      onClose();
      setSelectedImage(null);
      setCroppedImage(null);
    },
    onError: () => {
    },
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB 제한
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        setSelectedImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const cropImage = useCallback(() => {
    if (!imgRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const img = imgRef.current;

    if (!ctx) return;

    // 정사각형 크롭 사이즈 계산
    const size = Math.min(img.naturalWidth, img.naturalHeight);
    const startX = (img.naturalWidth - size) / 2;
    const startY = (img.naturalHeight - size) / 2;

    // 캔버스 크기 설정 (400x400 정사각형)
    canvas.width = 400;
    canvas.height = 400;

    // 이미지를 정사각형으로 크롭하여 캔버스에 그리기
    ctx.drawImage(
      img,
      startX, startY, size, size, // 소스 이미지의 크롭 영역
      0, 0, 400, 400 // 캔버스의 대상 영역
    );

    // 크롭된 이미지를 base64로 변환
    const croppedDataUrl = canvas.toDataURL('image/jpeg', 0.9);
    setCroppedImage(croppedDataUrl);
  }, []);

  const handleUpload = async () => {
    if (!croppedImage) return;

    setIsUploading(true);
    try {
      // base64를 File 객체로 변환
      const response = await fetch(croppedImage);
      const blob = await response.blob();
      const file = new File([blob], 'profile-photo.jpg', { type: 'image/jpeg' });
      
      uploadProfilePhotoMutation.mutate(file);
    } catch (error) {
    } finally {
      setIsUploading(false);
    }
  };

  const resetModal = () => {
    setSelectedImage(null);
    setCroppedImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            프로필 사진 변경
            <Button variant="ghost" size="sm" onClick={handleClose}>
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {!selectedImage ? (
            // 파일 선택 화면
            <div className="text-center">
              <div 
                className="border-2 border-dashed border-gray-300 rounded-lg p-8 cursor-pointer hover:border-blue-500 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600 mb-2">사진을 선택하세요</p>
                <p className="text-sm text-gray-400">JPG, PNG (최대 5MB)</p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
          ) : (
            // 이미지 크롭 및 미리보기 화면
            <div className="space-y-4">
              {!croppedImage ? (
                <div>
                  <div className="relative">
                    <img
                      ref={imgRef}
                      src={selectedImage}
                      alt="Selected"
                      className="w-full h-64 object-contain border rounded-lg"
                      onLoad={cropImage}
                    />
                    <canvas ref={canvasRef} className="hidden" />
                  </div>
                  <p className="text-sm text-gray-600 text-center mt-2">
                    이미지가 자동으로 정사각형으로 크롭됩니다
                  </p>
                </div>
              ) : (
                <div className="text-center">
                  <div className="w-32 h-32 mx-auto mb-4">
                    <img
                      src={croppedImage}
                      alt="Cropped preview"
                      className="w-full h-full object-cover rounded-full border-4 border-gray-200"
                    />
                  </div>
                  <p className="text-sm text-gray-600 mb-4">미리보기</p>
                  
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      onClick={resetModal}
                      disabled={isUploading}
                      className="flex-1"
                    >
                      다시 선택
                    </Button>
                    <Button
                      onClick={handleUpload}
                      disabled={isUploading}
                      className="flex-1"
                    >
                      {isUploading ? "업로드 중..." : "저장"}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}