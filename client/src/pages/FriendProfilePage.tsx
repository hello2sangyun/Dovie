import { useState, useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { ArrowLeft, Phone, Video, UserPlus, Search, MoreHorizontal, MapPin, Briefcase, Globe, Calendar, Heart, MessageCircle, Share, Building, MessageSquare, Image as ImageIcon, FileText, Link as LinkIcon, FileImage, FileVideo, FileAudio, FileCode, File } from "lucide-react";
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

interface BusinessPost {
  id: number;
  userId: number;
  title?: string;
  content: string;
  postType: string;
  attachments?: string[];
  visibility: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  isPinned: boolean;
  user?: {
    id: number;
    displayName: string;
    profilePicture?: string;
  };
}

interface BusinessCard {
  id: number;
  userId: number;
  fullName?: string;
  companyName?: string;
  jobTitle?: string;
  department?: string;
  email?: string;
  phoneNumber?: string;
  website?: string;
  address?: string;
  description?: string;
  cardImageUrl?: string;
}

interface BusinessProfile {
  id: number;
  userId: number;
  jobTitle?: string;
  company?: string;
  bio?: string;
  website?: string;
  location?: string;
  linkedinUrl?: string;
  industry?: string;
  experienceYears?: number;
  skills?: string[];
}

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

  const [activeTab, setActiveTab] = useState("posts");
  const [isCallModalOpen, setIsCallModalOpen] = useState(false);
  const [callChatRoomId, setCallChatRoomId] = useState<number | null>(null);
  const [selectedFile, setSelectedFile] = useState<{ url: string; name: string; size?: number } | null>(null);
  const [failedImages, setFailedImages] = useState<Set<number>>(new Set());

  // Fetch friend's business posts
  const { data: businessPosts = [], isLoading: postsLoading } = useQuery<BusinessPost[]>({
    queryKey: [`/api/business-posts/${userId}`],
    enabled: !!userId,
  });

  // Fetch friend's business card
  const { data: businessCard, isLoading: cardLoading } = useQuery<BusinessCard>({
    queryKey: [`/api/users/${userId}/business-card`],
    enabled: !!userId,
  });

  // Fetch friend's business profile
  const { data: businessProfile, isLoading: profileLoading } = useQuery<BusinessProfile>({
    queryKey: [`/api/users/${userId}/business-profile`],
    enabled: !!userId,
  });

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

  const friendName = (businessCard as any)?.fullName || (businessProfile as any)?.company || (userProfile as any)?.displayName || "친구";
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
              <AvatarImage src={(userProfile as any)?.profilePicture || (businessCard as any)?.cardImageUrl} />
              <AvatarFallback className="bg-blue-100 text-blue-600 text-xl font-bold">
                {friendName[0]}
              </AvatarFallback>
            </Avatar>
          </div>
          
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-1">{friendName}</h2>
            <p className="text-sm text-gray-600 mb-4">
              {businessCard?.jobTitle && businessCard?.companyName 
                ? `${businessCard.jobTitle} • ${businessCard.companyName}`
                : businessCard?.jobTitle || businessCard?.companyName || "프로필 정보"}
            </p>
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
          <TabsList className="grid w-full grid-cols-3 md:grid-cols-6 mb-4 h-9">
            <TabsTrigger value="posts" className="text-xs py-1.5">게시물</TabsTrigger>
            <TabsTrigger value="card" className="text-xs py-1.5">명함</TabsTrigger>
            <TabsTrigger value="profile" className="text-xs py-1.5">프로필</TabsTrigger>
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

          {/* Business Posts Tab */}
          <TabsContent value="posts" className="space-y-4">
            <div className="space-y-4">
              {postsLoading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <Card key={i}>
                      <CardContent className="p-4">
                        <div className="animate-pulse">
                          <div className="flex items-center space-x-3 mb-3">
                            <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                            <div className="space-y-2">
                              <div className="h-3 bg-gray-200 rounded w-24"></div>
                              <div className="h-2 bg-gray-200 rounded w-16"></div>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <div className="h-3 bg-gray-200 rounded"></div>
                            <div className="h-3 bg-gray-200 rounded w-4/5"></div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : businessPosts.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Building className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                    <h3 className="text-lg font-semibold text-gray-600 mb-2">아직 게시물이 없어요</h3>
                    <p className="text-gray-500 text-sm">친구의 비즈니스 게시물이 표시됩니다</p>
                  </CardContent>
                </Card>
              ) : (
                businessPosts.map((post: BusinessPost, index: number) => (
                  <div key={post.id}>
                    <Card className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start space-x-3">
                          <Avatar className="w-10 h-10">
                            <AvatarImage src={post.user?.profilePicture} />
                            <AvatarFallback className="bg-gray-100 text-gray-700 font-semibold text-sm">
                              {post.user?.displayName?.[0] || friendName[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <h4 className="font-semibold text-gray-900 text-sm">
                                  {post.user?.displayName || friendName}
                                </h4>
                                <p className="text-xs text-gray-500 mt-0.5">
                                  {new Date(post.createdAt).toLocaleDateString('ko-KR', {
                                    month: 'long',
                                    day: 'numeric'
                                  })}
                                </p>
                              </div>
                              <Button variant="ghost" size="sm" className="text-gray-400 hover:text-gray-600 p-1">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </div>
                            
                            <div className="mb-4">
                              {post.title && (
                                <h5 className="font-semibold text-gray-900 mb-2 text-sm">
                                  {post.title}
                                </h5>
                              )}
                              <p className="text-gray-800 leading-relaxed text-sm">
                                {post.content}
                              </p>
                              
                              {post.attachments && post.attachments.length > 0 && (
                                <div className="mt-3 space-y-2">
                                  {post.attachments.map((attachment, index) => (
                                    <div key={index} className="rounded-xl overflow-hidden border border-gray-200">
                                      <img 
                                        src={attachment}
                                        alt={`첨부 이미지 ${index + 1}`}
                                        className="w-full h-auto"
                                      />
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                            
                            <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                              <div className="flex space-x-6">
                                <button className="flex items-center space-x-1 text-gray-600 hover:text-red-600 transition-colors text-xs">
                                  <Heart className="w-4 h-4" />
                                  <span>{post.likeCount}</span>
                                </button>
                                <button className="flex items-center space-x-1 text-gray-600 hover:text-blue-600 transition-colors text-xs">
                                  <MessageCircle className="w-4 h-4" />
                                  <span>{post.commentCount}</span>
                                </button>
                                <button className="flex items-center space-x-1 text-gray-600 hover:text-green-600 transition-colors text-xs">
                                  <Share className="w-4 h-4" />
                                  <span>{post.shareCount}</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                ))
              )}
            </div>
          </TabsContent>

          {/* Business Card Tab */}
          <TabsContent value="card" className="space-y-4">
            <div>
              {cardLoading ? (
                <Card>
                  <CardContent className="p-6">
                    <div className="animate-pulse space-y-4">
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                      <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                    </div>
                  </CardContent>
                </Card>
              ) : businessCard ? (
                <Card className="shadow-lg">
                  <CardContent className="p-6">
                    <div className="text-center mb-6">
                      <h3 className="text-2xl font-bold text-gray-900 mb-2">
                        {businessCard.fullName || friendName}
                      </h3>
                      {businessCard.jobTitle && (
                        <p className="text-lg text-gray-600 mb-1">{businessCard.jobTitle}</p>
                      )}
                      {businessCard.companyName && (
                        <p className="text-blue-600 font-semibold">{businessCard.companyName}</p>
                      )}
                    </div>
                    
                    <div className="space-y-4">
                      {businessCard.phoneNumber && (
                        <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg">
                          <Phone className="w-5 h-5 text-blue-600" />
                          <span className="text-blue-800 font-medium">{businessCard.phoneNumber}</span>
                        </div>
                      )}
                      
                      {businessCard.email && (
                        <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                          <div className="w-5 h-5 text-gray-600">@</div>
                          <span className="text-gray-800">{businessCard.email}</span>
                        </div>
                      )}
                      
                      {businessCard.website && (
                        <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                          <Globe className="w-5 h-5 text-gray-600" />
                          <span className="text-gray-800">{businessCard.website}</span>
                        </div>
                      )}
                      
                      {businessCard.address && (
                        <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                          <MapPin className="w-5 h-5 text-gray-600" />
                          <span className="text-gray-800">{businessCard.address}</span>
                        </div>
                      )}
                      
                      {businessCard.description && (
                        <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg">
                          <p className="text-gray-700 leading-relaxed">{businessCard.description}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Briefcase className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                    <h3 className="text-lg font-semibold text-gray-600 mb-2">명함 정보가 없어요</h3>
                    <p className="text-gray-500 text-sm">아직 등록된 명함 정보가 없습니다</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Business Profile Tab */}
          <TabsContent value="profile" className="space-y-4">
            <div>
              {profileLoading ? (
                <Card>
                  <CardContent className="p-6">
                    <div className="animate-pulse space-y-4">
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                      <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                    </div>
                  </CardContent>
                </Card>
              ) : businessProfile ? (
                <Card className="shadow-lg">
                  <CardContent className="p-6 space-y-6">
                    {businessProfile.bio && (
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-3">소개</h4>
                        <p className="text-gray-700 leading-relaxed">{businessProfile.bio}</p>
                      </div>
                    )}
                    
                    <div className="grid grid-cols-1 gap-4">
                      {businessProfile.company && (
                        <div className="flex items-center space-x-3">
                          <Building className="w-5 h-5 text-gray-500" />
                          <div>
                            <p className="text-sm text-gray-500">회사</p>
                            <p className="font-medium text-gray-900">{businessProfile.company}</p>
                          </div>
                        </div>
                      )}
                      
                      {businessProfile.industry && (
                        <div className="flex items-center space-x-3">
                          <Briefcase className="w-5 h-5 text-gray-500" />
                          <div>
                            <p className="text-sm text-gray-500">업종</p>
                            <p className="font-medium text-gray-900">{businessProfile.industry}</p>
                          </div>
                        </div>
                      )}
                      
                      {businessProfile.location && (
                        <div className="flex items-center space-x-3">
                          <MapPin className="w-5 h-5 text-gray-500" />
                          <div>
                            <p className="text-sm text-gray-500">위치</p>
                            <p className="font-medium text-gray-900">{businessProfile.location}</p>
                          </div>
                        </div>
                      )}
                      
                      {businessProfile.experienceYears && (
                        <div className="flex items-center space-x-3">
                          <Calendar className="w-5 h-5 text-gray-500" />
                          <div>
                            <p className="text-sm text-gray-500">경력</p>
                            <p className="font-medium text-gray-900">{businessProfile.experienceYears}년</p>
                          </div>
                        </div>
                      )}
                      
                      {businessProfile.website && (
                        <div className="flex items-center space-x-3">
                          <Globe className="w-5 h-5 text-gray-500" />
                          <div>
                            <p className="text-sm text-gray-500">웹사이트</p>
                            <p className="font-medium text-blue-600">{businessProfile.website}</p>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {businessProfile.skills && businessProfile.skills.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-3">기술 및 스킬</h4>
                        <div className="flex flex-wrap gap-2">
                          {businessProfile.skills.map((skill, index) => (
                            <span 
                              key={index}
                              className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium"
                            >
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Building className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                    <h3 className="text-lg font-semibold text-gray-600 mb-2">프로필 정보가 없어요</h3>
                    <p className="text-gray-500 text-sm">아직 등록된 비즈니스 프로필이 없습니다</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

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