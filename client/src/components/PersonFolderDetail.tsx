import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
  Eye,
  X
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
  businessCardData?: string;
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
  const [selectedBusinessCard, setSelectedBusinessCard] = useState<{
    imageUrl: string;
    personName: string;
  } | null>(null);

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
    queryKey: [`/api/person-folders/${folderId}/items`],
    enabled: !!user && !!folderId,
  });

  // Extract business card data and image
  const businessCardItem = items.find(item => item.itemType === 'business_card');
  let businessCardData = null;
  try {
    businessCardData = businessCardItem?.businessCardData ? JSON.parse(businessCardItem.businessCardData) : null;
  } catch (error) {
    console.error('Error parsing business card data:', error);
  }

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
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100">
        {/* Top Navigation */}
        <div className="flex items-center justify-between p-4 border-b border-gray-50">
          <Button onClick={onBack} variant="ghost" size="sm" className="text-gray-600 hover:text-gray-900">
            <ArrowLeft className="w-5 h-5 mr-2" />
            뒤로
          </Button>
          <Button variant="outline" size="sm" className="border-purple-200 text-purple-600 hover:bg-purple-50">
            <Upload className="w-4 h-4 mr-2" />
            파일 추가
          </Button>
        </div>

        {/* Profile Section */}
        <div className="p-6">
          <div className="flex items-start gap-6 mb-6">
            {/* Left: Profile Info */}
            <div className="flex items-center space-x-4 flex-1">
              <PrismAvatar
                fallback={getInitials(folder.personName || folder.folderName || "Unknown")}
                size="lg"
                className="w-20 h-20 border-2 border-purple-100"
              />
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-gray-900 mb-1">{folder.personName || folder.folderName || "이름 없음"}</h1>
                <p className="text-base text-gray-600 mb-2">
                  {folder.contact?.jobTitle && (
                    <span className="font-medium">{folder.contact.jobTitle}</span>
                  )}
                  {folder.contact?.company && folder.contact?.jobTitle && <span className="mx-2">•</span>}
                  {folder.contact?.company && (
                    <span className="text-purple-600 font-medium">{folder.contact.company}</span>
                  )}
                </p>
                <div className="flex items-center text-sm text-gray-500">
                  <span>마지막 활동:</span>
                  <span className="ml-1">
                    {(() => {
                      try {
                        const date = new Date(folder.lastActivity);
                        if (isNaN(date.getTime())) {
                          return "정보 없음";
                        }
                        return formatDistanceToNow(date, {
                          addSuffix: true,
                          locale: ko
                        });
                      } catch (error) {
                        return "정보 없음";
                      }
                    })()}
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Business Card */}
            {businessCardItem && businessCardItem.fileUrl && (
              <div className="flex-shrink-0 w-96">
                <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-gray-900">명함</h3>
                    <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center">
                      <CreditCard className="w-3 h-3 text-purple-600" />
                    </div>
                  </div>
                  
                  <div 
                    className="relative cursor-pointer group overflow-hidden rounded-xl border border-gray-100 bg-gray-50 p-2 hover:border-purple-200 transition-all duration-200"
                    onClick={() => setSelectedBusinessCard({
                      imageUrl: businessCardItem.fileUrl!,
                      personName: folder.personName || folder.folderName || "명함"
                    })}
                  >
                    <img
                      src={businessCardItem.fileUrl}
                      alt="명함"
                      className="w-full h-auto rounded-lg transition-all duration-200 group-hover:scale-[1.02]"
                      style={{ minHeight: '200px', maxHeight: '280px', objectFit: 'contain' }}
                    />
                    <div className="absolute inset-0 bg-purple-600 bg-opacity-0 group-hover:bg-opacity-5 transition-all duration-200 rounded-xl flex items-center justify-center">
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-white rounded-full p-3 shadow-md">
                        <Eye className="w-5 h-5 text-purple-600" />
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-3 mt-4">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1 border-purple-200 text-purple-600 hover:bg-purple-50 font-medium"
                      onClick={() => setSelectedBusinessCard({
                        imageUrl: businessCardItem.fileUrl!,
                        personName: folder.personName || folder.folderName || "명함"
                      })}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      크게보기
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1 border-gray-200 text-gray-600 hover:bg-gray-50 font-medium"
                      onClick={() => {
                        const link = document.createElement('a');
                        link.href = businessCardItem.fileUrl!;
                        link.download = `${folder.personName || folder.folderName || "명함"}_명함.jpg`;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                      }}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      저장하기
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Search */}
          <div className="relative">
            <Input
              type="text"
              placeholder="파일 이름이나 내용으로 검색하세요"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-gray-50 border-gray-200 rounded-xl h-12 pl-4 pr-4 text-base placeholder:text-gray-400 focus:border-purple-300 focus:ring-purple-100"
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="flex gap-6 p-4">
          {/* Left Column - Contact Info and File List */}
          <div className="flex-1 min-w-0">
            {/* Contact Information Card */}
            {folder.contact && (
              <div className="p-4 mb-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
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

            {/* File List */}
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
              <div className="space-y-3">
                {filteredItems.map((item: FolderItem) => (
                  <div key={item.id} className="bg-white border border-gray-100 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3 flex-1">
                        <div className="flex-shrink-0 mt-1">
                          {getItemIcon(item.itemType)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h4 className="text-sm font-medium text-gray-900 truncate">
                              {item.title || item.fileName || "제목 없음"}
                            </h4>
                            <span className="text-xs text-gray-500 ml-2 flex-shrink-0">
                              {getItemTypeLabel(item.itemType)}
                            </span>
                          </div>
                          {item.description && (
                            <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                              {item.description}
                            </p>
                          )}
                          <div className="flex items-center justify-between mt-2">
                            <div className="flex items-center text-xs text-gray-400">
                              <span>
                                {(() => {
                                  try {
                                    const date = new Date(item.createdAt);
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
                              </span>
                              {item.fileSize && (
                                <span className="ml-2">
                                  • {formatFileSize(item.fileSize)}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center space-x-1">
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <Download className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-400 hover:text-red-500">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                          {item.tags && item.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {item.tags.slice(0, 3).map((tag, index) => (
                                <span key={index} className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-700">
                                  {tag}
                                </span>
                              ))}
                              {item.tags.length > 3 && (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-500">
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
      </div>

      {/* Business Card Modal */}
      <Dialog open={!!selectedBusinessCard} onOpenChange={() => setSelectedBusinessCard(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden bg-white rounded-3xl border-0 shadow-2xl">
          <DialogHeader className="pb-6 border-b border-gray-100">
            <DialogTitle className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                <CreditCard className="w-4 h-4 text-purple-600" />
              </div>
              {selectedBusinessCard?.personName} 명함
            </DialogTitle>
          </DialogHeader>
          {selectedBusinessCard && (
            <div className="space-y-6 p-2">
              <div className="relative bg-gray-50 rounded-2xl p-6 flex items-center justify-center overflow-hidden border border-gray-100">
                <img
                  src={selectedBusinessCard.imageUrl}
                  alt="명함 확대보기"
                  className="max-w-full max-h-[60vh] h-auto rounded-xl shadow-lg"
                  style={{ objectFit: 'contain' }}
                />
              </div>
              <div className="flex justify-between items-center pt-4 border-t border-gray-100">
                <div className="text-sm text-gray-500">
                  명함을 저장하거나 창을 닫을 수 있습니다
                </div>
                <div className="flex gap-3">
                  <Button 
                    variant="outline"
                    size="lg"
                    className="border-purple-200 text-purple-600 hover:bg-purple-50 font-medium px-6 py-3 rounded-xl"
                    onClick={() => {
                      const link = document.createElement('a');
                      link.href = selectedBusinessCard.imageUrl;
                      link.download = `${selectedBusinessCard.personName}_명함.jpg`;
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                    }}
                  >
                    <Download className="w-5 h-5 mr-2" />
                    저장하기
                  </Button>
                  <Button 
                    variant="outline" 
                    size="lg"
                    className="border-gray-200 text-gray-600 hover:bg-gray-50 font-medium px-6 py-3 rounded-xl"
                    onClick={() => setSelectedBusinessCard(null)}
                  >
                    <X className="w-5 h-5 mr-2" />
                    닫기
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}