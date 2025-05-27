import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Filter, Download, FileText, Code, Quote } from "lucide-react";
import PreviewModal from "./PreviewModal";

export default function ArchiveList() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [selectedCommand, setSelectedCommand] = useState<any>(null);
  const [showPreview, setShowPreview] = useState(false);

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
  });

  const commands = commandsData?.commands || [];

  const filteredAndSortedCommands = commands
    .filter((command: any) => {
      if (filterType === "all") return true;
      if (filterType === "file") return command.fileUrl;
      if (filterType === "message") return command.savedText;
      if (filterType === "command") return command.commandName;
      return true;
    })
    .sort((a: any, b: any) => {
      switch (sortBy) {
        case "newest":
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case "oldest":
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case "name":
          return a.commandName.localeCompare(b.commandName);
        default:
          return 0;
      }
    });

  const getCommandIcon = (command: any) => {
    if (command.fileUrl) {
      const extension = command.fileName?.split('.').pop()?.toLowerCase();
      if (['js', 'ts', 'py', 'java', 'cpp', 'c', 'html', 'css'].includes(extension || '')) {
        return <Code className="text-purple-600" />;
      }
      return <FileText className="text-green-600" />;
    }
    return <Quote className="text-blue-600" />;
  };

  const getCommandBadgeColor = (command: any) => {
    if (command.fileUrl) {
      const extension = command.fileName?.split('.').pop()?.toLowerCase();
      if (['js', 'ts', 'py', 'java', 'cpp', 'c', 'html', 'css'].includes(extension || '')) {
        return "bg-purple-100 text-purple-700";
      }
      return "bg-green-100 text-green-700";
    }
    return "bg-blue-100 text-blue-700";
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const truncateFileName = (fileName: string, maxLength: number) => {
    if (fileName.length <= maxLength) return fileName;
    const extension = fileName.lastIndexOf('.') > 0 ? fileName.substring(fileName.lastIndexOf('.')) : '';
    const name = fileName.substring(0, fileName.lastIndexOf('.') > 0 ? fileName.lastIndexOf('.') : fileName.length);
    const truncatedName = name.substring(0, maxLength - extension.length - 3);
    return `${truncatedName}...${extension}`;
  };

  const handleCommandClick = (command: any) => {
    setSelectedCommand(command);
    setShowPreview(true);
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-gray-500">저장소를 불러오는 중...</div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-900">저장소</h3>
          <Button
            variant="ghost"
            size="sm"
            className="text-purple-600 hover:text-purple-700"
          >
            <Filter className="h-5 w-5" />
          </Button>
        </div>
        
        <div className="relative mb-2">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            type="text"
            placeholder="태그나 파일명으로 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <div className="flex space-x-2">
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="타입 필터" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">모든 타입</SelectItem>
              <SelectItem value="file">파일</SelectItem>
              <SelectItem value="message">메시지</SelectItem>
              <SelectItem value="command">명령어</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="flex-1">
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

      <div className="flex-1 overflow-y-auto">
        {filteredAndSortedCommands.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            {searchTerm ? "검색 결과가 없습니다" : "저장된 명령어가 없습니다"}
          </div>
        ) : (
          <>
            <div className="p-3 bg-gray-50">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                저장된 항목들
              </p>
            </div>
            
            {filteredAndSortedCommands.map((command: any) => (
              <div
                key={command.id}
                className="p-3 hover:bg-purple-50 cursor-pointer border-b border-gray-100 transition-colors"
                onClick={() => handleCommandClick(command)}
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    {getCommandIcon(command)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${getCommandBadgeColor(command)}`}>
                        #{command.commandName}
                      </span>
                      <span className="text-xs text-gray-500">
                        채팅방
                      </span>
                    </div>
                    <p className="font-medium text-gray-900 text-sm truncate" title={command.fileName || command.savedText || "저장된 메시지"}>
                      {truncateFileName(command.fileName || command.savedText || "저장된 메시지", 40)}
                    </p>
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-gray-500">
                        {formatDate(command.createdAt)}
                      </p>
                      {command.originalSender && (
                        <p className="text-xs text-gray-500 truncate max-w-20" title={command.originalSender.displayName}>
                          {command.originalSender.displayName}
                        </p>
                      )}
                    </div>
                  </div>
                  {command.fileUrl && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-gray-400 hover:text-purple-600 flex-shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(command.fileUrl, '_blank');
                      }}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      {/* Preview Modal */}
      {selectedCommand && (
        <PreviewModal
          open={showPreview}
          onClose={() => {
            setShowPreview(false);
            setSelectedCommand(null);
          }}
          command={selectedCommand}
        />
      )}
    </div>
  );
}
