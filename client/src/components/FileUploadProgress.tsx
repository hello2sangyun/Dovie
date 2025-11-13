import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { UploadProgress } from "@/lib/uploadUtils";
import { formatBytes } from "@/lib/uploadUtils";

interface FileUploadProgressProps {
  uploads: UploadProgress[];
  className?: string;
}

export function FileUploadProgress({ uploads, className }: FileUploadProgressProps) {
  if (uploads.length === 0) return null;

  // Calculate overall progress and stats
  const totalFiles = uploads.length;
  const completedFiles = uploads.filter(u => u.status === 'completed').length;
  const uploadingFiles = uploads.filter(u => u.status === 'uploading').length;
  const errorFiles = uploads.filter(u => u.status === 'error').length;
  
  // Calculate average progress
  const totalProgress = uploads.reduce((sum, upload) => sum + upload.progress, 0);
  const averageProgress = totalFiles > 0 ? Math.round(totalProgress / totalFiles) : 0;
  
  // Calculate total bytes
  const totalLoaded = uploads.reduce((sum, upload) => sum + upload.loaded, 0);
  const totalSize = uploads.reduce((sum, upload) => sum + upload.total, 0);
  
  // Current file being uploaded (first non-completed file)
  const currentUpload = uploads.find(u => u.status !== 'completed') || uploads[uploads.length - 1];
  
  // Status determination
  const isAllCompleted = completedFiles === totalFiles;
  const hasError = errorFiles > 0;
  
  return (
    <div className={cn(className)}>
      <div
        className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm"
        data-testid="upload-progress-unified"
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2 flex-1 min-w-0">
            {!isAllCompleted && !hasError && (
              <Loader2 className="h-4 w-4 text-purple-500 animate-spin flex-shrink-0" />
            )}
            {isAllCompleted && !hasError && (
              <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
            )}
            {hasError && (
              <XCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
            )}
            <span className="text-sm font-medium text-gray-900 truncate">
              {totalFiles > 1 
                ? `(${Math.min(completedFiles + (isAllCompleted ? 0 : 1), totalFiles)}/${totalFiles}) ${currentUpload?.fileName || '업로드 중'}`
                : currentUpload?.fileName || '업로드 중'
              }
            </span>
          </div>
          <span
            className={cn(
              "text-sm font-semibold flex-shrink-0 ml-2",
              !isAllCompleted && !hasError && "text-purple-600",
              isAllCompleted && "text-green-600",
              hasError && "text-red-600"
            )}
            data-testid="upload-percentage-unified"
          >
            {averageProgress}%
          </span>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-300 ease-out",
              !isAllCompleted && !hasError && "bg-gradient-to-r from-purple-500 to-indigo-500",
              isAllCompleted && "bg-green-500",
              hasError && "bg-red-500"
            )}
            style={{ width: `${averageProgress}%` }}
            data-testid="upload-bar-unified"
          />
        </div>

        {/* File Size Info */}
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-gray-500">
            {formatBytes(totalLoaded)} / {formatBytes(totalSize)}
          </span>
          {hasError && (
            <span className="text-xs text-red-500">일부 파일 업로드 실패</span>
          )}
          {isAllCompleted && !hasError && (
            <span className="text-xs text-green-600">모두 완료</span>
          )}
          {!isAllCompleted && !hasError && uploadingFiles > 0 && (
            <span className="text-xs text-purple-600">업로드 중...</span>
          )}
        </div>
      </div>
    </div>
  );
}

interface SingleFileUploadProgressProps {
  upload: UploadProgress;
  className?: string;
}

export function SingleFileUploadProgress({ upload, className }: SingleFileUploadProgressProps) {
  return (
    <div className={cn("bg-purple-50 border border-purple-200 rounded-lg p-3", className)}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2 flex-1 min-w-0">
          <Loader2 className="h-4 w-4 text-purple-500 animate-spin flex-shrink-0" />
          <span className="text-sm font-medium text-gray-900 truncate">
            {upload.fileName}
          </span>
        </div>
        <span className="text-sm font-bold text-purple-600 flex-shrink-0 ml-2">
          {upload.progress}%
        </span>
      </div>

      {/* Animated Progress Bar */}
      <div className="w-full bg-purple-200 rounded-full h-2 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full transition-all duration-300 ease-out animate-pulse"
          style={{ width: `${upload.progress}%` }}
        />
      </div>

      <div className="flex items-center justify-between mt-2">
        <span className="text-xs text-gray-600">
          {formatBytes(upload.loaded)} / {formatBytes(upload.total)}
        </span>
        <span className="text-xs text-purple-600 font-medium">업로드 중...</span>
      </div>
    </div>
  );
}
