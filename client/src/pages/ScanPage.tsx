import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Camera, Upload, Scan, AlertCircle, Loader2 } from "lucide-react";
import CameraCapture from "@/components/CameraCapture";
import { apiRequest } from "@/lib/queryClient";

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
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

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
      toast({
        title: "스캔 완료",
        description: "명함 정보가 성공적으로 추출되었습니다.",
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
    }
  };

  const handleScan = () => {
    if (selectedFile) {
      scanMutation.mutate(selectedFile);
    }
  };

  const handleCameraCapture = (file: File) => {
    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setImageUrl(url);
    setScanResult(null);
    setShowCamera(false);
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
                
                <Button
                  onClick={handleScan}
                  disabled={scanMutation.isPending}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  {scanMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      스캔 중...
                    </>
                  ) : (
                    <>
                      <Scan className="w-4 h-4 mr-2" />
                      명함 스캔하기
                    </>
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

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