import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Camera, Upload, Scan, AlertCircle, Loader2, RefreshCw, Merge } from "lucide-react";
import CameraCapture from "@/components/CameraCapture";
import ImageCrop from "@/components/ImageCropNew";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
  folderId?: number;
  [key: string]: string | number | undefined;
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
  const [memo, setMemo] = useState<string>("");
  const [isSavingMemo, setIsSavingMemo] = useState(false);
  const [duplicateCheck, setDuplicateCheck] = useState<any>(null);
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);

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

  // Mutation for checking duplicates
  const checkDuplicateMutation = useMutation({
    mutationFn: async (extractedData: any) => {
      const userId = localStorage.getItem("userId");
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (userId) {
        headers["x-user-id"] = userId;
      }
      
      const response = await fetch("/api/business-cards/check-duplicate", {
        method: "POST",
        headers,
        body: JSON.stringify(extractedData),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`중복 확인 실패: ${response.status} - ${errorText}`);
      }
      
      return await response.json();
    },
    onSuccess: (data) => {
      if (data.isDuplicate) {
        setDuplicateCheck(data);
        setShowDuplicateDialog(true);
      } else {
        // No duplicate, proceed with saving
        proceedWithSave();
      }
    },
    onError: (error) => {
      console.error("Duplicate check error:", error);
      // If duplicate check fails, proceed with saving
      proceedWithSave();
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
      // First check for duplicates before saving
      const extractedData = {
        name: data.extractedData.name,
        company: data.extractedData.company,
        phone: data.extractedData.phone,
        email: data.extractedData.email,
      };
      
      // Store the full scan result for later use
      setScanResult({
        ...data.extractedData,
        folderId: data.folderId
      });
      
      // Check for duplicates
      checkDuplicateMutation.mutate(extractedData);
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

  // Mutation for merging business cards
  const mergeMutation = useMutation({
    mutationFn: async ({ existingCardId, newCardData }: { existingCardId: number; newCardData: any }) => {
      const userId = localStorage.getItem("userId");
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (userId) {
        headers["x-user-id"] = userId;
      }
      
      const response = await fetch("/api/business-cards/merge", {
        method: "POST",
        headers,
        body: JSON.stringify({ existingCardId, newCardData }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`병합 실패: ${response.status} - ${errorText}`);
      }
      
      return await response.json();
    },
    onSuccess: () => {
      setShowDuplicateDialog(false);
      setDuplicateCheck(null);
      proceedWithSave();
    },
    onError: (error) => {
      console.error("Merge error:", error);
      toast({
        title: "병합 실패",
        description: "명함 병합 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  // Function to proceed with saving (no duplicates found)
  const proceedWithSave = () => {
    setShowPreview(false);
    setShowManualCrop(false);
    toast({
      title: "저장되었습니다",
      description: "명함 정보가 성공적으로 저장되었습니다.",
    });
    
    // Invalidate person folders to refresh the list
    queryClient.invalidateQueries({ queryKey: ["/api/person-folders"] });
  };

  // Handle duplicate dialog actions
  const handleMergeCards = () => {
    if (duplicateCheck && scanResult) {
      mergeMutation.mutate({
        existingCardId: duplicateCheck.existingCard.id,
        newCardData: scanResult,
      });
    }
  };

  const handleKeepExisting = () => {
    setShowDuplicateDialog(false);
    setDuplicateCheck(null);
    toast({
      title: "기존 명함 유지",
      description: "기존에 저장된 명함을 유지합니다.",
    });
    setLocation("/");
  };

  const handleSaveAsNew = () => {
    setShowDuplicateDialog(false);
    setDuplicateCheck(null);
    proceedWithSave();
  };

  // Mutation for saving memo to folder
  const saveMemoMutation = useMutation({
    mutationFn: async ({ folderId, memo }: { folderId: number; memo: string }) => {
      return apiRequest(`/api/person-folders/${folderId}/memo`, "POST", { memo });
    },
    onSuccess: () => {
      toast({
        title: "메모 저장 완료",
        description: "메모가 폴더에 저장되었습니다.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/person-folders"] });
    },
    onError: (error) => {
      toast({
        title: "메모 저장 실패",
        description: "메모 저장 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  const handleSaveMemo = async () => {
    if (!memo.trim() || !scanResult?.folderId) return;
    
    setIsSavingMemo(true);
    try {
      await saveMemoMutation.mutateAsync({
        folderId: scanResult.folderId,
        memo: memo.trim()
      });
      setMemo("");
    } finally {
      setIsSavingMemo(false);
    }
  };

  const handleGoToCabinet = () => {
    // Force refresh the Cabinet folder list before navigation
    queryClient.invalidateQueries({ queryKey: ["/api/person-folders"] });
    queryClient.refetchQueries({ queryKey: ["/api/person-folders"] });
    
    setTimeout(() => {
      setLocation("/app");
    }, 100); // Small delay to ensure queries start
  };

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

        {/* Upload Section - Hide when processing or showing results */}
        {!showPreview && !showManualCrop && !scanResult && !isProcessing && (
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
                  disabled={isProcessing || scanMutation.isPending}
                >
                  <Camera className="w-4 h-4 mr-2" />
                  카메라로 촬영
                </Button>
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  variant="outline"
                  className="flex-1"
                  disabled={isProcessing || scanMutation.isPending}
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
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Processing Loading State */}
        {(isProcessing || (scanMutation.isPending && !showPreview)) && (
          <Card>
            <CardContent className="py-12">
              <div className="flex flex-col items-center justify-center space-y-6">
                <div className="relative">
                  <div className="w-16 h-16 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
                </div>
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {isProcessing ? "자동 크롭 처리 중..." : "명함 정보 분석 중..."}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {isProcessing ? "AI가 명함 영역을 자동으로 감지하고 있습니다" : "AI가 명함 정보를 추출하고 있습니다"}
                  </p>
                  <div className="mt-4 bg-gray-200 rounded-full h-2 w-64 mx-auto overflow-hidden">
                    <div className="bg-purple-600 h-2 rounded-full animate-pulse transition-all duration-500" 
                         style={{width: isProcessing ? '60%' : '90%'}}></div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

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
              
              {/* Memo Input Section */}
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  메모 추가
                </label>
                <textarea
                  value={memo}
                  onChange={(e) => setMemo(e.target.value)}
                  placeholder="이 명함에 대한 메모를 입력하세요..."
                  className="w-full p-3 border border-gray-300 rounded-md resize-none"
                  rows={3}
                />
                <Button
                  onClick={handleSaveMemo}
                  disabled={!memo.trim() || isSavingMemo}
                  className="mt-2 w-full bg-green-600 hover:bg-green-700 text-white"
                >
                  {isSavingMemo ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      메모 저장 중...
                    </>
                  ) : (
                    "메모 저장"
                  )}
                </Button>
              </div>
              
              <div className="mt-6 space-y-3">
                <Button
                  onClick={handleGoToCabinet}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Cabinet으로 이동
                </Button>
                <Button
                  onClick={() => {
                    setScanResult(null);
                    setSelectedFile(null);
                    setImageUrl(null);
                    setMemo("");
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

      {/* Duplicate Detection Dialog */}
      <Dialog open={showDuplicateDialog} onOpenChange={setShowDuplicateDialog}>
        <DialogContent className="max-w-md mx-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center text-lg font-semibold">
              <AlertCircle className="w-5 h-5 mr-2 text-yellow-500" />
              중복 명함 발견
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-600">
              이미 저장된 명함과 유사한 정보가 발견되었습니다.
            </DialogDescription>
          </DialogHeader>

          {duplicateCheck && (
            <div className="py-4 space-y-4">
              {/* Existing Card Info */}
              <div className="bg-gray-50 p-3 rounded-lg">
                <h4 className="font-medium text-gray-800 mb-2">기존 명함</h4>
                <div className="space-y-1 text-sm text-gray-600">
                  <p><span className="font-medium">이름:</span> {duplicateCheck.existingCard.businessCardData ? JSON.parse(duplicateCheck.existingCard.businessCardData).name : '정보 없음'}</p>
                  <p><span className="font-medium">회사:</span> {duplicateCheck.existingCard.businessCardData ? JSON.parse(duplicateCheck.existingCard.businessCardData).company : '정보 없음'}</p>
                  <p><span className="font-medium">연락처:</span> {duplicateCheck.existingCard.businessCardData ? JSON.parse(duplicateCheck.existingCard.businessCardData).phone : '정보 없음'}</p>
                </div>
              </div>

              {/* New Card Info */}
              <div className="bg-blue-50 p-3 rounded-lg">
                <h4 className="font-medium text-gray-800 mb-2">새로 스캔한 명함</h4>
                <div className="space-y-1 text-sm text-gray-600">
                  <p><span className="font-medium">이름:</span> {scanResult?.name || '정보 없음'}</p>
                  <p><span className="font-medium">회사:</span> {scanResult?.company || '정보 없음'}</p>
                  <p><span className="font-medium">연락처:</span> {scanResult?.phone || '정보 없음'}</p>
                </div>
              </div>

              {duplicateCheck.duplicateType === 'exact' && (
                <div className="bg-yellow-50 p-3 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    <strong>완전 일치:</strong> 이미 저장된 명함과 동일한 정보입니다.
                  </p>
                </div>
              )}

              {duplicateCheck.duplicateType === 'similar' && (
                <div className="bg-blue-50 p-3 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>유사한 명함:</strong> 기존 명함과 일부 정보가 다릅니다. 병합하면 새로운 정보로 업데이트됩니다.
                  </p>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="flex flex-col space-y-2">
            {duplicateCheck?.duplicateType === 'exact' ? (
              <>
                <Button
                  onClick={handleKeepExisting}
                  className="w-full bg-gray-600 hover:bg-gray-700 text-white"
                >
                  기존 명함 유지
                </Button>
                <Button
                  onClick={handleSaveAsNew}
                  variant="outline"
                  className="w-full"
                >
                  새로운 명함으로 저장
                </Button>
              </>
            ) : (
              <>
                <Button
                  onClick={handleMergeCards}
                  disabled={mergeMutation.isPending}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {mergeMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      병합 중...
                    </>
                  ) : (
                    <>
                      <Merge className="w-4 h-4 mr-2" />
                      명함 정보 병합
                    </>
                  )}
                </Button>
                <Button
                  onClick={handleKeepExisting}
                  variant="outline"
                  className="w-full"
                >
                  기존 명함 유지
                </Button>
                <Button
                  onClick={handleSaveAsNew}
                  variant="outline"
                  className="w-full"
                >
                  새로운 명함으로 저장
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}