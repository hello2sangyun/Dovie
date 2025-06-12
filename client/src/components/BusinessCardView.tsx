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
  
  let businessCardData = null;
  try {
    businessCardData = businessCardItem?.businessCardData ? JSON.parse(businessCardItem.businessCardData) : null;
  } catch (error) {
    console.error('Error parsing business card data:', error);
    businessCardData = null;
  }
  
  const personName = businessCardData?.name || folder?.personName || "이름 없음";
  
  // Check if contact is a registered user (enhanced with business card verification)
  const isRegisteredUser = businessCardData?.isRegisteredUser || 
                           businessCardData?.canSendDM || 
                           folder?.contact?.contactUserId !== null;
  
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
    if (isRegisteredUser && businessCardData?.registeredUserId) {
      // Navigate to DM with verified registered user
      console.log('Opening DM with verified user:', {
        userId: businessCardData.registeredUserId,
        userName: businessCardData.registeredUserDisplayName,
        name: businessCardData.name
      });
      // TODO: Navigate to chat with the registered user ID
    } else {
      // Show non-registered user message
      alert('Dovie 이용자가 아닙니다');
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
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="p-1"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
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
      <div className="flex-1 overflow-y-auto">
        {/* LinkedIn-style Profile Header */}
        <div className="bg-white">
          {/* Cover Photo */}
          <div className="h-32 bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 relative">
            <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-black/20 to-transparent"></div>
          </div>
          
          {/* Profile Info */}
          <div className="px-4 pb-4">
            {/* Avatar */}
            <div className="relative -mt-16 mb-4">
              <div className="w-24 h-24 bg-white rounded-full border-4 border-white shadow-lg flex items-center justify-center">
                <User className="w-12 h-12 text-gray-400" />
              </div>
            </div>
            
            {/* Name and Title */}
            <div className="mb-4">
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl font-bold text-gray-900">
                  {personName}
                </h1>
              </div>
              <p className="text-lg text-gray-700 mb-1">
                {businessCardData?.jobTitle || "직책 정보 없음"}
              </p>
              <p className="text-base text-blue-600 font-medium mb-2">
                {businessCardData?.company || "회사 정보 없음"}
              </p>
              {businessCardData?.address && (
                <p className="text-sm text-gray-600 flex items-center">
                  <MapPin className="w-4 h-4 mr-1" />
                  {businessCardData.address}
                </p>
              )}
            </div>
            
            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2 mb-4">
              <Button
                onClick={handleDM}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                DM 보내기
              </Button>
              <Button
                onClick={handleCall}
                disabled={!businessCardData?.phone}
                variant="outline"
                className="px-4"
              >
                <Phone className="w-4 h-4" />
              </Button>
              <Button
                onClick={handleEmail}
                disabled={!businessCardData?.email}
                variant="outline"
                className="px-4"
              >
                <Mail className="w-4 h-4" />
              </Button>
              <Button
                onClick={handleVideoCall}
                disabled={!isRegisteredUser}
                variant="outline"
                className="px-4"
              >
                <Video className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Contact Information Card */}
        <div className="bg-white mt-2 p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">연락처 정보</h3>
          <div className="space-y-4">
            {businessCardData?.email && (
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                  <Mail className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-500">이메일</p>
                  <p className="font-medium text-gray-900">{businessCardData.email}</p>
                </div>
              </div>
            )}
            {businessCardData?.phone && (
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                  <Phone className="w-5 h-5 text-green-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-500">전화번호</p>
                  <p className="font-medium text-gray-900">{businessCardData.phone}</p>
                </div>
              </div>
            )}
            {businessCardData?.company && (
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-purple-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-500">회사</p>
                  <p className="font-medium text-gray-900">{businessCardData.company}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Business Card Section - Enhanced Design */}
        {businessCardItem?.fileUrl && (
          <div className="bg-white mt-2 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl flex items-center justify-center">
                  <CreditCard className="w-4 h-4 text-white" />
                </div>
                명함
              </h3>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-sm text-gray-500">디지털 명함</span>
              </div>
            </div>
            
            {/* Business Card Display with Enhanced Visual Design */}
            <div className="relative">
              {/* Decorative Background */}
              <div className="absolute inset-0 bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 rounded-3xl opacity-60"></div>
              <div className="absolute top-4 right-4 w-20 h-20 bg-gradient-to-br from-purple-200 to-blue-200 rounded-full opacity-20"></div>
              <div className="absolute bottom-6 left-6 w-12 h-12 bg-gradient-to-br from-blue-200 to-indigo-200 rounded-full opacity-30"></div>
              
              {/* Main Card Container */}
              <div className="relative bg-white rounded-3xl p-6 shadow-lg border border-gray-100">
                <div 
                  className="relative cursor-pointer group overflow-hidden rounded-2xl bg-gradient-to-br from-gray-50 to-gray-100 p-4 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
                  onClick={() => {
                    if (businessCardItem?.fileUrl) {
                      const link = document.createElement('a');
                      link.href = businessCardItem.fileUrl;
                      link.target = '_blank';
                      link.click();
                    }
                  }}
                >
                  {/* Business Card Image */}
                  <div className="relative bg-white rounded-xl p-3 shadow-sm">
                    <img
                      src={businessCardItem.fileUrl!}
                      alt="명함"
                      className="w-full h-auto rounded-lg transition-all duration-300 group-hover:scale-105"
                      style={{ maxHeight: '220px', objectFit: 'contain' }}
                    />
                    
                    {/* Hover Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-600/0 via-blue-600/0 to-indigo-600/0 group-hover:from-purple-600/10 group-hover:via-blue-600/5 group-hover:to-indigo-600/10 transition-all duration-300 rounded-xl flex items-center justify-center">
                      <div className="opacity-0 group-hover:opacity-100 transition-all duration-300 transform scale-90 group-hover:scale-100">
                        <div className="bg-white/90 backdrop-blur-sm rounded-full p-3 shadow-lg border border-white/20">
                          <Eye className="w-5 h-5 text-gray-700" />
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Card Info Badge */}
                  <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm rounded-full px-3 py-1 shadow-sm border border-white/20">
                    <span className="text-xs font-medium text-gray-600">고화질</span>
                  </div>
                </div>
                
                {/* Action Buttons with Enhanced Design */}
                <div className="flex gap-3 mt-6">
                  <Button 
                    variant="outline" 
                    size="lg" 
                    className="flex-1 h-12 border-2 border-purple-200 text-purple-700 hover:bg-purple-50 hover:border-purple-300 font-medium transition-all duration-200 rounded-xl"
                    onClick={() => {
                      if (businessCardItem?.fileUrl) {
                        const link = document.createElement('a');
                        link.href = businessCardItem.fileUrl;
                        link.target = '_blank';
                        link.click();
                      }
                    }}
                  >
                    <Eye className="w-5 h-5 mr-2" />
                    크게보기
                  </Button>
                  <Button 
                    variant="outline" 
                    size="lg" 
                    className="flex-1 h-12 border-2 border-blue-200 text-blue-700 hover:bg-blue-50 hover:border-blue-300 font-medium transition-all duration-200 rounded-xl"
                    onClick={() => {
                      if (businessCardItem?.fileUrl) {
                        const link = document.createElement('a');
                        link.href = businessCardItem.fileUrl;
                        link.download = `${personName}_명함.jpg`;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                      }
                    }}
                  >
                    <Download className="w-5 h-5 mr-2" />
                    저장하기
                  </Button>
                </div>
                
                {/* Additional Info */}
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-gray-500">
                      <div className="w-1.5 h-1.5 bg-gray-400 rounded-full"></div>
                      <span>AI로 스캔됨</span>
                    </div>
                    <div className="text-gray-400">
                      {new Date().toLocaleDateString('ko-KR')}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Shared Files Section */}
        <div className="bg-white mt-2 p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">공유 파일</h3>
          {sharedFiles.length > 0 ? (
            <div className="space-y-3">
              {sharedFiles.map((file) => (
                <div key={file.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center">
                      {file.itemType === 'image' && <Image className="w-5 h-5 text-purple-500" />}
                      {file.itemType === 'audio' && <Mic className="w-5 h-5 text-orange-500" />}
                      {file.itemType === 'document' && <FileText className="w-5 h-5 text-green-500" />}
                      {file.itemType === 'chat_file' && <MessageCircle className="w-5 h-5 text-indigo-500" />}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 text-sm">{file.title}</p>
                      <p className="text-xs text-gray-500">{formatDate(file.createdAt)}</p>
                    </div>
                  </div>
                  <Button size="sm" variant="ghost">
                    <Download className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <FileText className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-gray-500 text-sm">공유된 파일이 없습니다</p>
              <p className="text-xs text-gray-400">DM에서 파일을 공유하면 여기에 표시됩니다</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}