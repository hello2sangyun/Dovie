import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import PrismAvatar from "@/components/PrismAvatar";
import { 
  ArrowLeft,
  FileText, 
  Image, 
  Mic,
  MessageCircle,
  CreditCard,
  Upload,
  MoreVertical,
  Download,
  Trash2,
  Eye
} from "lucide-react";
import { cn, getInitials } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";

interface FolderItem {
  id: number;
  folderId: number;
  itemType: 'business_card' | 'one_pager' | 'chat_file' | 'document' | 'image' | 'audio';
  itemId?: number;
  fileName?: string;
  fileUrl?: string;
  fileSize?: number;
  mimeType?: string;
  title?: string;
  description?: string;
  tags?: string[];
  createdAt: string;
}

interface PersonFolderData {
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

interface PersonFolderDetailProps {
  folderId: number;
  onBack: () => void;
}

export default function PersonFolderDetail({ folderId, onBack }: PersonFolderDetailProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");

  const { data: folder, isLoading: folderLoading } = useQuery<PersonFolderData>({
    queryKey: ["/api/person-folders", folderId],
    enabled: !!user && !!folderId,
    onSuccess: (data) => {
      console.log('Folder data loaded:', data);
    },
    onError: (error) => {
      console.error('Error loading folder:', error);
    }
  });

  const { data: items = [], isLoading: itemsLoading } = useQuery<FolderItem[]>({
    queryKey: ["/api/person-folders", folderId, "items"],
    enabled: !!user && !!folderId,
    onSuccess: (data) => {
      console.log('Folder items loaded:', data);
    },
    onError: (error) => {
      console.error('Error loading folder items:', error);
    }
  });

  const filteredItems = items.filter((item: FolderItem) =>
    item.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.fileName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getItemIcon = (itemType: string) => {
    switch (itemType) {
      case 'business_card':
      case 'one_pager':
        return <CreditCard className="w-5 h-5 text-blue-500" />;
      case 'document':
        return <FileText className="w-5 h-5 text-green-500" />;
      case 'image':
        return <Image className="w-5 h-5 text-purple-500" />;
      case 'audio':
        return <Mic className="w-5 h-5 text-orange-500" />;
      case 'chat_file':
        return <MessageCircle className="w-5 h-5 text-indigo-500" />;
      default:
        return <FileText className="w-5 h-5 text-gray-500" />;
    }
  };

  const getItemTypeLabel = (itemType: string) => {
    switch (itemType) {
      case 'business_card':
        return '명함';
      case 'one_pager':
        return 'One Pager';
      case 'document':
        return '문서';
      case 'image':
        return '이미지';
      case 'audio':
        return '음성';
      case 'chat_file':
        return '채팅 파일';
      default:
        return '파일';
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  if (folderLoading || itemsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-500">폴더 내용을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (!folder) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-gray-500">폴더를 찾을 수 없습니다.</p>
          <Button onClick={onBack} variant="outline" className="mt-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            돌아가기
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-white sticky top-0 z-10">
        <div className="flex items-center justify-between mb-4">
          <Button onClick={onBack} variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            뒤로
          </Button>
          <Button variant="outline" size="sm">
            <Upload className="w-4 h-4 mr-2" />
            파일 추가
          </Button>
        </div>

        {/* Folder Info */}
        <div className="flex items-center space-x-3 mb-4">
          <PrismAvatar
            fallback={getInitials(folder.personName || folder.folderName || "Unknown")}
            size="lg"
            className="w-16 h-16"
          />
          <div className="flex-1">
            <h1 className="text-xl font-semibold text-gray-900">{folder.personName || folder.folderName || "이름 없음"}</h1>
            <p className="text-sm text-gray-500">
              {folder.contact?.company && (
                <span>{folder.contact.company} • </span>
              )}
              {folder.contact?.jobTitle || folder.contact?.phone}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              마지막 활동: {(() => {
                try {
                  const date = new Date(folder.lastActivity);
                  if (isNaN(date.getTime())) {
                    return "날짜 정보 없음";
                  }
                  return formatDistanceToNow(date, {
                    addSuffix: true,
                    locale: ko
                  });
                } catch (error) {
                  return "날짜 정보 없음";
                }
              })()}
            </p>
          </div>
        </div>
        
        {/* Search */}
        <div className="relative">
          <Input
            type="text"
            placeholder="파일 이름, 제목으로 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-gray-50 border-gray-200"
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center px-4">
            <CreditCard className="w-16 h-16 text-gray-300 mb-4" />
            {items.length === 0 ? (
              <>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  폴더가 비어있습니다
                </h3>
                <p className="text-gray-500 mb-6 max-w-sm">
                  명함, One Pager, 채팅 파일을 추가하여 
                  {folder.personName || folder.folderName || "이분"}님과의 모든 자료를 한 곳에 정리하세요.
                </p>
                <Button className="bg-blue-500 hover:bg-blue-600">
                  <Upload className="w-4 h-4 mr-2" />
                  첫 파일 추가하기
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
          <div className="p-4 space-y-3">
            {filteredItems.map((item: FolderItem) => (
              <div
                key={item.id}
                className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start space-x-3">
                  {/* Item Icon */}
                  <div className="flex-shrink-0">
                    {getItemIcon(item.itemType)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-gray-900 truncate">
                        {item.title || item.fileName || '제목 없음'}
                      </h4>
                      <div className="flex items-center space-x-2">
                        <Button variant="ghost" size="sm">
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Download className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    
                    {item.description && (
                      <p className="text-sm text-gray-600 truncate mt-1">
                        {item.description}
                      </p>
                    )}
                    
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <span className="flex items-center">
                          <span className="bg-gray-100 px-2 py-1 rounded">
                            {getItemTypeLabel(item.itemType)}
                          </span>
                        </span>
                        {item.fileSize && (
                          <span>{formatFileSize(item.fileSize)}</span>
                        )}
                        <span>
                          {formatDistanceToNow(new Date(item.createdAt), {
                            addSuffix: true,
                            locale: ko
                          })}
                        </span>
                      </div>
                      
                      {item.tags && item.tags.length > 0 && (
                        <div className="flex items-center space-x-1">
                          {item.tags.slice(0, 2).map((tag, index) => (
                            <span
                              key={index}
                              className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded"
                            >
                              {tag}
                            </span>
                          ))}
                          {item.tags.length > 2 && (
                            <span className="text-xs text-gray-400">
                              +{item.tags.length - 2}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
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