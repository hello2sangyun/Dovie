import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { HashtagInput } from './HashtagInput';
import { X, Upload, File, Image, Video, Music, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

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
  const [hashtags, setHashtags] = useState<string[]>([]);
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
      await onUpload(selectedFiles, caption, hashtags);
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
    setHashtags([]);
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

          {/* Caption Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">설명</label>
            <Textarea
              placeholder="파일에 대한 설명을 입력하세요..."
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              rows={3}
              className="resize-none"
            />
          </div>

          {/* Hashtag Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">해시태그</label>
            <HashtagInput
              hashtags={hashtags}
              onHashtagsChange={setHashtags}
              placeholder="해시태그를 입력하세요... (예: #중요, #업무, #사진)"
              maxTags={10}
            />
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