import { useState, useMemo, useCallback, CSSProperties } from "react";
import { useLocation, useRoute } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft, UserPlus, Search, MoreHorizontal, MessageSquare, Image as ImageIcon, FileText, Link as LinkIcon, FileImage, FileVideo, FileAudio, FileCode, File, Loader2 } from "lucide-react";
import { FixedSizeGrid, FixedSizeList } from 'react-window';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";

import ScrollIndicator from "@/components/ScrollIndicator";
import { FilePreviewModal } from "@/components/FilePreviewModal";
import { LazyImage } from "@/components/LazyImage";
import { isImageFile, isVideoFile, getFileType, getFileName, type FileType } from "@/lib/fileUtils";
import { cn } from "@/lib/utils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

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
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState("media");
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

  // Fetch all chat rooms to find existing DM
  const { data: chatRoomsData, isLoading: chatRoomsLoading } = useQuery<{ chatRooms: any[] }>({
    queryKey: ["/api/chat-rooms"],
    enabled: !!user,
  });

  // Mutation to create a new chat room
  const createChatRoomMutation = useMutation({
    mutationFn: async (participantId: number) => {
      const chatName = (userProfile as any)?.displayName || "친구";
      const response = await apiRequest("/api/chat-rooms", "POST", {
        name: chatName,
        participantIds: [participantId],
        isGroup: false,
      });
      if (!response.ok) throw new Error("Failed to create chat room");
      return response.json();
    },
  });

  // Function to find or create direct chat room and navigate to it
  const handleMessageClick = useCallback(async () => {
    if (!userId || !user) return;
    
    // Wait for chat rooms to load before proceeding
    if (chatRoomsLoading || !chatRoomsData) return;
    
    // Prevent duplicate creation attempts
    if (createChatRoomMutation.isPending) return;

    const friendId = Number(userId);
    const chatRooms = chatRoomsData.chatRooms || [];

    // Find existing 1-on-1 chat room with this friend
    const existingDM = chatRooms.find((room: any) => {
      if (room.isGroup) return false;
      
      // Check if participants are exactly current user and friend
      const participantIds = room.participants?.map((p: any) => p.userId).sort();
      const expectedIds = [user.id, friendId].sort();
      
      return (
        participantIds?.length === 2 &&
        participantIds[0] === expectedIds[0] &&
        participantIds[1] === expectedIds[1]
      );
    });

    if (existingDM) {
      // Navigate to existing chat room
      setLocation(`/chat-rooms/${existingDM.id}`);
    } else {
      // Create new chat room and navigate to it
      try {
        const result = await createChatRoomMutation.mutateAsync(friendId);
        const chatRoomId = result?.chatRoom?.id || result?.id;
        
        if (chatRoomId) {
          // Invalidate chat rooms cache to keep it in sync
          queryClient.invalidateQueries({ queryKey: ["/api/chat-rooms"] });
          setLocation(`/chat-rooms/${chatRoomId}`);
        } else {
          toast({
            title: "오류",
            description: "대화방을 열 수 없습니다.",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error("Failed to create chat room:", error);
        toast({
          title: "오류",
          description: "대화방 생성에 실패했습니다.",
          variant: "destructive",
        });
      }
    }
  }, [userId, user, chatRoomsData, chatRoomsLoading, setLocation, createChatRoomMutation, toast]);

  if (!match || !userId) {
    setLocation("/");
    return null;
  }

  const friendName = (userProfile as any)?.displayName || "친구";
  const friendProfilePicture = (userProfile as any)?.profilePicture;

  // Memoize filtered media files to prevent recalculation on every render
  const mediaFiles = useMemo(() => {
    return sharedMedia.filter(m => {
      if (!m.fileUrl) return false;
      if (m.messageType === 'voice') return false;
      return isImageFile(m.fileUrl) || isVideoFile(m.fileUrl);
    });
  }, [sharedMedia]);
  
  // Memoize media files without failed images for virtualized grid
  const validMediaFiles = useMemo(() => {
    return mediaFiles.filter(f => !failedImages.has(f.id));
  }, [mediaFiles, failedImages]);
  
  // Memoize document files
  const documentFiles = useMemo(() => {
    return sharedMedia.filter(m => {
      if (!m.fileUrl) return false;
      const isMedia = isImageFile(m.fileUrl) || isVideoFile(m.fileUrl);
      if (m.messageType === 'voice') return false;
      return !isMedia && m.messageType !== 'text';
    });
  }, [sharedMedia]);
  
  // Memoize link files
  const linkFiles = useMemo(() => {
    return sharedMedia.filter(m => {
      if (!m.fileUrl) return false;
      const isMedia = isImageFile(m.fileUrl) || isVideoFile(m.fileUrl);
      const isDocument = !isMedia && m.messageType !== 'text';
      return m.messageType === 'text' && m.fileUrl.startsWith('http') && !isMedia && !isDocument;
    });
  }, [sharedMedia]);

  // Memoize file icon function
  const getFileIcon = useCallback((fileType: FileType, className: string = "h-8 w-8") => {
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
  }, []);

  // Loading skeleton UI
  if (userLoading) {
    return (
      <div className="bg-gradient-to-br from-gray-50 to-white min-h-screen">
        <div className="w-full pb-8">
          {/* Header Skeleton */}
          <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm border-b border-gray-100 px-4 pt-safe pb-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-10 w-10 rounded-full" />
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-10 w-10 rounded-full" />
            </div>
          </div>

          {/* Profile Header Skeleton */}
          <div className="px-4 py-5 bg-white">
            <div className="text-center">
              <Skeleton className="w-20 h-20 mx-auto mb-3 rounded-full" />
              <Skeleton className="h-7 w-32 mx-auto mb-2" />
              <Skeleton className="h-4 w-24 mx-auto mb-4" />
              
              {/* Action Buttons Skeleton */}
              <div className="grid grid-cols-3 gap-2 px-2 mb-5">
                <Skeleton className="h-[60px] rounded-lg" />
                <Skeleton className="h-[60px] rounded-lg" />
                <Skeleton className="h-[60px] rounded-lg" />
              </div>
            </div>
          </div>

          {/* Tabs Skeleton */}
          <div className="px-4">
            <div className="flex gap-2 mb-4">
              <Skeleton className="h-9 flex-1" />
              <Skeleton className="h-9 flex-1" />
              <Skeleton className="h-9 flex-1" />
            </div>
            
            {/* Content Grid Skeleton */}
            <div className="grid grid-cols-3 gap-2">
              {Array.from({ length: 9 }).map((_, i) => (
                <Skeleton key={i} className="aspect-square rounded-lg" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-gray-50 to-white">
      <ScrollIndicator />
      
      <div className="w-full pb-8">
      {/* Header - iOS safe area optimized */}
      <div
        className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm border-b border-gray-100 px-4 pt-safe pb-3"
      >
        <div className="flex items-center justify-between">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setLocation("/app")}
            className="p-2 hover:bg-gray-100 rounded-full min-h-[44px] min-w-[44px] flex items-center justify-center"
            data-testid="button-back"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          
          <h1 className="font-medium text-base text-gray-900">프로필</h1>
          
          <Button 
            variant="ghost" 
            size="sm" 
            className="p-2 hover:bg-gray-100 rounded-full min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <MoreHorizontal className="w-5 h-5" />
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
          <div className="grid grid-cols-3 gap-2 px-2 mb-5">
            <Button 
              variant="outline" 
              size="sm" 
              className="flex flex-col items-center py-3 px-2 h-auto border-gray-200 hover:bg-gray-50 min-h-[60px]"
              onClick={handleMessageClick}
              disabled={chatRoomsLoading || createChatRoomMutation.isPending}
              data-testid="button-message"
            >
              {chatRoomsLoading || createChatRoomMutation.isPending ? (
                <>
                  <Loader2 className="w-5 h-5 mb-1.5 animate-spin" />
                  <span className="text-xs font-medium">로딩중...</span>
                </>
              ) : (
                <>
                  <MessageSquare className="w-5 h-5 mb-1.5" />
                  <span className="text-xs font-medium">메시지</span>
                </>
              )}
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="flex flex-col items-center py-3 px-2 h-auto border-gray-200 hover:bg-gray-50 min-h-[60px]"
              data-testid="button-add-friend"
            >
              <UserPlus className="w-5 h-5 mb-1.5" />
              <span className="text-xs font-medium">친구 추가</span>
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="flex flex-col items-center py-3 px-2 h-auto border-gray-200 hover:bg-gray-50 min-h-[60px]"
              data-testid="button-search"
            >
              <Search className="w-5 h-5 mb-1.5" />
              <span className="text-xs font-medium">검색</span>
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
              <FixedSizeGrid
                columnCount={3}
                columnWidth={120}
                height={600}
                rowCount={Math.ceil(validMediaFiles.length / 3)}
                rowHeight={120}
                width={376}
                className="mx-auto"
              >
                {({ columnIndex, rowIndex, style }: { columnIndex: number; rowIndex: number; style: CSSProperties }) => {
                  const index = rowIndex * 3 + columnIndex;
                  const file = validMediaFiles[index];
                  
                  if (!file) return null;
                  
                  const isImage = isImageFile(file.fileUrl);
                  
                  return (
                    <div
                      style={{
                        ...style,
                        padding: '4px',
                      }}
                    >
                      <div
                        className="w-full h-full bg-gray-100 rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => {
                          setSelectedFile({ 
                            url: file.fileUrl, 
                            name: getFileName(file.fileUrl)
                          });
                        }}
                      >
                        {isImage ? (
                          <LazyImage
                            src={file.fileUrl}
                            alt="Shared media"
                            className="w-full h-full object-cover rounded-lg"
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
                    </div>
                  );
                }}
              </FixedSizeGrid>
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
              <FixedSizeList
                height={600}
                itemCount={documentFiles.length}
                itemSize={68}
                width="100%"
              >
                {({ index, style }: { index: number; style: CSSProperties }) => {
                  const file = documentFiles[index];
                  const fileType = getFileType(file.fileUrl);
                  const fileName = getFileName(file.fileUrl);
                  const canPreview = ['pdf', 'document', 'spreadsheet', 'presentation', 'text', 'code'].includes(fileType);
                  
                  return (
                    <div style={style}>
                      <div
                        className="flex items-center gap-3 p-3 mx-4 mb-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
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
                    </div>
                  );
                }}
              </FixedSizeList>
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
              <FixedSizeList
                height={600}
                itemCount={linkFiles.length}
                itemSize={68}
                width="100%"
              >
                {({ index, style }: { index: number; style: CSSProperties }) => {
                  const file = linkFiles[index];
                  
                  return (
                    <div style={style}>
                      <a
                        href={file.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-3 mx-4 mb-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
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
                    </div>
                  );
                }}
              </FixedSizeList>
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
    </div>
  );
}