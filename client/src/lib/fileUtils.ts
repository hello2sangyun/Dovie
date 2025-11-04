export const isImageFile = (url: string): boolean => {
  const imageExtensions = /\.(jpg|jpeg|png|gif|webp|svg|bmp|ico)$/i;
  return imageExtensions.test(url);
};

export const isVideoFile = (url: string): boolean => {
  const videoExtensions = /\.(mp4|webm|avi|mov|wmv|flv|mkv|m4v)$/i;
  return videoExtensions.test(url);
};

export const isAudioFile = (url: string): boolean => {
  const audioExtensions = /\.(mp3|wav|ogg|aac|m4a|flac|wma)$/i;
  return audioExtensions.test(url);
};

export const getFileExtension = (url: string): string => {
  const cleanUrl = url.split('?')[0].split('#')[0];
  return cleanUrl.split('.').pop()?.toLowerCase() || '';
};

export const getFileName = (url: string): string => {
  const cleanUrl = url.split('?')[0].split('#')[0];
  return cleanUrl.split('/').pop() || 'file';
};

export const formatFileSize = (bytes?: number): string => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
};

export type FileType = 'image' | 'video' | 'audio' | 'pdf' | 'document' | 'spreadsheet' | 'presentation' | 'archive' | 'code' | 'text' | 'file';

export const getFileType = (url: string): FileType => {
  const extension = getFileExtension(url);
  
  if (isImageFile(url)) return 'image';
  if (isVideoFile(url)) return 'video';
  if (isAudioFile(url)) return 'audio';
  
  switch (extension) {
    case 'pdf':
      return 'pdf';
    case 'doc':
    case 'docx':
      return 'document';
    case 'xls':
    case 'xlsx':
      return 'spreadsheet';
    case 'ppt':
    case 'pptx':
      return 'presentation';
    case 'zip':
    case 'rar':
    case '7z':
      return 'archive';
    case 'js':
    case 'ts':
    case 'jsx':
    case 'tsx':
    case 'py':
    case 'java':
    case 'cpp':
    case 'c':
    case 'html':
    case 'css':
      return 'code';
    case 'txt':
    case 'md':
      return 'text';
    default:
      return 'file';
  }
};
