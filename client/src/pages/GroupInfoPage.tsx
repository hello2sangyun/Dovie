import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowLeft, 
  Image as ImageIcon, 
  FileText, 
  Link as LinkIcon,
  Users,
  MoreHorizontal,
  MessageSquare,
  Camera,
  Edit2
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { LazyImage } from "@/components/LazyImage";

type ChatRoom = {
  id: number;
  name: string;
  isGroup: boolean;
  profileImage?: string;
  createdBy: number;
};

type User = {
  id: number;
  username: string;
  displayName: string;
  profilePicture?: string;
  isOnline: boolean;
};

type Message = {
  id: number;
  content: string | null;
  fileUrl: string | null;
  messageType: string;
  createdAt: string;
};

export default function GroupInfoPage() {
  const { chatRoomId } = useParams();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState("media");
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // Edit states
  const [showNameEditDialog, setShowNameEditDialog] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch chat room info
  const { data: chatRoom, isLoading: chatRoomLoading, isError: chatRoomError, refetch: refetchChatRoom } = useQuery({
    queryKey: [`/api/chat-rooms/${chatRoomId}`],
    enabled: !!chatRoomId,
  }) as { data?: ChatRoom; isLoading: boolean; isError: boolean; refetch: () => void };

  // Fetch participants
  const { data: participantsData, isLoading: participantsLoading, isError: participantsError, refetch: refetchParticipants } = useQuery({
    queryKey: [`/api/chat-rooms/${chatRoomId}/participants`],
    enabled: !!chatRoomId,
  }) as { data?: { participants: User[] }; isLoading: boolean; isError: boolean; refetch: () => void };

  const participants = participantsData?.participants || [];

  // Fetch messages for shared content
  const { data: messagesData, isLoading: messagesLoading } = useQuery({
    queryKey: ["/api/chat-rooms", chatRoomId, "messages"],
    queryFn: async () => {
      const response = await apiRequest(`/api/chat-rooms/${chatRoomId}/messages?limit=30&offset=0`, "GET");
      if (!response.ok) throw new Error('Failed to fetch messages');
      return response.json();
    },
    enabled: !!chatRoomId,
  }) as { data?: { messages: Message[] }; isLoading: boolean };

  const messages = messagesData?.messages || [];

  // Update group name mutation
  const updateNameMutation = useMutation({
    mutationFn: async (name: string) => {
      const response = await apiRequest(`/api/chat-rooms/${chatRoomId}/name`, "PUT", { name });
      if (!response.ok) throw new Error('Failed to update group name');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/chat-rooms/${chatRoomId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/chat-rooms"] });
      toast({
        title: "그룹 이름 변경됨",
        description: "그룹 이름이 성공적으로 변경되었습니다.",
      });
      setShowNameEditDialog(false);
    },
    onError: () => {
      toast({
        title: "오류",
        description: "그룹 이름 변경에 실패했습니다.",
        variant: "destructive",
      });
    },
  });

  // Update profile image mutation
  const updateProfileImageMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('profileImage', file);
      
      const response = await fetch(`/api/chat-rooms/${chatRoomId}/profile-image`, {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) throw new Error('Failed to update profile image');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/chat-rooms/${chatRoomId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/chat-rooms"] });
      toast({
        title: "프로필 사진 변경됨",
        description: "프로필 사진이 성공적으로 변경되었습니다.",
      });
    },
    onError: () => {
      toast({
        title: "오류",
        description: "프로필 사진 변경에 실패했습니다.",
        variant: "destructive",
      });
    },
  });

  // Handlers
  const handleNameEdit = () => {
    setNewGroupName(chatRoom?.name || "");
    setShowNameEditDialog(true);
  };

  const handleNameSave = () => {
    if (newGroupName.trim()) {
      updateNameMutation.mutate(newGroupName.trim());
    }
  };

  const handleProfileImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      updateProfileImageMutation.mutate(file);
    }
  };

  // Helper function to check if file is an image
  const isImageFile = (fileUrl: string) => {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'];
    const cleanUrl = fileUrl.split('?')[0].toLowerCase();
    return imageExtensions.some(ext => cleanUrl.endsWith(ext));
  };

  // Helper function to check if file is a video
  const isVideoFile = (fileUrl: string) => {
    const videoExtensions = ['.mp4', '.webm', '.mov', '.avi', '.mkv'];
    const cleanUrl = fileUrl.split('?')[0].toLowerCase();
    return videoExtensions.some(ext => cleanUrl.endsWith(ext));
  };

  // Extract URLs from messages
  const extractUrls = (text: string | null): string[] => {
    if (!text) return [];
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.match(urlRegex) || [];
  };

  // Filter messages by type
  const mediaFiles = messages.filter(m => m.fileUrl && (isImageFile(m.fileUrl) || isVideoFile(m.fileUrl)));
  const documentFiles = messages.filter(m => m.fileUrl && !isImageFile(m.fileUrl) && !isVideoFile(m.fileUrl));
  const linkMessages = messages.filter(m => m.content && extractUrls(m.content).length > 0);

  // Error and loading state handling
  const isError = chatRoomError || participantsError;
  const isLoading = chatRoomLoading || participantsLoading || messagesLoading;
  
  // Error state UI
  if (isError) {
    return (
      <div className="bg-gradient-to-br from-gray-50 to-white min-h-screen">
        <div className="w-full pb-8">
          {/* Header */}
          <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm border-b border-gray-100 px-4 pt-safe pb-3">
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.history.back()}
                className="p-2 hover:bg-gray-100 rounded-full min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-label="뒤로 가기"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <h1 className="font-medium text-base text-gray-900">그룹 정보</h1>
              <div className="w-10" />
            </div>
          </div>

          {/* Error Message */}
          <div className="flex flex-col items-center justify-center px-4 py-20">
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">정보를 불러올 수 없습니다</h2>
            <p className="text-sm text-gray-600 text-center mb-6">
              네트워크 연결을 확인하거나<br/>잠시 후 다시 시도해주세요
            </p>
            <Button 
              onClick={() => {
                if (chatRoomError) refetchChatRoom();
                if (participantsError) refetchParticipants();
              }}
              className="min-h-[44px]"
            >
              다시 시도
            </Button>
          </div>
        </div>
      </div>
    );
  }
  
  if (isLoading) {
    return (
      <div className="bg-gradient-to-br from-gray-50 to-white min-h-screen">
        <div className="w-full pb-8">
          {/* Header Skeleton */}
          <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm border-b border-gray-100 px-4 pt-safe pb-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-10 w-10 rounded-full" />
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-10 w-10 rounded-full" />
            </div>
          </div>

          {/* Profile Header Skeleton */}
          <div className="px-4 py-5 bg-white">
            <div className="text-center">
              <Skeleton className="w-20 h-20 mx-auto mb-3 rounded-full" />
              <Skeleton className="h-7 w-40 mx-auto mb-2" />
              <Skeleton className="h-4 w-28 mx-auto mb-4" />
              
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
      {/* Header - iOS safe area optimized */}
      <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm border-b border-gray-100 px-4 pt-safe pb-3">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.history.back()}
            className="p-2 hover:bg-gray-100 rounded-full min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="뒤로 가기"
            data-testid="button-back"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          
          <h1 className="font-medium text-base text-gray-900">그룹 정보</h1>
          
          <Button
            variant="ghost"
            size="sm"
            className="p-2 hover:bg-gray-100 rounded-full min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="더보기 옵션"
          >
            <MoreHorizontal className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Hidden file input for profile image */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleProfileImageChange}
      />

      {/* Profile Header */}
      <div className="px-4 py-5 bg-white">
        <div className="text-center">
          {/* Profile Image */}
          <div className="relative w-20 h-20 mx-auto mb-3 group">
            {/* Camera overlay button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-0 hover:bg-opacity-40 rounded-full transition-all duration-200 z-10 group"
              disabled={updateProfileImageMutation.isPending}
              data-testid="button-change-profile-image"
            >
              <Camera className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
            {chatRoom?.profileImage ? (
              <Avatar className="w-20 h-20 shadow-md">
                <AvatarImage src={chatRoom.profileImage} />
                <AvatarFallback className="bg-blue-100 text-blue-600 text-xl font-bold">
                  {chatRoom.name[0]}
                </AvatarFallback>
              </Avatar>
            ) : participants.length > 0 ? (
              <div className="relative w-20 h-20 flex items-center justify-center">
                {participants.slice(0, 2).map((participant, index) => {
                  const horizontalPositions = [
                    { top: '50%', left: '0px', transform: 'translateY(-50%)' },
                    { top: '50%', right: '0px', transform: 'translateY(-50%)' }
                  ];
                  
                  const position = horizontalPositions[index];
                  
                  return (
                    <div
                      key={participant.id}
                      className="absolute border-2 border-white rounded-full shadow-md"
                      style={{
                        ...position,
                        zIndex: 2 - index
                      }}
                    >
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={participant.profilePicture || undefined} />
                        <AvatarFallback className="bg-gradient-to-br from-purple-400 to-blue-400 text-white text-sm font-bold">
                          {participant.displayName[0]}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                  );
                })}
                {participants.length > 2 && (
                  <div 
                    className="absolute bottom-0 right-0 bg-purple-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center font-bold shadow-md border-2 border-white"
                    style={{ zIndex: 3 }}
                  >
                    +{participants.length - 2}
                  </div>
                )}
              </div>
            ) : (
              <Avatar className="w-20 h-20 shadow-md">
                <AvatarFallback className="bg-blue-100 text-blue-600 text-xl font-bold">
                  <Users className="w-8 h-8" />
                </AvatarFallback>
              </Avatar>
            )}
          </div>
          
          {/* Group Name */}
          <div className="relative">
            <div className="flex items-center justify-center gap-2 mb-1">
              <h2 className="text-xl font-bold text-gray-900">{chatRoom?.name || "그룹 채팅"}</h2>
              <button
                onClick={handleNameEdit}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                data-testid="button-edit-group-name"
              >
                <Edit2 className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-4">멤버 {participants.length}명 • 공유 파일</p>
          </div>
          
          {/* Action Buttons - Mobile Optimized */}
          <div className="grid grid-cols-3 gap-2 px-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="flex flex-col items-center py-3 px-2 h-auto border-gray-200 hover:bg-gray-50 min-h-[60px]"
              onClick={() => navigate(`/chat-rooms/${chatRoomId}`)}
              data-testid="button-message"
            >
              <MessageSquare className="w-5 h-5 mb-1.5" />
              <span className="text-xs font-medium">메시지</span>
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="flex flex-col items-center py-3 px-2 h-auto border-gray-200 hover:bg-gray-50 min-h-[60px]"
              onClick={() => {
                const participantsSection = document.getElementById('participants-section');
                participantsSection?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
              data-testid="button-participants"
            >
              <Users className="w-5 h-5 mb-1.5" />
              <span className="text-xs font-medium">참여자</span>
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="flex flex-col items-center py-3 px-2 h-auto border-gray-200 hover:bg-gray-50 min-h-[60px]"
              data-testid="button-settings"
            >
              <MoreHorizontal className="w-5 h-5 mb-1.5" />
              <span className="text-xs font-medium">설정</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Participants Section */}
      <div id="participants-section" className="px-4 py-4 bg-white mb-2">
        <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
          <Users className="w-4 h-4 mr-2 text-purple-600" />
          참여자 {participants.length}명
        </h3>
        <div className="space-y-2">
          {participants.map((participant) => (
            <div
              key={participant.id}
              className="flex items-center justify-between py-2 px-3 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer"
              onClick={() => navigate(`/profile/${participant.id}`)}
              data-testid={`participant-${participant.id}`}
            >
              <div className="flex items-center space-x-3 flex-1 min-w-0">
                <div className="relative flex-shrink-0">
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={participant.profilePicture || undefined} />
                    <AvatarFallback className="bg-gradient-to-br from-purple-400 to-blue-400 text-white font-bold">
                      {participant.displayName[0]}
                    </AvatarFallback>
                  </Avatar>
                  {participant.isOnline && (
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{participant.displayName}</p>
                  <p className="text-xs text-gray-500 truncate">@{participant.username}</p>
                </div>
              </div>
              <div className="flex-shrink-0">
                {participant.isOnline ? (
                  <span className="text-xs text-green-600 font-medium">온라인</span>
                ) : (
                  <span className="text-xs text-gray-400">오프라인</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Content Tabs */}
      <div className="px-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-4 min-h-[44px]">
            <TabsTrigger value="media" className="text-xs py-2" data-testid="tab-media">
              <ImageIcon className="h-3 w-3 mr-1 inline" />
              미디어
            </TabsTrigger>
            <TabsTrigger value="files" className="text-xs py-2" data-testid="tab-files">
              <FileText className="h-3 w-3 mr-1 inline" />
              파일
            </TabsTrigger>
            <TabsTrigger value="links" className="text-xs py-2" data-testid="tab-links">
              <LinkIcon className="h-3 w-3 mr-1 inline" />
              링크
            </TabsTrigger>
          </TabsList>

          {/* Media Tab */}
          <TabsContent value="media" className="space-y-4">
            {mediaFiles.length > 0 ? (
              <div className="grid grid-cols-3 gap-2">
                {mediaFiles.map((file) => (
                  <div
                    key={file.id}
                    className="aspect-square bg-gray-100 rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
                    data-testid={`media-item-${file.id}`}
                  >
                    <LazyImage
                      src={file.fileUrl || ''}
                      alt="Shared media"
                      className="w-full h-full object-cover rounded-lg"
                    />
                  </div>
                ))}
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
                {documentFiles.map((file) => (
                  <a
                    key={file.id}
                    href={file.fileUrl || ''}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    data-testid={`file-item-${file.id}`}
                  >
                    <FileText className="h-5 w-5 text-purple-600" />
                    <span className="text-sm text-gray-700 flex-1 truncate">
                      {file.fileUrl?.split('/').pop() || 'File'}
                    </span>
                  </a>
                ))}
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
            {linkMessages.length > 0 ? (
              <div className="space-y-2">
                {linkMessages.map((msg) => {
                  const urls = extractUrls(msg.content);
                  return urls.map((url, idx) => (
                    <a
                      key={`${msg.id}-${idx}`}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                      data-testid={`link-item-${msg.id}-${idx}`}
                    >
                      <LinkIcon className="h-5 w-5 text-blue-600" />
                      <span className="text-sm text-blue-600 flex-1 truncate">
                        {url}
                      </span>
                    </a>
                  ));
                })}
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

      {/* Edit Group Name Dialog */}
      <Dialog open={showNameEditDialog} onOpenChange={setShowNameEditDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>그룹 이름 변경</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Input
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              placeholder="새로운 그룹 이름을 입력하세요"
              className="min-h-[44px]"
              maxLength={50}
              data-testid="input-group-name"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !updateNameMutation.isPending) {
                  handleNameSave();
                }
              }}
            />
            <p className="text-xs text-gray-500">{newGroupName.length}/50 자</p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowNameEditDialog(false)}
              className="min-h-[44px]"
              data-testid="button-cancel-name-edit"
            >
              취소
            </Button>
            <Button
              onClick={handleNameSave}
              disabled={!newGroupName.trim() || updateNameMutation.isPending}
              className="min-h-[44px]"
              data-testid="button-save-name"
            >
              {updateNameMutation.isPending ? "저장 중..." : "저장"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
