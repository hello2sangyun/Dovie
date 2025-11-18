import { useUpload } from '@/contexts/UploadContext';
import { Progress } from '@/components/ui/progress';
import { X, CheckCircle2, AlertCircle, Upload } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function UploadIndicator() {
  const { uploads, removeUpload } = useUpload();

  if (uploads.length === 0) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-safe">
      <div className="max-w-3xl mx-auto">
        <AnimatePresence>
          {uploads.map((upload) => (
            <motion.div
              key={upload.id}
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              className="mb-2 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden"
            >
              <div className="p-4">
                <div className="flex items-start gap-3">
                  <div className="mt-1">
                    {upload.status === 'uploading' && (
                      <Upload className="w-5 h-5 text-purple-600 dark:text-purple-400 animate-pulse" />
                    )}
                    {upload.status === 'completed' && (
                      <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                    )}
                    {upload.status === 'error' && (
                      <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {upload.fileName}
                        </p>
                        {upload.chatRoomName && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            {upload.chatRoomName}
                          </p>
                        )}
                      </div>

                      <button
                        onClick={() => removeUpload(upload.id)}
                        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                        data-testid={`button-close-upload-${upload.id}`}
                      >
                        <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                      </button>
                    </div>

                    {upload.status === 'uploading' && (
                      <div className="space-y-1">
                        <Progress value={upload.progress} className="h-2" />
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {upload.progress}% • {(upload.fileSize / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    )}

                    {upload.status === 'completed' && (
                      <p className="text-xs text-green-600 dark:text-green-400 font-medium">
                        업로드 완료
                      </p>
                    )}

                    {upload.status === 'error' && (
                      <p className="text-xs text-red-600 dark:text-red-400">
                        {upload.error || '업로드 실패'}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
