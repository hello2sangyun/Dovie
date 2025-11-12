import { useState } from "react";
import { useLocation, useRoute } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { InstantAvatar } from "@/components/InstantAvatar";
import { AIChatAssistantModal } from "@/components/AIChatAssistantModal";
import { ImageViewerModal } from "@/components/ImageViewerModal";
import { FilePreviewModal } from "@/components/FilePreviewModal";
import { 
  ArrowLeft, 
  UserPlus, 
  MessageCircle, 
  Share2, 
  Ban, 
  Link2, 
  Sparkles,
  Image as ImageIcon,
  FileText,
  Link as LinkIcon,
  Check,
  File,
  FileCode,
  FileImage,
  FileVideo,
  FileAudio
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { isImageFile, isVideoFile, getFileType, getFileName, type FileType } from "@/lib/fileUtils";

interface UserProfile {
  id: number;
  username: string;
  displayName: string;
  profilePicture: string | null;
  isOnline: boolean;
  userRole: string;
}

interface SharedMediaFile {
  id: number;
  fileUrl: string;
  messageType: string;
  createdAt: string;
}

export default function UserProfilePage() {
  const [match, params] = useRoute("/profile/:userId");
  const userId = params?.userId;
  const [, navigate] = useLocation();
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const [showAIModal, setShowAIModal] = useState(false);
  const [activeTab, setActiveTab] = useState("media");
  
  const [selectedImage, setSelectedImage] = useState<{ url: string; name: string } | null>(null);
  const [selectedFile, setSelectedFile] = useState<{ url: string; name: string; size?: number } | null>(null);
  const [failedImages, setFailedImages] = useState<Set<number>>(new Set());

  console.log('UserProfilePage mounted', { match, userId, currentUser });

  const profileUserId = parseInt(userId || "0");
  const isOwnProfile = currentUser?.id === profileUserId;

  // Fetch user profile
  const { data: profile, isLoading: profileLoading } = useQuery<UserProfile>({
    queryKey: ['/api/users', profileUserId, 'profile'],
    queryFn: async () => {
      const response = await fetch(`/api/users/${profileUserId}/profile`);
      if (!response.ok) throw new Error('Failed to fetch profile');
      return response.json();
    },
    enabled: !!profileUserId,
  });

  // Fetch shared media/files
  const { data: sharedMedia = [] } = useQuery<SharedMediaFile[]>({
    queryKey: ['/api/shared-media', profileUserId],
    queryFn: async () => {
      const response = await fetch(`/api/shared-media/${profileUserId}`, {
        headers: {
          'x-user-id': currentUser?.id?.toString() || '',
        },
      });
      if (!response.ok) throw new Error('Failed to fetch shared media');
      return response.json();
    },
    enabled: !!profileUserId && !!currentUser,
  });

  // Check if already friends
  const { data: contactsData } = useQuery<{ contacts: any[] }>({
    queryKey: ['/api/contacts'],
    enabled: !!currentUser,
  });
  const contacts = contactsData?.contacts || [];

  // Get existing chat rooms to find the one with this user
  const { data: chatRoomsData } = useQuery<{ chatRooms: any[] }>({
    queryKey: ['/api/chat-rooms'],
    enabled: !!currentUser,
  });
  const chatRooms = chatRoomsData?.chatRooms || [];

  const isContact = contacts.some(c => c.contactUserId === profileUserId);
  const blockedContact = contacts.find(c => c.contactUserId === profileUserId);
  const isBlocked = blockedContact?.isBlocked || false;

  // Find existing chat room with this user
  const existingChatRoom = chatRooms.find(room => 
    !room.isGroup && 
    room.participants?.some((p: any) => p.id === profileUserId)
  );
  const chatRoomId = existingChatRoom?.id || 0;

  // Add friend mutation
  const addFriendMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('/api/contacts', 'POST', { contactUserId: profileUserId });
      if (!response.ok) throw new Error('Failed to add friend');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/contacts'] });
      toast({
        title: "친구 추가 완료",
        description: `${profile?.displayName}님을 친구로 추가했습니다.`,
      });
    },
    onError: () => {
      toast({
        title: "친구 추가 실패",
        description: "이미 친구이거나 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  });

  // Create chat or navigate to existing one
  const createChatMutation = useMutation({
    mutationFn: async () => {
      // If chat room already exists, just return it
      if (existingChatRoom) {
        return { chatRoom: existingChatRoom };
      }
      
      // Otherwise create a new one
      const response = await apiRequest('/api/chat-rooms', 'POST', {
        name: "",
        isGroup: false,
        participantIds: [profileUserId]
      });
      if (!response.ok) throw new Error('Failed to create chat');
      return response.json();
    },
    onSuccess: (data: any) => {
      // Invalidate chat rooms query to update cache with new room
      queryClient.invalidateQueries({ queryKey: ['/api/chat-rooms'] });
      navigate(`/chat-rooms/${data.chatRoom.id}`);
    },
  });

  // Block/Unblock mutation
  const blockMutation = useMutation({
    mutationFn: async () => {
      const endpoint = isBlocked 
        ? `/api/contacts/${profileUserId}/unblock`
        : `/api/contacts/${profileUserId}/block`;
      const response = await apiRequest(endpoint, 'POST');
      if (!response.ok) throw new Error('Failed to block/unblock contact');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/contacts'] });
      toast({
        title: isBlocked ? "차단 해제됨" : "차단됨",
        description: isBlocked 
          ? `${profile?.displayName}님의 차단을 해제했습니다.`
          : `${profile?.displayName}님을 차단했습니다.`,
      });
    },
  });

  // Share profile
  const handleShare = async () => {
    const profileUrl = `${window.location.origin}/profile/${profileUserId}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${profile?.displayName}님의 프로필`,
          text: `Dovie Messenger에서 ${profile?.displayName}님과 연결하세요`,
          url: profileUrl,
        });
      } catch (err) {
        console.log('Share cancelled');
      }
    } else {
      navigator.clipboard.writeText(profileUrl);
      toast({
        title: "링크 복사됨",
        description: "프로필 링크가 클립보드에 복사되었습니다.",
      });
    }
  };

  // Get file icon based on file type
  const getFileIcon = (fileType: FileType, className: string = "h-8 w-8") => {
    switch (fileType) {
      case 'image':
        return <FileImage className={cn(className, "text-purple-600")} />;
      case 'video':
        return <FileVideo className={cn(className, "text-purple-600")} />;
      case 'audio':
        return <FileAudio className={cn(className, "text-purple-600")} />;
      case 'pdf':
        return <FileText className={cn(className, "text-red-600")} />;
      case 'document':
        return <FileText className={cn(className, "text-blue-600")} />;
      case 'spreadsheet':
        return <FileText className={cn(className, "text-green-600")} />;
      case 'presentation':
        return <FileText className={cn(className, "text-orange-600")} />;
      case 'archive':
        return <File className={cn(className, "text-purple-600")} />;
      case 'code':
        return <FileCode className={cn(className, "text-gray-600")} />;
      case 'text':
        return <FileText className={cn(className, "text-gray-600")} />;
      default:
        return <File className={cn(className, "text-gray-600")} />;
    }
  };

  // Filter media by type using file extensions
  const mediaFiles = sharedMedia.filter(m => {
    if (!m.fileUrl) return false;
    return isImageFile(m.fileUrl) || isVideoFile(m.fileUrl);
  });
  
  const documentFiles = sharedMedia.filter(m => {
    if (!m.fileUrl) return false;
    // Files that are not images or videos (includes both local uploads and external files)
    const isMedia = isImageFile(m.fileUrl) || isVideoFile(m.fileUrl);
    return !isMedia && m.messageType !== 'text';
  });
  
  // Links are text messages with URLs, excluding files already classified as media or documents
  const linkFiles = sharedMedia.filter(m => {
    if (!m.fileUrl) return false;
    const isMedia = isImageFile(m.fileUrl) || isVideoFile(m.fileUrl);
    const isDocument = !isMedia && m.messageType !== 'text';
    // Only text messages with HTTP(S) URLs that aren't already classified as media or documents
    return m.messageType === 'text' && m.fileUrl.startsWith('http') && !isMedia && !isDocument;
  });

  if (profileLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-purple-50 to-indigo-50">
        <div className="animate-spin h-8 w-8 border-2 border-purple-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gradient-to-br from-purple-50 to-indigo-50">
        <p className="text-gray-600 mb-4">사용자를 찾을 수 없습니다</p>
        <Button onClick={() => navigate('/')}>홈으로 돌아가기</Button>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gradient-to-br from-purple-50 to-indigo-50 overflow-y-auto">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.history.back()}
            className="h-9 w-9 p-0"
            data-testid="button-back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold text-gray-900">프로필</h1>
        </div>
      </div>

      {/* Profile Section */}
      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-4">
          <div className="flex flex-col items-center text-center mb-6">
            {/* Avatar */}
            <div className="relative mb-4">
              <InstantAvatar
                src={profile.profilePicture || undefined}
                fallbackText={profile.displayName}
                size="xl"
                className="w-24 h-24 border-4 border-white shadow-lg"
                showOnlineStatus={true}
                isOnline={profile.isOnline}
              />
            </div>

            {/* User Info */}
            <h2 className="text-2xl font-bold text-gray-900 mb-1">
              {profile.displayName}
            </h2>
            <p className="text-sm text-gray-500 mb-1">@{profile.username}</p>
            {profile.userRole === 'business' && (
              <div className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded-full">
                <span>비즈니스 계정</span>
              </div>
            )}
          </div>

          {/* Share Link */}
          <div className="mb-6">
            <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
              <Link2 className="h-4 w-4 text-gray-400 flex-shrink-0" />
              <input
                type="text"
                value={`dovie.app/${profile.username}`}
                readOnly
                className="flex-1 bg-transparent text-sm text-gray-600 outline-none"
                data-testid="input-profile-link"
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/profile/${profileUserId}`);
                  toast({ title: "링크 복사됨" });
                }}
                className="h-8 px-2 text-purple-600 hover:text-purple-700"
                data-testid="button-copy-link"
              >
                복사
              </Button>
            </div>
          </div>

          {/* Action Buttons */}
          {!isOwnProfile && currentUser && (
            <div className="grid grid-cols-2 gap-3 mb-4">
              <Button
                onClick={() => addFriendMutation.mutate()}
                disabled={isContact || addFriendMutation.isPending}
                className={cn(
                  "flex items-center justify-center gap-2",
                  isContact 
                    ? "bg-gray-100 text-gray-600 hover:bg-gray-100" 
                    : "bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white"
                )}
                data-testid="button-add-friend"
              >
                {isContact ? (
                  <>
                    <Check className="h-4 w-4" />
                    <span>친구</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4" />
                    <span>친구 추가</span>
                  </>
                )}
              </Button>

              <Button
                onClick={() => createChatMutation.mutate()}
                disabled={createChatMutation.isPending}
                className="flex items-center justify-center gap-2 bg-white border-2 border-purple-500 text-purple-600 hover:bg-purple-50"
                data-testid="button-message"
              >
                <MessageCircle className="h-4 w-4" />
                <span>메시지</span>
              </Button>
            </div>
          )}

          {!isOwnProfile && currentUser && (
            <div className="grid grid-cols-3 gap-2">
              <Button
                onClick={() => setShowAIModal(true)}
                variant="outline"
                className="flex items-center justify-center gap-1 text-purple-600 border-purple-200 hover:bg-purple-50"
                data-testid="button-ai-chat"
              >
                <Sparkles className="h-4 w-4" />
                <span className="text-xs">AI 채팅</span>
              </Button>

              <Button
                onClick={handleShare}
                variant="outline"
                className="flex items-center justify-center gap-1"
                data-testid="button-share"
              >
                <Share2 className="h-4 w-4" />
                <span className="text-xs">공유</span>
              </Button>

              <Button
                onClick={() => blockMutation.mutate()}
                disabled={blockMutation.isPending}
                variant="outline"
                className={cn(
                  "flex items-center justify-center gap-1",
                  isBlocked
                    ? "text-gray-600 border-gray-200 hover:bg-gray-50"
                    : "text-red-600 border-red-200 hover:bg-red-50"
                )}
                data-testid="button-block"
              >
                <Ban className="h-4 w-4" />
                <span className="text-xs">{isBlocked ? "차단 해제" : "차단"}</span>
              </Button>
            </div>
          )}

          {/* Login prompt for non-authenticated users */}
          {!currentUser && (
            <div className="text-center py-4">
              <p className="text-sm text-gray-600 mb-3">
                이 프로필과 소통하려면 로그인하세요
              </p>
              <Button
                onClick={() => navigate('/login')}
                className="bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white"
                data-testid="button-login"
              >
                로그인
              </Button>
            </div>
          )}
        </div>

        {/* Shared Content Tabs */}
        {currentUser && (
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="w-full grid grid-cols-3 bg-gray-50 rounded-none border-b border-gray-200">
                <TabsTrigger 
                  value="media" 
                  className="data-[state=active]:bg-white data-[state=active]:text-purple-600 data-[state=active]:border-b-2 data-[state=active]:border-purple-600"
                  data-testid="tab-media"
                >
                  <ImageIcon className="h-4 w-4 mr-1" />
                  미디어
                </TabsTrigger>
                <TabsTrigger 
                  value="files"
                  className="data-[state=active]:bg-white data-[state=active]:text-purple-600 data-[state=active]:border-b-2 data-[state=active]:border-purple-600"
                  data-testid="tab-files"
                >
                  <FileText className="h-4 w-4 mr-1" />
                  파일
                </TabsTrigger>
                <TabsTrigger 
                  value="links"
                  className="data-[state=active]:bg-white data-[state=active]:text-purple-600 data-[state=active]:border-b-2 data-[state=active]:border-purple-600"
                  data-testid="tab-links"
                >
                  <LinkIcon className="h-4 w-4 mr-1" />
                  링크
                </TabsTrigger>
              </TabsList>

              <TabsContent value="media" className="p-4">
                {mediaFiles.length > 0 ? (
                  <div className="grid grid-cols-3 gap-2">
                    {mediaFiles
                      .filter((file) => !failedImages.has(file.id))
                      .map((file) => {
                        const isImage = isImageFile(file.fileUrl);
                        
                        return (
                          <div
                            key={file.id}
                            className="aspect-square bg-gray-100 rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
                            data-testid={`media-item-${file.id}`}
                            onClick={() => {
                              if (isImage) {
                                setSelectedImage({ url: file.fileUrl, name: getFileName(file.fileUrl) });
                              }
                            }}
                          >
                            {isImage ? (
                              <img
                                src={file.fileUrl}
                                alt="Shared media"
                                className="w-full h-full object-cover"
                                onError={() => {
                                  setFailedImages(prev => new Set(prev).add(file.id));
                                }}
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-purple-50">
                                <FileVideo className="h-12 w-12 text-purple-600" />
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <ImageIcon className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">공유된 미디어가 없습니다</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="files" className="p-4">
                {documentFiles.length > 0 ? (
                  <div className="space-y-2">
                    {documentFiles.map((file) => {
                      const fileType = getFileType(file.fileUrl);
                      const fileName = getFileName(file.fileUrl);
                      const canPreview = ['pdf', 'document', 'spreadsheet', 'presentation', 'text', 'code'].includes(fileType);
                      
                      return (
                        <div
                          key={file.id}
                          className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                          data-testid={`file-item-${file.id}`}
                          onClick={() => {
                            if (canPreview) {
                              setSelectedFile({ url: file.fileUrl, name: fileName });
                            } else {
                              window.open(file.fileUrl, '_blank');
                            }
                          }}
                        >
                          {getFileIcon(fileType)}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {fileName}
                            </p>
                            <p className="text-xs text-gray-500">
                              {new Date(file.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <FileText className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">공유된 파일이 없습니다</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="links" className="p-4">
                {linkFiles.length > 0 ? (
                  <div className="space-y-2">
                    {linkFiles.map((file) => (
                      <a
                        key={file.id}
                        href={file.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                        data-testid={`link-item-${file.id}`}
                      >
                        <LinkIcon className="h-8 w-8 text-blue-600" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-blue-600 truncate">
                            {file.fileUrl}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(file.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </a>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <LinkIcon className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">공유된 링크가 없습니다</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>

      {/* AI Chat Modal */}
      {showAIModal && currentUser && chatRoomId > 0 && (
        <AIChatAssistantModal
          isOpen={showAIModal}
          onClose={() => setShowAIModal(false)}
          chatRoomId={chatRoomId}
        />
      )}
      {showAIModal && currentUser && chatRoomId === 0 && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowAIModal(false)}>
          <div className="bg-white rounded-xl p-6 max-w-sm mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-2">채팅방이 없습니다</h3>
            <p className="text-sm text-gray-600 mb-4">
              AI 어시스턴트를 사용하려면 먼저 메시지를 보내 채팅을 시작하세요.
            </p>
            <Button onClick={() => {
              setShowAIModal(false);
              createChatMutation.mutate();
            }} className="w-full">
              메시지 보내기
            </Button>
          </div>
        </div>
      )}

      {/* Image Viewer Modal */}
      {selectedImage && (
        <ImageViewerModal
          isOpen={true}
          onClose={() => setSelectedImage(null)}
          imageUrl={selectedImage.url}
          fileName={selectedImage.name}
        />
      )}

      {/* File Preview Modal */}
      {selectedFile && (
        <FilePreviewModal
          isOpen={true}
          onClose={() => setSelectedFile(null)}
          fileUrl={selectedFile.url}
          fileName={selectedFile.name}
          fileSize={selectedFile.size}
        />
      )}
    </div>
  );
}
