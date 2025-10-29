export interface UploadProgress {
  fileName: string;
  fileId: string;
  progress: number;
  loaded: number;
  total: number;
  status: 'uploading' | 'completed' | 'error';
  error?: string;
}

export interface UploadOptions {
  onProgress?: (progress: UploadProgress) => void;
  userId?: string;
}

export async function uploadFileWithProgress(
  file: File,
  endpoint: string = '/api/upload',
  options: UploadOptions = {}
): Promise<any> {
  const { onProgress, userId } = options;
  const fileId = `${Date.now()}-${file.name}`;

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append('file', file);

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && onProgress) {
        const progress = Math.round((e.loaded / e.total) * 100);
        onProgress({
          fileName: file.name,
          fileId,
          progress,
          loaded: e.loaded,
          total: e.total,
          status: 'uploading',
        });
      }
    });

    xhr.addEventListener('load', async () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response = JSON.parse(xhr.responseText);
          if (onProgress) {
            onProgress({
              fileName: file.name,
              fileId,
              progress: 100,
              loaded: file.size,
              total: file.size,
              status: 'completed',
            });
          }
          resolve(response);
        } catch (error) {
          if (onProgress) {
            onProgress({
              fileName: file.name,
              fileId,
              progress: 0,
              loaded: 0,
              total: file.size,
              status: 'error',
              error: 'Failed to parse response',
            });
          }
          reject(new Error('Failed to parse response'));
        }
      } else {
        const error = `Upload failed: ${xhr.status} - ${xhr.statusText}`;
        if (onProgress) {
          onProgress({
            fileName: file.name,
            fileId,
            progress: 0,
            loaded: 0,
            total: file.size,
            status: 'error',
            error,
          });
        }
        reject(new Error(error));
      }
    });

    xhr.addEventListener('error', () => {
      const error = 'Network error occurred';
      if (onProgress) {
        onProgress({
          fileName: file.name,
          fileId,
          progress: 0,
          loaded: 0,
          total: file.size,
          status: 'error',
          error,
        });
      }
      reject(new Error(error));
    });

    xhr.addEventListener('abort', () => {
      const error = 'Upload cancelled';
      if (onProgress) {
        onProgress({
          fileName: file.name,
          fileId,
          progress: 0,
          loaded: 0,
          total: file.size,
          status: 'error',
          error,
        });
      }
      reject(new Error(error));
    });

    xhr.open('POST', endpoint);
    if (userId) {
      xhr.setRequestHeader('x-user-id', userId);
    }
    xhr.send(formData);
  });
}

export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}
