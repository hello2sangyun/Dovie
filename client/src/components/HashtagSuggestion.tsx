import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileText, Image, Video, Music, Archive } from 'lucide-react';

interface HashtagSuggestionProps {
  isVisible: boolean;
  searchQuery: string;
  onSelectTag: (tag: string, fileData: any) => void;
  onClose: () => void;
  chatRoomId: number;
}

interface FileCommand {
  id: number;
  commandName: string;
  savedText: string;
  createdAt: string;
  fileData?: {
    fileName: string;
    fileType: string;
    fileSize: number;
    filePath: string;
  };
}

export function HashtagSuggestion({ 
  isVisible, 
  searchQuery, 
  onSelectTag, 
  onClose, 
  chatRoomId 
}: HashtagSuggestionProps) {
  const [filteredTags, setFilteredTags] = useState<FileCommand[]>([]);

  // Fetch hashtag suggestions based on search query with fileOnly filter
  const { data: commandsData } = useQuery({
    queryKey: ['/api/commands', { hashtag: searchQuery, fileOnly: 'true' }],
    enabled: isVisible && searchQuery.length > 0,
    staleTime: 10000,
  });

  // Filter tags based on search query
  useEffect(() => {
    if (!commandsData || !isVisible) {
      setFilteredTags([]);
      return;
    }

    const commands = (commandsData as any)?.commands || [];
    
    // Commands are already filtered by the API for hashtag searches
    // Just limit the results for display
    setFilteredTags(commands.slice(0, 8)); // Limit to 8 suggestions for better UX
  }, [commandsData, searchQuery, isVisible]);

  // Get file icon based on file type
  const getFileIcon = (fileType: string) => {
    if (fileType?.startsWith('image/')) return <Image className="h-4 w-4 text-blue-500" />;
    if (fileType?.startsWith('video/')) return <Video className="h-4 w-4 text-purple-500" />;
    if (fileType?.startsWith('audio/')) return <Music className="h-4 w-4 text-green-500" />;
    return <FileText className="h-4 w-4 text-gray-500" />;
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="absolute bottom-full left-0 right-0 mb-2 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto z-50">
      <div className="p-2 border-b border-gray-100 bg-gray-50">
        <div className="text-xs text-gray-600">
          태그를 선택하여 파일 소환
        </div>
      </div>
      
      <div className="py-1">
        {filteredTags.map((tag) => {
          let fileData = null;
          try {
            fileData = JSON.parse(tag.savedText);
          } catch {
            // Handle plain text commands
          }

          return (
            <button
              key={tag.id}
              onClick={() => {
                onSelectTag(tag.commandName, fileData);
                onClose();
              }}
              className="w-full px-3 py-2 text-left hover:bg-purple-50 flex items-center gap-3 transition-colors"
            >
              <div className="flex-shrink-0">
                {getFileIcon(fileData?.fileType)}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900 truncate">
                  #{tag.commandName}
                </div>
                {fileData?.fileName && (
                  <div className="text-xs text-gray-500 truncate">
                    {fileData.fileName}
                  </div>
                )}
                <div className="text-xs text-gray-400">
                  {new Date(tag.createdAt).toLocaleDateString()}
                </div>
              </div>
              
              {fileData?.fileSize && (
                <div className="text-xs text-gray-400 flex-shrink-0">
                  {Math.round(fileData.fileSize / 1024)}KB
                </div>
              )}
            </button>
          );
        })}
      </div>
      
      {filteredTags.length === 0 && (
        <div className="p-4 text-center text-gray-500 text-sm">
          {searchQuery ? `"${searchQuery}" 태그를 찾을 수 없습니다` : '업로드된 파일이 없습니다'}
        </div>
      )}
    </div>
  );
}