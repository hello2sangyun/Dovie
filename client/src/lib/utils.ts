import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format file size in bytes to human readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

/**
 * Get initials from a name
 */
export function getInitials(name: string): string {
  return name
    .split(" ")
    .map(word => word.charAt(0).toUpperCase())
    .join("")
    .slice(0, 2);
}

/**
 * Format timestamp to relative time (e.g., "2 minutes ago")
 */
export function formatRelativeTime(date: Date | string): string {
  const now = new Date();
  const targetDate = typeof date === "string" ? new Date(date) : date;
  const diffInSeconds = Math.floor((now.getTime() - targetDate.getTime()) / 1000);
  
  if (diffInSeconds < 60) {
    return "방금 전";
  }
  
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes}분 전`;
  }
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours}시간 전`;
  }
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    return `${diffInDays}일 전`;
  }
  
  return targetDate.toLocaleDateString("ko-KR");
}

/**
 * Format time for chat messages (HH:MM)
 */
export function formatMessageTime(date: Date | string): string {
  const targetDate = typeof date === "string" ? new Date(date) : date;
  return targetDate.toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

/**
 * Check if a date is today
 */
export function isToday(date: Date | string): boolean {
  const today = new Date();
  const targetDate = typeof date === "string" ? new Date(date) : date;
  
  return (
    today.getDate() === targetDate.getDate() &&
    today.getMonth() === targetDate.getMonth() &&
    today.getFullYear() === targetDate.getFullYear()
  );
}

/**
 * Check if a date is yesterday
 */
export function isYesterday(date: Date | string): boolean {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const targetDate = typeof date === "string" ? new Date(date) : date;
  
  return (
    yesterday.getDate() === targetDate.getDate() &&
    yesterday.getMonth() === targetDate.getMonth() &&
    yesterday.getFullYear() === targetDate.getFullYear()
  );
}

/**
 * Get online status text for a user
 */
export function getOnlineStatus(user: { isOnline: boolean; lastSeen?: string | null }): {
  text: string;
  color: "green" | "gray";
} {
  if (user.isOnline) {
    return { text: "온라인", color: "green" };
  }
  
  if (!user.lastSeen) {
    return { text: "오프라인", color: "gray" };
  }
  
  const lastSeen = new Date(user.lastSeen);
  const now = new Date();
  const diffMinutes = Math.floor((now.getTime() - lastSeen.getTime()) / (1000 * 60));
  
  if (diffMinutes < 1) {
    return { text: "방금 접속", color: "green" };
  }
  
  if (diffMinutes < 60) {
    return { text: `${diffMinutes}분 전 접속`, color: "gray" };
  }
  
  if (diffMinutes < 1440) {
    const hours = Math.floor(diffMinutes / 60);
    return { text: `${hours}시간 전 접속`, color: "gray" };
  }
  
  const days = Math.floor(diffMinutes / 1440);
  if (days === 1) {
    return { text: "어제 접속", color: "gray" };
  }
  
  return { text: `${days}일 전 접속`, color: "gray" };
}

/**
 * Validate username format
 */
export function validateUsername(username: string): boolean {
  // Username should be alphanumeric and underscores, 3-20 characters
  const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
  return usernameRegex.test(username);
}

/**
 * Validate command name format
 */
export function validateCommandName(commandName: string): boolean {
  // Command name should be alphanumeric and underscores, 1-50 characters, no spaces
  const commandRegex = /^[a-zA-Z0-9_]{1,50}$/;
  return commandRegex.test(commandName);
}

/**
 * Truncate text to specified length with ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + "...";
}

/**
 * Generate a random color for avatars based on name
 */
export function getAvatarColor(name: string): string {
  const colors = [
    "from-purple-400 to-purple-600",
    "from-blue-400 to-blue-600",
    "from-green-400 to-green-600",
    "from-yellow-400 to-yellow-600",
    "from-red-400 to-red-600",
    "from-indigo-400 to-indigo-600",
    "from-pink-400 to-pink-600",
    "from-teal-400 to-teal-600",
  ];
  
  // Use simple hash of name to pick color
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  return colors[Math.abs(hash) % colors.length];
}

/**
 * Check if a file is an image
 */
export function isImageFile(fileName: string): boolean {
  const imageExtensions = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg"];
  const extension = fileName.toLowerCase().substring(fileName.lastIndexOf("."));
  return imageExtensions.includes(extension);
}

/**
 * Get file type icon class based on file extension
 */
export function getFileTypeIcon(fileName: string): string {
  const extension = fileName.toLowerCase().substring(fileName.lastIndexOf("."));
  
  const iconMap: Record<string, string> = {
    // Documents
    ".pdf": "fas fa-file-pdf",
    ".doc": "fas fa-file-word",
    ".docx": "fas fa-file-word",
    ".txt": "fas fa-file-alt",
    ".rtf": "fas fa-file-alt",
    
    // Spreadsheets
    ".xls": "fas fa-file-excel",
    ".xlsx": "fas fa-file-excel",
    ".csv": "fas fa-file-csv",
    
    // Presentations
    ".ppt": "fas fa-file-powerpoint",
    ".pptx": "fas fa-file-powerpoint",
    
    // Images
    ".jpg": "fas fa-file-image",
    ".jpeg": "fas fa-file-image",
    ".png": "fas fa-file-image",
    ".gif": "fas fa-file-image",
    ".webp": "fas fa-file-image",
    ".svg": "fas fa-file-image",
    
    // Videos
    ".mp4": "fas fa-file-video",
    ".avi": "fas fa-file-video",
    ".mov": "fas fa-file-video",
    ".wmv": "fas fa-file-video",
    
    // Audio
    ".mp3": "fas fa-file-audio",
    ".wav": "fas fa-file-audio",
    ".ogg": "fas fa-file-audio",
    
    // Archives
    ".zip": "fas fa-file-archive",
    ".rar": "fas fa-file-archive",
    ".7z": "fas fa-file-archive",
    ".tar": "fas fa-file-archive",
    
    // Code
    ".js": "fas fa-file-code",
    ".ts": "fas fa-file-code",
    ".jsx": "fas fa-file-code",
    ".tsx": "fas fa-file-code",
    ".html": "fas fa-file-code",
    ".css": "fas fa-file-code",
    ".scss": "fas fa-file-code",
    ".py": "fas fa-file-code",
    ".java": "fas fa-file-code",
    ".cpp": "fas fa-file-code",
    ".c": "fas fa-file-code",
    ".php": "fas fa-file-code",
    ".rb": "fas fa-file-code",
    ".go": "fas fa-file-code",
    ".rs": "fas fa-file-code",
  };
  
  return iconMap[extension] || "fas fa-file";
}

/**
 * Debounce function for search inputs
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}
