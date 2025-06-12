import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { 
  ArrowLeft, 
  MoreVertical, 
  Share, 
  CreditCard, 
  FileText, 
  Download,
  Eye,
  Phone,
  Mail,
  Video,
  User,
  Building2,
  MapPin,
  UserCheck,
  UserX,
  MessageCircle,
  Image,
  Mic
} from "lucide-react";

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
  businessCardData?: string;
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

interface BusinessCardViewProps {
  folderId: number;
  onBack: () => void;
}

export default function BusinessCardView({ folderId, onBack }: BusinessCardViewProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'card' | 'files'>('card');

  const { data: folder, isLoading: folderLoading } = useQuery<PersonFolderData>({
    queryKey: ["/api/person-folders", folderId],
    enabled: !!user && !!folderId,
  });

  const { data: items = [], isLoading: itemsLoading } = useQuery<FolderItem[]>({
    queryKey: [`/api/person-folders/${folderId}/items`],
    enabled: !!user && !!folderId,
  });

  // Extract business card data
  const businessCardItem = items.find(item => item.itemType === 'business_card');
  const businessCardData = businessCardItem ? JSON.parse(businessCardItem.businessCardData || '{}') : null;
  const personName = businessCardData?.name || folder?.personName || "이름 없음";
  
  // Check if contact is a registered user
  const isRegisteredUser = folder?.contact?.contactUserId !== null;
  
  // Get shared files from DM
  const sharedFiles = items.filter(item => item.itemType !== 'business_card');

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 60) return `${diffInMinutes}분 전`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}시간 전`;
    return `${Math.floor(diffInMinutes / 1440)}일 전`;
  };

  const handleCall = () => {
    if (businessCardData?.phone) {
      window.open(`tel:${businessCardData.phone}`);
    }
  };

  const handleEmail = () => {
    if (businessCardData?.email) {
      window.open(`mailto:${businessCardData.email}`);
    }
  };

  const handleDM = () => {
    if (isRegisteredUser) {
      // Navigate to DM with this user
      console.log('Open DM with registered user');
    }
  };

  const handleVideoCall = () => {
    if (isRegisteredUser) {
      // Start video call with registered user
      console.log('Start video call with registered user');
    }
  };

  if (folderLoading || itemsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-500">정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-white sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="p-1"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">
                {personName}
              </h1>
              <p className="text-sm text-gray-500">
                {businessCardData?.company && businessCardData?.jobTitle 
                  ? `${businessCardData.company} • ${businessCardData.jobTitle}`
                  : "연락처 정보"
                }
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="sm">
              <Share className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Business Card Section */}
        {businessCardItem && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <CreditCard className="w-5 h-5 mr-2 text-blue-500" />
                  명함
                </h3>
                <div className="flex space-x-2">
                  <Button size="sm" variant="outline">
                    <Eye className="w-4 h-4 mr-1" />
                    크게보기
                  </Button>
                  <Button size="sm" variant="outline">
                    <Download className="w-4 h-4 mr-1" />
                    다운로드
                  </Button>
                </div>
              </div>
              
              {/* Business Card Preview */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-100 border-2 border-blue-200 rounded-lg p-6 mb-4">
                <div className="text-center">
                  <h4 className="text-xl font-bold text-gray-900 mb-1">{businessCardData?.name}</h4>
                  <p className="text-blue-600 font-medium mb-2">{businessCardData?.jobTitle}</p>
                  <p className="text-gray-700 font-medium mb-3">{businessCardData?.company}</p>
                  <div className="text-sm text-gray-600 space-y-1">
                    {businessCardData?.email && <p>{businessCardData.email}</p>}
                    {businessCardData?.phone && <p>{businessCardData.phone}</p>}
                    {businessCardData?.address && <p>{businessCardData.address}</p>}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Contact Information */}
        {businessCardData && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <User className="w-5 h-5 mr-2 text-green-500" />
              연락처 정보
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {businessCardData.name && (
                <div className="flex items-center space-x-3">
                  <User className="w-4 h-4 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">이름</p>
                    <p className="font-medium text-gray-900">{businessCardData.name}</p>
                  </div>
                </div>
              )}
              {businessCardData.company && (
                <div className="flex items-center space-x-3">
                  <Building2 className="w-4 h-4 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">회사</p>
                    <p className="font-medium text-gray-900">{businessCardData.company}</p>
                  </div>
                </div>
              )}
              {businessCardData.jobTitle && (
                <div className="flex items-center space-x-3">
                  <UserCheck className="w-4 h-4 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">직책</p>
                    <p className="font-medium text-gray-900">{businessCardData.jobTitle}</p>
                  </div>
                </div>
              )}
              {businessCardData.email && (
                <div className="flex items-center space-x-3">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">이메일</p>
                    <p className="font-medium text-gray-900">{businessCardData.email}</p>
                  </div>
                </div>
              )}
              {businessCardData.phone && (
                <div className="flex items-center space-x-3">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">전화번호</p>
                    <p className="font-medium text-gray-900">{businessCardData.phone}</p>
                  </div>
                </div>
              )}
              {businessCardData.address && (
                <div className="flex items-center space-x-3 md:col-span-2">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">주소</p>
                    <p className="font-medium text-gray-900">{businessCardData.address}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">연락하기</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Button
              onClick={handleCall}
              disabled={!businessCardData?.phone}
              className="flex flex-col items-center p-4 h-auto bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
              variant="outline"
            >
              <Phone className="w-6 h-6 mb-2" />
              <span className="text-sm">전화걸기</span>
            </Button>
            
            <Button
              onClick={handleDM}
              disabled={!isRegisteredUser}
              className={`flex flex-col items-center p-4 h-auto ${
                isRegisteredUser 
                  ? 'bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200' 
                  : 'bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed'
              }`}
              variant="outline"
            >
              <MessageCircle className="w-6 h-6 mb-2" />
              <span className="text-sm">DM</span>
              {!isRegisteredUser && <span className="text-xs text-gray-400">미가입자</span>}
            </Button>
            
            <Button
              onClick={handleEmail}
              disabled={!businessCardData?.email}
              className="flex flex-col items-center p-4 h-auto bg-purple-50 hover:bg-purple-100 text-purple-700 border-purple-200"
              variant="outline"
            >
              <Mail className="w-6 h-6 mb-2" />
              <span className="text-sm">메일보내기</span>
            </Button>
            
            <Button
              onClick={handleVideoCall}
              disabled={!isRegisteredUser}
              className={`flex flex-col items-center p-4 h-auto ${
                isRegisteredUser 
                  ? 'bg-orange-50 hover:bg-orange-100 text-orange-700 border-orange-200' 
                  : 'bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed'
              }`}
              variant="outline"
            >
              <Video className="w-6 h-6 mb-2" />
              <span className="text-sm">화상통화</span>
              {!isRegisteredUser && <span className="text-xs text-gray-400">미가입자</span>}
            </Button>
          </div>
        </div>

        {/* Shared Files Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <FileText className="w-5 h-5 mr-2 text-indigo-500" />
            DM에서 주고받은 파일자료
          </h3>
          {sharedFiles.length > 0 ? (
            <div className="space-y-3">
              {sharedFiles.map((file) => (
                <div key={file.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    {file.itemType === 'image' && <Image className="w-5 h-5 text-purple-500" />}
                    {file.itemType === 'audio' && <Mic className="w-5 h-5 text-orange-500" />}
                    {file.itemType === 'document' && <FileText className="w-5 h-5 text-green-500" />}
                    {file.itemType === 'chat_file' && <MessageCircle className="w-5 h-5 text-indigo-500" />}
                    <div>
                      <p className="font-medium text-gray-900">{file.title}</p>
                      <p className="text-sm text-gray-500">{formatDate(file.createdAt)}</p>
                    </div>
                  </div>
                  <Button size="sm" variant="ghost">
                    <Download className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">주고받은 파일이 없습니다</p>
              <p className="text-sm text-gray-400">DM에서 파일을 공유하면 여기에 표시됩니다</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}