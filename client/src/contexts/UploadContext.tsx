import { createContext, useContext, useState, ReactNode } from 'react';

export interface UploadTask {
  id: string;
  fileName: string;
  fileSize: number;
  progress: number;
  status: 'uploading' | 'completed' | 'error';
  error?: string;
  chatRoomId?: number;
  chatRoomName?: string;
}

interface UploadContextType {
  uploads: UploadTask[];
  addUpload: (task: Omit<UploadTask, 'id' | 'progress' | 'status'>) => string;
  updateUploadProgress: (id: string, progress: number) => void;
  completeUpload: (id: string) => void;
  failUpload: (id: string, error: string) => void;
  removeUpload: (id: string) => void;
}

const UploadContext = createContext<UploadContextType | undefined>(undefined);

export function UploadProvider({ children }: { children: ReactNode }) {
  const [uploads, setUploads] = useState<UploadTask[]>([]);

  const addUpload = (task: Omit<UploadTask, 'id' | 'progress' | 'status'>): string => {
    const id = `upload-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newTask: UploadTask = {
      ...task,
      id,
      progress: 0,
      status: 'uploading',
    };
    
    setUploads(prev => [...prev, newTask]);
    return id;
  };

  const updateUploadProgress = (id: string, progress: number) => {
    setUploads(prev =>
      prev.map(upload =>
        upload.id === id ? { ...upload, progress } : upload
      )
    );
  };

  const completeUpload = (id: string) => {
    setUploads(prev =>
      prev.map(upload =>
        upload.id === id ? { ...upload, status: 'completed' as const, progress: 100 } : upload
      )
    );

    setTimeout(() => {
      removeUpload(id);
    }, 2000);
  };

  const failUpload = (id: string, error: string) => {
    setUploads(prev =>
      prev.map(upload =>
        upload.id === id ? { ...upload, status: 'error' as const, error } : upload
      )
    );

    setTimeout(() => {
      removeUpload(id);
    }, 5000);
  };

  const removeUpload = (id: string) => {
    setUploads(prev => prev.filter(upload => upload.id !== id));
  };

  return (
    <UploadContext.Provider
      value={{
        uploads,
        addUpload,
        updateUploadProgress,
        completeUpload,
        failUpload,
        removeUpload,
      }}
    >
      {children}
    </UploadContext.Provider>
  );
}

export function useUpload() {
  const context = useContext(UploadContext);
  if (!context) {
    throw new Error('useUpload must be used within UploadProvider');
  }
  return context;
}
