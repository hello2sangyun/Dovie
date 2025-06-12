import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Camera, 
  Upload, 
  ArrowLeft, 
  CheckCircle, 
  AlertCircle,
  FileImage,
  Loader2,
  FolderPlus
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
      toast({
        title: "스캔 완료",
        description: "명함 정보를 성공적으로 추출했습니다.",
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

  // Create person folder mutation
  const createFolderMutation = useMutation({
    mutationFn: async (scanData: ScanResult) => {
      // First create contact
      const contact = await apiRequest('/api/contacts', {
        method: 'POST',
        body: {
          name: scanData.name,
          company: scanData.company,
          jobTitle: scanData.jobTitle,
          email: scanData.email,
          phone: scanData.phone,
          website: scanData.website,
          address: scanData.address,
        },
      });

      // Then create person folder
      const folder = await apiRequest('/api/person-folders', {
        method: 'POST',
        body: {
          contactId: contact.id,
          folderName: scanData.name || scanData.company || '이름 없음',
        },
      });

      // Add business card as first item to folder
      await apiRequest(`/api/person-folders/${folder.id}/items`, {
        method: 'POST',
        body: {
          itemType: 'business_card',
          title: `${scanData.name || '이름 없음'}의 명함`,
          description: `${scanData.company || ''} ${scanData.jobTitle || ''}`.trim(),
          tags: ['명함', 'AI 스캔'],
          fileName: selectedFile?.name,
          mimeType: selectedFile?.type,
          fileSize: selectedFile?.size,
        },
      });

      return { contact, folder };
    },
    onSuccess: ({ contact, folder }) => {
      setFolderCreated(true);
      queryClient.invalidateQueries({ queryKey: ['/api/person-folders'] });
      queryClient.invalidateQueries({ queryKey: ['/api/contacts'] });
      
      toast({
        title: "폴더 생성 완료",
        description: `${folder.folderName}님의 폴더가 Cabinet에 추가되었습니다.`,
      });
    },
    onError: (error) => {
      toast({
        title: "폴더 생성 실패",
        description: error instanceof Error ? error.message : "폴더 생성 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

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
    }
  };

  const handleScan = () => {
    if (!selectedFile) return;
    
    setIsScanning(true);
    scanMutation.mutate(selectedFile);
  };

  const handleCreateFolder = () => {
    if (!scanResult) return;
    
    createFolderMutation.mutate(scanResult);
  };

  const handleReturnToCabinet = () => {
    setLocation('/');
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
                    <Upload className="w-12 h-12 text-gray-400 mx-auto" />
                    <div>
                      <p className="text-lg font-medium text-gray-900">
                        명함 이미지를 업로드하세요
                      </p>
                      <p className="text-gray-500">
                        JPG, PNG, WEBP 파일 (최대 10MB)
                      </p>
                    </div>
                    <Button
                      onClick={() => fileInputRef.current?.click()}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      이미지 선택
                    </Button>
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {scanResult.name && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        이름
                      </label>
                      <p className="text-gray-900">{scanResult.name}</p>
                    </div>
                  )}
                  {scanResult.company && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        회사
                      </label>
                      <p className="text-gray-900">{scanResult.company}</p>
                    </div>
                  )}
                  {scanResult.jobTitle && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        직책
                      </label>
                      <p className="text-gray-900">{scanResult.jobTitle}</p>
                    </div>
                  )}
                  {scanResult.email && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        이메일
                      </label>
                      <p className="text-gray-900">{scanResult.email}</p>
                    </div>
                  )}
                  {scanResult.phone && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        전화번호
                      </label>
                      <p className="text-gray-900">{scanResult.phone}</p>
                    </div>
                  )}
                  {scanResult.website && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        웹사이트
                      </label>
                      <p className="text-gray-900">{scanResult.website}</p>
                    </div>
                  )}
                </div>

                {!folderCreated ? (
                  <Button
                    onClick={handleCreateFolder}
                    disabled={createFolderMutation.isPending}
                    className="w-full bg-green-600 hover:bg-green-700"
                    size="lg"
                  >
                    {createFolderMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        폴더 생성 중...
                      </>
                    ) : (
                      <>
                        <FolderPlus className="w-4 h-4 mr-2" />
                        Cabinet에 폴더 생성
                      </>
                    )}
                  </Button>
                ) : (
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
    </div>
  );
}