import { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Search, Filter, Download, FileText, Code, Quote, FileImage, FileSpreadsheet, File, Video, Trash2, X } from "lucide-react";
import PreviewModal from "./PreviewModal";
import { debounce } from "@/lib/utils";

// 검색 결과만 렌더링하는 별도 컴포넌트
function SearchResults({ searchTerm, filterType, sortBy, onCommandClick, selectedItems, onItemSelect, selectionMode }: {
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
    queryKey: ["/api/commands", { search: searchTerm }],
    enabled: !!user,
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchTerm) params.append("search", searchTerm);
      
      const response = await fetch(`/api/commands?${params}`, {
        headers: { "x-user-id": user!.id.toString() },
      });
      if (!response.ok) throw new Error("Failed to fetch commands");
      return response.json();
    },
    staleTime: 30 * 1000,
    refetchOnWindowFocus: false,
  });

  const commands = commandsData?.commands || [];
  
  // 필터링 및 정렬 로직
  const filteredAndSortedCommands = useMemo(() => {
    let filtered = commands;
    
    if (filterType !== "all") {
      filtered = commands.filter((command: any) => {
        const fileType = getFileType(command.fileName || "");
        return fileType === filterType;
      });
    }
    
    return filtered.sort((a: any, b: any) => {
      if (sortBy === "newest") {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      } else if (sortBy === "oldest") {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      } else if (sortBy === "name") {
        return (a.commandName || a.fileName || "").localeCompare(b.commandName || b.fileName || "");
      }
      return 0;
    });
  }, [commands, filterType, sortBy]);

  const getFileType = (fileName: string) => {
    if (!fileName) return "text";
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '')) return 'image';
    if (['mp4', 'avi', 'mov', 'wmv'].includes(ext || '')) return 'video';
    if (['pdf', 'doc', 'docx'].includes(ext || '')) return 'document';
    if (['xls', 'xlsx', 'csv'].includes(ext || '')) return 'spreadsheet';
    if (['js', 'ts', 'py', 'html', 'css'].includes(ext || '')) return 'code';
    return 'text';
  };

  const getFileIcon = (fileName: string) => {
    const fileType = getFileType(fileName);
    switch (fileType) {
      case 'image': return FileImage;
      case 'video': return Video;
      case 'document': return FileText;
      case 'spreadsheet': return FileSpreadsheet;
      case 'code': return Code;
      default: return File;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return "오늘";
    if (days === 1) return "어제";
    if (days < 7) return `${days}일 전`;
    if (days < 30) return `${Math.floor(days / 7)}주 전`;
    if (days < 365) return `${Math.floor(days / 30)}개월 전`;
    return `${Math.floor(days / 365)}년 전`;
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-gray-500">검색 중...</div>
      </div>
    );
  }

  if (filteredAndSortedCommands.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <File className="h-12 w-12 text-gray-300 mb-3" />
        <p className="text-gray-500 text-center">
          {searchTerm ? "검색 결과가 없습니다" : "저장된 자료가 없습니다"}
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
    <div className="flex-1 overflow-y-auto">
      <div className="divide-y divide-gray-100">
        {filteredAndSortedCommands.map((command: any) => {
          const Icon = getFileIcon(command.fileName || "");
          const isSelected = selectedItems.has(command.id);
          
          return (
            <div
              key={command.id}
              onClick={() => selectionMode ? onItemSelect(command.id) : onCommandClick(command)}
              className={`flex items-center px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors ${
                isSelected ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
              }`}
            >
              {/* Checkbox for selection mode */}
              {selectionMode && (
                <div className="mr-3" onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => onItemSelect(command.id)}
                    className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                  />
                </div>
              )}
              
              {/* File icon */}
              <div className="flex-shrink-0 mr-3">
                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                  <Icon className="h-5 w-5 text-gray-600" />
                </div>
              </div>
              
              {/* File content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-gray-900 truncate text-sm">
                    {command.commandName || command.fileName || "제목 없음"}
                  </h4>
                  <span className="text-xs text-gray-500 ml-2 flex-shrink-0">
                    {formatDate(command.createdAt)}
                  </span>
                </div>
                
                {/* File size or content preview */}
                <div className="flex items-center mt-1">
                  {command.fileSize && (
                    <span className="text-xs text-gray-500">
                      {(command.fileSize / 1024).toFixed(1)} KB
                    </span>
                  )}
                  {command.savedText && !command.fileName && (
                    <span className="text-xs text-gray-500 truncate">
                      {command.savedText.substring(0, 50)}...
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
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
  const [showSuggestions, setShowSuggestions] = useState(false);
  
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
    const allIds = allCommandsData?.commands?.map((cmd: any) => cmd.id) || [];
    setSelectedItems(new Set(allIds));
  }, [allCommandsData]);

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

  // 기본 데이터 조회 (한 번만)
  const { data: allCommandsData } = useQuery({
    queryKey: ["/api/commands"],
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

  const allCommands = allCommandsData?.commands || [];

  // 해시태그 추천을 위한 함수
  const getHashtagSuggestions = useCallback(() => {
    const hashtags = new Set<string>();
    
    allCommands.forEach((command: any) => {
      if (command.savedText) {
        const hashtagMatches = command.savedText.match(/#[\w가-힣]+/g);
        if (hashtagMatches) {
          hashtagMatches.forEach((hashtag: string) => hashtags.add(hashtag));
        }
      }
      
      if (command.fileName) {
        const fileHashtagMatches = command.fileName.match(/#[\w가-힣]+/g);
        if (fileHashtagMatches) {
          fileHashtagMatches.forEach((hashtag: string) => hashtags.add(hashtag));
        }
      }
    });
    
    const hashtagArray = Array.from(hashtags);
    
    if (searchInput) {
      const filtered = hashtagArray.filter(hashtag => 
        hashtag.toLowerCase().includes(searchInput.toLowerCase()) &&
        hashtag.toLowerCase() !== searchInput.toLowerCase()
      );
      return filtered.slice(0, 6);
    }
    
    return hashtagArray.slice(0, 8);
  }, [searchInput, allCommands]);

  const getSearchSuggestions = useCallback(() => {
    const suggestions = new Set<string>();
    
    allCommands.forEach((command: any) => {
      // Add command names
      if (command.commandName && command.commandName.length > 1) {
        suggestions.add(command.commandName);
      }
      
      // Add file names (without extensions)
      if (command.fileName) {
        const nameWithoutExt = command.fileName.split('.')[0];
        if (nameWithoutExt.length > 2) {
          suggestions.add(nameWithoutExt);
        }
      }
    });
    
    const suggestionsArray = Array.from(suggestions);
    
    if (searchInput) {
      const filtered = suggestionsArray.filter(suggestion => 
        suggestion.toLowerCase().includes(searchInput.toLowerCase()) &&
        suggestion.toLowerCase() !== searchInput.toLowerCase()
      );
      return filtered.slice(0, 4);
    }
    
    return suggestionsArray.slice(0, 6);
  }, [searchInput, allCommands]);

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
                  onClick={() => setShowSuggestions(!showSuggestions)}
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
            placeholder="단일 해시태그 검색... (예: #soeun_passport, #회의록_2025)"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            className="pl-10"
          />
          
          {/* Search suggestions dropdown */}
          {showSuggestions && (
            <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-md shadow-lg z-10 mt-1 max-h-64 overflow-y-auto">
              {/* Hashtag suggestions */}
              {getHashtagSuggestions().length > 0 && (
                <div className="p-2">
                  <div className="text-xs font-medium text-gray-500 mb-2">해시태그</div>
                  <div className="flex flex-wrap gap-1">
                    {getHashtagSuggestions().map((hashtag, index) => (
                      <button
                        key={index}
                        onClick={() => {
                          setSearchInput(hashtag);
                          setShowSuggestions(false);
                        }}
                        className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-full hover:bg-blue-100 transition-colors"
                      >
                        {hashtag}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Search term suggestions */}
              {getSearchSuggestions().length > 0 && (
                <div className="p-2 border-t border-gray-100">
                  <div className="text-xs font-medium text-gray-500 mb-2">추천 검색어</div>
                  <div className="space-y-1">
                    {getSearchSuggestions().map((suggestion, index) => (
                      <button
                        key={index}
                        onClick={() => {
                          setSearchInput(suggestion);
                          setShowSuggestions(false);
                        }}
                        className="block w-full text-left px-2 py-1 text-sm text-gray-700 hover:bg-gray-100 rounded transition-colors"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        
        <div className="flex space-x-2">
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="필터" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체</SelectItem>
              <SelectItem value="text">텍스트</SelectItem>
              <SelectItem value="image">이미지</SelectItem>
              <SelectItem value="document">문서</SelectItem>
              <SelectItem value="code">코드</SelectItem>
              <SelectItem value="video">비디오</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="정렬" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">최신순</SelectItem>
              <SelectItem value="oldest">오래된순</SelectItem>
              <SelectItem value="name">이름순</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 검색 결과 컨테이너 - 이 부분만 업데이트됨 */}
      <SearchResults
        searchTerm={debouncedSearchTerm}
        filterType={filterType}
        sortBy={sortBy}
        onCommandClick={handleCommandClick}
        selectedItems={selectedItems}
        onItemSelect={handleItemSelect}
        selectionMode={selectionMode}
      />

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