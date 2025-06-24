import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useImagePreloader, preloadGlobalImage } from "@/hooks/useImagePreloader";

import { useLocation } from "wouter";

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
import { PWAPushManager } from "@/components/PWAPushManager";
import { usePWABadge } from "@/hooks/usePWABadge";
import QRCodeModal from "@/components/QRCodeModal";
import InstantAvatar from "@/components/InstantAvatar";
import { BannerNotificationContainer } from "@/components/MobileBannerNotification";
import LoadingScreen from "@/components/LoadingScreen";
import { ConnectionStatusIndicator } from "@/components/ConnectionStatusIndicator";
import { PermissionRequestModal } from "@/components/PermissionRequestModal";

import ModernSettingsPage from "@/components/ModernSettingsPage";

import BlockedContactsPage from "@/components/BlockedContactsPage";
import SimpleSpacePage from "@/pages/SimpleSpacePage";
import LinkedInSpacePage from "@/pages/LinkedInSpacePage";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookUser, MessageCircle, Archive, Settings, Search, MessageSquare, Users, Building2, Shield, UserX, Camera, QrCode } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export default function MainApp() {
  const { user, isLoading } = useAuth();
  const { updateBadge, clearBadge } = usePWABadge();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { preloadImage, isLoading: imagePreloading } = useImagePreloader();
  const [location, setLocation] = useLocation();
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
    permissions: false,
    qrCode: false,
  });
  const [commandModalData, setCommandModalData] = useState<any>(null);
  const [messageDataForCommand, setMessageDataForCommand] = useState<any>(null);
  const [contactFilter, setContactFilter] = useState<number | null>(null);
  const [friendFilter, setFriendFilter] = useState<number | null>(null);

  const { sendMessage, connectionState, pendingMessageCount } = useWebSocket(user?.id);

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
      if (modals.addContact || modals.command || modals.createGroup || modals.profilePhoto || modals.permissions) {
        setModals({
          addContact: false,
          command: false,
          createGroup: false,
          profilePhoto: false,
          permissions: false,
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

  // Request permissions and register push notifications after login
  useEffect(() => {
    if (!user) return;
    
    console.log('MainApp rendering with user:', user.id);
    
    // Check if permissions have been requested before
    const microphoneGranted = localStorage.getItem('microphonePermissionGranted');
    const notificationGranted = localStorage.getItem('notificationPermissionGranted');
    
    // 첫 로그인 시 자동으로 푸시 알림 권한 요청 및 등록 (기본값 ON)
    if (!notificationGranted) {
      setTimeout(async () => {
        await autoEnablePushNotifications();
      }, 1500);
    } else if (notificationGranted === 'true') {
      // If notifications are already granted, ensure push subscription is registered
      setTimeout(() => {
        registerPushNotification();
      }, 1000);
    }
    
    // Always try to register push subscription for existing users
    setTimeout(() => {
      ensurePushSubscription();
    }, 2000);
    
    // Only show permission modal if microphone permission hasn't been handled yet
    if (!microphoneGranted && notificationGranted !== 'false') {
      setTimeout(() => {
        setModals(prev => ({ ...prev, permissions: true }));
      }, 3000); // Delay after push notification setup
    }
  }, [user]);

  // Function to register push notifications
  const registerPushNotification = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.log('Push notifications not supported');
      return false;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      if (!registration.pushManager) return false;

      // Check if already subscribed
      const existingSubscription = await registration.pushManager.getSubscription();
      
      console.log('🔍 Push subscription check:', {
        hasExistingSubscription: !!existingSubscription,
        userId: user?.id,
        notificationPermission: Notification.permission
      });

      if (existingSubscription) {
        console.log('🔄 Verifying existing subscription with server...');
        
        // Verify existing subscription with server
        const verifyResponse = await fetch('/api/push-subscription', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-User-ID': user?.id?.toString() || ''
          },
          body: JSON.stringify(existingSubscription)
        });
        
        if (verifyResponse.ok) {
          console.log('✅ Existing subscription verified with server');
          return true;
        } else {
          console.log('⚠️ Existing subscription verification failed, creating new one...');
        }
      }

      console.log('🔔 Creating new push subscription...');
      
      // Get VAPID public key from server
      const vapidResponse = await fetch('/api/vapid-public-key');
      const { publicKey } = await vapidResponse.json();
      
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: publicKey
      });

      // Send subscription to server
      const response = await fetch('/api/push-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': user?.id?.toString() || ''
        },
        body: JSON.stringify(subscription)
      });

      if (response.ok) {
        console.log('✅ Push subscription registered successfully');
        localStorage.setItem('notificationPermissionGranted', 'true');
        return true;
      } else {
        console.error('❌ Failed to register push subscription');
        return false;
      }
    } catch (error) {
      console.error('Push notification registration failed:', error);
      return false;
    }
  };

  // Function to ensure push subscription exists for all users  
  const ensurePushSubscription = async () => {
    if (!user?.id) {
      console.log('⚠️ No user ID available for push subscription check');
      return;
    }

    console.log('🔍 Checking push subscription status for user:', user.id);
    
    // Check server-side subscription status
    try {
      const statusResponse = await fetch('/api/push-subscription/status', {
        headers: {
          'X-User-ID': user.id.toString()
        }
      });
      
      if (statusResponse.ok) {
        const { isSubscribed, subscriptionCount } = await statusResponse.json();
        console.log(`📊 Server subscription status:`, { isSubscribed, subscriptionCount });
        
        if (isSubscribed) {
          console.log('✅ User already has active push subscription');
          localStorage.setItem('notificationPermissionGranted', 'true');
          return;
        }
      }
    } catch (error) {
      console.error('Failed to check server subscription status:', error);
    }

    // If notification permission is granted but no server subscription, register one
    if (Notification.permission === 'granted') {
      console.log('🔔 Permission granted but no subscription found, registering...');
      const success = await registerPushNotification();
      
      if (success) {
        console.log('✅ Push subscription successfully ensured');
      } else {
        console.log('❌ Failed to ensure push subscription');
      }
    } else {
      console.log('⚠️ Notification permission not granted:', Notification.permission);
    }
  };

  // Function to automatically enable push notifications on first login - iPhone PWA optimized
  const autoEnablePushNotifications = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.log('Push notifications not supported');
      return;
    }

    // iPhone PWA detection
    const isIPhonePWA = (window.navigator as any).standalone === true || 
                       window.matchMedia('(display-mode: standalone)').matches;
    
    if (isIPhonePWA) {
      console.log('📱 iPhone PWA detected - using enhanced notification setup');
    }

    try {
      // Check current permission state first
      console.log('Current notification permission:', Notification.permission);
      
      // For iPhone PWA, we need to be more aggressive about permission requests
      if (Notification.permission === 'default') {
        console.log('🔔 Requesting notification permission for first-time user...');
        const permission = await Notification.requestPermission();
        
        if (permission === 'granted') {
          console.log('✅ Auto-enabling push notifications on first login');
          localStorage.setItem('notificationPermissionGranted', 'true');
          
          // Force multiple registration attempts for iPhone PWA reliability
          let success = false;
          let attempts = 0;
          const maxAttempts = isIPhonePWA ? 3 : 1;
          
          while (!success && attempts < maxAttempts) {
            attempts++;
            console.log(`🔄 Push subscription attempt ${attempts}/${maxAttempts}`);
            
            try {
              success = await registerPushNotification();
              if (success) {
                console.log(`✅ Push subscription successful on attempt ${attempts}`);
                break;
              }
            } catch (error) {
              console.log(`⚠️ Attempt ${attempts} failed:`, error);
            }
            
            // Wait before retry
            if (attempts < maxAttempts) {
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
          }
          
          if (!success) {
            console.error('❌ All push subscription attempts failed');
          }
          
          console.log('🎉 Push notifications automatically enabled');
        } else {
          localStorage.setItem('notificationPermissionGranted', 'false');
          console.log('❌ Push notification permission denied');
        }
      } else if (Notification.permission === 'granted') {
        // Permission already granted, just ensure subscription
        console.log('🔔 Permission already granted, ensuring subscription...');
        localStorage.setItem('notificationPermissionGranted', 'true');
        await registerPushNotification();
      }
    } catch (error) {
      console.error('❌ Auto push notification setup failed:', error);
      localStorage.setItem('notificationPermissionGranted', 'false');
    }
  };

  const handlePermissionsComplete = () => {
    setModals(prev => ({ ...prev, permissions: false }));
  };

  // PWA 배지 시스템과 로그인 디버깅
  useEffect(() => {
    if (!user) {
      console.log('📱 MainApp: 사용자 없음 - 로그인 필요');
      return;
    }
    
    console.log('📱 MainApp: 사용자 로그인됨:', user.id, user.username);
    console.log('📱 PWA 모드 확인:', {
      standalone: window.navigator.standalone,
      displayMode: window.matchMedia('(display-mode: standalone)').matches
    });
    
    // 배지 시스템 초기화
    setTimeout(() => {
      updateBadge(0); // 초기 배지 클리어
    }, 1000);
  }, [user, updateBadge]);

  // Clear app badge when app becomes active (iPhone PWA)
  useEffect(() => {
    const clearAppBadge = () => {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then(registration => {
          if (registration.active) {
            registration.active.postMessage({
              type: 'CLEAR_BADGE'
            });
          }
        });
      }
    };

    // Clear badge when app becomes visible
    const handleVisibilityChange = () => {
      if (!document.hidden && user) {
        clearAppBadge();
      }
    };

    const handleFocus = () => {
      if (user) {
        clearAppBadge();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
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
    setModals({ ...modals, command: true, permissions: false });
  };

  const handleChatRoomSelect = (chatRoomId: number) => {
    setSelectedChatRoom(chatRoomId);
    setActiveTab("chats");
  };

  const closeModals = () => {
    setModals({ addContact: false, command: false, createGroup: false, profilePhoto: false, permissions: false });
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

  // 간단한 로그인 상태 체크
  if (!user) {
    return <Navigate to="/login" />;
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
                        onSelectChat={setSelectedChatRoom}
                        selectedChatId={selectedChatRoom}
                        onCreateGroup={() => setModals({ ...modals, createGroup: true })}
                        contactFilter={contactFilter || undefined}
                        onClearFilter={() => setContactFilter(null)}
                      />
                    </TabsContent>
                  </div>
                )}

                {activeTab === "archive" && (
                  <div
                    key="desktop-archive"
                    className="absolute inset-0"
                  >
                    <TabsContent value="archive" className="h-full m-0">
                      <ArchiveList />
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
                        <div className="flex justify-between items-center p-4 border-b">
                          <h2 className="text-lg font-semibold text-gray-900">설정</h2>
                          <button
                            onClick={() => setModals(prev => ({ ...prev, qrCode: true }))}
                            className="p-2 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                            title="QR 코드 생성"
                          >
                            <QrCode className="h-6 w-6" />
                          </button>
                        </div>
                        <div className="h-full overflow-y-auto">
                          <div className="p-4">
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
                isLocationChat={false}
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
        )}

        {/* Mobile Content with improved padding for Footer visibility */}
        <div className={cn(
          "flex-1 overflow-hidden relative",
          showMobileChat ? "pt-0 pb-0" : "pt-20 pb-20"
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
                  />
                </div>
              </div>
            )}
            {activeMobileTab === "chats" && !showMobileChat && (
              <div
                key="chats"
                className="absolute inset-0 flex flex-col"
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
            {activeMobileTab === "archive" && (
              <div
                key="archive"
                className="absolute inset-0 flex flex-col"
              >
                {/* Search Header for Archive */}
                <div className="flex-shrink-0 p-4 bg-gray-50 border-b border-gray-200">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <input
                      type="text"
                      placeholder="자료실 검색..."
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                </div>
                
                <div className="flex-1 overflow-hidden">
                  <ArchiveList />
                </div>
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
      
      {/* Permission Request Modal for PWA functionality */}
      <PermissionRequestModal
        isOpen={modals.permissions}
        onComplete={handlePermissionsComplete}
      />

      <QRCodeModal
        isOpen={modals.qrCode}
        onClose={() => setModals(prev => ({ ...prev, qrCode: false }))}
      />

      {/* Mobile Banner Notifications - replaces bottom popup notifications */}
      <BannerNotificationContainer />

      {/* Loading screen overlay for profile image preloading */}
      {(isLoading || isPreloadingImages) && (
        <div className="fixed inset-0 z-50 bg-white">
          <LoadingScreen message="프로필 이미지를 다운로드하는 중..." />
        </div>
      )}

      <PWAPushManager />
    </div>
  );
}
