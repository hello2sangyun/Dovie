import { useState, useRef, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import ReactCrop, { Crop, centerCrop, makeAspectCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Camera, Loader2, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";

interface ProfilePhotoUploadProps {
  isOpen: boolean;
  onClose: () => void;
}

function centerAspectCrop(mediaWidth: number, mediaHeight: number, aspect: number) {
  return centerCrop(
    makeAspectCrop(
      {
        unit: '%',
        width: 50, // 더 작은 초기 크롭 영역으로 전체 이미지를 더 잘 보이게 함
      },
      aspect,
      mediaWidth,
      mediaHeight,
    ),
    mediaWidth,
    mediaHeight,
  )
}

export default function ProfilePhotoUpload({ isOpen, onClose }: ProfilePhotoUploadProps) {
  const { user, setUser } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [imgSrc, setImgSrc] = useState("");
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<Crop>();
  const imgRef = useRef<HTMLImageElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const userId = localStorage.getItem("userId");
      const formData = new FormData();
      formData.append("file", file);
      
      const response = await fetch("/api/upload/profile-picture", {
        method: "POST",
        headers: {
          ...(userId ? { "x-user-id": userId } : {})
        },
        body: formData,
        credentials: "include",
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "업로드 실패");
      }
      
      return response.json();
    },
    onSuccess: async (data) => {
      console.log("✅ Profile photo uploaded successfully:", data);
      
      try {
        // 1단계: 전역 이미지 캐시 완전 무효화
        if ((window as any).globalImageCache) {
          const cache = (window as any).globalImageCache;
          cache.clear(); // 모든 이미지 캐시 삭제
          console.log("🗑️ All image cache cleared");
        }
        
        // 2단계: 새 프로필 이미지를 즉시 다운로드하여 캐시에 저장
        if (data.profilePicture) {
          const imageResponse = await fetch(data.profilePicture + '?t=' + Date.now()); // 캐시 버스팅
          if (imageResponse.ok) {
            const blob = await imageResponse.blob();
            if ((window as any).globalImageCache) {
              (window as any).globalImageCache.set(data.profilePicture, blob);
              console.log("📸 New profile image cached immediately");
            }
          }
        }
        
        // 3단계: 사용자 상태를 즉시 업데이트 (낙관적 업데이트)
        if (user) {
          const updatedUser = { ...user, profilePicture: data.profilePicture };
          setUser(updatedUser);
          console.log("👤 User state updated immediately");
        }
        
        // 4단계: React Query 캐시 무효화 및 재로드
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] }),
          queryClient.invalidateQueries({ queryKey: ["/api/contacts"] }),
          queryClient.invalidateQueries({ queryKey: ["/api/chat-rooms"] })
        ]);
        
        // 5단계: 강제 데이터 새로고침
        await queryClient.refetchQueries({ queryKey: ["/api/auth/me"] });
        
        // 6단계: 모든 InstantAvatar 컴포넌트 강제 업데이트
        window.dispatchEvent(new CustomEvent('profileImageUpdated', { 
          detail: { newUrl: data.profilePicture } 
        }));
        
        console.log("🔄 Profile photo update process completed successfully");
        
        toast({
          title: "프로필 사진 업데이트 완료",
          description: "프로필 사진이 성공적으로 변경되었습니다.",
        });
        
        onClose();
        setImgSrc("");
        setCrop(undefined);
        setCompletedCrop(undefined);
        
      } catch (error) {
        console.error("❌ Profile photo update process failed:", error);
        toast({
          variant: "destructive",
          title: "업데이트 처리 실패",
          description: "프로필 사진 업데이트 후 처리 중 오류가 발생했습니다.",
        });
      }
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "업로드 실패",
        description: error.message || "프로필 사진 업로드 중 오류가 발생했습니다.",
      });
    },
    onSettled: () => {
      setIsUploading(false);
    }
  });

  const onSelectFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const reader = new FileReader();
      reader.addEventListener('load', () =>
        setImgSrc(reader.result?.toString() || ''),
      );
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    setCrop(centerAspectCrop(width, height, 1));
  }, []);

  const getCroppedImg = useCallback(
    (image: HTMLImageElement, crop: Crop): Promise<File> => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        throw new Error("No 2d context");
      }

      const scaleX = image.naturalWidth / image.width;
      const scaleY = image.naturalHeight / image.height;

      canvas.width = crop.width;
      canvas.height = crop.height;

      ctx.drawImage(
        image,
        crop.x * scaleX,
        crop.y * scaleY,
        crop.width * scaleX,
        crop.height * scaleY,
        0,
        0,
        crop.width,
        crop.height,
      );

      return new Promise((resolve) => {
        canvas.toBlob((blob) => {
          if (!blob) {
            throw new Error("Canvas is empty");
          }
          const file = new File([blob], "profile.jpg", { type: "image/jpeg" });
          resolve(file);
        }, "image/jpeg", 0.9);
      });
    },
    [],
  );

  const handleCropComplete = async () => {
    if (completedCrop && imgRef.current) {
      setIsUploading(true);
      try {
        const croppedFile = await getCroppedImg(imgRef.current, completedCrop);
        uploadMutation.mutate(croppedFile);
      } catch (error) {
        console.error("크롭 처리 실패:", error);
        toast({
          variant: "destructive",
          title: "이미지 처리 실패",
          description: "이미지 크롭 처리 중 오류가 발생했습니다.",
        });
        setIsUploading(false);
      }
    }
  };

  const handleClose = () => {
    if (!isUploading) {
      onClose();
      setImgSrc("");
      setCrop(undefined);
      setCompletedCrop(undefined);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-w-[95vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Camera className="w-5 h-5" />
            <span>프로필 사진 변경</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {!imgSrc ? (
            <div className="text-center">
              <input
                type="file"
                accept="image/*"
                onChange={onSelectFile}
                ref={fileInputRef}
                className="hidden"
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                className="w-full purple-gradient hover:purple-gradient-hover"
                disabled={isUploading}
              >
                <Upload className="w-4 h-4 mr-2" />
                사진 선택하기
              </Button>
              <p className="text-sm text-gray-500 mt-2">
                정사각형으로 크롭되어 업로드됩니다
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="w-full max-h-[50vh] overflow-auto rounded-lg border bg-gray-100 p-2">
                <div className="flex justify-center items-center min-h-[200px]">
                  <ReactCrop
                    crop={crop}
                    onChange={(_, percentCrop) => setCrop(percentCrop)}
                    onComplete={(c) => setCompletedCrop(c)}
                    aspect={1}
                    minWidth={30}
                    minHeight={30}
                    circularCrop
                  >
                    <img
                      ref={imgRef}
                      alt="크롭할 이미지"
                      src={imgSrc}
                      onLoad={onImageLoad}
                      className="max-w-full max-h-full object-contain"
                      style={{ 
                        minWidth: '200px',
                        minHeight: '200px',
                        maxWidth: '100%',
                        maxHeight: '400px'
                      }}
                    />
                  </ReactCrop>
                </div>
              </div>
              <div className="text-center space-y-2">
                <p className="text-sm text-gray-600">
                  원본 이미지 전체가 표시됩니다. 원하는 부분을 선택하여 프로필 사진을 만드세요.
                </p>
                <p className="text-xs text-gray-500">
                  선택 영역을 드래그하여 크기를 조절하고 위치를 변경할 수 있습니다.
                </p>
              </div>

              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setImgSrc("");
                    setCrop(undefined);
                    setCompletedCrop(undefined);
                  }}
                  disabled={isUploading}
                  className="flex-1"
                >
                  다시 선택
                </Button>
                <Button
                  onClick={handleCropComplete}
                  disabled={!completedCrop || isUploading}
                  className="flex-1 purple-gradient hover:purple-gradient-hover"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      업로드 중...
                    </>
                  ) : (
                    "적용하기"
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}