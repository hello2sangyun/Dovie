import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useWebSocketContext } from "@/hooks/useWebSocketContext";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useImagePreloader, preloadGlobalImage } from "@/hooks/useImagePreloader";

import { useLocation, useParams } from "wouter";
import { navigationService } from "@/lib/navigation";

import VaultLogo from "@/components/VaultLogo";
import ContactsList from "@/components/ContactsList";
import ChatsList from "@/components/ChatsList";
import BookmarkList from "@/components/BookmarkList";
import ChatArea from "@/components/ChatArea";
import AddContactModal from "@/components/AddContactModal";
import CommandModal from "@/components/CommandModal";
import CreateGroupChatModal from "@/components/CreateGroupChatModal";
import ProfilePhotoModal from "@/components/ProfilePhotoModal";
import ZeroDelayAvatar from "@/components/ZeroDelayAvatar";

import { usePWABadge } from "@/hooks/usePWABadge";
import { usePWABadgeManager } from "@/hooks/usePWABadgeManager";
import { useNativeBadgeManager } from "@/hooks/useNativeBadgeManager";
import { useIndependentBadge } from "@/hooks/useIndependentBadge";
import QRCodeModal from "@/components/QRCodeModal";
import InstantAvatar from "@/components/InstantAvatar";
import { BannerNotificationContainer } from "@/components/MobileBannerNotification";
import LoadingScreen from "@/components/LoadingScreen";
import { ConnectionStatusIndicator } from "@/components/ConnectionStatusIndicator";

import { TelegramStyleNotificationManager } from "@/components/TelegramStyleNotificationManager";
import { useCapacitorPushNotifications } from "@/hooks/useCapacitorPushNotifications";
import { SimplePushManager } from "@/components/SimplePushManager";

import ModernSettingsPage from "@/components/ModernSettingsPage";

import BlockedContactsPage from "@/components/BlockedContactsPage";
import SimpleSpacePage from "@/pages/SimpleSpacePage";
import LinkedInSpacePage from "@/pages/LinkedInSpacePage";
import InboxPage from "@/pages/InboxPage";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookUser, MessageCircle, Bookmark, Settings, Search, MessageSquare, Users, Building2, Shield, UserX, Camera, QrCode, Inbox } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { UploadProvider } from "@/contexts/UploadContext";

export default function MainApp() {
  const { user, isLoading } = useAuth();
  const queryClient = useQueryClient();
  const { preloadImage, isLoading: imagePreloading } = useImagePreloader();
  const [location, setLocation] = useLocation();
  const params = useParams();
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
    qrCode: false,
  });
  const [commandModalData, setCommandModalData] = useState<any>(null);
  const [messageDataForCommand, setMessageDataForCommand] = useState<any>(null);
  const [contactFilter, setContactFilter] = useState<number | null>(null);
  const [friendFilter, setFriendFilter] = useState<number | null>(null);

  const { sendMessage, connectionState, pendingMessageCount, subscribeToSignaling } = useWebSocketContext();
  
  // PWA badge functionality - always active, independent of push notifications
  const { updateBadge, clearBadge, unreadCount } = usePWABadge();
  
  // Comprehensive PWA badge manager for accurate total count
  const { currentBadgeCount, totalUnread } = usePWABadgeManager();
  
  // Native iOS badge manager - uses Capacitor PushNotifications.setBadgeCount
  const { currentBadgeCount: nativeBadgeCount, setBadgeCount: setNativeBadge, clearBadge: clearNativeBadge } = useNativeBadgeManager();
  
  // Independent badge system - works without app execution
  const { forceBadgeRefresh, clearBadge: clearIndependentBadge } = useIndependentBadge();
  
  // iOS Capacitor native push notifications
  const { isRegistered: isIOSRegistered, clearBadge: clearIOSBadge } = useCapacitorPushNotifications();

  // Fetch unread AI Inbox count
  const { data: unreadInboxData } = useQuery<{ count: number }>({
    queryKey: ["/api/ai-notices/unread-count"],
    enabled: !!user,
    refetchInterval: 30000,
  });

  const unreadInboxCount = unreadInboxData?.count || 0;

  // Register navigation service and handle pending deep links from push notifications
  useEffect(() => {
    // Register the navigator with the navigation service
    navigationService.registerNavigator(setLocation);
    console.log('✅ Navigator registered with navigation service');

    // Check for pending deep link from cold start (push notification clicked while app was closed)
    const pendingDeepLink = localStorage.getItem('pendingDeepLink');
    if (pendingDeepLink && user) {
      console.log('🔗 Found pending deep link from cold start:', pendingDeepLink);
      
      // Clear the pending deep link immediately to prevent re-navigation
      localStorage.removeItem('pendingDeepLink');
      
      // Navigate to the pending deep link
      console.log('🚀 Navigating to pending deep link:', pendingDeepLink);
      setLocation(pendingDeepLink);
      
      // Extract chatRoomId from the path and update state
      const match = pendingDeepLink.match(/\/chat-rooms\/(\d+)/);
      if (match) {
        const chatRoomId = parseInt(match[1]);
        setSelectedChatRoom(chatRoomId);
        setShowMobileChat(true);
        setActiveTab("chats");
        setActiveMobileTab("chats");
        console.log('✅ Chat room selected from deep link:', chatRoomId);
      }
    }
  }, [user, setLocation]);

  // Handle push notification clicks from Service Worker
  useEffect(() => {
    if (!('serviceWorker' in navigator)) {
      console.log('🚫 Service Worker not supported');
      return;
    }

    const handleServiceWorkerMessage = (event: MessageEvent) => {
      console.log('📨 Message received from Service Worker:', event.data);
      
      const { type, chatRoomId, url } = event.data;

      if (type === 'NOTIFICATION_CLICKED') {
        console.log('🔔 Push notification clicked - navigating to chat:', chatRoomId);
        
        if (chatRoomId) {
          // Open the specific chat room
          setSelectedChatRoom(chatRoomId);
          setShowMobileChat(true);
          setActiveTab("chats");
          setActiveMobileTab("chats");
          
          // Navigate to the chat URL
          if (url) {
            setLocation(url);
          }
          
          // Refresh chat data immediately
          queryClient.invalidateQueries({ queryKey: ['/api/chat-rooms'] });
          queryClient.invalidateQueries({ queryKey: ["/api/chat-rooms", chatRoomId, "messages"] });
          
          console.log('✅ Navigated to chat room from push notification:', chatRoomId);
        } else if (url) {
          // Just navigate to the URL
          setLocation(url);
        }
      }
    };

    navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
    console.log('✅ Service Worker message listener registered');

    return () => {
      navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage);
      console.log('🧹 Service Worker message listener removed');
    };
  }, [setLocation, queryClient]);

  // Immediate data synchronization when app becomes visible (like Telegram/WhatsApp)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && user) {
        console.log('🔄 PWA app opened - syncing messages immediately');
        
        // Force refresh all critical data immediately
        queryClient.invalidateQueries({ queryKey: ['/api/chat-rooms'] });
        queryClient.invalidateQueries({ queryKey: ['/api/unread-counts'] });
        queryClient.invalidateQueries({ queryKey: ['/api/contacts'] });
        
        // If a chat room is selected, refresh its messages immediately
        if (selectedChatRoom) {
          queryClient.invalidateQueries({ queryKey: ["/api/chat-rooms", selectedChatRoom, "messages"] });
        }
      }
    };

    const handleFocus = () => {
      if (user) {
        console.log('🔄 PWA app focused - syncing messages immediately');
        
        // Force refresh all critical data immediately
        queryClient.invalidateQueries({ queryKey: ['/api/chat-rooms'] });
        queryClient.invalidateQueries({ queryKey: ['/api/unread-counts'] });
        queryClient.invalidateQueries({ queryKey: ['/api/contacts'] });
        
        // If a chat room is selected, refresh its messages immediately
        if (selectedChatRoom) {
          queryClient.invalidateQueries({ queryKey: ["/api/chat-rooms", selectedChatRoom, "messages"] });
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [user, queryClient, selectedChatRoom]);

  // 브라우저 뒤로가기 버튼 처리 - 앱 내 네비게이션 관리
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      const state = event.state;
      
      // 채팅방이 열려있는 경우 채팅방을 닫고 목록으로 돌아가기
      if (showMobileChat && selectedChatRoom) {
        setShowMobileChat(false);
        setSelectedChatRoom(null);
        return;
      }
      
      // 설정 페이지가 열려있는 경우 설정 닫기
      if (showSettings) {
        setShowSettings(false);
        return;
      }
      
      // 모달이 열려있는 경우 모달 닫기
      if (modals.addContact || modals.command || modals.createGroup || modals.profilePhoto) {
        setModals({
          addContact: false,
          command: false,
          createGroup: false,
          profilePhoto: false,

          qrCode: false,
        });
        return;
      }

      // 상태가 있으면 해당 상태로 복원
      if (state) {
        if (state.tab) setActiveTab(state.tab);
        if (state.mobileTab) setActiveMobileTab(state.mobileTab);
        if (state.chatRoom) setSelectedChatRoom(state.chatRoom);
        if (state.showMobileChat !== undefined) setShowMobileChat(state.showMobileChat);
        if (state.showSettings !== undefined) setShowSettings(state.showSettings);
      }
    };

    window.addEventListener('popstate', handlePopState);
    
    // 초기 히스토리 상태 설정
    if (!window.history.state) {
      window.history.replaceState({
        tab: activeTab,
        mobileTab: activeMobileTab,
        chatRoom: selectedChatRoom,
        showMobileChat,
        showSettings
      }, '', location);
    }

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [showMobileChat, selectedChatRoom, showSettings, modals, activeTab, activeMobileTab, location]);

  // 상태 변경 시 히스토리 업데이트
  useEffect(() => {
    const newState = {
      tab: activeTab,
      mobileTab: activeMobileTab,
      chatRoom: selectedChatRoom,
      showMobileChat,
      showSettings
    };
    
    // 현재 상태와 다른 경우에만 히스토리 추가
    const currentState = window.history.state;
    if (!currentState || JSON.stringify(currentState) !== JSON.stringify(newState)) {
      window.history.pushState(newState, '', location);
    }
  }, [activeTab, activeMobileTab, selectedChatRoom, showMobileChat, showSettings, location]);

  // Handle URL parameters for chat room and friend filter
  useEffect(() => {
    // Handle /chat-rooms/:chatRoomId route
    if (params.chatRoomId) {
      const roomId = parseInt(params.chatRoomId);
      if (!isNaN(roomId)) {
        setSelectedChatRoom(roomId);
        setShowMobileChat(true);
        setActiveTab("chats");
        setActiveMobileTab("chats");
      }
    }
    
    // Handle URL query parameters
    const urlParams = new URLSearchParams(window.location.search);
    const friendFilterParam = urlParams.get('friendFilter');
    const tabParam = urlParams.get('tab');
    const inviteParam = urlParams.get('invite');
    
    // Handle tab switching from URL
    if (tabParam) {
      setActiveTab(tabParam);
      setActiveMobileTab(tabParam);
    }
    
    // Handle invite parameter - switch to contacts tab for group invite
    if (inviteParam) {
      const chatRoomId = parseInt(inviteParam);
      if (!isNaN(chatRoomId)) {
        // Store the invite chatRoomId for ContactsList to handle
        (window as any).__inviteChatRoomId = chatRoomId;
        setActiveTab("contacts");
        setActiveMobileTab("contacts");
      }
    }
    
    if (friendFilterParam) {
      const friendId = parseInt(friendFilterParam);
      setFriendFilter(friendId);
      setActiveMobileTab("chats");
      setActiveTab("chats");
      
      // Clear the URL parameter after setting the filter
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }
  }, [params.chatRoomId]);

  // Get contacts with immediate refresh like native messaging apps
  const { data: contactsData } = useQuery({
    queryKey: ["/api/contacts"],
    enabled: !!user,
    staleTime: 30000, // 30초 캐시로 성능 개선
    refetchOnMount: true, // Always refresh when component mounts
    refetchOnWindowFocus: true, // Refresh when app becomes visible
    refetchInterval: 120000, // 2분마다 업데이트로 배터리 절약
  });

  // Get chat rooms data with immediate refresh like native messaging apps
  const { data: chatRoomsData } = useQuery({
    queryKey: ["/api/chat-rooms"],
    enabled: !!user,
    staleTime: 30000, // 30초 캐시로 성능 개선
    refetchOnMount: true, // Always refresh when component mounts
    refetchOnWindowFocus: true, // Refresh when app becomes visible
    refetchInterval: 90000, // 1.5분마다 업데이트로 배터리 절약
  });

  // Profile images are now preloaded during authentication in useAuth hook

  // Prefetch messages for recent chat rooms
  useEffect(() => {
    if ((chatRoomsData as any)?.chatRooms && queryClient) {
      // 최근 채팅방 5개의 메시지를 미리 로딩
      const recentChatRooms = (chatRoomsData as any).chatRooms.slice(0, 5);
      
      recentChatRooms.forEach((room: any, index: number) => {
        // 각 요청을 100ms씩 지연시켜 서버 부하 분산
        setTimeout(() => {
          queryClient.prefetchQuery({
            queryKey: ["/api/chat-rooms", room.id, "messages"],
            queryFn: async () => {
              const response = await apiRequest(`/api/chat-rooms/${room.id}/messages?limit=30&offset=0`, "GET");
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

  // Handler for navigating to a bookmarked message
  const handleNavigateToBookmark = (chatRoomId: number, messageId: number) => {
    // Navigate to the chat room
    setSelectedChatRoom(chatRoomId);
    setActiveMobileTab("chats");
    setShowMobileChat(true);
    
    // Store the message ID to scroll to it in ChatArea
    // We'll use a slight delay to ensure ChatArea is mounted
    setTimeout(() => {
      const messageElement = document.getElementById(`message-${messageId}`);
      if (messageElement) {
        messageElement.scrollIntoView({ behavior: "smooth", block: "center" });
        // Add a highlight effect
        messageElement.classList.add("highlight-message");
        setTimeout(() => {
          messageElement.classList.remove("highlight-message");
        }, 2000);
      }
    }, 500);
  };








  // 네이티브 앱에서는 권한 모달 불필요

  // Clear app badge when app becomes active (iPhone PWA) - enhanced with PWA badge hook
  useEffect(() => {
    // Clear badge when app loads
    if (user) {
      clearBadge();
    }

    // Clear badge when app becomes visible
    const handleVisibilityChange = () => {
      if (!document.hidden && user) {
        clearBadge();
      }
    };

    const handleFocus = () => {
      if (user) {
        clearBadge();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [user, clearBadge]);

  // 친구와의 채팅방 찾기 또는 생성
  const createOrFindChatRoom = (contactUserId: number, contactUser: any) => {
    // 해당 친구와의 기존 채팅방이 있는지 확인
    const existingChatRoom = (chatRoomsData as any)?.chatRooms?.find((room: any) => {
      return room.participants?.length === 2 && 
             room.participants?.some((p: any) => p.id === contactUserId) &&
             room.participants?.some((p: any) => p.id === user?.id);
    });

    if (existingChatRoom) {
      // 기존 채팅방이 있으면 해당 채팅방 선택
      setSelectedChatRoom(existingChatRoom.id);
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
    
    // Clear PWA badge when entering a chat room
    clearBadge();
  };

  const closeModals = () => {
    setModals({ addContact: false, command: false, createGroup: false, profilePhoto: false, qrCode: false });
    setCommandModalData(null);
    setMessageDataForCommand(null);
  };

  const handleGroupChatSuccess = (chatRoomId: number) => {
    setSelectedChatRoom(chatRoomId);
    setActiveTab("chats");
  };

  // Calculate unread counts for tabs - fix for reduce error
  const calculateUnreadCounts = () => {
    const unreadCounts = (unreadCountsData as any)?.unreadCounts || [];
    
    let totalChatUnread = 0;
    
    // Ensure unreadCounts is an array before processing
    if (Array.isArray(unreadCounts)) {
      unreadCounts.forEach((unread: any) => {
        totalChatUnread += unread.unreadCount || 0;
      });
    }
    
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
    <UploadProvider>
      <div className="fixed inset-0 bg-white dark:bg-gray-900">
      {/* Desktop Layout */}
      <div className="hidden lg:flex h-full">
        {/* Sidebar */}
        <div className="w-96 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex flex-col">
          {/* Header */}
          <div className="p-4 pt-[calc(1.7rem+env(safe-area-inset-top))] border-b border-gray-200 dark:border-gray-700 purple-gradient">
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
            } else if (value === "bookmark") {
              setRightPanelContent("bookmark");
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
                value="bookmark"
                className={cn(
                  "py-2 px-3 text-sm font-medium rounded-none border-b-2 border-transparent flex-col items-center gap-1 min-w-0",
                  "data-[state=active]:border-purple-600 data-[state=active]:bg-purple-50 data-[state=active]:text-purple-600"
                )}
              >
                <Bookmark className="h-4 w-4" />
                <span className="text-xs truncate">북마크</span>
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

            <div className="flex-1 overflow-hidden relative">
                {activeTab === "contacts" && (
                  <div
                    key="desktop-contacts"
                    className="absolute inset-0"
                  >
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
                        onNavigateToChat={(chatRoomId) => {
                          setSelectedChatRoom(chatRoomId);
                          setActiveTab("chats");
                        }}
                      />
                    </TabsContent>
                  </div>
                )}
                
                {activeTab === "chats" && (
                  <div
                    key="desktop-chats"
                    className="absolute inset-0"
                  >
                    <TabsContent value="chats" className="h-full m-0">
                      <ChatsList 
                        onSelectChat={(chatId) => {
                          setSelectedChatRoom(chatId);
                          setLocation(`/chat-rooms/${chatId}`);
                        }}
                        selectedChatId={selectedChatRoom}
                        onCreateGroup={() => setModals({ ...modals, createGroup: true })}
                        contactFilter={contactFilter || undefined}
                        onClearFilter={() => setContactFilter(null)}
                      />
                    </TabsContent>
                  </div>
                )}

                {activeTab === "bookmark" && (
                  <div
                    key="desktop-bookmark"
                    className="absolute inset-0"
                  >
                    <TabsContent value="bookmark" className="h-full m-0">
                      <BookmarkList onNavigateToMessage={handleNavigateToBookmark} />
                    </TabsContent>
                  </div>
                )}
                
                {activeTab === "settings" && (
                  <div
                    key="desktop-settings"
                    className="absolute inset-0"
                  >
                    <TabsContent value="settings" className="h-full m-0">
                      <div className="h-full flex flex-col bg-white">
                        <div className="flex justify-between items-center p-4 border-b flex-shrink-0">
                          <h2 className="text-lg font-semibold text-gray-900">설정</h2>
                          <button
                            onClick={() => setModals(prev => ({ ...prev, qrCode: true }))}
                            className="p-2 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                            title="QR 코드 생성"
                          >
                            <QrCode className="h-6 w-6" />
                          </button>
                        </div>
                        <div className="flex-1 overflow-y-auto scrollbar-thin" style={{ maxHeight: 'calc(100vh - 200px)' }}>
                          <div className="p-4 space-y-4">
                            {/* 프로필 섹션 */}
                            <div 
                              className="mb-6 bg-white rounded-xl p-4 shadow-sm border border-gray-200 hover:shadow-md transition-shadow cursor-pointer"
                              onClick={() => setRightPanelContent("profile")}
                            >
                              <div className="flex items-center space-x-3">
                                <div className="relative">
                                  <div 
                                    className="w-12 h-12 cursor-pointer hover:ring-2 hover:ring-purple-500 transition-all"
                                    onClick={(e: any) => {
                                      e.stopPropagation();
                                      setModals({ ...modals, profilePhoto: true });
                                    }}
                                  >
                                    <InstantAvatar 
                                      src={user?.profilePicture}
                                      fallbackText={user?.displayName?.charAt(0) || user?.username?.charAt(0) || "U"}
                                      size="lg"
                                      className="w-full h-full"
                                    />
                                  </div>
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
                      </div>
                    </TabsContent>
                  </div>
                )}
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
          ) : rightPanelContent === "bookmark" ? (
            <div className="flex-1 bg-gray-50 overflow-y-auto">
              <div className="max-w-4xl mx-auto p-6">
                <div className="flex items-center justify-between mb-6">
                  <h1 className="text-2xl font-bold text-gray-900">북마크</h1>
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
                <BookmarkList onNavigateToMessage={handleNavigateToBookmark} />
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

          ) : selectedChatRoom ? (
            <div className="flex-1 flex flex-col">
              {/* Connection Status Indicator */}
              <div className="flex-shrink-0 p-2">
                <ConnectionStatusIndicator 
                  connectionState={connectionState}
                  pendingMessageCount={pendingMessageCount}
                  className="mx-auto max-w-sm"
                />
              </div>
              
              <ChatArea 
                chatRoomId={selectedChatRoom}
                onCreateCommand={handleCreateCommand}
              />
            </div>
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
        {/* Fixed Mobile Header - Hide when viewing chat */}
        {!showMobileChat && (
          <div className="flex-shrink-0 purple-gradient p-4 pt-[calc(1.7rem+env(safe-area-inset-top))] text-white fixed top-0 left-0 right-0 z-50 lg:hidden">
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
        )}

        {/* Mobile Content with improved padding for Footer visibility */}
        <div className={cn(
          "flex-1 overflow-hidden relative",
          showMobileChat ? "pt-0 pb-0" : "pt-24 pb-20"
        )}>
            {activeMobileTab === "contacts" && (
              <div
                key="contacts"
                className="absolute inset-0 flex flex-col"
              >
                {/* Search Header for Contacts */}
                <div className="flex-shrink-0 p-4 bg-gray-50 border-b border-gray-200">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <input
                      type="text"
                      placeholder="연락처 검색..."
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                </div>
                
                <div className="flex-1 overflow-hidden">
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
                    onNavigateToChat={(chatRoomId) => {
                      setSelectedChatRoom(chatRoomId);
                      setActiveMobileTab("chats");
                      setShowMobileChat(true);
                    }}
                  />
                </div>
              </div>
            )}
            {activeMobileTab === "chats" && (
              <div
                key="chats"
                className={`absolute inset-0 flex flex-col bg-white transition-transform duration-300 ease-out ${
                  showMobileChat ? '-translate-x-full' : 'translate-x-0'
                }`}
                style={{ zIndex: showMobileChat ? 10 : 20 }}
              >
                {/* Search Header for Chats */}
                <div className="flex-shrink-0 p-4 bg-gray-50 border-b border-gray-200">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <input
                      type="text"
                      placeholder="채팅방 검색..."
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                </div>
                
                <div className="flex-1 overflow-hidden">
                  <ChatsList 
                    onSelectChat={(chatId) => {
                      setSelectedChatRoom(chatId);
                      setShowMobileChat(true);
                      setLocation(`/chat-rooms/${chatId}`);
                    }}
                    selectedChatId={selectedChatRoom}
                    onCreateGroup={() => setModals({ ...modals, createGroup: true })}
                    contactFilter={contactFilter || undefined}
                    onClearFilter={() => setContactFilter(null)}
                    friendFilter={friendFilter}
                    onClearFriendFilter={() => setFriendFilter(null)}
                  />
                </div>
              </div>
            )}

            {showMobileChat && selectedChatRoom && (
              <div
                key="chat-area"
                className="absolute inset-0 h-full flex flex-col overflow-hidden"
              >
                {/* Mobile Connection Status Indicator */}
                <div className="flex-shrink-0 p-2">
                  <ConnectionStatusIndicator 
                    connectionState={connectionState}
                    pendingMessageCount={pendingMessageCount}
                    className="mx-auto max-w-xs"
                  />
                </div>
                
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
            {activeMobileTab === "bookmark" && (
              <div
                key="bookmark"
                className="absolute inset-0 flex flex-col"
              >
                {/* Search Header for Bookmark */}
                <div className="flex-shrink-0 p-4 bg-gray-50 border-b border-gray-200">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <input
                      type="text"
                      placeholder="북마크 검색..."
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                </div>
                
                <div className="flex-1 overflow-hidden">
                  <BookmarkList onNavigateToMessage={handleNavigateToBookmark} />
                </div>
              </div>
            )}
            {activeMobileTab === "inbox" && (
              <div
                key="inbox"
                className="absolute inset-0 top-20 flex flex-col"
              >
                <InboxPage />
              </div>
            )}
            {activeMobileTab === "settings" && (
              <div
                key="settings"
                className="absolute inset-0 flex flex-col"
              >
                {/* Header for Settings */}
                <div className="flex-shrink-0 p-4 bg-gray-50 border-b border-gray-200">
                  <div className="flex justify-between items-center">
                    <h2 className="text-lg font-semibold text-gray-900">설정</h2>
                    <button
                      onClick={() => setModals(prev => ({ ...prev, qrCode: true }))}
                      className="p-2 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                      title="QR 코드 생성"
                    >
                      <QrCode className="h-6 w-6" />
                    </button>
                  </div>
                </div>
                
                <div className="flex-1 overflow-hidden">
                  <ModernSettingsPage 
                    isMobile={true} 
                    onQRCodeClick={() => setModals(prev => ({ ...prev, qrCode: true }))}
                  />
                </div>
              </div>
            )}
        </div>

        {/* Fixed Mobile Bottom Navigation - Always visible with safe area */}
        {!showMobileChat && (
          <div className="bg-white border-t border-gray-200 pb-safe pt-2 px-2 fixed bottom-0 left-0 right-0 z-40 lg:hidden" style={{ paddingBottom: 'max(8px, env(safe-area-inset-bottom))' }}>
            <div className="flex justify-around items-end relative">
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

              {/* Central Inbox FAB Button */}
              <button
                className={cn(
                  "flex items-center justify-center w-14 h-14 rounded-full shadow-lg -mt-6 transition-all relative",
                  activeMobileTab === "inbox"
                    ? "bg-purple-600 text-white scale-110" 
                    : "bg-gradient-to-br from-purple-600 to-purple-700 text-white hover:scale-105"
                )}
                onClick={() => setActiveMobileTab("inbox")}
                data-testid="button-inbox"
              >
                <Inbox className="h-6 w-6" />
                {unreadInboxCount > 0 && (
                  <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5 shadow-md animate-pulse">
                    {unreadInboxCount > 99 ? "99+" : unreadInboxCount}
                  </div>
                )}
              </button>

              <Button
                variant="ghost"
                className={cn(
                  "flex flex-col items-center py-1 px-2",
                  activeMobileTab === "bookmark" ? "text-purple-600" : "text-gray-400"
                )}
                onClick={() => setActiveMobileTab("bookmark")}
              >
                <Bookmark className="h-4 w-4" />
                <span className="text-xs mt-0.5">북마크</span>
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
      


      <QRCodeModal
        isOpen={modals.qrCode}
        onClose={() => setModals(prev => ({ ...prev, qrCode: false }))}
      />

      {/* Telegram-style notification and PWA badge management */}
      <TelegramStyleNotificationManager />
      
      {/* PWA Push Notification Manager - handles push subscription registration */}
      <SimplePushManager />
      
      {/* Mobile Banner Notifications - replaces bottom popup notifications */}
      <BannerNotificationContainer />

      {/* Loading screen overlay */}
      {isLoading && (
        <div className="fixed inset-0 z-50 bg-white">
          <LoadingScreen message="로딩 중..." />
        </div>
      )}
    </div>
    </UploadProvider>
  );
}
