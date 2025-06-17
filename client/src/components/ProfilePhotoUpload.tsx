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
        width: 90,
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
  const { setUser } = useAuth();
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
      const formData = new FormData();
      formData.append("file", file);
      
      const response = await fetch("/api/upload/profile-picture", {
        method: "POST",
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error("업로드 실패");
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      setUser(prev => prev ? { ...prev, profilePicture: data.profilePicture } : prev);
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({
        title: "프로필 사진 업데이트 완료",
        description: "프로필 사진이 성공적으로 변경되었습니다.",
      });
      onClose();
      setImgSrc("");
      setCrop(undefined);
      setCompletedCrop(undefined);
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "업로드 실패",
        description: "프로필 사진 업로드 중 오류가 발생했습니다.",
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
      <DialogContent className="sm:max-w-md">
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
              <div className="max-h-96 overflow-hidden rounded-lg border">
                <ReactCrop
                  crop={crop}
                  onChange={(_, percentCrop) => setCrop(percentCrop)}
                  onComplete={(c) => setCompletedCrop(c)}
                  aspect={1}
                  minWidth={100}
                  minHeight={100}
                  circularCrop
                >
                  <img
                    ref={imgRef}
                    alt="크롭할 이미지"
                    src={imgSrc}
                    onLoad={onImageLoad}
                    className="max-w-full h-auto"
                  />
                </ReactCrop>
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