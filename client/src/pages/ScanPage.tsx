import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Camera, Upload, Scan, AlertCircle, Loader2 } from "lucide-react";
import CameraCapture from "@/components/CameraCapture";
import ImageCrop from "@/components/ImageCrop";

import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";

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
  [key: string]: string | undefined;
}

export default function ScanPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [croppedImageUrl, setCroppedImageUrl] = useState<string | null>(null);
  const [croppedFile, setCroppedFile] = useState<File | null>(null);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showManualCrop, setShowManualCrop] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  // Mutation for auto-cropping business card
  const autoCropMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      
      const response = await fetch("/api/auto-crop", {
        method: "POST",
        body: formData,
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`자동 크롭 실패: ${response.status} - ${errorText}`);
      }
      
      return await response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        setCroppedImageUrl(data.croppedImageUrl);
        // Convert base64 back to File for scanning
        fetch(data.croppedImageUrl)
          .then(res => res.blob())
          .then(blob => {
            const file = new File([blob], 'cropped-business-card.jpg', { type: 'image/jpeg' });
            setCroppedFile(file);
          });
        setIsProcessing(false);
        setShowPreview(true);
      } else {
        throw new Error(data.message || "Auto-crop failed");
      }
    },
    onError: (error) => {
      console.error("Auto-crop error:", error);
      setIsProcessing(false);
      toast({
        title: "자동 크롭 실패",
        description: "명함 영역 자동 감지에 실패했습니다.",
        variant: "destructive",
      });
    },
  });

  // Mutation for scanning business card
  const scanMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      
      const userId = localStorage.getItem("userId");
      const headers: Record<string, string> = {};
      if (userId) {
        headers["x-user-id"] = userId;
      }
      
      const response = await fetch("/api/scan", {
        method: "POST",
        headers,
        body: formData,
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`스캔 실패: ${response.status} - ${errorText}`);
      }
      
      return await response.json();
    },
    onSuccess: (data) => {
      setScanResult(data.extractedData);
      setShowPreview(false);
      setShowManualCrop(false);
      toast({
        title: "저장되었습니다",
        description: "명함 정보가 성공적으로 저장되었습니다.",
      });
      
      // Invalidate person folders to refresh the list
      queryClient.invalidateQueries({ queryKey: ["/api/person-folders"] });
    },
    onError: (error) => {
      console.error("Scan error:", error);
      toast({
        title: "스캔 실패",
        description: "명함 스캔 중 오류가 발생했습니다. 다시 시도해주세요.",
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setImageUrl(url);
      setScanResult(null);
      setIsProcessing(true);
      
      // Auto-crop to remove background
      autoCropMutation.mutate(file);
    }
  };



  const handleCameraCapture = (file: File) => {
    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setImageUrl(url);
    setScanResult(null);
    setShowCamera(false);
    setIsProcessing(true);
    
    // Auto-crop to remove background
    autoCropMutation.mutate(file);
  };

  const handleConfirmScan = () => {
    if (croppedFile) {
      scanMutation.mutate(croppedFile);
    }
  };

  const handleManualCrop = () => {
    setShowPreview(false);
    setShowManualCrop(true);
  };

  const handleCropComplete = (newCroppedFile: File) => {
    setCroppedFile(newCroppedFile);
    const url = URL.createObjectURL(newCroppedFile);
    setCroppedImageUrl(url);
    setShowManualCrop(false);
    setShowPreview(true);
  };

  const handleResetScan = () => {
    setScanResult(null);
    setSelectedFile(null);
    setImageUrl(null);
    setCroppedImageUrl(null);
    setCroppedFile(null);
    setShowPreview(false);
    setShowManualCrop(false);
    setIsProcessing(false);
  };

  const cameraProps = {
    onCapture: handleCameraCapture,
    onClose: () => setShowCamera(false),
    isOpen: showCamera,
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-md mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">명함 스캔</h1>
          <p className="text-gray-600">명함을 촬영하거나 업로드하여 정보를 추출하세요</p>
        </div>

        {/* Upload Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Upload className="w-5 h-5 mr-2 text-blue-600" />
              명함 업로드
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-3">
              <Button
                onClick={() => setShowCamera(true)}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                <Camera className="w-4 h-4 mr-2" />
                카메라로 촬영
              </Button>
              <Button
                onClick={() => fileInputRef.current?.click()}
                variant="outline"
                className="flex-1"
              >
                <Upload className="w-4 h-4 mr-2" />
                파일 선택
              </Button>
            </div>
            
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept="image/*"
              className="hidden"
            />
            
            {imageUrl && (
              <div className="space-y-4">
                <div className="relative bg-gray-100 rounded-lg overflow-hidden">
                  <img 
                    src={imageUrl} 
                    alt="명함 이미지" 
                    className="w-full h-auto object-contain max-h-64"
                  />
                </div>
                
                {scanMutation.isPending && (
                  <div className="text-center py-4">
                    <Loader2 className="w-8 h-8 mx-auto animate-spin text-green-600" />
                    <p className="mt-2 text-gray-600">AI가 명함을 분석하고 있습니다...</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Preview Mode */}
        {showPreview && croppedImageUrl && (
          <Card>
            <CardHeader>
              <CardTitle className="text-purple-600">자동 크롭 결과</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-center mb-6">
                <img
                  src={croppedImageUrl}
                  alt="Cropped business card"
                  className="max-w-full max-h-64 object-contain rounded-lg border border-gray-200"
                />
              </div>
              <div className="space-y-3">
                <Button 
                  onClick={handleConfirmScan}
                  disabled={scanMutation.isPending}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                >
                  {scanMutation.isPending ? "스캔 중..." : "확인"}
                </Button>
                <Button 
                  onClick={handleManualCrop}
                  variant="outline"
                  className="w-full border-purple-200 text-purple-600 hover:bg-purple-50"
                >
                  수동으로 영역 조정
                </Button>
                <Button 
                  onClick={handleResetScan}
                  variant="ghost"
                  className="w-full text-gray-500 hover:text-gray-700"
                >
                  다시 촬영
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Manual Crop Mode */}
        {showManualCrop && selectedFile && (
          <Card>
            <CardHeader>
              <CardTitle className="text-purple-600">명함 영역 조정</CardTitle>
            </CardHeader>
            <CardContent>
              <ImageCrop
                imageUrl={imageUrl!}
                onCrop={handleCropComplete}
                onCancel={() => {
                  setShowManualCrop(false);
                  setShowPreview(true);
                }}
              />
            </CardContent>
          </Card>
        )}

        {/* Scan Results */}
        {scanResult && (
          <Card>
            <CardHeader>
              <CardTitle className="text-green-600">스캔 결과</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {scanResult.name && (
                  <div>
                    <span className="font-medium text-gray-700">이름:</span>
                    <span className="ml-2 text-gray-900">{scanResult.name}</span>
                  </div>
                )}
                {scanResult.jobTitle && (
                  <div>
                    <span className="font-medium text-gray-700">직책:</span>
                    <span className="ml-2 text-gray-900">{scanResult.jobTitle}</span>
                  </div>
                )}
                {scanResult.company && (
                  <div>
                    <span className="font-medium text-gray-700">회사:</span>
                    <span className="ml-2 text-gray-900">{scanResult.company}</span>
                  </div>
                )}
                {scanResult.email && (
                  <div>
                    <span className="font-medium text-gray-700">이메일:</span>
                    <span className="ml-2 text-gray-900">{scanResult.email}</span>
                  </div>
                )}
                {scanResult.phone && (
                  <div>
                    <span className="font-medium text-gray-700">전화번호:</span>
                    <span className="ml-2 text-gray-900">{scanResult.phone}</span>
                  </div>
                )}
                {scanResult.address && (
                  <div>
                    <span className="font-medium text-gray-700">주소:</span>
                    <span className="ml-2 text-gray-900">{scanResult.address}</span>
                  </div>
                )}
                {scanResult.website && (
                  <div>
                    <span className="font-medium text-gray-700">웹사이트:</span>
                    <span className="ml-2 text-gray-900">{scanResult.website}</span>
                  </div>
                )}
              </div>
              
              <div className="mt-6 space-y-3">
                <Button
                  onClick={() => setLocation("/cabinet")}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Cabinet으로 이동
                </Button>
                <Button
                  onClick={() => {
                    setScanResult(null);
                    setSelectedFile(null);
                    setImageUrl(null);
                  }}
                  variant="outline"
                  className="w-full"
                >
                  새로운 명함 스캔
                </Button>
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