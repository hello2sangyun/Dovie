import { useState, useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { ArrowLeft, Phone, Video, UserPlus, Search, MoreHorizontal, MessageSquare, Image as ImageIcon, FileText, Link as LinkIcon, FileImage, FileVideo, FileAudio, FileCode, File } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";

import ScrollIndicator from "@/components/ScrollIndicator";
import { CallModal } from "@/components/CallModal";
import { useToast } from "@/hooks/use-toast";
import { FilePreviewModal } from "@/components/FilePreviewModal";
import { isImageFile, isVideoFile, getFileType, getFileName, type FileType } from "@/lib/fileUtils";
import { cn } from "@/lib/utils";

interface SharedMediaFile {
  id: number;
  fileUrl: string;
  messageType: string;
  createdAt: string;
}

export default function FriendProfilePage() {
  const [, setLocation] = useLocation();
  const [matchFriend, paramsFriend] = useRoute("/friend/:userId");
  const [matchProfile, paramsProfile] = useRoute("/profile/:userId");
  const match = matchFriend || matchProfile;
  const userId = paramsFriend?.userId || paramsProfile?.userId;
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState("media");
  const [isCallModalOpen, setIsCallModalOpen] = useState(false);
  const [callChatRoomId, setCallChatRoomId] = useState<number | null>(null);
  const [selectedFile, setSelectedFile] = useState<{ url: string; name: string; size?: number } | null>(null);
  const [failedImages, setFailedImages] = useState<Set<number>>(new Set());

  // Fetch friend's user profile data
  const { data: userProfile, isLoading: userLoading } = useQuery<any>({
    queryKey: [`/api/users/${userId}/profile`],
    enabled: !!userId,
  });

  // Fetch shared media/files
  const { data: sharedMedia = [] } = useQuery<SharedMediaFile[]>({
    queryKey: [`/api/shared-media/${userId}`],
    enabled: !!userId && !!user,
  });

  // Debug logging
  console.log('🔍 FriendProfilePage Debug:', {
    match,
    userId,
    sharedMediaCount: sharedMedia.length,
    sharedMediaSample: sharedMedia.slice(0, 2),
  });

  // Fetch existing chat rooms to check if a direct chat already exists
  const { data: chatRoomsData } = useQuery({
    queryKey: ["/api/chat-rooms"],
    enabled: !!user,
  });

  // Mutation to create or find existing chat room (for messaging)
  const createChatRoomMutation = useMutation({
    mutationFn: async (friendUserId: string) => {
      const response = await apiRequest("/api/chat-rooms", "POST", {
        name: "",
        isGroup: false,
        participantIds: [parseInt(friendUserId)],
      });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat-rooms"] });
      // Navigate to the chat room
      setLocation(`/app?chat=${data.chatRoom.id}`);
    },
    onError: () => {
    },
  });

  // Mutation to create or find existing chat room (for calling - no navigation)
  const getOrCreateChatRoomForCall = useMutation({
    mutationFn: async (friendUserId: string) => {
      const response = await apiRequest("/api/chat-rooms", "POST", {
        name: "",
        isGroup: false,
        participantIds: [parseInt(friendUserId)],
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat-rooms"] });
    },
    onError: (error) => {
      console.error('Failed to create chat room for call:', error);
      toast({
        title: "통화 연결 실패",
        description: "채팅방을 생성하지 못했습니다. 다시 시도해주세요.",
        variant: "destructive"
      });
    },
  });

  // Function to handle message button click
  const handleMessageClick = () => {
    if (!userId || !user) return;

    // Navigate to chat list with filter for this friend
    setLocation(`/app?friendFilter=${userId}`);
  };

  // Function to handle call button click (get or create chat room)
  const handleCallClick = async () => {
    if (!userId || !user) return;

    try {
      // Check if a direct chat room already exists
      const existingRoom = (chatRoomsData as any)?.chatRooms?.find((room: any) => 
        !room.isGroup && 
        room.participants?.some((p: any) => p.id === parseInt(userId)) &&
        room.participants?.some((p: any) => p.id === user.id)
      );

      if (existingRoom) {
        // Use existing chat room
        setCallChatRoomId(existingRoom.id);
        setIsCallModalOpen(true);
      } else {
        // Create new chat room (without navigation)
        const data = await getOrCreateChatRoomForCall.mutateAsync(userId);
        setCallChatRoomId(data.chatRoom.id);
        setIsCallModalOpen(true);
      }
    } catch (error) {
      // Error already handled by mutation onError
      console.error('Failed to get/create chat room for call:', error);
    }
  };

  if (!match || !userId) {
    setLocation("/");
    return null;
  }

  const friendName = (userProfile as any)?.displayName || "친구";
  const friendProfilePicture = (userProfile as any)?.profilePicture;

  // Filter shared media into categories (exclude voice messages from media tab)
  const mediaFiles = sharedMedia.filter(m => {
    if (!m.fileUrl) return false;
    if (m.messageType === 'voice') return false;
    return isImageFile(m.fileUrl) || isVideoFile(m.fileUrl);
  });
  
  console.log('🎨 Media files:', {
    total: sharedMedia.length,
    filtered: mediaFiles.length,
    sample: mediaFiles.slice(0, 2).map(m => ({
      fileUrl: m.fileUrl,
      messageType: m.messageType,
      isImage: isImageFile(m.fileUrl),
      isVideo: isVideoFile(m.fileUrl),
    })),
  });
  
  // Documents are files that are not media (excluding voice messages)
  const documentFiles = sharedMedia.filter(m => {
    if (!m.fileUrl) return false;
    const isMedia = isImageFile(m.fileUrl) || isVideoFile(m.fileUrl);
    // Exclude voice messages from document files as well
    if (m.messageType === 'voice') return false;
    return !isMedia && m.messageType !== 'text';
  });
  
  console.log('📄 Document files:', {
    filtered: documentFiles.length,
    sample: documentFiles.slice(0, 2),
  });
  
  // Links are text messages with URLs, excluding files already classified as media or documents
  const linkFiles = sharedMedia.filter(m => {
    if (!m.fileUrl) return false;
    const isMedia = isImageFile(m.fileUrl) || isVideoFile(m.fileUrl);
    const isDocument = !isMedia && m.messageType !== 'text';
    // Only text messages with HTTP(S) URLs that aren't already classified as media or documents
    return m.messageType === 'text' && m.fileUrl.startsWith('http') && !isMedia && !isDocument;
  });

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
      case 'code':
        return <FileCode className={cn(className, "text-green-600")} />;
      default:
        return <File className={cn(className, "text-gray-600")} />;
    }
  };

  return (
    <div className="bg-gradient-to-br from-gray-50 to-white">
      <ScrollIndicator />
      
      <div className="w-full pb-8">
      {/* Header */}
      <div
        className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm border-b border-gray-100 px-3 py-2.5"
      >
        <div className="flex items-center justify-between">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setLocation("/app")}
            className="p-1.5 hover:bg-gray-100 rounded-full -ml-1"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          
          <h1 className="font-medium text-base text-gray-900">프로필</h1>
          
          <Button variant="ghost" size="sm" className="p-1.5 hover:bg-gray-100 rounded-full -mr-1">
            <MoreHorizontal className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Profile Header */}
      <div className="px-4 py-5 bg-white">
        <div className="text-center">
          <div>
            <Avatar className="w-20 h-20 mx-auto mb-3 shadow-md">
              <AvatarImage src={(userProfile as any)?.profilePicture} />
              <AvatarFallback className="bg-blue-100 text-blue-600 text-xl font-bold">
                {friendName[0]}
              </AvatarFallback>
            </Avatar>
          </div>
          
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-1">{friendName}</h2>
            <p className="text-sm text-gray-600 mb-4">공유 파일 탐색</p>
          </div>
          
          {/* Action Buttons - Mobile Optimized */}
          <div className="grid grid-cols-5 gap-1.5 px-2 mb-5">
            <Button 
              variant="outline" 
              size="sm" 
              className="flex flex-col items-center py-2.5 px-1 h-auto border-gray-200 hover:bg-gray-50"
              onClick={handleCallClick}
              disabled={getOrCreateChatRoomForCall.isPending}
              data-testid="button-call"
            >
              <Phone className="w-4 h-4 mb-1" />
              <span className="text-xs">{getOrCreateChatRoomForCall.isPending ? "연결중..." : "통화"}</span>
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="flex flex-col items-center py-2.5 px-1 h-auto border-gray-200 hover:bg-gray-50"
              onClick={handleMessageClick}
              disabled={createChatRoomMutation.isPending}
            >
              <MessageSquare className="w-4 h-4 mb-1" />
              <span className="text-xs">메시지</span>
            </Button>
            <Button variant="outline" size="sm" className="flex flex-col items-center py-2.5 px-1 h-auto border-gray-200 hover:bg-gray-50">
              <Video className="w-4 h-4 mb-1" />
              <span className="text-xs">영상</span>
            </Button>
            <Button variant="outline" size="sm" className="flex flex-col items-center py-2.5 px-1 h-auto border-gray-200 hover:bg-gray-50">
              <UserPlus className="w-4 h-4 mb-1" />
              <span className="text-xs">친구 추가</span>
            </Button>
            <Button variant="outline" size="sm" className="flex flex-col items-center py-2.5 px-1 h-auto border-gray-200 hover:bg-gray-50">
              <Search className="w-4 h-4 mb-1" />
              <span className="text-xs">검색</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Content Tabs */}
      <div className="px-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-4 h-9">
            <TabsTrigger value="media" className="text-xs py-1.5">
              <ImageIcon className="h-3 w-3 mr-1 inline" />
              미디어
            </TabsTrigger>
            <TabsTrigger value="files" className="text-xs py-1.5">
              <FileText className="h-3 w-3 mr-1 inline" />
              파일
            </TabsTrigger>
            <TabsTrigger value="links" className="text-xs py-1.5">
              <LinkIcon className="h-3 w-3 mr-1 inline" />
              링크
            </TabsTrigger>
          </TabsList>

          {/* Media Tab */}
          <TabsContent value="media" className="space-y-4">
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
                        onClick={() => {
                          setSelectedFile({ 
                            url: file.fileUrl, 
                            name: getFileName(file.fileUrl)
                          });
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

          {/* Files Tab */}
          <TabsContent value="files" className="space-y-4">
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

          {/* Links Tab */}
          <TabsContent value="links" className="space-y-4">
            {linkFiles.length > 0 ? (
              <div className="space-y-2">
                {linkFiles.map((file) => (
                  <a
                    key={file.id}
                    href={file.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
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
      
      {/* Bottom spacing for mobile scrolling */}
      <div className="h-6"></div>
      </div>

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

      {/* Call Modal */}
      {isCallModalOpen && callChatRoomId && (
        <CallModal
          isOpen={isCallModalOpen}
          onClose={() => {
            setIsCallModalOpen(false);
            setCallChatRoomId(null);
          }}
          targetUserId={parseInt(userId)}
          targetName={friendName}
          targetProfilePicture={friendProfilePicture}
          chatRoomId={callChatRoomId}
        />
      )}
    </div>
  );
}