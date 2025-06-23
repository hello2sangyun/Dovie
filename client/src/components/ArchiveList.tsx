import { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Search, Filter, FileText, Code, FileImage, FileSpreadsheet, File, Video, Trash2, X, Hash, Folder, FolderOpen, ChevronRight, ArrowLeft } from "lucide-react";
import PreviewModal from "./PreviewModal";
import { debounce } from "@/lib/utils";

interface ChatRoomFolder {
  id: number;
  name: string;
  fileCount: number;
  files: any[];
}

// Folder view component
function FolderView({ 
  folders, 
  onFolderClick, 
  searchTerm, 
  selectedItems, 
  onItemSelect, 
  selectionMode 
}: {
  folders: ChatRoomFolder[];
  onFolderClick: (folder: ChatRoomFolder) => void;
  searchTerm: string;
  selectedItems: Set<number>;
  onItemSelect: (id: number) => void;
  selectionMode: boolean;
}) {
  const filteredFolders = useMemo(() => {
    if (!searchTerm.trim()) return folders;
    
    const searchLower = searchTerm.toLowerCase();
    return folders.filter(folder => 
      folder.name.toLowerCase().includes(searchLower) ||
      folder.files.some(file => 
        (file.fileName?.toLowerCase() || '').includes(searchLower) ||
        (file.savedText?.toLowerCase() || '').includes(searchLower)
      )
    );
  }, [folders, searchTerm]);

  if (filteredFolders.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Folder className="h-12 w-12 mx-auto mb-4 text-gray-300" />
        <p className="text-sm font-medium">
          {searchTerm ? '검색 결과가 없습니다' : '파일이 저장된 채팅방이 없습니다'}
        </p>
        {searchTerm && (
          <p className="text-sm text-gray-400 mt-1">
            다른 검색어를 시도해보세요
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white">
      {filteredFolders.map((folder, index) => (
        <div
          key={folder.id}
          onClick={() => !selectionMode && onFolderClick(folder)}
          className={`flex items-center px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors ${
            index !== filteredFolders.length - 1 ? 'border-b border-gray-100' : ''
          }`}
        >
          {/* Folder icon */}
          <div className="flex-shrink-0 mr-3">
            <Folder className="h-5 w-5 text-blue-500" />
          </div>
          
          {/* Folder info */}
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-gray-900 truncate">
              {folder.name}
            </div>
            <div className="text-xs text-gray-500 mt-0.5">
              {folder.fileCount}개 파일
            </div>
          </div>
          
          {/* Arrow icon */}
          <div className="flex-shrink-0 ml-2">
            <ChevronRight className="h-4 w-4 text-gray-400" />
          </div>
        </div>
      ))}
    </div>
  );
}

// Search results view component showing all files
function SearchResultsView({
  files,
  searchTerm,
  sortBy,
  onCommandClick,
  selectedItems,
  onItemSelect,
  selectionMode
}: {
  files: any[];
  searchTerm: string;
  sortBy: string;
  onCommandClick: (command: any) => void;
  selectedItems: Set<number>;
  onItemSelect: (id: number) => void;
  selectionMode: boolean;
}) {
  const filteredAndSortedFiles = useMemo(() => {
    let filtered = files;
    
    // Apply search filter
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter((file: any) => {
        const fileName = file.fileName?.toLowerCase() || '';
        const savedText = file.savedText?.toLowerCase() || '';
        const commandName = file.commandName?.toLowerCase() || '';
        const chatRoomName = file.chatRoomName?.toLowerCase() || '';
        
        return fileName.includes(searchLower) || 
               savedText.includes(searchLower) || 
               commandName.includes(searchLower) ||
               chatRoomName.includes(searchLower);
      });
    }
    
    // Apply sorting
    filtered.sort((a: any, b: any) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'oldest':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'name':
          const nameA = a.fileName || a.commandName || '';
          const nameB = b.fileName || b.commandName || '';
          return nameA.localeCompare(nameB);
        default:
          return 0;
      }
    });

    return filtered;
  }, [files, searchTerm, sortBy]);

  const getFileIcon = (fileName: string) => {
    if (!fileName) return Hash;
    const ext = fileName.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'pdf':
      case 'doc':
      case 'docx':
        return FileText;
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
      case 'webp':
        return FileImage;
      case 'mp3':
      case 'wav':
      case 'webm':
      case 'mp4':
        return Video;
      case 'xlsx':
      case 'xls':
      case 'csv':
        return FileSpreadsheet;
      case 'js':
      case 'ts':
      case 'jsx':
      case 'tsx':
      case 'html':
      case 'css':
        return Code;
      default:
        return File;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
    } else if (date.toDateString() === yesterday.toDateString()) {
      return '어제';
    } else {
      return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
    }
  };

  if (filteredAndSortedFiles.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <File className="h-12 w-12 mx-auto mb-4 text-gray-300" />
        <p className="text-sm font-medium">검색 결과가 없습니다</p>
        <p className="text-sm text-gray-400 mt-1">다른 검색어를 시도해보세요</p>
      </div>
    );
  }

  return (
    <div className="bg-white">
      {filteredAndSortedFiles.map((file: any, index: number) => {
        const Icon = getFileIcon(file.fileName || "");
        const isSelected = selectedItems.has(file.id);
        
        return (
          <div
            key={file.id}
            onClick={() => selectionMode ? onItemSelect(file.id) : onCommandClick(file)}
            className={`flex items-center px-4 py-2.5 hover:bg-gray-50 cursor-pointer transition-colors ${
              index !== filteredAndSortedFiles.length - 1 ? 'border-b border-gray-100' : ''
            } ${isSelected ? 'bg-blue-50' : ''}`}
          >
            {/* Checkbox for selection mode */}
            {selectionMode && (
              <div className="flex-shrink-0 mr-3" onClick={(e) => e.stopPropagation()}>
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => onItemSelect(file.id)}
                  className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                />
              </div>
            )}
            
            {/* File icon */}
            <div className="flex-shrink-0 mr-3">
              <Icon className="h-4 w-4 text-gray-500" />
            </div>
            
            {/* File info */}
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-900 truncate">
                {file.fileName ? 
                  (file.fileName.length > 30 ? 
                    `${file.fileName.substring(0, 27)}...` : 
                    file.fileName
                  ) : 
                  file.commandName
                }
              </div>
              <div className="text-xs text-gray-500 truncate mt-0.5">
                📁 {file.chatRoomName}{file.chatRoomParticipants ? ` (${file.chatRoomParticipants})` : ''}
              </div>
              {file.savedText && !file.fileName && (
                <div className="text-xs text-gray-500 truncate mt-0.5">
                  {file.savedText.length > 40 ? 
                    `${file.savedText.substring(0, 40)}...` : 
                    file.savedText
                  }
                </div>
              )}
            </div>
            
            {/* File size and date */}
            <div className="flex-shrink-0 text-right ml-2">
              {file.fileSize && (
                <div className="text-xs text-gray-400">
                  {formatFileSize(file.fileSize)}
                </div>
              )}
              <div className="text-xs text-gray-400 mt-0.5">
                {formatDate(file.createdAt)}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// File list view component for a specific folder
function FileListView({ 
  folder, 
  onBack, 
  searchTerm, 
  sortBy, 
  onCommandClick,
  selectedItems,
  onItemSelect,
  selectionMode 
}: {
  folder: ChatRoomFolder;
  onBack: () => void;
  searchTerm: string;
  sortBy: string;
  onCommandClick: (command: any) => void;
  selectedItems: Set<number>;
  onItemSelect: (id: number) => void;
  selectionMode: boolean;
}) {
  const filteredAndSortedFiles = useMemo(() => {
    let filtered = folder.files;
    
    // Apply search filter
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter((file: any) => {
        const fileName = file.fileName?.toLowerCase() || '';
        const savedText = file.savedText?.toLowerCase() || '';
        const commandName = file.commandName?.toLowerCase() || '';
        
        return fileName.includes(searchLower) || 
               savedText.includes(searchLower) || 
               commandName.includes(searchLower);
      });
    }
    
    // Apply sorting
    filtered.sort((a: any, b: any) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'oldest':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'name':
          const nameA = a.fileName || a.commandName || '';
          const nameB = b.fileName || b.commandName || '';
          return nameA.localeCompare(nameB);
        default:
          return 0;
      }
    });

    return filtered;
  }, [folder.files, searchTerm, sortBy]);

  const getFileIcon = (fileName: string) => {
    if (!fileName) return Hash;
    const ext = fileName.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'pdf':
      case 'doc':
      case 'docx':
        return FileText;
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
      case 'webp':
        return FileImage;
      case 'mp3':
      case 'wav':
      case 'webm':
      case 'mp4':
        return Video;
      case 'xlsx':
      case 'xls':
      case 'csv':
        return FileSpreadsheet;
      case 'js':
      case 'ts':
      case 'jsx':
      case 'tsx':
      case 'html':
      case 'css':
        return Code;
      default:
        return File;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
    } else if (date.toDateString() === yesterday.toDateString()) {
      return '어제';
    } else {
      return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
    }
  };

  if (filteredAndSortedFiles.length === 0) {
    return (
      <div className="bg-white">
        {/* Header with back button */}
        <div className="flex items-center px-4 py-3 border-b border-gray-200 bg-gray-50">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="mr-3 p-1"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <FolderOpen className="h-4 w-4 text-blue-500 mr-2" />
          <span className="text-sm font-medium text-gray-900">{folder.name}</span>
        </div>
        
        <div className="text-center py-8 text-gray-500">
          <File className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <p className="text-sm font-medium">
            {searchTerm ? '검색 결과가 없습니다' : '이 폴더에 파일이 없습니다'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white">
      {/* Header with back button */}
      <div className="flex items-center px-4 py-3 border-b border-gray-200 bg-gray-50">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="mr-3 p-1"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <FolderOpen className="h-4 w-4 text-blue-500 mr-2" />
        <span className="text-sm font-medium text-gray-900">{folder.name}</span>
        <span className="text-xs text-gray-500 ml-2">({filteredAndSortedFiles.length}개 파일)</span>
      </div>
      
      {/* File list */}
      {filteredAndSortedFiles.map((file: any, index: number) => {
        const Icon = getFileIcon(file.fileName || "");
        const isSelected = selectedItems.has(file.id);
        
        return (
          <div
            key={file.id}
            onClick={() => selectionMode ? onItemSelect(file.id) : onCommandClick(file)}
            className={`flex items-center px-4 py-2.5 hover:bg-gray-50 cursor-pointer transition-colors ${
              index !== filteredAndSortedFiles.length - 1 ? 'border-b border-gray-100' : ''
            } ${isSelected ? 'bg-blue-50' : ''}`}
          >
            {/* Checkbox for selection mode */}
            {selectionMode && (
              <div className="flex-shrink-0 mr-3" onClick={(e) => e.stopPropagation()}>
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => onItemSelect(file.id)}
                  className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                />
              </div>
            )}
            
            {/* File icon */}
            <div className="flex-shrink-0 mr-3">
              <Icon className="h-4 w-4 text-gray-500" />
            </div>
            
            {/* File info */}
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-900 truncate">
                {file.fileName ? 
                  (file.fileName.length > 30 ? 
                    `${file.fileName.substring(0, 27)}...` : 
                    file.fileName
                  ) : 
                  file.commandName
                }
              </div>
              {file.savedText && !file.fileName && (
                <div className="text-xs text-gray-500 truncate mt-0.5">
                  {file.savedText.length > 40 ? 
                    `${file.savedText.substring(0, 40)}...` : 
                    file.savedText
                  }
                </div>
              )}
            </div>
            
            {/* File size and date */}
            <div className="flex-shrink-0 text-right ml-2">
              {file.fileSize && (
                <div className="text-xs text-gray-400">
                  {formatFileSize(file.fileSize)}
                </div>
              )}
              <div className="text-xs text-gray-400 mt-0.5">
                {formatDate(file.createdAt)}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function ArchiveList() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [selectedCommand, setSelectedCommand] = useState<any>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [currentFolder, setCurrentFolder] = useState<ChatRoomFolder | null>(null);
  
  // Multi-select state
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());

  // Fetch commands and chat rooms
  const { data: commandsData, isLoading: commandsLoading } = useQuery({
    queryKey: ["/api/commands", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const response = await fetch("/api/commands", {
        headers: { "x-user-id": user!.id.toString() },
      });
      if (!response.ok) throw new Error("Failed to fetch commands");
      return response.json();
    },
    staleTime: 30 * 1000,
  });

  const { data: chatRoomsData, isLoading: chatRoomsLoading } = useQuery({
    queryKey: ["/api/chat-rooms", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const response = await fetch("/api/chat-rooms", {
        headers: { "x-user-id": user!.id.toString() },
      });
      if (!response.ok) throw new Error("Failed to fetch chat rooms");
      return response.json();
    },
    staleTime: 30 * 1000,
  });

  // Debounced search implementation
  const debouncedSetSearch = useMemo(
    () => debounce((searchTerm: string) => {
      setDebouncedSearchTerm(searchTerm);
    }, 500),
    []
  );

  useEffect(() => {
    debouncedSetSearch(searchInput);
  }, [searchInput, debouncedSetSearch]);

  // Create folder structure from commands and chat rooms
  const folders = useMemo(() => {
    const commands = commandsData?.commands || [];
    const chatRooms = chatRoomsData?.chatRooms || [];
    
    // Create a map of chat room ID to chat room name
    const chatRoomMap = new Map();
    chatRooms.forEach((room: any) => {
      chatRoomMap.set(room.id, room.name);
    });
    
    // Group commands by chat room
    const folderMap = new Map<number, ChatRoomFolder>();
    
    commands.forEach((command: any) => {
      if (command.chatRoomId) {
        const chatRoomName = chatRoomMap.get(command.chatRoomId) || `채팅방 ${command.chatRoomId}`;
        
        if (!folderMap.has(command.chatRoomId)) {
          folderMap.set(command.chatRoomId, {
            id: command.chatRoomId,
            name: chatRoomName,
            fileCount: 0,
            files: []
          });
        }
        
        const folder = folderMap.get(command.chatRoomId)!;
        folder.files.push(command);
        folder.fileCount = folder.files.length;
      }
    });
    
    return Array.from(folderMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [commandsData, chatRoomsData]);

  // Get all files when searching
  const allFiles = useMemo(() => {
    const commands = commandsData?.commands || [];
    const chatRooms = chatRoomsData?.chatRooms || [];
    
    // Create a map of chat room ID to chat room name
    const chatRoomMap = new Map();
    chatRooms.forEach((room: any) => {
      chatRoomMap.set(room.id, room.name);
    });
    
    // Add chat room name to each file for display
    return commands.map((command: any) => ({
      ...command,
      chatRoomName: chatRoomMap.get(command.chatRoomId) || `채팅방 ${command.chatRoomId}`
    }));
  }, [commandsData, chatRoomsData]);

  const handleCommandClick = useCallback((command: any) => {
    setSelectedCommand(command);
    setShowPreview(true);
  }, []);

  const handleFolderClick = useCallback((folder: ChatRoomFolder) => {
    setCurrentFolder(folder);
    setSelectionMode(false);
    setSelectedItems(new Set());
  }, []);

  const handleBackToFolders = useCallback(() => {
    setCurrentFolder(null);
    setSelectionMode(false);
    setSelectedItems(new Set());
  }, []);

  // Multi-select handlers
  const handleItemSelect = useCallback((id: number) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    if (currentFolder) {
      const allFileIds = new Set(currentFolder.files.map(file => file.id));
      setSelectedItems(allFileIds);
    }
  }, [currentFolder]);

  const handleDeselectAll = useCallback(() => {
    setSelectedItems(new Set());
  }, []);

  const toggleSelectionMode = useCallback(() => {
    setSelectionMode(prev => !prev);
    if (selectionMode) {
      setSelectedItems(new Set());
    }
  }, [selectionMode]);

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (commandIds: number[]) => {
      const response = await fetch("/api/commands/bulk-delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": user!.id.toString(),
        },
        body: JSON.stringify({ commandIds }),
      });
      if (!response.ok) throw new Error("Failed to delete commands");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "삭제 완료",
        description: `${selectedItems.size}개의 파일이 삭제되었습니다.`,
      });
      setSelectedItems(new Set());
      setSelectionMode(false);
      queryClient.invalidateQueries({ queryKey: ["/api/commands"] });
    },
    onError: () => {
      toast({
        title: "삭제 실패",
        description: "파일 삭제 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  const handleDelete = useCallback(() => {
    if (selectedItems.size === 0) return;
    
    const confirmDelete = window.confirm(
      `선택한 ${selectedItems.size}개의 파일을 삭제하시겠습니까?`
    );
    
    if (confirmDelete) {
      deleteMutation.mutate(Array.from(selectedItems));
    }
  }, [selectedItems, deleteMutation]);

  const isLoading = commandsLoading || chatRoomsLoading;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-900">
            {currentFolder ? currentFolder.name : "저장소"}
          </h3>
          <div className="flex items-center space-x-2">
            {currentFolder && !selectionMode ? (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleSelectionMode}
                  className="text-purple-600 hover:text-purple-700"
                >
                  선택
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-purple-600 hover:text-purple-700"
                >
                  <Filter className="h-5 w-5" />
                </Button>
              </>
            ) : selectionMode ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleSelectionMode}
                className="text-red-600 hover:text-red-700"
              >
                <X className="h-4 w-4 mr-1" />
                취소
              </Button>
            ) : null}
          </div>
        </div>
        
        {/* Selection mode header */}
        {selectionMode && currentFolder && (
          <div className="flex items-center justify-between mb-3 p-3 bg-blue-50 rounded-lg">
            <div className="flex items-center space-x-4">
              <span className="text-sm font-medium text-blue-700">
                {selectedItems.size}개 선택됨
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={selectedItems.size > 0 ? handleDeselectAll : handleSelectAll}
                className="text-blue-600 hover:text-blue-700 text-xs"
              >
                {selectedItems.size > 0 ? "선택 해제" : "모두 선택"}
              </Button>
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              disabled={selectedItems.size === 0 || deleteMutation.isPending}
              className="flex items-center space-x-1"
            >
              <Trash2 className="h-4 w-4" />
              <span>삭제</span>
            </Button>
          </div>
        )}
        
        <div className="relative mb-2">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            type="text"
            placeholder={currentFolder ? "파일명으로 검색..." : "폴더명, 파일명으로 검색..."}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-10 border-gray-300 focus:border-purple-500 focus:ring-purple-500"
          />
        </div>

        {currentFolder && (
          <div className="flex space-x-2">
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">최신순</SelectItem>
                <SelectItem value="oldest">오래된순</SelectItem>
                <SelectItem value="name">이름순</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          </div>
        ) : debouncedSearchTerm.trim() ? (
          <SearchResultsView
            files={allFiles}
            searchTerm={debouncedSearchTerm}
            sortBy={sortBy}
            onCommandClick={handleCommandClick}
            selectedItems={selectedItems}
            onItemSelect={handleItemSelect}
            selectionMode={selectionMode}
          />
        ) : currentFolder ? (
          <FileListView
            folder={currentFolder}
            onBack={handleBackToFolders}
            searchTerm={debouncedSearchTerm}
            sortBy={sortBy}
            onCommandClick={handleCommandClick}
            selectedItems={selectedItems}
            onItemSelect={handleItemSelect}
            selectionMode={selectionMode}
          />
        ) : (
          <FolderView
            folders={folders}
            onFolderClick={handleFolderClick}
            searchTerm={debouncedSearchTerm}
            selectedItems={selectedItems}
            onItemSelect={handleItemSelect}
            selectionMode={selectionMode}
          />
        )}
      </div>

      {/* Preview Modal */}
      {showPreview && selectedCommand && (
        <PreviewModal
          open={showPreview}
          onClose={() => setShowPreview(false)}
          command={selectedCommand}
        />
      )}
    </div>
  );
}