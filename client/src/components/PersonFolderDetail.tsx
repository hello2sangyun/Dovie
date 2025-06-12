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
  fileName?: string;
  fileUrl?: string;
  fileSize?: number;
  mimeType?: string;
  title?: string;
  description?: string;
  tags?: string[];
  chatRoomId?: number;
  messageId?: number;
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
    contactUserId?: number | null;
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

  // One Pager generation mutation
  const generateOnePagerMutation = useMutation({
    mutationFn: async (contactData: any) => {
      return apiRequest(`/api/person-folders/${folderId}/generate-onepager`, "POST", {
        contactData
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/person-folders", folderId, "items"] });
      toast({
        title: "One Pager 생성 완료",
        description: "명함 정보를 바탕으로 One Pager가 생성되었습니다.",
      });
    },
    onError: (error) => {
      toast({
        title: "One Pager 생성 실패",
        description: error instanceof Error ? error.message : "One Pager 생성 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  const { data: folder, isLoading: folderLoading, error: folderError } = useQuery<PersonFolderData>({
    queryKey: ["/api/person-folders", folderId],
    enabled: !!user && !!folderId,
  });

  const { data: items = [], isLoading: itemsLoading, error: itemsError } = useQuery<FolderItem[]>({
    queryKey: ["/api/person-folders", folderId, "items"],
    enabled: !!user && !!folderId,
  });

  // Console logging for debugging
  if (folder) console.log('Folder data loaded:', folder);
  if (folderError) console.error('Error loading folder:', folderError);
  if (items.length > 0) console.log('Folder items loaded:', items);
  if (itemsError) console.error('Error loading folder items:', itemsError);

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
        {/* Contact Information Card */}
        {folder.contact && (
          <div className="p-4 mx-4 mt-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-900">연락처 정보</h3>
              <div className="flex items-center space-x-2">
                {folder.contact.contactUserId ? (
                  <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                    ✓ Dovie 가입자
                  </span>
                ) : (
                  <span className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full">
                    미가입자
                  </span>
                )}
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              {folder.contact.name && (
                <div>
                  <span className="font-medium text-gray-700">이름:</span>
                  <span className="ml-2 text-gray-900">{folder.contact.name}</span>
                </div>
              )}
              {folder.contact.company && (
                <div>
                  <span className="font-medium text-gray-700">회사:</span>
                  <span className="ml-2 text-gray-900">{folder.contact.company}</span>
                </div>
              )}
              {folder.contact.jobTitle && (
                <div>
                  <span className="font-medium text-gray-700">직책:</span>
                  <span className="ml-2 text-gray-900">{folder.contact.jobTitle}</span>
                </div>
              )}
              {folder.contact.email && (
                <div>
                  <span className="font-medium text-gray-700">이메일:</span>
                  <span className="ml-2 text-gray-900">{folder.contact.email}</span>
                </div>
              )}
              {folder.contact.phone && (
                <div>
                  <span className="font-medium text-gray-700">전화번호:</span>
                  <span className="ml-2 text-gray-900">{folder.contact.phone}</span>
                </div>
              )}
            </div>
            
            {!folder.contact.contactUserId && (
              <div className="mt-4 pt-3 border-t border-blue-200">
                <p className="text-sm text-gray-600 mb-3">
                  이 분은 아직 Dovie에 가입하지 않았습니다. 명함 정보를 바탕으로 One Pager를 생성할 수 있습니다.
                </p>
                <Button 
                  size="sm" 
                  className="bg-blue-600 hover:bg-blue-700"
                  onClick={() => generateOnePagerMutation.mutate(folder.contact)}
                  disabled={generateOnePagerMutation.isPending}
                >
                  <CreditCard className="w-4 h-4 mr-2" />
                  {generateOnePagerMutation.isPending ? "생성 중..." : "One Pager 생성하기"}
                </Button>
              </div>
            )}
          </div>
        )}

        {filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center px-4">
            <CreditCard className="w-16 h-16 text-gray-300 mb-4" />
            {items.length === 0 ? (
              <>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  추가 파일이 없습니다
                </h3>
                <p className="text-gray-500 mb-6 max-w-sm">
                  명함, 채팅 파일, 문서를 추가하여 
                  {folder.personName || folder.folderName || "이분"}님과의 모든 자료를 한 곳에 정리하세요.
                </p>
                <Button className="bg-blue-500 hover:bg-blue-600">
                  <Upload className="w-4 h-4 mr-2" />
                  파일 추가하기
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