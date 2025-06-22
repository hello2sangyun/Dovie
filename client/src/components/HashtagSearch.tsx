import React, { useState, useEffect, useRef } from 'react';
import { Search, Hash, X, File, Calendar, Tag } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';

interface Hashtag {
  id: number;
  tag: string;
  normalizedTag: string;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
}

interface FileResult {
  id: number;
  userId: number;
  chatRoomId: number | null;
  fileName: string;
  originalName: string;
  fileSize: number;
  fileType: string;
  filePath: string;
  hashtags: string[];
  uploadedAt: string;
  isDeleted: boolean;
}

interface HashtagSearchProps {
  onFileSelect?: (file: FileResult) => void;
  placeholder?: string;
  className?: string;
}

export default function HashtagSearch({ onFileSelect, placeholder = "해시태그로 파일 검색 (예: #디자인 #회의)", className }: HashtagSearchProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedHashtags, setSelectedHashtags] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [currentInput, setCurrentInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // 해시태그 자동완성 suggestions
  const { data: suggestions = [] } = useQuery<{ suggestions: Hashtag[] }>({
    queryKey: ['/api/hashtags/suggestions', currentInput],
    enabled: currentInput.length > 0 && showSuggestions,
    staleTime: 30000,
  });

  // 파일 검색
  const { data: searchResults, isLoading: isSearching } = useQuery<{ files: FileResult[] }>({
    queryKey: ['/api/files/search', selectedHashtags.join(',')],
    enabled: selectedHashtags.length > 0,
    staleTime: 30000,
  });

  // 검색어 파싱 및 해시태그 추출
  const parseSearchQuery = (query: string) => {
    const hashtagRegex = /#([가-힣a-zA-Z0-9_]+)/g;
    const hashtags: string[] = [];
    let match;
    
    while ((match = hashtagRegex.exec(query)) !== null) {
      const tag = match[1];
      if (!hashtags.includes(tag)) {
        hashtags.push(tag);
      }
    }
    
    return hashtags;
  };

  // 입력 변화 처리
  const handleInputChange = (value: string) => {
    setSearchQuery(value);
    
    // 현재 입력 중인 해시태그 찾기
    const lastHashIndex = value.lastIndexOf('#');
    if (lastHashIndex !== -1) {
      const currentHashtag = value.substring(lastHashIndex + 1);
      setCurrentInput(currentHashtag);
      setShowSuggestions(true);
    } else {
      setCurrentInput('');
      setShowSuggestions(false);
    }

    // 완성된 해시태그들 추출
    const hashtags = parseSearchQuery(value);
    setSelectedHashtags(hashtags);
  };

  // 해시태그 제안 선택
  const selectSuggestion = (tag: string) => {
    const lastHashIndex = searchQuery.lastIndexOf('#');
    if (lastHashIndex !== -1) {
      const newQuery = searchQuery.substring(0, lastHashIndex + 1) + tag + ' ';
      setSearchQuery(newQuery);
      handleInputChange(newQuery);
    }
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  // 해시태그 제거
  const removeHashtag = (tagToRemove: string) => {
    const newQuery = searchQuery.replace(new RegExp(`#${tagToRemove}\\s*`, 'g'), '');
    setSearchQuery(newQuery);
    handleInputChange(newQuery);
  };

  // 검색 초기화
  const clearSearch = () => {
    setSearchQuery('');
    setSelectedHashtags([]);
    setCurrentInput('');
    setShowSuggestions(false);
  };

  // 파일 크기 포맷팅
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // 파일 타입 아이콘
  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return '🖼️';
    if (fileType.startsWith('video/')) return '🎥';
    if (fileType.startsWith('audio/')) return '🎵';
    if (fileType.includes('pdf')) return '📄';
    if (fileType.includes('document') || fileType.includes('word')) return '📝';
    if (fileType.includes('spreadsheet') || fileType.includes('excel')) return '📊';
    return '📁';
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* 검색 입력 */}
      <div className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            ref={inputRef}
            type="text"
            placeholder={placeholder}
            value={searchQuery}
            onChange={(e) => handleInputChange(e.target.value)}
            className="pl-10 pr-10"
            onFocus={() => currentInput && setShowSuggestions(true)}
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearSearch}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* 자동완성 제안 */}
        {showSuggestions && suggestions.suggestions && suggestions.suggestions.length > 0 && (
          <Card className="absolute top-full left-0 right-0 mt-1 z-50 shadow-lg">
            <CardContent className="p-2">
              <ScrollArea className="max-h-40">
                {suggestions.suggestions.map((hashtag) => (
                  <div
                    key={hashtag.id}
                    onClick={() => selectSuggestion(hashtag.tag)}
                    className="flex items-center justify-between p-2 rounded cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    <div className="flex items-center space-x-2">
                      <Hash className="h-4 w-4 text-blue-500" />
                      <span className="font-medium">{hashtag.tag}</span>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {hashtag.usageCount}개 파일
                    </Badge>
                  </div>
                ))}
              </ScrollArea>
            </CardContent>
          </Card>
        )}
      </div>

      {/* 선택된 해시태그 표시 */}
      {selectedHashtags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedHashtags.map((tag) => (
            <Badge key={tag} variant="default" className="flex items-center gap-1">
              <Hash className="h-3 w-3" />
              {tag}
              <X
                className="h-3 w-3 cursor-pointer hover:text-red-500"
                onClick={() => removeHashtag(tag)}
              />
            </Badge>
          ))}
        </div>
      )}

      {/* 검색 결과 */}
      {selectedHashtags.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">검색 결과</h3>
            {isSearching && (
              <div className="text-sm text-gray-500">검색 중...</div>
            )}
          </div>

          {searchResults?.files && searchResults.files.length > 0 ? (
            <ScrollArea className="max-h-96">
              <div className="space-y-2">
                {searchResults.files.map((file) => (
                  <Card
                    key={file.id}
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => onFileSelect?.(file)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3 flex-1">
                          <div className="text-2xl">{getFileIcon(file.fileType)}</div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{file.originalName}</p>
                            <div className="flex items-center space-x-4 text-xs text-gray-500 mt-1">
                              <span className="flex items-center">
                                <File className="h-3 w-3 mr-1" />
                                {formatFileSize(file.fileSize)}
                              </span>
                              <span className="flex items-center">
                                <Calendar className="h-3 w-3 mr-1" />
                                {new Date(file.uploadedAt).toLocaleDateString('ko-KR')}
                              </span>
                            </div>
                            {file.hashtags && file.hashtags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {file.hashtags.map((tag) => (
                                  <Badge key={tag} variant="outline" className="text-xs">
                                    <Tag className="h-2 w-2 mr-1" />
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          ) : !isSearching && searchResults ? (
            <div className="text-center py-8 text-gray-500">
              <Hash className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>해당 해시태그로 태그된 파일을 찾을 수 없습니다.</p>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}