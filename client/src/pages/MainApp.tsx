import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useImagePreloader, preloadGlobalImage } from "@/hooks/useImagePreloader";

import VaultLogo from "@/components/VaultLogo";
import ContactsList from "@/components/ContactsList";
import ChatsList from "@/components/ChatsList";
import ArchiveList from "@/components/ArchiveList";
import ChatArea from "@/components/ChatArea";
import AddContactModal from "@/components/AddContactModal";
import CommandModal from "@/components/CommandModal";
import CreateGroupChatModal from "@/components/CreateGroupChatModal";
import ProfilePhotoModal from "@/components/ProfilePhotoModal";
import ZeroDelayAvatar from "@/components/ZeroDelayAvatar";
import { BannerNotificationContainer } from "@/components/MobileBannerNotification";
import LoadingScreen from "@/components/LoadingScreen";


import ModernSettingsPage from "@/components/ModernSettingsPage";

import BlockedContactsPage from "@/components/BlockedContactsPage";
import SimpleSpacePage from "@/pages/SimpleSpacePage";
import LinkedInSpacePage from "@/pages/LinkedInSpacePage";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookUser, MessageCircle, Archive, Settings, Search, MessageSquare, Users, Building2, Shield, UserX, Camera } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export default function MainApp() {
  const { user, isLoading, isPreloadingImages } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { preloadImage, isLoading: imagePreloading } = useImagePreloader();
  const [activeTab, setActiveTab] = useState("chats");
  const [activeMobileTab, setActiveMobileTab] = useState("chats");
  const [showSettings, setShowSettings] = useState(false);
  const [selectedChatRoom, setSelectedChatRoom] = useState<number | null>(null);
  const [rightPanelContent, setRightPanelContent] = useState<string | null>(null);
  const [showMobileChat, setShowMobileChat] = useState(false);
  const [modals, setModals] = useState({
    addContact: false,
    command: false,
    createGroup: false,
    profilePhoto: false,
  });
  const [commandModalData, setCommandModalData] = useState<any>(null);
  const [messageDataForCommand, setMessageDataForCommand] = useState<any>(null);
  const [contactFilter, setContactFilter] = useState<number | null>(null);
  const [friendFilter, setFriendFilter] = useState<number | null>(null);

  useWebSocket(user?.id);

  // Handle URL parameters for friend filter
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const friendFilterParam = urlParams.get('friendFilter');
    
    if (friendFilterParam) {
      const friendId = parseInt(friendFilterParam);
      setFriendFilter(friendId);
      setActiveMobileTab("chats");
      setActiveTab("chats");
      
      // Clear the URL parameter after setting the filter
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }
  }, []);

  // Get contacts to find contact user data
  const { data: contactsData } = useQuery({
    queryKey: ["/api/contacts"],
    enabled: !!user,
  });

  // Get chat rooms data
  const { data: chatRoomsData } = useQuery({
    queryKey: ["/api/chat-rooms"],
    enabled: !!user,
  });

  // 앱 시작 시 모든 프로필 이미지 사전 다운로드
  useEffect(() => {
    if (user && contactsData && chatRoomsData) {
      console.log('🚀 Starting profile image preloading...');
      
      const profileImagesToPreload = new Set<string>();
      
      // 사용자 자신의 프로필 이미지
      if (user.profilePicture) {
        profileImagesToPreload.add(user.profilePicture);
      }
      
      // 연락처 프로필 이미지들
      if ((contactsData as any)?.contacts) {
        (contactsData as any).contacts.forEach((contact: any) => {
          if (contact.contactUser?.profilePicture) {
            profileImagesToPreload.add(contact.contactUser.profilePicture);
          }
        });
      }
      
      // 채팅방 참가자 프로필 이미지들
      if ((chatRoomsData as any)?.chatRooms) {
        (chatRoomsData as any).chatRooms.forEach((room: any) => {
          if (room.participants) {
            room.participants.forEach((participant: any) => {
              if (participant.profilePicture) {
                profileImagesToPreload.add(participant.profilePicture);
              }
            });
          }
        });
      }
      
      // 모든 프로필 이미지를 백그라운드에서 병렬로 다운로드
      const preloadPromises = Array.from(profileImagesToPreload).map(async (imageUrl, index) => {
        try {
          // 각 이미지를 50ms씩 지연시켜 서버 부하 분산
          await new Promise(resolve => setTimeout(resolve, index * 50));
          await preloadGlobalImage(imageUrl);
          console.log(`✅ Preloaded profile image: ${imageUrl}`);
        } catch (error) {
          console.warn(`❌ Failed to preload image: ${imageUrl}`, error);
        }
      });
      
      Promise.all(preloadPromises).then(() => {
        console.log(`🎉 Profile image preloading completed! Total: ${profileImagesToPreload.size} images`);
      });
    }
  }, [user, contactsData, chatRoomsData]);

  // Prefetch messages for recent chat rooms
  useEffect(() => {
    if ((chatRoomsData as any)?.chatRooms && queryClient) {
      // 최근 채팅방 5개의 메시지를 미리 로딩
      const recentChatRooms = (chatRoomsData as any).chatRooms.slice(0, 5);
      
      recentChatRooms.forEach((room: any, index: number) => {
        // 각 요청을 100ms씩 지연시켜 서버 부하 분산
        setTimeout(() => {
          queryClient.prefetchQuery({
            queryKey: [`/api/chat-rooms/${room.id}/messages`],
            queryFn: async () => {
              const response = await apiRequest(`/api/chat-rooms/${room.id}/messages`, "GET");
              if (!response.ok) throw new Error('Failed to prefetch messages');
              return response.json();
            },
            staleTime: 30000, // 30초 동안 캐시 유지
          });
        }, index * 100);
      });
    }
  }, [(chatRoomsData as any)?.chatRooms, queryClient]);

  // Get unread counts
  const { data: unreadCountsData } = useQuery({
    queryKey: ["/api/unread-counts"],
    enabled: !!user,
    refetchInterval: 5000,
  });

  // Background image preloading will be implemented after fixing rendering issues
  useEffect(() => {
    if (!user) return;
    
    console.log('MainApp rendering with user:', user.id);
  }, [user]);

  // 친구와의 채팅방 찾기 또는 생성
  const createOrFindChatRoom = (contactUserId: number, contactUser: any) => {
    // 해당 친구와의 기존 채팅방이 있는지 확인
    const existingChatRoom = (chatRoomsData as any)?.chatRooms?.find((room: any) => {
      return room.participants?.length === 2 && 
             room.participants?.some((p: any) => p.id === contactUserId) &&
             room.participants?.some((p: any) => p.id === user?.id);
    });

    if (existingChatRoom) {
      // 기존 채팅방이 있으면 해당 채팅방 선택하고 필터 적용
      setSelectedChatRoom(existingChatRoom.id);
      setContactFilter(contactUserId);
      setActiveTab("chats");
      setActiveMobileTab("chats");
      setShowMobileChat(true);
    } else {
      // 기존 채팅방이 없으면 새로 생성
      const roomName = contactUser.nickname || contactUser.displayName || contactUser.username;
      createChatRoomMutation.mutate({
        contactUserId,
        contactUser
      });
    }
  };

  // Create chat room mutation
  const createChatRoomMutation = useMutation({
    mutationFn: async ({ contactUserId, contactUser }: { contactUserId: number, contactUser: any }) => {
      const response = await apiRequest("/api/chat-rooms", "POST", {
        name: contactUser.nickname || contactUser.displayName,
        participantIds: [contactUserId],
        isGroup: false,
      });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat-rooms"] });
      setSelectedChatRoom(data.chatRoom.id);
      setActiveTab("chats");
      setActiveMobileTab("chats");
      setShowMobileChat(true);
    },
    onError: () => {
      // 채팅방 생성 실패 - 알림 제거
    },
  });

  const openModal = (modal: keyof typeof modals, data?: any) => {
    setModals(prev => ({ ...prev, [modal]: true }));
    if (modal === 'command' && data) {
      setCommandModalData(data);
    }
  };

  const handleCreateCommand = (fileData?: any, messageData?: any) => {
    setCommandModalData(fileData);
    setMessageDataForCommand(messageData);
    setModals({ ...modals, command: true });
  };

  const handleChatRoomSelect = (chatRoomId: number) => {
    setSelectedChatRoom(chatRoomId);
    setActiveTab("chats");
  };

  const closeModals = () => {
    setModals({ addContact: false, command: false, createGroup: false, profilePhoto: false });
    setCommandModalData(null);
    setMessageDataForCommand(null);
  };

  const handleGroupChatSuccess = (chatRoomId: number) => {
    setSelectedChatRoom(chatRoomId);
    setActiveTab("chats");
  };

  // Calculate unread counts for tabs
  const calculateUnreadCounts = () => {
    const unreadCounts = (unreadCountsData as any)?.unreadCounts || [];
    
    let totalChatUnread = 0;
    
    unreadCounts.forEach((unread: any) => {
      totalChatUnread += unread.unreadCount;
    });
    
    return { totalChatUnread };
  };

  const { totalChatUnread } = calculateUnreadCounts();

  // 사용자가 있으면 바로 메인 앱을 렌더링
  if (!user) {
    // 저장된 사용자 ID가 있으면 로딩 표시
    const storedUserId = localStorage.getItem("userId");
    if (storedUserId) {
      return (
        <div className="fixed inset-0 bg-white dark:bg-gray-900 flex items-center justify-center">
          <div className="text-center">
            <VaultLogo size="lg" className="mx-auto mb-4 animate-pulse" />
            <p className="text-gray-600 dark:text-gray-400">사용자 정보 불러오는 중...</p>
          </div>
        </div>
      );
    }
    
    // 저장된 사용자 ID가 없으면 로그인 페이지로 리다이렉트
    window.location.href = "/login";
    return null;
  }

  return (
    <div className="fixed inset-0 bg-white dark:bg-gray-900">
      {/* Desktop Layout */}
      <div className="hidden lg:flex h-full">
        {/* Sidebar */}
        <div className="w-96 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 purple-gradient">
            <div className="flex items-center justify-center space-x-3">
              <VaultLogo size="sm" />
              <h1 className="text-xl font-bold text-white">Dovie Messenger</h1>
            </div>
          </div>

          {/* Navigation Tabs */}
          <Tabs value={activeTab} onValueChange={(value) => {
            setActiveTab(value);
            if (value === "settings") {
              setRightPanelContent(value);
              setSelectedChatRoom(null);
            } else if (value === "archive") {
              setRightPanelContent("archive");
              setSelectedChatRoom(null);
            } else {
              setRightPanelContent(null);
            }
          }} className="flex-1 flex flex-col">
            <TabsList className="grid w-full grid-cols-4 border-b border-gray-200 dark:border-gray-700 rounded-none bg-transparent dark:bg-transparent h-auto">
              <TabsTrigger 
                value="contacts" 
                className={cn(
                  "py-2 px-3 text-sm font-medium rounded-none border-b-2 border-transparent flex-col items-center gap-1 min-w-0",
                  "data-[state=active]:border-purple-600 data-[state=active]:bg-purple-50 data-[state=active]:text-purple-600"
                )}
              >
                <Users className="h-4 w-4" />
                <span className="text-xs truncate">연락처</span>
              </TabsTrigger>
              <TabsTrigger 
                value="chats"
                className={cn(
                  "py-2 px-3 text-sm font-medium rounded-none border-b-2 border-transparent flex-col items-center gap-1 relative min-w-0",
                  "data-[state=active]:border-purple-600 data-[state=active]:bg-purple-50 data-[state=active]:text-purple-600"
                )}
              >
                <div className="relative">
                  <MessageSquare className="h-4 w-4" />
                  {totalChatUnread > 0 && (
                    <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full min-w-[16px] h-[16px] flex items-center justify-center font-medium">
                      {totalChatUnread > 99 ? '99+' : totalChatUnread}
                    </div>
                  )}
                </div>
                <span className="text-xs truncate">채팅방</span>
              </TabsTrigger>


              <TabsTrigger 
                value="archive"
                className={cn(
                  "py-2 px-3 text-sm font-medium rounded-none border-b-2 border-transparent flex-col items-center gap-1 min-w-0",
                  "data-[state=active]:border-purple-600 data-[state=active]:bg-purple-50 data-[state=active]:text-purple-600"
                )}
              >
                <Archive className="h-4 w-4" />
                <span className="text-xs truncate">저장소</span>
              </TabsTrigger>
              <TabsTrigger 
                value="settings"
                className={cn(
                  "py-2 px-3 text-sm font-medium rounded-none border-b-2 border-transparent flex-col items-center gap-1 min-w-0",
                  "data-[state=active]:border-purple-600 data-[state=active]:bg-purple-50 data-[state=active]:text-purple-600"
                )}
              >
                <Settings className="h-4 w-4" />
                <span className="text-xs truncate">설정</span>
              </TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-hidden">
              <TabsContent value="contacts" className="h-full m-0">
                <ContactsList 
                  onAddContact={() => openModal("addContact")}
                  onSelectContact={(contactUserId) => {
                    // Find the contact user data
                    const contact = (contactsData as any)?.contacts?.find((c: any) => c.contactUserId === contactUserId);
                    if (contact) {
                      createOrFindChatRoom(contactUserId, contact.contactUser);
                    }
                  }}
                />
              </TabsContent>
              
              <TabsContent value="chats" className="h-full m-0">
                <ChatsList 
                  onSelectChat={setSelectedChatRoom}
                  selectedChatId={selectedChatRoom}
                  onCreateGroup={() => setModals({ ...modals, createGroup: true })}
                  contactFilter={contactFilter || undefined}
                  onClearFilter={() => setContactFilter(null)}
                />
              </TabsContent>
              

              

              
              <TabsContent value="archive" className="h-full m-0">
                <ArchiveList />
              </TabsContent>
              
              <TabsContent value="settings" className="h-full m-0">
                <div className="h-full overflow-y-auto">
                  <div className="p-4">
                    {/* 프로필 섹션 */}
                    <div 
                      className="mb-6 bg-white rounded-xl p-4 shadow-sm border border-gray-200 hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => setRightPanelContent("profile")}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="relative">
                          <Avatar 
                            className="w-12 h-12 cursor-pointer hover:ring-2 hover:ring-purple-500 transition-all"
                            onClick={(e) => {
                              e.stopPropagation();
                              setModals({ ...modals, profilePhoto: true });
                            }}
                          >
                            <AvatarImage src={user?.profilePicture || undefined} />
                            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-semibold">
                              {user?.displayName?.charAt(0) || user?.username?.charAt(0) || "U"}
                            </AvatarFallback>
                          </Avatar>
                          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-purple-600 rounded-full flex items-center justify-center">
                            <Camera className="w-2.5 h-2.5 text-white" />
                          </div>
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900">{user?.displayName}</h3>
                          <p className="text-sm text-gray-500">@{user?.username}</p>
                          <div className="flex items-center space-x-1 mt-1">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            <span className="text-xs text-gray-500">온라인</span>
                          </div>
                        </div>
                        <MessageCircle className="w-5 h-5 text-gray-400" />
                      </div>
                    </div>

                    {/* 비즈니스 섹션 */}
                    <div className="mb-6">
                      <h4 className="text-sm font-medium text-gray-600 mb-3">비즈니스</h4>
                      
                      <div 
                        className="mb-3 bg-white rounded-xl p-4 shadow-sm border border-gray-200 hover:shadow-md transition-shadow cursor-pointer"
                        onClick={() => setRightPanelContent("digital-command")}
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl flex items-center justify-center">
                            <MessageSquare className="w-6 h-6 text-white" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-900">디지털 명함</h3>
                            <p className="text-sm text-gray-500">명함 정보 관리 및 공유</p>
                          </div>
                          <MessageCircle className="w-5 h-5 text-gray-400" />
                        </div>
                      </div>

                      <div 
                        className="bg-white rounded-xl p-4 shadow-sm border border-gray-200 hover:shadow-md transition-shadow cursor-pointer"
                        onClick={() => {
                          setRightPanelContent("linkedin-space");
                        }}
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center">
                            <Building2 className="w-6 h-6 text-white" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-900">Business Space</h3>
                            <p className="text-sm text-gray-500">비즈니스 네트워킹 및 피드</p>
                          </div>
                          <MessageCircle className="w-5 h-5 text-gray-400" />
                        </div>
                      </div>
                    </div>

                    {/* 개정 설정 섹션 */}
                    <div className="mb-6">
                      <h4 className="text-sm font-medium text-gray-600 mb-3">개정 설정</h4>
                      
                      <div 
                        className="mb-3 bg-white rounded-xl p-4 shadow-sm border border-gray-200 hover:shadow-md transition-shadow cursor-pointer"
                        onClick={() => setRightPanelContent("privacy")}
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
                            <Users className="w-6 h-6 text-white" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-900">개인정보</h3>
                            <p className="text-sm text-gray-500">프로필 및 계정 정보 수정</p>
                          </div>
                          <MessageCircle className="w-5 h-5 text-gray-400" />
                        </div>
                      </div>

                      <div 
                        className="mb-3 bg-white rounded-xl p-4 shadow-sm border border-gray-200 hover:shadow-md transition-shadow cursor-pointer"
                        onClick={() => setRightPanelContent("notifications")}
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center">
                            <MessageSquare className="w-6 h-6 text-white" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-900">알림 설정</h3>
                            <p className="text-sm text-gray-500">메시지 및 앱 알림 관리</p>
                          </div>
                          <MessageCircle className="w-5 h-5 text-gray-400" />
                        </div>
                      </div>

                      <div 
                        className="mb-3 bg-white rounded-xl p-4 shadow-sm border border-gray-200 hover:shadow-md transition-shadow cursor-pointer"
                        onClick={() => setRightPanelContent("security")}
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-12 bg-gradient-to-br from-gray-600 to-gray-800 rounded-xl flex items-center justify-center">
                            <Shield className="w-6 h-6 text-white" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-900">보안 및 개인정보</h3>
                            <p className="text-sm text-gray-500">비밀번호 및 보안 설정</p>
                          </div>
                          <MessageCircle className="w-5 h-5 text-gray-400" />
                        </div>
                      </div>

                      <div 
                        className="bg-white rounded-xl p-4 shadow-sm border border-gray-200 hover:shadow-md transition-shadow cursor-pointer"
                        onClick={() => setRightPanelContent("account")}
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-pink-600 rounded-xl flex items-center justify-center">
                            <UserX className="w-6 h-6 text-white" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-900">차단된 연락처</h3>
                            <p className="text-sm text-gray-500">차단된 사용자 관리</p>
                          </div>
                          <MessageCircle className="w-5 h-5 text-gray-400" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col">
          {rightPanelContent === "settings" ? (
            <div className="flex-1 bg-gray-50 overflow-y-auto">
              <div className="max-w-4xl mx-auto p-6">
                <div className="flex items-center justify-between mb-6">
                  <h1 className="text-2xl font-bold text-gray-900">설정</h1>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setRightPanelContent(null);
                      setActiveTab("chats");
                    }}
                  >
                    뒤로 가기
                  </Button>
                </div>
                <div className="text-center text-gray-500 py-12">
                  <Settings className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg">좌측 메뉴에서 설정 항목을 선택하세요</p>
                </div>
              </div>
            </div>
          ) : rightPanelContent === "archive" ? (
            <div className="flex-1 bg-gray-50 overflow-y-auto">
              <div className="max-w-4xl mx-auto p-6">
                <div className="flex items-center justify-between mb-6">
                  <h1 className="text-2xl font-bold text-gray-900">저장소</h1>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setRightPanelContent(null);
                      setActiveTab("chats");
                    }}
                  >
                    뒤로 가기
                  </Button>
                </div>
                <ArchiveList />
              </div>
            </div>
          ) : rightPanelContent === "profile" ? (
            <div className="flex-1 bg-gray-50 overflow-y-auto">
              <div className="max-w-4xl mx-auto p-6">
                <div className="flex items-center justify-between mb-6">
                  <h1 className="text-2xl font-bold text-gray-900">프로필</h1>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setRightPanelContent(null);
                      setActiveTab("settings");
                    }}
                  >
                    뒤로 가기
                  </Button>
                </div>
                <div className="space-y-6">
                  <div className="text-center">
                    <div className="w-24 h-24 bg-purple-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                      <BookUser className="w-12 h-12 text-purple-600" />
                    </div>
                    <h2 className="text-xl font-semibold text-gray-900">{user?.displayName}</h2>
                    <p className="text-gray-500">@{user?.username}</p>
                  </div>
                  <div className="bg-white rounded-lg p-6 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">표시 이름</label>
                      <p className="text-gray-900">{user?.displayName}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">사용자명</label>
                      <p className="text-gray-900">@{user?.username}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">이메일</label>
                      <p className="text-gray-900">{user?.email || "이메일 미설정"}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : rightPanelContent === "business-space" ? (
            <div className="flex-1 bg-gray-50 overflow-y-auto">
              <div className="max-w-4xl mx-auto p-6">
                <div className="flex items-center justify-between mb-6">
                  <h1 className="text-2xl font-bold text-gray-900">Business Space</h1>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setRightPanelContent(null);
                      setActiveTab("settings");
                    }}
                  >
                    뒤로 가기
                  </Button>
                </div>
                <div className="space-y-6">
                  <div className="bg-white rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">공개 설정</h3>
                    <div className="space-y-3">
                      <label className="flex items-center space-x-3">
                        <input type="checkbox" className="rounded border-gray-300" defaultChecked />
                        <span className="text-gray-700">내 게시물을 친구들에게 공개</span>
                      </label>
                      <label className="flex items-center space-x-3">
                        <input type="checkbox" className="rounded border-gray-300" />
                        <span className="text-gray-700">회사 정보 공개</span>
                      </label>
                      <label className="flex items-center space-x-3">
                        <input type="checkbox" className="rounded border-gray-300" defaultChecked />
                        <span className="text-gray-700">연락처 동기화 허용</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : rightPanelContent === "privacy" ? (
            <div className="flex-1 bg-gray-50 overflow-y-auto">
              <div className="max-w-4xl mx-auto p-6">
                <div className="flex items-center justify-between mb-6">
                  <h1 className="text-2xl font-bold text-gray-900">개인정보</h1>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setRightPanelContent(null);
                      setActiveTab("settings");
                    }}
                  >
                    뒤로 가기
                  </Button>
                </div>
                <div className="space-y-6">
                  <div className="bg-white rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">접근 권한</h3>
                    <div className="space-y-3">
                      <label className="flex items-center space-x-3">
                        <input type="checkbox" className="rounded border-gray-300" defaultChecked />
                        <span className="text-gray-700">온라인 상태 표시</span>
                      </label>
                      <label className="flex items-center space-x-3">
                        <input type="checkbox" className="rounded border-gray-300" defaultChecked />
                        <span className="text-gray-700">마지막 접속 시간 표시</span>
                      </label>
                      <label className="flex items-center space-x-3">
                        <input type="checkbox" className="rounded border-gray-300" />
                        <span className="text-gray-700">프로필 검색 허용</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : rightPanelContent === "security" ? (
            <div className="flex-1 bg-gray-50 overflow-y-auto">
              <div className="max-w-4xl mx-auto p-6">
                <div className="flex items-center justify-between mb-6">
                  <h1 className="text-2xl font-bold text-gray-900">보안 및 개인정보</h1>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setRightPanelContent(null);
                      setActiveTab("settings");
                    }}
                  >
                    뒤로 가기
                  </Button>
                </div>
                <div className="space-y-6">
                  <div className="bg-white rounded-lg p-6 space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900">보안 설정</h3>
                    <Button className="w-full" variant="outline">
                      비밀번호 변경
                    </Button>
                    <Button className="w-full" variant="outline">
                      2단계 인증 설정
                    </Button>
                    <Button className="w-full" variant="outline">
                      로그인 기록 확인
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ) : rightPanelContent === "account" ? (
            <BlockedContactsPage onBack={() => {
              setRightPanelContent(null);
              setActiveTab("settings");
            }} />

          ) : rightPanelContent === "notifications" ? (
            <div className="flex-1 bg-gray-50 overflow-y-auto">
              <div className="max-w-4xl mx-auto p-6">
                <div className="flex items-center justify-between mb-6">
                  <h1 className="text-2xl font-bold text-gray-900">알림 설정</h1>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setRightPanelContent(null);
                      setActiveTab("settings");
                    }}
                  >
                    뒤로 가기
                  </Button>
                </div>
                <div className="space-y-6">
                  <div className="bg-white rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">알림 설정</h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">메시지 알림</p>
                          <p className="text-sm text-gray-500">새 메시지가 도착했을 때 알림</p>
                        </div>
                        <input type="checkbox" className="rounded border-gray-300" defaultChecked />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">소리 알림</p>
                          <p className="text-sm text-gray-500">알림음 재생</p>
                        </div>
                        <input type="checkbox" className="rounded border-gray-300" defaultChecked />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">진동 알림</p>
                          <p className="text-sm text-gray-500">기기 진동 알림</p>
                        </div>
                        <input type="checkbox" className="rounded border-gray-300" />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">Business Space 알림</p>
                          <p className="text-sm text-gray-500">비즈니스 피드 업데이트 알림</p>
                        </div>
                        <input type="checkbox" className="rounded border-gray-300" defaultChecked />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : rightPanelContent === "linkedin-space" ? (
            <LinkedInSpacePage onBack={() => setRightPanelContent("digital-command")} />
          ) : rightPanelContent === "profile-edit" ? (
            <div className="flex-1 bg-gray-50 overflow-y-auto">
              <div className="max-w-4xl mx-auto p-6">
                <div className="flex items-center justify-between mb-6">
                  <h1 className="text-2xl font-bold text-gray-900">프로필 편집</h1>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setRightPanelContent("digital-command");
                    }}
                  >
                    뒤로 가기
                  </Button>
                </div>
                <div className="space-y-6">
                  <div className="bg-white rounded-lg p-6">
                    <div className="space-y-4">
                      <div className="text-center">
                        <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full mx-auto mb-4 flex items-center justify-center relative">
                          <BookUser className="w-12 h-12 text-white" />
                          <Button 
                            size="sm" 
                            className="absolute -bottom-1 -right-1 rounded-full w-8 h-8 p-0"
                          >
                            <Users className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">표시 이름</label>
                          <input 
                            type="text" 
                            defaultValue={user?.displayName}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">사용자명</label>
                          <input 
                            type="text" 
                            defaultValue={user?.username}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">이메일</label>
                          <input 
                            type="email" 
                            defaultValue={user?.email || ""}
                            placeholder="이메일을 입력하세요"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">회사</label>
                          <input 
                            type="text" 
                            placeholder="회사명을 입력하세요"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">직책</label>
                          <input 
                            type="text" 
                            placeholder="직책을 입력하세요"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">전화번호</label>
                          <input 
                            type="tel" 
                            placeholder="전화번호를 입력하세요"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">자기소개</label>
                        <textarea 
                          rows={3}
                          placeholder="간단한 자기소개를 입력하세요"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      
                      <div className="flex space-x-3 pt-4">
                        <Button className="flex-1">변경사항 저장</Button>
                        <Button 
                          variant="outline" 
                          onClick={() => setRightPanelContent("digital-command")}
                        >
                          취소
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : selectedChatRoom ? (
            <ChatArea 
              chatRoomId={selectedChatRoom}
              onCreateCommand={handleCreateCommand}
              isLocationChat={false}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center bg-gray-50">
              <div className="text-center">
                <VaultLogo size="lg" className="mx-auto mb-4 opacity-50" />
                <p className="text-gray-500 text-lg">채팅방을 선택하여 대화를 시작하세요</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Layout */}
      <div className="lg:hidden h-full flex flex-col">
        {/* Fixed Mobile Header */}
        <div className="flex-shrink-0 purple-gradient p-4 text-white fixed top-0 left-0 right-0 z-50 lg:hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <VaultLogo size="sm" className="brightness-0 invert" />
              <h1 className="text-lg font-bold">Dovie Messenger</h1>
            </div>
            <Button variant="ghost" size="sm" className="text-white">
              <Search className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Mobile Content with padding for fixed header and footer */}
        <div className="flex-1 overflow-hidden pt-20 pb-14">
          {activeMobileTab === "contacts" && (
            <ContactsList 
              onAddContact={() => openModal("addContact")}
              onSelectContact={(contactUserId) => {
                // 해당 친구와의 채팅방 찾기 또는 생성 (모바일)
                const contact = (contactsData as any)?.contacts?.find((c: any) => c.contactUserId === contactUserId);
                if (contact) {
                  createOrFindChatRoom(contactUserId, contact.contactUser);
                  setActiveMobileTab("chats");
                }
              }}
            />
          )}
          {activeMobileTab === "chats" && !showMobileChat && (
            <ChatsList 
              onSelectChat={(chatId) => {
                setSelectedChatRoom(chatId);
                setShowMobileChat(true);
              }}
              selectedChatId={selectedChatRoom}
              onCreateGroup={() => setModals({ ...modals, createGroup: true })}
              contactFilter={contactFilter || undefined}
              onClearFilter={() => setContactFilter(null)}
              friendFilter={friendFilter}
              onClearFriendFilter={() => setFriendFilter(null)}
            />
          )}

          {showMobileChat && selectedChatRoom && (
            <div className="h-full flex flex-col overflow-hidden">
              <div className="flex-1 min-h-0">
                <ChatArea 
                  chatRoomId={selectedChatRoom}
                  onCreateCommand={handleCreateCommand}
                  showMobileHeader={true}
                  onBackClick={() => {
                    setShowMobileChat(false);
                    setSelectedChatRoom(null);
                  }}
                />
              </div>
            </div>
          )}
          {activeMobileTab === "archive" && <ArchiveList />}
          {activeMobileTab === "settings" && (
            <ModernSettingsPage isMobile={true} />
          )}
        </div>

        {/* Fixed Mobile Bottom Navigation - Hide when in chat */}
        {!showMobileChat && (
          <div className="bg-white border-t border-gray-200 pb-0 pt-1 px-2 fixed bottom-0 left-0 right-0 z-40 lg:hidden">
            <div className="flex justify-around">
              <Button
                variant="ghost"
                className={cn(
                  "flex flex-col items-center py-1 px-2",
                  activeMobileTab === "contacts" ? "text-purple-600" : "text-gray-400"
                )}
                onClick={() => setActiveMobileTab("contacts")}
              >
                <BookUser className="h-4 w-4" />
                <span className="text-xs mt-0.5">연락처</span>
              </Button>
              <Button
                variant="ghost"
                className={cn(
                  "flex flex-col items-center py-1 px-2 relative",
                  activeMobileTab === "chats" ? "text-purple-600" : "text-gray-400"
                )}
                onClick={() => setActiveMobileTab("chats")}
              >
                <div className="relative">
                  <MessageCircle className="h-4 w-4" />
                  {totalChatUnread > 0 && (
                    <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full min-w-[16px] h-[16px] flex items-center justify-center font-medium">
                      {totalChatUnread > 9 ? '9+' : totalChatUnread}
                    </div>
                  )}
                </div>
                <span className="text-xs mt-0.5">채팅방</span>
              </Button>

              <Button
                variant="ghost"
                className={cn(
                  "flex flex-col items-center py-1 px-2",
                  activeMobileTab === "archive" ? "text-purple-600" : "text-gray-400"
                )}
                onClick={() => setActiveMobileTab("archive")}
              >
                <Archive className="h-4 w-4" />
                <span className="text-xs mt-0.5">저장소</span>
              </Button>
              <Button
                variant="ghost"
                className={cn(
                  "flex flex-col items-center py-1 px-2",
                  activeMobileTab === "settings" ? "text-purple-600" : "text-gray-400"
                )}
                onClick={() => setActiveMobileTab("settings")}
              >
                <Settings className="h-4 w-4" />
                <span className="text-xs mt-0.5">설정</span>
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <AddContactModal 
        open={modals.addContact}
        onClose={closeModals}
      />
      <CommandModal 
        open={modals.command}
        onClose={closeModals}
        chatRoomId={selectedChatRoom ?? undefined}
        fileData={commandModalData}
        messageData={messageDataForCommand}
      />
      <CreateGroupChatModal 
        open={modals.createGroup}
        onClose={closeModals}
        onSuccess={handleGroupChatSuccess}
      />
      <ProfilePhotoModal 
        isOpen={modals.profilePhoto}
        onClose={closeModals}
      />

      {/* Mobile Banner Notifications - replaces bottom popup notifications */}
      <BannerNotificationContainer />

    </div>
  );
}
