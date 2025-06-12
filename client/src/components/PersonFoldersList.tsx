import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { OptimizedAvatar } from "@/components/OptimizedAvatar";
import PrismAvatar from "@/components/PrismAvatar";
import { 
  FolderOpen, 
  Search, 
  Plus, 
  FileText, 
  Image, 
  Mic,
  MoreVertical,
  Clock,
  ChevronRight
} from "lucide-react";
import { cn, getInitials, getAvatarColor } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";

interface PersonFolder {
  id: number;
  userId: number;
  contactId?: number | null;
  personName: string;
  folderName?: string;
  avatarUrl?: string;
  lastActivity: string;
  itemCount: number;
  contact?: {
    id: number;
    name?: string;
    nickname?: string;
    email?: string;
    phone?: string;
    company?: string;
    jobTitle?: string;
  } | null;
}

interface PersonFoldersListProps {
  onSelectFolder: (folderId: number) => void;
  onScanCard?: () => void;
}

export default function PersonFoldersList({ onSelectFolder }: PersonFoldersListProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");

  const { data: folders = [], isLoading } = useQuery<PersonFolder[]>({
    queryKey: ["/api/person-folders"],
    enabled: !!user,
  });

  const filteredFolders = folders.filter((folder: PersonFolder) =>
    (folder.folderName || folder.personName).toLowerCase().includes(searchTerm.toLowerCase()) ||
    folder.personName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    folder.contact?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    folder.contact?.company?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getItemTypeIcon = (itemCount: number) => {
    if (itemCount === 0) return <FolderOpen className="w-5 h-5 text-gray-400" />;
    return <FolderOpen className="w-5 h-5 text-blue-500" />;
  };

  const getContactDisplayName = (folder: PersonFolder) => {
    if (folder.contact) {
      return folder.contact.nickname || folder.contact.name || folder.contact.email || folder.personName;
    }
    return folder.personName || "이름 없음";
  };

  const getContactSubtitle = (folder: PersonFolder) => {
    if (folder.contact) {
      const parts = [];
      if (folder.contact.jobTitle) parts.push(folder.contact.jobTitle);
      if (folder.contact.company) parts.push(folder.contact.company);
      return parts.join(" • ") || folder.contact.phone || folder.contact.email || "";
    }
    return folder.folderName || "";
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-500">폴더 목록을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-white sticky top-0 z-10">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-semibold text-gray-900">Cabinet</h1>
          <Button
            onClick={() => setLocation("/scan")}
            size="sm"
            className="bg-blue-500 hover:bg-blue-600"
          >
            <Plus className="w-4 h-4 mr-2" />
            명함 스캔
          </Button>
        </div>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            type="text"
            placeholder="사람 이름, 회사명으로 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-gray-50 border-gray-200"
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {filteredFolders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center px-4">
            <FolderOpen className="w-16 h-16 text-gray-300 mb-4" />
            {folders.length === 0 ? (
              <>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  아직 폴더가 없습니다
                </h3>
                <p className="text-gray-500 mb-6 max-w-sm">
                  명함을 스캔하면 자동으로 사람별 폴더가 생성됩니다. 
                  폴더에는 명함, One Pager, 채팅 파일이 정리됩니다.
                </p>
                <Button
                  onClick={() => setLocation("/scan")}
                  className="bg-blue-500 hover:bg-blue-600"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  첫 명함 스캔하기
                </Button>
              </>
            ) : (
              <>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  검색 결과가 없습니다
                </h3>
                <p className="text-gray-500">
                  다른 검색어를 시도해보세요.
                </p>
              </>
            )}
          </div>
        ) : (
          <div className="p-3 space-y-1">
            {filteredFolders.map((folder: PersonFolder) => (
              <div
                key={folder.id}
                onClick={() => {
                  console.log('Folder clicked:', folder.id, folder.personName);
                  onSelectFolder(folder.id);
                }}
                className="bg-white border border-gray-100 rounded-lg p-3 hover:bg-gray-50 active:bg-gray-100 transition-colors cursor-pointer"
              >
                <div className="flex items-center space-x-3">
                  {/* Avatar */}
                  <div className="relative flex-shrink-0">
                    {getContactDisplayName(folder) ? (
                      <PrismAvatar
                        fallback={getInitials(getContactDisplayName(folder))}
                        size="sm"
                        className="w-9 h-9"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center">
                        <FolderOpen className="w-4 h-4 text-gray-400" />
                      </div>
                    )}
                    {folder.itemCount > 0 && (
                      <div className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-medium">
                        {folder.itemCount > 99 ? '99+' : folder.itemCount}
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium text-gray-900 truncate text-sm">
                        {getContactDisplayName(folder)}
                      </h3>
                      <div className="flex items-center text-xs text-gray-400 ml-2 flex-shrink-0">
                        <span>
                          {folder.itemCount > 0 
                            ? `${folder.itemCount}개` 
                            : "빈 폴더"
                          }
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between mt-0.5">
                      <p className="text-xs text-gray-500 truncate">
                        {getContactSubtitle(folder) || "연락처 정보 없음"}
                      </p>
                      <div className="flex items-center text-xs text-gray-400 ml-2 flex-shrink-0">
                        <Clock className="w-3 h-3 mr-1" />
                        <span>
                          {formatDistanceToNow(new Date(folder.lastActivity), {
                            addSuffix: true,
                            locale: ko
                          })}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Arrow indicator */}
                  <div className="flex-shrink-0">
                    <ChevronRight className="w-4 h-4 text-gray-300" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}