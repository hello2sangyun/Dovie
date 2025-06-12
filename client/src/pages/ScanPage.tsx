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
      const contactResponse = await fetch('/api/contacts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user?.id.toString() || '',
        },
        body: JSON.stringify({
          name: scanData.name,
          company: scanData.company,
          jobTitle: scanData.jobTitle,
          email: scanData.email,
          phone: scanData.phone,
          website: scanData.website,
          address: scanData.address,
        }),
      });

      if (!contactResponse.ok) {
        throw new Error('연락처 생성에 실패했습니다.');
      }

      const contactData = await contactResponse.json();
      const contactId = contactData.contact?.id || contactData.id;

      // Then create person folder
      const folderResponse = await fetch('/api/person-folders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user?.id.toString() || '',
        },
        body: JSON.stringify({
          contactId: contactId,
          folderName: scanData.name || scanData.company || '이름 없음',
        }),
      });

      if (!folderResponse.ok) {
        throw new Error('폴더 생성에 실패했습니다.');
      }

      const folder = await folderResponse.json();

      return { contactData, folder };
    },
    onSuccess: ({ contactData, folder }) => {
      setFolderCreated(true);
      queryClient.invalidateQueries({ queryKey: ['/api/person-folders'] });
      queryClient.invalidateQueries({ queryKey: ['/api/contacts'] });
      
      toast({
        title: "폴더 생성 완료", 
        description: `${folder.person_name || folder.folder_name}님의 폴더가 Cabinet에 추가되었습니다.`,
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

  const handleCreateFolder = () => {
    const dataToSave = isEditing ? editedData : scanResult;
    if (!dataToSave) return;
    
    createFolderMutation.mutate(dataToSave);
  };

  const handleReturnToCabinet = () => {
    setLocation('/');
  };

  const handleCameraCapture = (file: File) => {
    setSelectedFile(file);
    setScanResult(null);
    setFolderCreated(false);
    setShowCamera(false);
  };

  if (showCamera) {
    return (
      <div className="min-h-screen bg-gray-50">
        <CameraCapture 
          onCapture={handleCameraCapture}
          onCancel={() => setShowCamera(false)}
        />
      </div>
    );
  }

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
                  {(scanResult.name || isEditing) && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        이름
                      </label>
                      {isEditing ? (
                        <Input
                          value={editedData.name || ''}
                          onChange={(e) => handleEditChange('name', e.target.value)}
                          placeholder="이름을 입력하세요"
                        />
                      ) : (
                        <p className="text-gray-900">{scanResult.name}</p>
                      )}
                    </div>
                  )}
                  {(scanResult.company || isEditing) && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        회사
                      </label>
                      {isEditing ? (
                        <Input
                          value={editedData.company || ''}
                          onChange={(e) => handleEditChange('company', e.target.value)}
                          placeholder="회사명을 입력하세요"
                        />
                      ) : (
                        <p className="text-gray-900">{scanResult.company}</p>
                      )}
                    </div>
                  )}
                  {(scanResult.jobTitle || isEditing) && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        직책
                      </label>
                      {isEditing ? (
                        <Input
                          value={editedData.jobTitle || ''}
                          onChange={(e) => handleEditChange('jobTitle', e.target.value)}
                          placeholder="직책을 입력하세요"
                        />
                      ) : (
                        <p className="text-gray-900">{scanResult.jobTitle}</p>
                      )}
                    </div>
                  )}
                  {(scanResult.email || isEditing) && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        이메일
                      </label>
                      {isEditing ? (
                        <Input
                          value={editedData.email || ''}
                          onChange={(e) => handleEditChange('email', e.target.value)}
                          placeholder="이메일을 입력하세요"
                          type="email"
                        />
                      ) : (
                        <p className="text-gray-900">{scanResult.email}</p>
                      )}
                    </div>
                  )}
                  {(scanResult.phone || isEditing) && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        전화번호
                      </label>
                      {isEditing ? (
                        <Input
                          value={editedData.phone || ''}
                          onChange={(e) => handleEditChange('phone', e.target.value)}
                          placeholder="전화번호를 입력하세요"
                          type="tel"
                        />
                      ) : (
                        <p className="text-gray-900">{scanResult.phone}</p>
                      )}
                    </div>
                  )}
                  {(scanResult.website || isEditing) && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        웹사이트
                      </label>
                      {isEditing ? (
                        <Input
                          value={editedData.website || ''}
                          onChange={(e) => handleEditChange('website', e.target.value)}
                          placeholder="웹사이트를 입력하세요"
                          type="url"
                        />
                      ) : (
                        <p className="text-gray-900">{scanResult.website}</p>
                      )}
                    </div>
                  )}
                  {(scanResult.address || isEditing) && (
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        주소
                      </label>
                      {isEditing ? (
                        <Input
                          value={editedData.address || ''}
                          onChange={(e) => handleEditChange('address', e.target.value)}
                          placeholder="주소를 입력하세요"
                        />
                      ) : (
                        <p className="text-gray-900">{scanResult.address}</p>
                      )}
                    </div>
                  )}
                </div>

                {!folderCreated && !isEditing && (
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
                )}

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