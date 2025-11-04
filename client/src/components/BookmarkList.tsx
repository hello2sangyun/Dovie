import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FolderIcon, FileIcon, Grid3x3, List, ChevronLeft, Search, Download, Share2, Eye, ArrowUp, ArrowDown } from "lucide-react";

interface FileUploadData {
  id: number;
  userId: number;
  chatRoomId: number;
  fileName: string;
  originalName: string;
  fileSize: number;
  fileType: string;
  filePath: string;
  description: string | null;
  uploadedAt: string;
  uploader: {
    id: number;
    displayName: string;
    profilePicture: string | null;
  };
}

interface ChatRoomData {
  id: number;
  name: string;
  isGroup: boolean;
  participants?: Array<{
    id: number;
    displayName: string;
    nickname?: string;
  }>;
}

interface FolderItem {
  chatRoomId: number;
  chatRoomName: string;
  fileCount: number;
  lastModified: string;
}

interface BookmarkListProps {
  onNavigateToMessage?: (chatRoomId: number, messageId: number) => void;
}

type SortBy = 'name' | 'date';
type SortOrder = 'asc' | 'desc';
type ViewMode = 'list' | 'grid';

export default function BookmarkList({ onNavigateToMessage }: BookmarkListProps) {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFolderId, setSelectedFolderId] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [sortBy, setSortBy] = useState<SortBy>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  // Fetch all file uploads
  const { data: filesData, isLoading } = useQuery<{ files: FileUploadData[] }>({
    queryKey: ["/api/files/all"],
    enabled: !!user,
  });

  // Fetch chat rooms to get room names
  const { data: chatRoomsData } = useQuery<{ chatRooms: ChatRoomData[] }>({
    queryKey: ["/api/chat-rooms"],
    enabled: !!user,
  });

  // Get chat room name by ID
  const getChatRoomName = (chatRoomId: number) => {
    const chatRoom = chatRoomsData?.chatRooms?.find((room) => room.id === chatRoomId);
    if (!chatRoom) return "알 수 없는 채팅방";
    
    if (chatRoom.isGroup) {
      return chatRoom.name;
    } else {
      // For 1:1 chats, show the other participant's name
      const otherParticipant = chatRoom.participants?.find((p: any) => p.id !== user?.id);
      return otherParticipant?.nickname || otherParticipant?.displayName || chatRoom.name;
    }
  };

  // Group files by chat room (folders)
  const folders = useMemo(() => {
    if (!filesData?.files || !chatRoomsData?.chatRooms) return [];

    const folderMap = new Map<number, FolderItem>();

    filesData.files.forEach((file) => {
      if (!folderMap.has(file.chatRoomId)) {
        const chatRoomName = getChatRoomName(file.chatRoomId);
        folderMap.set(file.chatRoomId, {
          chatRoomId: file.chatRoomId,
          chatRoomName,
          fileCount: 1,
          lastModified: file.uploadedAt,
        });
      } else {
        const folder = folderMap.get(file.chatRoomId)!;
        folder.fileCount++;
        // Update last modified if this file is newer
        if (new Date(file.uploadedAt) > new Date(folder.lastModified)) {
          folder.lastModified = file.uploadedAt;
        }
      }
    });

    return Array.from(folderMap.values());
  }, [filesData?.files, chatRoomsData?.chatRooms]);

  // Get files for selected folder
  const selectedFolderFiles = useMemo(() => {
    if (!selectedFolderId || !filesData?.files) return [];
    return filesData.files.filter((file) => file.chatRoomId === selectedFolderId);
  }, [selectedFolderId, filesData?.files]);

  // Apply search filter
  const filteredItems = useMemo(() => {
    if (selectedFolderId) {
      // Filter files in selected folder
      let filtered = selectedFolderFiles;
      
      if (searchTerm.trim()) {
        const searchLower = searchTerm.toLowerCase();
        filtered = filtered.filter((file) => {
          const fileName = file.originalName?.toLowerCase() || "";
          const description = file.description?.toLowerCase() || "";
          return fileName.includes(searchLower) || description.includes(searchLower);
        });
      }

      return filtered;
    } else {
      // Filter folders
      if (!searchTerm.trim()) return folders;
      
      const searchLower = searchTerm.toLowerCase();
      return folders.filter((folder) => 
        folder.chatRoomName.toLowerCase().includes(searchLower)
      );
    }
  }, [selectedFolderId, selectedFolderFiles, folders, searchTerm]);

  // Sort folders or files
  const sortedItems = useMemo(() => {
    const items = [...filteredItems];

    if (selectedFolderId) {
      // Sort files
      const files = items as FileUploadData[];
      files.sort((a, b) => {
        let compareValue = 0;

        if (sortBy === 'name') {
          compareValue = (a.originalName || '').localeCompare(b.originalName || '');
        } else if (sortBy === 'date') {
          compareValue = new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime();
        }

        return sortOrder === 'asc' ? compareValue : -compareValue;
      });

      return files;
    } else {
      // Sort folders
      const folders = items as FolderItem[];
      folders.sort((a, b) => {
        let compareValue = 0;

        if (sortBy === 'name') {
          compareValue = a.chatRoomName.localeCompare(b.chatRoomName);
        } else if (sortBy === 'date') {
          compareValue = new Date(a.lastModified).getTime() - new Date(b.lastModified).getTime();
        }

        return sortOrder === 'asc' ? compareValue : -compareValue;
      });

      return folders;
    }
  }, [filteredItems, sortBy, sortOrder, selectedFolderId]);

  // Format date like Google Drive
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return date.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
    } else if (date.toDateString() === yesterday.toDateString()) {
      return "어제";
    } else {
      return date.toLocaleDateString("ko-KR", { year: 'numeric', month: 'short', day: 'numeric' });
    }
  };

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  };

  // Get file icon based on type
  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return '🖼️';
    if (fileType.startsWith('video/')) return '🎥';
    if (fileType.startsWith('audio/')) return '🎵';
    if (fileType.includes('pdf')) return '📄';
    if (fileType.includes('word') || fileType.includes('document')) return '📝';
    if (fileType.includes('excel') || fileType.includes('spreadsheet')) return '📊';
    if (fileType.includes('zip') || fileType.includes('rar')) return '📦';
    return '📎';
  };

  // Handle file download
  const handleDownload = (file: FileUploadData) => {
    const link = document.createElement('a');
    link.href = file.filePath;
    link.download = file.originalName || 'file';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Handle file preview
  const handlePreview = (file: FileUploadData) => {
    window.open(file.filePath, '_blank');
  };

  // Handle share using Web Share API
  const handleShare = async (file: FileUploadData) => {
    const shareData = {
      title: file.originalName,
      text: file.description || file.originalName,
      url: file.filePath,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        // Fallback for browsers that don't support Web Share API
        const textToCopy = `${shareData.title}\n${shareData.text}\n${shareData.url}`;
        await navigator.clipboard.writeText(textToCopy);
        alert('링크가 클립보드에 복사되었습니다');
      }
    } catch (error) {
      console.error('Share failed:', error);
    }
  };

  // Toggle sort order
  const toggleSort = (newSortBy: SortBy) => {
    if (sortBy === newSortBy) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(newSortBy);
      setSortOrder('asc');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full" data-testid="files-loading">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white" data-testid="file-explorer">
      {/* Header */}
      <div className="p-4 pt-[calc(1rem+var(--safe-area-inset-top))] border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between mb-3">
          {selectedFolderId ? (
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedFolderId(null)}
                className="h-8 w-8 p-0 hover:bg-gray-100"
                data-testid="button-back-to-folders"
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <h3 className="text-xl font-bold text-gray-900">
                {folders.find(f => f.chatRoomId === selectedFolderId)?.chatRoomName}
              </h3>
            </div>
          ) : (
            <h3 className="text-xl font-bold text-gray-900">내 파일</h3>
          )}
          
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode('list')}
              className={`h-8 w-8 p-0 ${viewMode === 'list' ? 'bg-gray-100' : 'hover:bg-gray-100'}`}
              data-testid="button-view-list"
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode('grid')}
              className={`h-8 w-8 p-0 ${viewMode === 'grid' ? 'bg-gray-100' : 'hover:bg-gray-100'}`}
              data-testid="button-view-grid"
            >
              <Grid3x3 className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            type="text"
            placeholder={selectedFolderId ? "파일명, 설명 검색..." : "폴더 검색..."}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
            data-testid="input-file-search"
          />
        </div>
      </div>

      {/* Sort Header */}
      <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 flex items-center gap-4">
        <button
          onClick={() => toggleSort('name')}
          className="flex items-center gap-1 text-sm font-medium text-gray-700 hover:text-gray-900"
          data-testid="button-sort-name"
        >
          Name
          {sortBy === 'name' && (
            sortOrder === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
          )}
        </button>
        <button
          onClick={() => toggleSort('date')}
          className="flex items-center gap-1 text-sm font-medium text-gray-700 hover:text-gray-900 ml-auto"
          data-testid="button-sort-date"
        >
          Modified
          {sortBy === 'date' && (
            sortOrder === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
          )}
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {sortedItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500" data-testid="files-empty-state">
            {selectedFolderId ? (
              <>
                <FileIcon className="h-16 w-16 mb-4 text-gray-300" />
                <p className="text-lg font-medium">
                  {searchTerm ? "검색 결과가 없습니다" : "파일이 없습니다"}
                </p>
              </>
            ) : (
              <>
                <FolderIcon className="h-16 w-16 mb-4 text-gray-300" />
                <p className="text-lg font-medium">
                  {searchTerm ? "검색 결과가 없습니다" : "폴더가 없습니다"}
                </p>
                <p className="text-sm text-gray-400 mt-1">
                  파일을 업로드하면 자동으로 채팅방별 폴더가 생성됩니다
                </p>
              </>
            )}
          </div>
        ) : (
          <>
            {/* Folders View (Root level) */}
            {!selectedFolderId && viewMode === 'list' && (
              <div className="p-2">
                {(sortedItems as FolderItem[]).map((folder) => (
                  <div
                    key={folder.chatRoomId}
                    onClick={() => setSelectedFolderId(folder.chatRoomId)}
                    className="flex items-center gap-3 px-3 py-3 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors border-b border-gray-100"
                    data-testid={`folder-item-${folder.chatRoomId}`}
                  >
                    <FolderIcon className="h-5 w-5 text-gray-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {folder.chatRoomName}
                      </p>
                    </div>
                    <div className="text-xs text-gray-500 text-right flex-shrink-0">
                      <p>{formatDate(folder.lastModified)}</p>
                      <p className="text-gray-400">{folder.fileCount}개 파일</p>
                    </div>
                    <div className="w-6" /> {/* Spacing for menu */}
                  </div>
                ))}
              </div>
            )}

            {/* Folders View (Grid) */}
            {!selectedFolderId && viewMode === 'grid' && (
              <div className="p-4 grid grid-cols-2 gap-3">
                {(sortedItems as FolderItem[]).map((folder) => (
                  <div
                    key={folder.chatRoomId}
                    onClick={() => setSelectedFolderId(folder.chatRoomId)}
                    className="flex flex-col items-center gap-2 p-4 hover:bg-gray-50 rounded-lg cursor-pointer border border-gray-200 transition-colors"
                    data-testid={`folder-card-${folder.chatRoomId}`}
                  >
                    <FolderIcon className="h-12 w-12 text-yellow-500" />
                    <p className="text-sm font-medium text-gray-900 text-center line-clamp-2 w-full">
                      {folder.chatRoomName}
                    </p>
                    <p className="text-xs text-gray-400">{folder.fileCount}개</p>
                  </div>
                ))}
              </div>
            )}

            {/* Files View (List) */}
            {selectedFolderId && viewMode === 'list' && (
              <div className="p-2">
                {(sortedItems as FileUploadData[]).map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center gap-3 px-3 py-3 hover:bg-gray-50 rounded-lg transition-colors border-b border-gray-100 group"
                    data-testid={`file-item-${file.id}`}
                  >
                    <span className="text-2xl flex-shrink-0">{getFileIcon(file.fileType)}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {file.originalName}
                      </p>
                      {file.description && (
                        <p className="text-xs text-gray-500 truncate mt-0.5">
                          {file.description}
                        </p>
                      )}
                      <p className="text-xs text-gray-400 mt-0.5">
                        {file.uploader.displayName} • {formatFileSize(file.fileSize)}
                      </p>
                    </div>
                    <div className="text-xs text-gray-500 flex-shrink-0">
                      {formatDate(file.uploadedAt)}
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handlePreview(file)}
                        className="h-7 w-7 p-0 hover:bg-blue-50"
                        title="미리보기"
                        data-testid={`button-preview-file-${file.id}`}
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDownload(file)}
                        className="h-7 w-7 p-0 hover:bg-green-50"
                        title="다운로드"
                        data-testid={`button-download-file-${file.id}`}
                      >
                        <Download className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleShare(file)}
                        className="h-7 w-7 p-0 hover:bg-purple-50"
                        title="공유"
                        data-testid={`button-share-file-${file.id}`}
                      >
                        <Share2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Files View (Grid) */}
            {selectedFolderId && viewMode === 'grid' && (
              <div className="p-4 grid grid-cols-2 gap-3">
                {(sortedItems as FileUploadData[]).map((file) => (
                  <div
                    key={file.id}
                    className="flex flex-col border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow group"
                    data-testid={`file-card-${file.id}`}
                  >
                    {/* File Preview */}
                    <div 
                      className="aspect-square bg-gradient-to-br from-purple-50 to-indigo-50 flex items-center justify-center relative cursor-pointer"
                      onClick={() => handlePreview(file)}
                    >
                      {file.fileType.startsWith('image/') ? (
                        <img 
                          src={file.filePath} 
                          alt={file.originalName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-5xl">{getFileIcon(file.fileType)}</span>
                      )}
                      
                      {/* Action buttons on hover */}
                      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownload(file);
                          }}
                          className="h-7 w-7 p-0 bg-white/90 hover:bg-white shadow-sm"
                          title="다운로드"
                          data-testid={`button-download-grid-${file.id}`}
                        >
                          <Download className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleShare(file);
                          }}
                          className="h-7 w-7 p-0 bg-white/90 hover:bg-white shadow-sm"
                          title="공유"
                          data-testid={`button-share-grid-${file.id}`}
                        >
                          <Share2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>

                    {/* File Info */}
                    <div className="p-2 bg-white">
                      <p className="text-xs font-medium text-gray-900 truncate" title={file.originalName}>
                        {file.originalName}
                      </p>
                      {file.description && (
                        <p className="text-xs text-gray-500 line-clamp-1 mt-0.5" title={file.description}>
                          {file.description}
                        </p>
                      )}
                      <p className="text-xs text-gray-400 mt-1">
                        {formatDate(file.uploadedAt)} • {formatFileSize(file.fileSize)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
