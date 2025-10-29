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

  return (
    <div className={cn("space-y-2", className)}>
      {uploads.map((upload) => (
        <div
          key={upload.fileId}
          className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm"
          data-testid={`upload-progress-${upload.fileId}`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2 flex-1 min-w-0">
              {upload.status === 'uploading' && (
                <Loader2 className="h-4 w-4 text-purple-500 animate-spin flex-shrink-0" />
              )}
              {upload.status === 'completed' && (
                <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
              )}
              {upload.status === 'error' && (
                <XCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
              )}
              <span className="text-sm font-medium text-gray-900 truncate">
                {upload.fileName}
              </span>
            </div>
            <span
              className={cn(
                "text-sm font-semibold flex-shrink-0 ml-2",
                upload.status === 'uploading' && "text-purple-600",
                upload.status === 'completed' && "text-green-600",
                upload.status === 'error' && "text-red-600"
              )}
              data-testid={`upload-percentage-${upload.fileId}`}
            >
              {upload.progress}%
            </span>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-300 ease-out",
                upload.status === 'uploading' && "bg-gradient-to-r from-purple-500 to-indigo-500",
                upload.status === 'completed' && "bg-green-500",
                upload.status === 'error' && "bg-red-500"
              )}
              style={{ width: `${upload.progress}%` }}
              data-testid={`upload-bar-${upload.fileId}`}
            />
          </div>

          {/* File Size Info */}
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-gray-500">
              {formatBytes(upload.loaded)} / {formatBytes(upload.total)}
            </span>
            {upload.status === 'error' && upload.error && (
              <span className="text-xs text-red-500">{upload.error}</span>
            )}
            {upload.status === 'completed' && (
              <span className="text-xs text-green-600">완료</span>
            )}
          </div>
        </div>
      ))}
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
