import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  ArrowLeft, 
  Image as ImageIcon, 
  FileText, 
  Link as LinkIcon,
  Users,
  MoreHorizontal,
  MessageSquare
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

  // Fetch chat room info
  const { data: chatRoom } = useQuery({
    queryKey: [`/api/chat-rooms/${chatRoomId}`],
    enabled: !!chatRoomId,
  }) as { data?: ChatRoom };

  // Fetch participants
  const { data: participantsData } = useQuery({
    queryKey: [`/api/chat-rooms/${chatRoomId}/participants`],
    enabled: !!chatRoomId,
  }) as { data?: { participants: User[] } };

  const participants = participantsData?.participants || [];

  // Fetch messages for shared content
  const { data: messagesData } = useQuery({
    queryKey: ["/api/chat-rooms", chatRoomId, "messages"],
    queryFn: async () => {
      const response = await apiRequest(`/api/chat-rooms/${chatRoomId}/messages?limit=30&offset=0`, "GET");
      if (!response.ok) throw new Error('Failed to fetch messages');
      return response.json();
    },
    enabled: !!chatRoomId,
  }) as { data?: { messages: Message[] } };

  const messages = messagesData?.messages || [];

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
          {/* Profile Image */}
          <div className="relative w-20 h-20 mx-auto mb-3">
            {chatRoom?.profileImage ? (
              <Avatar className="w-20 h-20 shadow-md">
                <AvatarImage src={chatRoom.profileImage} />
                <AvatarFallback className="bg-blue-100 text-blue-600 text-xl font-bold">
                  {chatRoom.name[0]}
                </AvatarFallback>
              </Avatar>
            ) : (
              <Avatar className="w-20 h-20 shadow-md">
                <AvatarFallback className="bg-blue-100 text-blue-600 text-xl font-bold">
                  <Users className="w-8 h-8" />
                </AvatarFallback>
              </Avatar>
            )}
          </div>
          
          {/* Group Name */}
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-1">{chatRoom?.name || "그룹 채팅"}</h2>
            <p className="text-sm text-gray-600 mb-4">멤버 {participants.length}명 • 공유 파일</p>
          </div>
          
          {/* Action Buttons - Mobile Optimized */}
          <div className="grid grid-cols-3 gap-2 px-2 mb-5">
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

      {/* Content Tabs */}
      <div className="px-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-4 h-9">
            <TabsTrigger value="media" className="text-xs py-1.5" data-testid="tab-media">
              <ImageIcon className="h-3 w-3 mr-1 inline" />
              미디어
            </TabsTrigger>
            <TabsTrigger value="files" className="text-xs py-1.5" data-testid="tab-files">
              <FileText className="h-3 w-3 mr-1 inline" />
              파일
            </TabsTrigger>
            <TabsTrigger value="links" className="text-xs py-1.5" data-testid="tab-links">
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
    </div>
  );
}
