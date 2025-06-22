import { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Filter, Download, FileText, Code, Quote, FileImage, FileSpreadsheet, File, Video, Hash } from "lucide-react";
import PreviewModal from "./PreviewModal";
import HashtagSearch from "./HashtagSearch";
import { debounce } from "@/lib/utils";

// 검색 결과만 렌더링하는 별도 컴포넌트
function SearchResults({ searchTerm, filterType, sortBy, onCommandClick }: {
  searchTerm: string;
  filterType: string;
  sortBy: string;
  onCommandClick: (command: any) => void;
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
      <div className="p-4 space-y-3">
        {filteredAndSortedCommands.map((command: any) => {
          const Icon = getFileIcon(command.fileName || "");
          return (
            <div
              key={command.id}
              onClick={() => onCommandClick(command)}
              className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
            >
              <div className="flex items-start space-x-3">
                <Icon className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-gray-900 truncate">
                      {command.commandName || command.fileName || "제목 없음"}
                    </h4>
                    <span className="text-xs text-gray-500 ml-2 flex-shrink-0">
                      {formatDate(command.createdAt)}
                    </span>
                  </div>
                  {command.fileName && command.commandName && (
                    <p className="text-sm text-gray-600 mt-1">
                      파일: {command.fileName}
                    </p>
                  )}
                  {command.savedText && (
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                      {command.savedText.substring(0, 100)}...
                    </p>
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
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [selectedCommand, setSelectedCommand] = useState<any>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

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
          <h3 className="font-semibold text-gray-900">자료실</h3>
        </div>
        
        {/* 탭 인터페이스 */}
        <Tabs defaultValue="hashtag" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="hashtag" className="flex items-center space-x-2">
              <Hash className="h-4 w-4" />
              <span>해시태그 검색</span>
            </TabsTrigger>
            <TabsTrigger value="filename" className="flex items-center space-x-2">
              <Search className="h-4 w-4" />
              <span>파일명 검색</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="hashtag" className="space-y-4 mt-4">
            <HashtagSearch
              onFileSelect={(file) => {
                setSelectedCommand({
                  ...file,
                  commandName: file.originalName,
                  savedText: file.originalName,
                  fileUrl: `/uploads/${file.fileName}`,
                  createdAt: file.uploadedAt
                });
                setIsPreviewModalOpen(true);
              }}
              placeholder="해시태그로 파일 검색 (예: #디자인 #회의)"
            />
          </TabsContent>
          
          <TabsContent value="filename" className="space-y-4 mt-4">
            {/* 검색 입력 */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                type="text"
                placeholder="파일명 또는 해시태그로 검색..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-10 focus:ring-2 focus:ring-purple-500"
              />
            </div>

            {/* 필터 및 정렬 */}
            <div className="flex space-x-2">
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-32">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  <SelectItem value="image">이미지</SelectItem>
                  <SelectItem value="document">문서</SelectItem>
                  <SelectItem value="video">비디오</SelectItem>
                  <SelectItem value="other">기타</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recent">최신순</SelectItem>
                  <SelectItem value="name">이름순</SelectItem>
                  <SelectItem value="size">크기순</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 검색 결과 */}
            <div className="flex-1 overflow-hidden">
              <SearchResults
                searchTerm={debouncedSearchTerm}
                filterType={filterType}
                sortBy={sortBy}
                onCommandClick={handleCommandClick}
              />
            </div>

            {/* 해시태그 및 검색 제안 */}
            {searchInput && (
              <div className="space-y-2">
                {getHashtagSuggestions().length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">해시태그 제안</p>
                    <div className="flex flex-wrap gap-1">
                      {getHashtagSuggestions().map((hashtag: string, index: number) => (
                        <Button
                          key={index}
                          variant="outline"
                          size="sm"
                          onClick={() => setSearchInput(hashtag)}
                          className="text-xs"
                        >
                          {hashtag}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
                
                {getSearchSuggestions().length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">검색 제안</p>
                    <div className="flex flex-wrap gap-1">
                      {getSearchSuggestions().map((suggestion: string, index: number) => (
                        <Button
                          key={index}
                          variant="outline"
                          size="sm"
                          onClick={() => setSearchInput(suggestion)}
                          className="text-xs"
                        >
                          {suggestion}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
      
      {/* Preview Modal */}
      {selectedCommand && (
        <PreviewModal
          open={isPreviewModalOpen}
          onClose={() => {
            setIsPreviewModalOpen(false);
            setSelectedCommand(null);
          }}
          command={selectedCommand}
        />
      )}
    </div>
  );
}
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