import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FilePreviewModal } from "@/components/FilePreviewModal";
import { FolderIcon, FileIcon, Grid3x3, List, ChevronLeft, Search, Download, Share2, Eye, ArrowUp, ArrowDown, MessageSquare } from "lucide-react";

interface BookmarkData {
  id: number;
  userId: number;
  messageId: number;
  chatRoomId: number;
  bookmarkType: string;
  note: string | null;
  createdAt: string;
  message: {
    id: number;
    senderId: number;
    chatRoomId: number;
    content: string;
    fileUrl: string | null;
    fileType: string | null;
    fileName: string | null;
    fileSize: number | null;
    createdAt: string;
    sender: {
      id: number;
      displayName: string;
      profilePicture: string | null;
    };
  } | null;
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
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortBy, setSortBy] = useState<SortBy>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [selectedFile, setSelectedFile] = useState<{ url: string; name: string; size?: number; type?: string } | null>(null);

  // Fetch all bookmarks
  const { data: bookmarksData, isLoading } = useQuery<{ bookmarks: BookmarkData[] }>({
    queryKey: ["/api/bookmarks"],
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

  // Group bookmarks by chat room (folders)
  const folders = useMemo(() => {
    if (!bookmarksData?.bookmarks || !chatRoomsData?.chatRooms) return [];

    const folderMap = new Map<number, FolderItem>();

    bookmarksData.bookmarks.forEach((bookmark) => {
      if (!folderMap.has(bookmark.chatRoomId)) {
        const chatRoomName = getChatRoomName(bookmark.chatRoomId);
        folderMap.set(bookmark.chatRoomId, {
          chatRoomId: bookmark.chatRoomId,
          chatRoomName,
          fileCount: 1,
          lastModified: bookmark.createdAt,
        });
      } else {
        const folder = folderMap.get(bookmark.chatRoomId)!;
        folder.fileCount++;
        // Update last modified if this bookmark is newer
        if (new Date(bookmark.createdAt) > new Date(folder.lastModified)) {
          folder.lastModified = bookmark.createdAt;
        }
      }
    });

    return Array.from(folderMap.values());
  }, [bookmarksData?.bookmarks, chatRoomsData?.chatRooms]);

  // Get bookmarks for selected folder
  const selectedFolderBookmarks = useMemo(() => {
    if (!selectedFolderId || !bookmarksData?.bookmarks) return [];
    return bookmarksData.bookmarks.filter((bookmark) => bookmark.chatRoomId === selectedFolderId);
  }, [selectedFolderId, bookmarksData?.bookmarks]);

  // Apply search filter
  const filteredItems = useMemo(() => {
    if (selectedFolderId) {
      // Filter bookmarks in selected folder
      let filtered = selectedFolderBookmarks;
      
      if (searchTerm.trim()) {
        const searchLower = searchTerm.toLowerCase();
        filtered = filtered.filter((bookmark) => {
          const content = bookmark.message?.content?.toLowerCase() || "";
          const fileName = bookmark.message?.fileName?.toLowerCase() || "";
          const note = bookmark.note?.toLowerCase() || "";
          return content.includes(searchLower) || fileName.includes(searchLower) || note.includes(searchLower);
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
  }, [selectedFolderId, selectedFolderBookmarks, folders, searchTerm]);

  // Sort folders or bookmarks
  const sortedItems = useMemo(() => {
    const items = [...filteredItems];

    if (selectedFolderId) {
      // Sort bookmarks
      const bookmarks = items as BookmarkData[];
      bookmarks.sort((a, b) => {
        let compareValue = 0;

        if (sortBy === 'name') {
          const aName = a.message?.fileName || a.message?.content || '';
          const bName = b.message?.fileName || b.message?.content || '';
          compareValue = aName.localeCompare(bName);
        } else if (sortBy === 'date') {
          compareValue = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        }

        return sortOrder === 'asc' ? compareValue : -compareValue;
      });

      return bookmarks;
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
  const handleDownload = (bookmark: BookmarkData) => {
    if (!bookmark.message?.fileUrl) return;
    const link = document.createElement('a');
    link.href = bookmark.message.fileUrl;
    link.download = bookmark.message.fileName || 'file';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Handle file preview
  const handlePreview = (bookmark: BookmarkData) => {
    if (!bookmark.message?.fileUrl) return;
    setSelectedFile({
      url: bookmark.message.fileUrl,
      name: bookmark.message.fileName || 'file',
      size: bookmark.message.fileSize || undefined,
      type: bookmark.message.fileType || undefined
    });
  };

  // Handle share using Web Share API
  const handleShare = async (bookmark: BookmarkData) => {
    const shareData = {
      title: bookmark.message?.fileName || 'Bookmark',
      text: bookmark.message?.content || bookmark.note || '',
      url: bookmark.message?.fileUrl || '',
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

  // Navigate to the message in chat
  const handleNavigateToBookmark = (bookmark: BookmarkData) => {
    if (onNavigateToMessage) {
      onNavigateToMessage(bookmark.chatRoomId, bookmark.messageId);
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
            <h3 className="text-xl font-bold text-gray-900">내 북마크</h3>
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
            placeholder={selectedFolderId ? "메시지, 노트 검색..." : "폴더 검색..."}
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
          <div className="flex flex-col items-center justify-center h-full text-gray-500" data-testid="bookmarks-empty-state">
            {selectedFolderId ? (
              <>
                <FileIcon className="h-16 w-16 mb-4 text-gray-300" />
                <p className="text-lg font-medium">
                  {searchTerm ? "검색 결과가 없습니다" : "북마크가 없습니다"}
                </p>
              </>
            ) : (
              <>
                <FolderIcon className="h-16 w-16 mb-4 text-gray-300" />
                <p className="text-lg font-medium">
                  {searchTerm ? "검색 결과가 없습니다" : "북마크가 없습니다"}
                </p>
                <p className="text-sm text-gray-400 mt-1">
                  메시지를 북마크하면 자동으로 채팅방별 폴더가 생성됩니다
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
              <div className="p-3 grid grid-cols-3 gap-2">
                {(sortedItems as FolderItem[]).map((folder) => (
                  <div
                    key={folder.chatRoomId}
                    onClick={() => setSelectedFolderId(folder.chatRoomId)}
                    className="flex flex-col items-center gap-1.5 p-3 hover:bg-gray-50 rounded-lg cursor-pointer border border-gray-200 transition-colors"
                    data-testid={`folder-card-${folder.chatRoomId}`}
                  >
                    <FolderIcon className="h-10 w-10 text-yellow-500" />
                    <p className="text-xs font-medium text-gray-900 text-center line-clamp-2 w-full">
                      {folder.chatRoomName}
                    </p>
                    <p className="text-[10px] text-gray-400">{folder.fileCount}개</p>
                  </div>
                ))}
              </div>
            )}

            {/* Bookmarks View (List) */}
            {selectedFolderId && viewMode === 'list' && (
              <div className="p-2">
                {(sortedItems as BookmarkData[]).map((bookmark) => (
                  <div
                    key={bookmark.id}
                    className="flex items-center gap-3 px-3 py-3 hover:bg-gray-50 rounded-lg transition-colors border-b border-gray-100 group cursor-pointer"
                    onClick={() => handleNavigateToBookmark(bookmark)}
                    data-testid={`bookmark-item-${bookmark.id}`}
                  >
                    {bookmark.message?.fileUrl ? (
                      <span className="text-2xl flex-shrink-0">{getFileIcon(bookmark.message.fileType || '')}</span>
                    ) : (
                      <MessageSquare className="h-5 w-5 text-purple-600 flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {bookmark.message?.fileName || bookmark.message?.content || '북마크된 메시지'}
                      </p>
                      {bookmark.note && (
                        <p className="text-xs text-gray-500 truncate mt-0.5">
                          {bookmark.note}
                        </p>
                      )}
                      <p className="text-xs text-gray-400 mt-0.5">
                        {bookmark.message?.sender?.displayName || '알 수 없음'}
                        {bookmark.message?.fileSize && ` • ${formatFileSize(bookmark.message.fileSize)}`}
                      </p>
                    </div>
                    <div className="text-xs text-gray-500 flex-shrink-0">
                      {formatDate(bookmark.createdAt)}
                    </div>
                    {bookmark.message?.fileUrl && (
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePreview(bookmark);
                          }}
                          className="h-7 w-7 p-0 hover:bg-blue-50"
                          title="미리보기"
                          data-testid={`button-preview-bookmark-${bookmark.id}`}
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownload(bookmark);
                          }}
                          className="h-7 w-7 p-0 hover:bg-green-50"
                          title="다운로드"
                          data-testid={`button-download-bookmark-${bookmark.id}`}
                        >
                          <Download className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleShare(bookmark);
                          }}
                          className="h-7 w-7 p-0 hover:bg-purple-50"
                          title="공유"
                          data-testid={`button-share-bookmark-${bookmark.id}`}
                        >
                          <Share2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Bookmarks View (Grid) */}
            {selectedFolderId && viewMode === 'grid' && (
              <div className="p-3 grid grid-cols-3 gap-2">
                {(sortedItems as BookmarkData[]).map((bookmark) => (
                  <div
                    key={bookmark.id}
                    className="flex flex-col border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow group"
                    data-testid={`bookmark-card-${bookmark.id}`}
                  >
                    {/* Bookmark Preview */}
                    <div 
                      className="aspect-square bg-gradient-to-br from-purple-50 to-indigo-50 flex items-center justify-center relative cursor-pointer"
                      onClick={() => bookmark.message?.fileUrl ? handlePreview(bookmark) : handleNavigateToBookmark(bookmark)}
                    >
                      {bookmark.message?.fileUrl && bookmark.message.fileType?.startsWith('image/') ? (
                        <img 
                          src={bookmark.message.fileUrl} 
                          alt={bookmark.message.fileName || 'bookmark'}
                          className="w-full h-full object-cover"
                        />
                      ) : bookmark.message?.fileUrl ? (
                        <span className="text-3xl">{getFileIcon(bookmark.message.fileType || '')}</span>
                      ) : (
                        <MessageSquare className="h-10 w-10 text-purple-400" />
                      )}
                      
                      {/* Action buttons on hover */}
                      {bookmark.message?.fileUrl && (
                        <div className="absolute top-1 right-1 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDownload(bookmark);
                            }}
                            className="h-6 w-6 p-0 bg-white/90 hover:bg-white shadow-sm"
                            title="다운로드"
                            data-testid={`button-download-grid-${bookmark.id}`}
                          >
                            <Download className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleShare(bookmark);
                            }}
                            className="h-6 w-6 p-0 bg-white/90 hover:bg-white shadow-sm"
                            title="공유"
                            data-testid={`button-share-grid-${bookmark.id}`}
                          >
                            <Share2 className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Bookmark Info */}
                    <div className="p-1.5 bg-white">
                      <p className="text-[10px] font-medium text-gray-900 truncate leading-tight" title={bookmark.message?.fileName || bookmark.message?.content}>
                        {bookmark.message?.fileName || bookmark.message?.content || '북마크'}
                      </p>
                      {bookmark.message?.fileSize && (
                        <p className="text-[9px] text-gray-400 mt-0.5">
                          {formatFileSize(bookmark.message.fileSize)}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* File Preview Modal */}
      {selectedFile && (
        <FilePreviewModal
          isOpen={true}
          onClose={() => setSelectedFile(null)}
          fileUrl={selectedFile.url}
          fileName={selectedFile.name}
          fileSize={selectedFile.size}
          fileType={selectedFile.type}
        />
      )}
    </div>
  );
}
