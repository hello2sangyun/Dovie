import { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Search, Filter, FileText, Code, FileImage, FileSpreadsheet, File, Video, Trash2, X, Hash } from "lucide-react";
import PreviewModal from "./PreviewModal";
import { debounce } from "@/lib/utils";

// Telegram-style compact file list component
function TelegramFileList({ searchTerm, filterType, sortBy, onCommandClick, selectedItems, onItemSelect, selectionMode }: {
  searchTerm: string;
  filterType: string;
  sortBy: string;
  onCommandClick: (command: any) => void;
  selectedItems: Set<number>;
  onItemSelect: (id: number) => void;
  selectionMode: boolean;
}) {
  const { user } = useAuth();
  
  const { data: commandsData, isLoading } = useQuery({
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

  const commands = commandsData?.commands || [];
  
  // Filtering and sorting logic
  const filteredAndSortedCommands = useMemo(() => {
    let filtered = commands;
    
    // Apply search filter
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter((cmd: any) => {
        const commandName = cmd.commandName?.toLowerCase() || '';
        const savedText = cmd.savedText?.toLowerCase() || '';
        const fileName = cmd.fileName?.toLowerCase() || '';
        
        return commandName.includes(searchLower) || 
               savedText.includes(searchLower) || 
               fileName.includes(searchLower);
      });
    }
    
    // Apply type filter
    if (filterType !== "all") {
      filtered = filtered.filter((command: any) => {
        if (filterType === 'files') return command.fileName;
        if (filterType === 'text') return !command.fileName;
        return true;
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
  }, [commands, searchTerm, filterType, sortBy]);

  // Helper functions for file display
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (!filteredAndSortedCommands || filteredAndSortedCommands.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <File className="h-12 w-12 mx-auto mb-4 text-gray-300" />
        <p className="text-sm font-medium">
          {searchTerm ? '검색 결과가 없습니다' : '저장된 파일이 없습니다'}
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
      {filteredAndSortedCommands.map((command: any, index: number) => {
        const Icon = getFileIcon(command.fileName || "");
        const isSelected = selectedItems.has(command.id);
        
        return (
          <div
            key={command.id}
            onClick={() => selectionMode ? onItemSelect(command.id) : onCommandClick(command)}
            className={`flex items-center px-3 py-2.5 hover:bg-gray-50 cursor-pointer transition-colors ${
              index !== filteredAndSortedCommands.length - 1 ? 'border-b border-gray-100' : ''
            } ${isSelected ? 'bg-blue-50' : ''}`}
          >
            {/* Checkbox for selection mode */}
            {selectionMode && (
              <div className="flex-shrink-0 mr-3" onClick={(e) => e.stopPropagation()}>
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => onItemSelect(command.id)}
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
                {command.fileName ? 
                  (command.fileName.length > 30 ? 
                    `${command.fileName.substring(0, 27)}...` : 
                    command.fileName
                  ) : 
                  command.commandName
                }
              </div>
              {command.savedText && !command.fileName && (
                <div className="text-xs text-gray-500 truncate mt-0.5">
                  {command.savedText.length > 40 ? 
                    `${command.savedText.substring(0, 40)}...` : 
                    command.savedText
                  }
                </div>
              )}
            </div>
            
            {/* File size and date */}
            <div className="flex-shrink-0 text-right ml-2">
              {command.fileSize && (
                <div className="text-xs text-gray-400">
                  {formatFileSize(command.fileSize)}
                </div>
              )}
              <div className="text-xs text-gray-400 mt-0.5">
                {formatDate(command.createdAt)}
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
  const [filterType, setFilterType] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [selectedCommand, setSelectedCommand] = useState<any>(null);
  const [showPreview, setShowPreview] = useState(false);
  
  // Multi-select state
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());

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

  const handleCommandClick = useCallback((command: any) => {
    setSelectedCommand(command);
    setShowPreview(true);
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
    // We need to get all command IDs from the current filtered list
    setSelectedItems(new Set());
  }, []);

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

  return (
    <div className="h-full flex flex-col">
      {/* Header - 고정 영역 */}
      <div className="p-4 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-900">저장소</h3>
          <div className="flex items-center space-x-2">
            {!selectionMode ? (
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
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleSelectionMode}
                className="text-red-600 hover:text-red-700"
              >
                <X className="h-4 w-4 mr-1" />
                취소
              </Button>
            )}
          </div>
        </div>
        
        {/* Selection mode header */}
        {selectionMode && (
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
            placeholder="파일명, 해시태그로 검색..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-10 border-gray-300 focus:border-purple-500 focus:ring-purple-500"
          />
        </div>

        <div className="flex space-x-2">
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체</SelectItem>
              <SelectItem value="files">파일</SelectItem>
              <SelectItem value="text">텍스트</SelectItem>
            </SelectContent>
          </Select>
          
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
      </div>

      {/* File list content */}
      <div className="flex-1 overflow-hidden">
        <TelegramFileList
          searchTerm={debouncedSearchTerm}
          filterType={filterType}
          sortBy={sortBy}
          onCommandClick={handleCommandClick}
          selectedItems={selectedItems}
          onItemSelect={handleItemSelect}
          selectionMode={selectionMode}
        />
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