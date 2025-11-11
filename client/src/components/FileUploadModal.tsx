import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { X, Upload, File, Image, Video, Music, FileText } from 'lucide-react';
import { queryClient } from '@/lib/queryClient';

interface FileUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (files: FileList, caption: string, description: string) => Promise<void>;
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
  const [description, setDescription] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      return;
    }

    // Check file sizes (100MB limit per file)
    const maxSize = 100 * 1024 * 1024; // 100MB
    for (let i = 0; i < files.length; i++) {
      if (files[i].size > maxSize) {
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
    
    // 업로드 시작 즉시 모달 닫기
    handleClose();
    
    try {
      await onUpload(selectedFiles, caption, description.trim());
      
      // 업로드 완료 후 commands 캐시를 무효화하여 즉시 검색 가능하게 함
      await queryClient.invalidateQueries({ queryKey: ['/api/commands'] });
    } catch (error) {
    } finally{
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    setSelectedFiles(null);
    setCaption('');
    setDescription('');
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
      <DialogContent className="w-[95vw] max-w-sm sm:max-w-lg max-h-[90vh] overflow-y-auto mx-2 p-3 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Upload className="h-5 w-5 text-purple-600" />
            <span>파일 업로드</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 sm:space-y-4">
          {/* File Drop Zone */}
          {!selectedFiles && (
            <div
              className={`border-2 border-dashed rounded-lg p-4 sm:p-6 text-center transition-colors ${
                dragActive 
                  ? 'border-purple-500 bg-purple-50' 
                  : 'border-gray-300 hover:border-purple-400'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <Upload className="h-6 w-6 sm:h-12 sm:w-12 text-gray-400 mx-auto mb-1 sm:mb-4" />
              <p className="text-xs sm:text-base text-gray-600 mb-1 sm:mb-2">파일을 드래그하여 놓거나</p>
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="text-purple-600 border-purple-300 hover:bg-purple-50 text-xs sm:text-sm py-1 sm:py-2"
              >
                파일 선택
              </Button>
              <p className="text-xs text-gray-500 mt-1 sm:mt-2">
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
                    <div className="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0">
                      {getFileIcon(file.name)}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs sm:text-sm font-medium text-gray-900 truncate" title={file.name}>
                          {file.name.length > 25 ? `${file.name.substring(0, 22)}...` : file.name}
                        </p>
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



          {/* 파일 설명 입력 */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-medium text-gray-700">
              파일 설명
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="이 파일에 대한 설명을 입력하세요 (AI가 학습합니다)"
              className="w-full min-h-[100px] resize-none border-gray-300 focus:ring-purple-500 focus:border-purple-500"
              maxLength={500}
            />
            <div className="flex justify-between items-center">
              <p className="text-xs text-gray-500">
                AI가 이 설명을 학습하여 나중에 파일을 쉽게 찾을 수 있습니다
              </p>
              <span className="text-xs text-gray-400">
                {description.length}/500
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-2 sm:space-x-3 pt-2 sm:pt-4">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isUploading}
              className="flex-1 text-sm sm:text-base py-2 sm:py-2.5"
            >
              취소
            </Button>
            <Button
              onClick={handleUpload}
              disabled={!selectedFiles || isUploading}
              className="flex-1 purple-gradient hover:purple-gradient-hover text-white text-sm sm:text-base py-2 sm:py-2.5"
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
          accept="image/*,video/*,audio/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/*"
          onChange={(e) => handleFileSelect(e.target.files)}
          className="hidden"
        />
      </DialogContent>
    </Dialog>
  );
};