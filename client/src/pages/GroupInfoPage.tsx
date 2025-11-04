import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  ArrowLeft, 
  Image as ImageIcon, 
  FileText, 
  Link as LinkIcon,
  Users,
  UserPlus,
  Bell,
  BellOff,
  Pin,
  LogOut,
  Camera,
  Edit2,
  Check,
  X,
  Search
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

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

type ChatSettings = {
  isMuted: boolean;
  isPinned: boolean;
};

export default function GroupInfoPage() {
  const { chatRoomId } = useParams();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("media");
  const [isEditingName, setIsEditingName] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [searchMember, setSearchMember] = useState("");
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    queryKey: [`/api/chat-rooms/${chatRoomId}/messages`],
    enabled: !!chatRoomId,
  }) as { data?: { messages: Message[] } };

  const messages = messagesData?.messages || [];

  // Fetch chat settings
  const { data: settingsData } = useQuery({
    queryKey: [`/api/chat-settings/${chatRoomId}`],
    enabled: !!chatRoomId,
  }) as { data?: { settings: ChatSettings } };

  const settings = settingsData?.settings || { isMuted: false, isPinned: false };

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

  // Filtered participants
  const filteredParticipants = participants.filter(p =>
    p.displayName.toLowerCase().includes(searchMember.toLowerCase()) ||
    p.username.toLowerCase().includes(searchMember.toLowerCase())
  );

  // Update group name mutation
  const updateNameMutation = useMutation({
    mutationFn: async (name: string) => {
      const response = await apiRequest(`/api/chat-rooms/${chatRoomId}/name`, 'PUT', { name });
      if (!response.ok) throw new Error('Failed to update group name');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/chat-rooms/${chatRoomId}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/chat-rooms'] });
      setIsEditingName(false);
      toast({ title: "그룹명이 변경되었습니다" });
    },
    onError: () => {
      toast({ title: "그룹명 변경 실패", variant: "destructive" });
    }
  });

  // Update profile image mutation
  const updateImageMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('profileImage', file);
      const response = await fetch(`/api/chat-rooms/${chatRoomId}/profile-image`, {
        method: 'POST',
        headers: {
          'x-user-id': localStorage.getItem('userId') || '',
        },
        body: formData,
      });
      if (!response.ok) throw new Error('Failed to upload image');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/chat-rooms/${chatRoomId}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/chat-rooms'] });
      toast({ title: "프로필 사진이 변경되었습니다" });
    },
    onError: () => {
      toast({ title: "사진 변경 실패", variant: "destructive" });
    }
  });

  // Mute toggle mutation
  const muteMutation = useMutation({
    mutationFn: async (isMuted: boolean) => {
      const response = await apiRequest(`/api/chat-settings/${chatRoomId}/mute`, 'POST', { isMuted });
      if (!response.ok) throw new Error('Failed to toggle mute');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/chat-settings/${chatRoomId}`] });
      toast({ title: settings.isMuted ? "알림 켜짐" : "알림 꺼짐" });
    },
  });

  // Pin toggle mutation
  const pinMutation = useMutation({
    mutationFn: async (isPinned: boolean) => {
      const response = await apiRequest(`/api/chat-settings/${chatRoomId}/pin`, 'POST', { isPinned });
      if (!response.ok) throw new Error('Failed to toggle pin');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/chat-settings/${chatRoomId}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/chat-rooms'] });
      toast({ title: settings.isPinned ? "고정 해제됨" : "고정됨" });
    },
  });

  // Leave group mutation
  const leaveMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest(`/api/chat-rooms/${chatRoomId}/leave`, 'POST', { saveFiles: true });
      if (!response.ok) throw new Error('Failed to leave group');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/chat-rooms'] });
      toast({ title: "그룹을 나갔습니다" });
      navigate('/');
    },
    onError: () => {
      toast({ title: "나가기 실패", variant: "destructive" });
    }
  });

  const handleSaveName = () => {
    if (groupName.trim() && groupName !== chatRoom?.name) {
      updateNameMutation.mutate(groupName.trim());
    } else {
      setIsEditingName(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      updateImageMutation.mutate(file);
    }
  };

  const handleLeaveGroup = () => {
    leaveMutation.mutate();
    setLeaveDialogOpen(false);
  };

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50">
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
          <h1 className="text-lg font-semibold text-gray-900">그룹 정보</h1>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto pb-6">
          {/* Group Profile Section */}
          <div className="bg-white mt-4 mx-4 rounded-2xl shadow-sm p-6">
            <div className="flex flex-col items-center">
              {/* Profile Image */}
              <div className="relative mb-4">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={chatRoom?.profileImage} />
                  <AvatarFallback className="bg-purple-100 text-purple-600 text-2xl font-semibold">
                    {chatRoom?.name?.[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-0 right-0 bg-purple-600 text-white rounded-full p-2 shadow-lg hover:bg-purple-700 transition-colors"
                  data-testid="button-change-profile-image"
                >
                  <Camera className="h-4 w-4" />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                  data-testid="input-profile-image"
                />
              </div>

              {/* Group Name */}
              {isEditingName ? (
                <div className="flex items-center gap-2 w-full max-w-xs">
                  <Input
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    className="text-center font-semibold"
                    autoFocus
                    data-testid="input-group-name"
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleSaveName}
                    className="h-8 w-8 p-0"
                    data-testid="button-save-name"
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setIsEditingName(false)}
                    className="h-8 w-8 p-0"
                    data-testid="button-cancel-name"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <h2 className="text-2xl font-bold text-gray-900" data-testid="text-group-name">
                    {chatRoom?.name}
                  </h2>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setGroupName(chatRoom?.name || "");
                      setIsEditingName(true);
                    }}
                    className="h-8 w-8 p-0"
                    data-testid="button-edit-name"
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                </div>
              )}

              <p className="text-sm text-gray-500 mt-1">
                {participants.length}명의 멤버
              </p>
            </div>
          </div>

          {/* Shared Content Tabs */}
          <div className="bg-white mt-4 mx-4 rounded-2xl shadow-sm overflow-hidden">
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
                    {mediaFiles.map((file) => (
                      <div
                        key={file.id}
                        className="aspect-square bg-gray-100 rounded-lg overflow-hidden"
                        data-testid={`media-item-${file.id}`}
                      >
                        <img
                          src={file.fileUrl || ''}
                          alt="Shared media"
                          className="w-full h-full object-cover"
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

              <TabsContent value="files" className="p-4">
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
                        <FileText className="h-5 w-5 text-gray-400" />
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

              <TabsContent value="links" className="p-4">
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
                          <LinkIcon className="h-5 w-5 text-gray-400" />
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

          {/* Participants Section */}
          <div className="bg-white mt-4 mx-4 rounded-2xl shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-gray-600" />
                <h3 className="font-semibold text-gray-900">참여자 ({participants.length})</h3>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-purple-600"
                onClick={() => navigate(`/app?tab=contacts&invite=${chatRoomId}`)}
                data-testid="button-invite-members"
              >
                <UserPlus className="h-4 w-4 mr-1" />
                초대
              </Button>
            </div>

            {/* Search */}
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                type="text"
                placeholder="멤버 검색..."
                value={searchMember}
                onChange={(e) => setSearchMember(e.target.value)}
                className="pl-10"
                data-testid="input-search-member"
              />
            </div>

            {/* Member List */}
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {filteredParticipants.map((participant) => (
                <div
                  key={participant.id}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50"
                  data-testid={`participant-${participant.id}`}
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={participant.profilePicture} />
                    <AvatarFallback className="bg-purple-100 text-purple-600">
                      {participant.displayName[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {participant.displayName}
                      {participant.id === chatRoom?.createdBy && (
                        <span className="ml-2 text-xs text-purple-600 font-semibold">방장</span>
                      )}
                    </p>
                    <p className="text-xs text-gray-500">@{participant.username}</p>
                  </div>
                  {participant.isOnline && (
                    <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Settings Section */}
          <div className="bg-white mt-4 mx-4 rounded-2xl shadow-sm p-4">
            <h3 className="font-semibold text-gray-900 mb-3">설정</h3>
            
            <div className="space-y-3">
              {/* Mute */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  {settings.isMuted ? (
                    <BellOff className="h-5 w-5 text-gray-600" />
                  ) : (
                    <Bell className="h-5 w-5 text-gray-600" />
                  )}
                  <span className="text-sm font-medium text-gray-900">무음 모드</span>
                </div>
                <Switch
                  checked={settings.isMuted}
                  onCheckedChange={(checked) => muteMutation.mutate(checked)}
                  data-testid="switch-mute"
                />
              </div>

              {/* Pin */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Pin className="h-5 w-5 text-gray-600" />
                  <span className="text-sm font-medium text-gray-900">채팅방 고정</span>
                </div>
                <Switch
                  checked={settings.isPinned}
                  onCheckedChange={(checked) => pinMutation.mutate(checked)}
                  data-testid="switch-pin"
                />
              </div>

              {/* Leave Group */}
              <Button
                variant="ghost"
                className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={() => setLeaveDialogOpen(true)}
                data-testid="button-leave-group"
              >
                <LogOut className="h-5 w-5 mr-3" />
                그룹 나가기
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Leave Confirmation Dialog */}
      <Dialog open={leaveDialogOpen} onOpenChange={setLeaveDialogOpen}>
        <DialogContent data-testid="dialog-leave-group">
          <DialogHeader>
            <DialogTitle>그룹을 나가시겠습니까?</DialogTitle>
            <DialogDescription>
              그룹을 나가면 더 이상 메시지를 받을 수 없습니다. 파일은 보관함에 자동으로 저장됩니다.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setLeaveDialogOpen(false)}
              data-testid="button-cancel-leave"
            >
              취소
            </Button>
            <Button
              variant="destructive"
              onClick={handleLeaveGroup}
              data-testid="button-confirm-leave"
            >
              나가기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
