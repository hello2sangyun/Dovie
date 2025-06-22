import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { HashtagInput } from './HashtagInput';
import { X, Upload, File, Image, Video, Music, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { queryClient } from '@/lib/queryClient';

interface FileUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (files: FileList, caption: string, hashtags: string[]) => Promise<void>;
  maxFiles?: number;
}

export const FileUploadModal: React.FC<FileUploadModalProps> = ({
  isOpen,
  onClose,
  onUpload,
  maxFiles = 10
}) => {
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [caption, setCaption] = useState('');
  const [hashtag, setHashtag] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const getFileIcon = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(extension || '')) {
      return <Image className="h-5 w-5 text-blue-500" />;
    }
    if (['mp4', 'avi', 'mov', 'webm'].includes(extension || '')) {
      return <Video className="h-5 w-5 text-purple-500" />;
    }
    if (['mp3', 'wav', 'ogg', 'webm'].includes(extension || '')) {
      return <Music className="h-5 w-5 text-green-500" />;
    }
    if (['pdf', 'doc', 'docx', 'txt'].includes(extension || '')) {
      return <FileText className="h-5 w-5 text-red-500" />;
    }
    return <File className="h-5 w-5 text-gray-500" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleFileSelect = (files: FileList | null) => {
    if (!files) return;

    if (files.length > maxFiles) {
      toast({
        variant: "destructive",
        title: "파일 제한 초과",
        description: `최대 ${maxFiles}개의 파일까지 업로드할 수 있습니다.`,
      });
      return;
    }

    // Check file sizes (5MB limit per file)
    const maxSize = 5 * 1024 * 1024; // 5MB
    for (let i = 0; i < files.length; i++) {
      if (files[i].size > maxSize) {
        toast({
          variant: "destructive",
          title: "파일 크기 초과",
          description: `${files[i].name}이 5MB를 초과합니다.`,
        });
        return;
      }
    }

    setSelectedFiles(files);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files);
    }
  };

  const handleUpload = async () => {
    if (!selectedFiles) return;

    setIsUploading(true);
    try {
      // 단일 해시태그를 배열로 변환하여 기존 API 호환성 유지
      const hashtagArray = hashtag.trim() ? [hashtag.trim()] : [];
      await onUpload(selectedFiles, caption, hashtagArray);
      
      // 업로드 완료 후 commands 캐시를 무효화하여 즉시 검색 가능하게 함
      await queryClient.invalidateQueries({ queryKey: ['/api/commands'] });
      
      handleClose();
      toast({
        title: "업로드 완료",
        description: `${selectedFiles.length}개 파일이 성공적으로 업로드되었습니다.`,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "업로드 실패",
        description: "파일 업로드 중 오류가 발생했습니다. 다시 시도해주세요.",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    setSelectedFiles(null);
    setCaption('');
    setHashtag('');
    setIsUploading(false);
    setDragActive(false);
    onClose();
  };

  const removeFile = (indexToRemove: number) => {
    if (!selectedFiles) return;
    
    const filesArray = Array.from(selectedFiles);
    filesArray.splice(indexToRemove, 1);
    
    const newFileList = new DataTransfer();
    filesArray.forEach(file => newFileList.items.add(file));
    setSelectedFiles(newFileList.files.length > 0 ? newFileList.files : null);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Upload className="h-5 w-5 text-purple-600" />
            <span>파일 업로드</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* File Drop Zone */}
          {!selectedFiles && (
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragActive 
                  ? 'border-purple-500 bg-purple-50' 
                  : 'border-gray-300 hover:border-purple-400'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-2">파일을 드래그하여 놓거나</p>
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="text-purple-600 border-purple-300 hover:bg-purple-50"
              >
                파일 선택
              </Button>
              <p className="text-xs text-gray-500 mt-2">
                최대 {maxFiles}개 파일, 각 파일 5MB 이하
              </p>
            </div>
          )}

          {/* Selected Files */}
          {selectedFiles && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-gray-900">선택된 파일 ({selectedFiles.length}개)</h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedFiles(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  모두 제거
                </Button>
              </div>
              
              <div className="max-h-32 overflow-y-auto space-y-2">
                {Array.from(selectedFiles).map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      {getFileIcon(file.name)}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                        <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(index)}
                      className="text-gray-400 hover:text-red-500 p-1"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="w-full text-purple-600 border-purple-300 hover:bg-purple-50"
              >
                추가 파일 선택
              </Button>
            </div>
          )}



          {/* 단일 해시태그 입력 */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-700">해시태그 입력</label>
            <div className="space-y-2">
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-purple-500 font-medium">#</span>
                <input
                  type="text"
                  value={hashtag}
                  onChange={(e) => setHashtag(e.target.value.replace(/[^a-zA-Z0-9가-힣_]/g, ''))}
                  placeholder="한 개의 해시태그를 입력하세요 (예: soeun_passport)"
                  className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  maxLength={50}
                />
              </div>
              
              {/* 안내 메시지 */}
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                <div className="flex items-start space-x-2">
                  <div className="w-5 h-5 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-purple-600 text-xs font-bold">💡</span>
                  </div>
                  <div className="text-sm text-purple-700">
                    <p className="font-medium mb-1">해시태그 입력 가이드</p>
                    <p className="text-xs leading-relaxed mb-2">
                      <strong>한 개의 해시태그만 입력할 수 있습니다.</strong> 언더바(_)를 사용해서 여러 단어를 조합하세요.
                    </p>
                    <div className="space-y-1 text-xs">
                      <p><strong>좋은 예시:</strong></p>
                      <ul className="list-disc list-inside ml-2 space-y-0.5 text-purple-600">
                        <li><code>soeun_passport</code> (소은이 여권)</li>
                        <li><code>회의록_2025</code> (2025년 회의록)</li>
                        <li><code>계약서_중요</code> (중요한 계약서)</li>
                        <li><code>사진_여행</code> (여행 사진)</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3 pt-4">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isUploading}
              className="flex-1"
            >
              취소
            </Button>
            <Button
              onClick={handleUpload}
              disabled={!selectedFiles || isUploading}
              className="flex-1 purple-gradient hover:purple-gradient-hover text-white"
            >
              {isUploading ? "업로드 중..." : "업로드"}
            </Button>
          </div>
        </div>

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="*/*"
          onChange={(e) => handleFileSelect(e.target.files)}
          className="hidden"
        />
      </DialogContent>
    </Dialog>
  );
};