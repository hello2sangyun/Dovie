import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useImagePreloader } from "@/hooks/useImagePreloader";
import VaultLogo from "@/components/VaultLogo";
import ContactsList from "@/components/ContactsList";
import ChatsList from "@/components/ChatsList";
import ArchiveList from "@/components/ArchiveList";
import ChatArea from "@/components/ChatArea";
import AddContactModal from "@/components/AddContactModal";
import CommandModal from "@/components/CommandModal";
import CreateGroupChatModal from "@/components/CreateGroupChatModal";


import ModernSettingsPage from "@/components/ModernSettingsPage";

import BlockedContactsPage from "@/components/BlockedContactsPage";
import SimpleSpacePage from "@/pages/SimpleSpacePage";
import LinkedInSpacePage from "@/pages/LinkedInSpacePage";
import EnhancedBusinessCard from "@/components/EnhancedBusinessCard";
import MobileOptimizedBusinessCard from "@/components/MobileOptimizedBusinessCard";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookUser, MessageCircle, Archive, Settings, Search, MessageSquare, Users, Building2, Shield, UserX, Camera, CreditCard, Menu, User, Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import CameraCapture from "@/components/CameraCapture";

export default function MainApp() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
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
  });
  const [commandModalData, setCommandModalData] = useState<any>(null);
  const [messageDataForCommand, setMessageDataForCommand] = useState<any>(null);
  const [contactFilter, setContactFilter] = useState<number | null>(null);
  const [friendFilter, setFriendFilter] = useState<number | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const { addToPreloadQueue } = useImagePreloader();

  // Add contact mutation for business card scanning
  const addContactMutation = useMutation({
    mutationFn: (contactData: any) => 
      apiRequest("/api/contacts", "POST", contactData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      toast({
        title: "연락처 추가 완료",
        description: "명함에서 추출한 정보로 연락처가 추가되었습니다.",
      });
    },
    onError: (error) => {
      console.error("Add contact error:", error);
      toast({
        variant: "destructive",
        title: "연락처 추가 실패",
        description: "연락처 추가 중 오류가 발생했습니다.",
      });
    },
  });

  // Handle camera capture for business card scanning
  const handleCameraCapture = async (file: File) => {
    try {
      console.log('Starting business card analysis...', file.name, file.size);
      
      toast({
        title: "명함 분석 중",
        description: "AI가 명함 정보를 추출하고 있습니다...",
      });
      
      // Create FormData and upload image
      const formData = new FormData();
      formData.append('image', file);

      console.log('Sending request to /api/business-cards/analyze');
      
      const response = await fetch('/api/business-cards/analyze', {
        method: 'POST',
        headers: {
          'x-user-id': localStorage.getItem('userId') || user?.id?.toString() || '',
        },
        body: formData,
      });

      console.log('Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Response error:', errorText);
        throw new Error(`분석 실패: ${response.status}`);
      }

      const result = await response.json();
      console.log('Analysis result:', result);
      
      if (result.success && result.analysis) {
        console.log('Auto-adding contact with:', result.analysis);
        
        // Create contact data from analysis
        const contactData = {
          name: result.analysis.name || "Unknown",
          email: result.analysis.email || "",
          phone: result.analysis.phone || "",
          company: result.analysis.company || "",
          jobTitle: result.analysis.title || "",
          notes: `명함에서 추출: ${result.analysis.additionalInfo || ""}`,
        };
        
        // Add to contacts automatically
        addContactMutation.mutate(contactData);
        
        // Switch to contacts tab to show the new contact
        setActiveMobileTab("contacts");
        
        toast({
          title: "명함 스캔 완료",
          description: `${result.analysis.name || '새 연락처'}가 친구 목록에 추가되었습니다.`,
        });
      } else {
        console.error('Analysis failed or no data:', result);
        throw new Error(result.error || '분석된 정보가 없습니다.');
      }
    } catch (error) {
      console.error('Camera capture error:', error);
      toast({
        variant: "destructive",
        title: "스캔 실패",
        description: error instanceof Error ? error.message : "명함 스캔 중 오류가 발생했습니다.",
      });
    }
  };

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

  // Optimized profile image preloading with debounce and limits
  useEffect(() => {
    if (!user) return;
    
    const timeoutId = setTimeout(() => {
      const imagesToPreload = new Set<string>();
      
      // Add current user's profile image
      if (user?.profilePicture) {
        imagesToPreload.add(`${user.profilePicture}?v=${user.id}`);
      }
      
      // Add contact profile images (limit to first 8 for performance)
      if ((contactsData as any)?.contacts) {
        (contactsData as any).contacts.slice(0, 8).forEach((contact: any) => {
          if (contact.contactUser?.profilePicture) {
            imagesToPreload.add(`${contact.contactUser.profilePicture}?v=${contact.contactUser.id}`);
          }
        });
      }
      
      // Add chat room participants' profile images (limit to recent 5 rooms)
      if ((chatRoomsData as any)?.chatRooms) {
        (chatRoomsData as any).chatRooms.slice(0, 5).forEach((room: any) => {
          if (room.participants) {
            room.participants.slice(0, 3).forEach((participant: any) => {
              if (participant.profilePicture && participant.id !== user?.id) {
                imagesToPreload.add(`${participant.profilePicture}?v=${participant.id}`);
              }
            });
          }
        });
      }
      
      // Batch preload with rate limiting to prevent network congestion
      if (imagesToPreload.size > 0) {
        Array.from(imagesToPreload).forEach((imageUrl, index) => {
          setTimeout(() => {
            const img = new Image();
            img.src = imageUrl;
          }, index * 100); // Stagger requests by 100ms
        });
      }
    }, 800); // Debounce by 800ms to avoid rapid re-execution
    
    return () => clearTimeout(timeoutId);
  }, [user?.id, (contactsData as any)?.contacts?.length, (chatRoomsData as any)?.chatRooms?.length]);

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
      toast({
        title: "채팅방 생성 완료",
        description: "새로운 채팅방이 생성되었습니다.",
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "채팅방 생성 실패",
        description: "다시 시도해주세요.",
      });
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
    setModals({ addContact: false, command: false, createGroup: false });
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
    const chatRooms = (chatRoomsData as any)?.chatRooms || [];
    
    let totalChatUnread = 0;
    let totalNearbyUnread = 0;
    
    unreadCounts.forEach((unread: any) => {
      const chatRoom = chatRooms.find((room: any) => room.id === unread.chatRoomId);
      if (chatRoom) {
        if (chatRoom.name?.includes('위치') || chatRoom.address) {
          // Location-based chat room
          totalNearbyUnread += unread.unreadCount;
        } else {
          // Regular chat room
          totalChatUnread += unread.unreadCount;
        }
      }
    });
    
    return { totalChatUnread, totalNearbyUnread };
  };

  const { totalChatUnread, totalNearbyUnread } = calculateUnreadCounts();

  if (!user) {
    return <div>Loading...</div>;
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
            if (value === "archive") {
              setRightPanelContent(value);
              setSelectedChatRoom(null);
            } else if (value === "settings") {
              // Go directly to advanced settings
              setRightPanelContent("settings");
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
                <span className="text-xs truncate">Cabinet</span>
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
                <span className="text-xs truncate">DM</span>
              </TabsTrigger>
              <TabsTrigger 
                value="onepager"
                className={cn(
                  "py-2 px-3 text-sm font-medium rounded-none border-b-2 border-transparent flex-col items-center gap-1 min-w-0",
                  "data-[state=active]:border-purple-600 data-[state=active]:bg-purple-50 data-[state=active]:text-purple-600"
                )}
              >
                <CreditCard className="h-4 w-4" />
                <span className="text-xs truncate">원페이저</span>
              </TabsTrigger>
              <TabsTrigger 
                value="archive"
                className={cn(
                  "py-2 px-3 text-sm font-medium rounded-none border-b-2 border-transparent flex-col items-center gap-1 min-w-0",
                  "data-[state=active]:border-purple-600 data-[state=active]:bg-purple-50 data-[state=active]:text-purple-600"
                )}
              >
                <Archive className="h-4 w-4" />
                <span className="text-xs truncate">Folder</span>
              </TabsTrigger>
              <TabsTrigger 
                value="settings"
                className={cn(
                  "py-2 px-3 text-sm font-medium rounded-none border-b-2 border-transparent flex-col items-center gap-1 min-w-0",
                  "data-[state=active]:border-purple-600 data-[state=active]:bg-purple-50 data-[state=active]:text-purple-600"
                )}
              >
                <Settings className="h-4 w-4" />
                <span className="text-xs truncate">Setting</span>
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
              

              
              <TabsContent value="onepager" className="h-full m-0">
                <div className="h-full overflow-y-auto pb-24">
                  <div className="p-4">
                    {/* 원페이저 헤더 */}
                    <div className="mb-6">
                      <h2 className="text-xl font-bold text-gray-900 mb-2">원페이저 (One Pager)</h2>
                      <p className="text-gray-600 text-sm">디지털 명함을 관리하고 명함을 스캔하여 자동으로 생성하세요</p>
                    </div>

                    {/* 내 원페이저 */}
                    <div 
                      className="mb-6 bg-white rounded-xl p-4 shadow-sm border border-gray-200 hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => setRightPanelContent("business-card")}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-gray-900">내 원페이저</h3>
                        <CreditCard className="w-5 h-5 text-blue-600" />
                      </div>
                      <p className="text-sm text-gray-600 mb-3">나의 디지털 명함을 확인하고 편집하세요</p>
                      <div className="flex items-center text-sm text-blue-600">
                        <span>프로필 보기</span>
                        <MessageCircle className="w-4 h-4 ml-1" />
                      </div>
                    </div>

                    {/* 명함 스캐너 */}
                    <div className="mb-6">
                      <h4 className="text-sm font-medium text-gray-600 mb-3">명함 스캐너</h4>
                      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <h3 className="font-semibold text-gray-900">종이 명함 스캔</h3>
                            <p className="text-sm text-gray-600">AI 기반 자동 인식 및 원페이저 생성</p>
                          </div>
                          <Camera className="w-8 h-8 text-blue-600" />
                        </div>
                        <Button 
                          onClick={() => window.location.href = '/card-scanner'}
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          명함 스캔 시작
                        </Button>
                      </div>
                    </div>

                    {/* 기능 안내 */}
                    <div className="mb-6">
                      <h4 className="text-sm font-medium text-gray-600 mb-3">주요 기능</h4>
                      <div className="space-y-3">
                        <div className="bg-white rounded-lg p-3 border border-gray-200">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                              <Camera className="w-4 h-4 text-green-600" />
                            </div>
                            <div>
                              <p className="font-medium text-sm text-gray-900">자동 명함 인식</p>
                              <p className="text-xs text-gray-500">ChatGPT 기반 정보 추출</p>
                            </div>
                          </div>
                        </div>
                        
                        <div className="bg-white rounded-lg p-3 border border-gray-200">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                              <Users className="w-4 h-4 text-blue-600" />
                            </div>
                            <div>
                              <p className="font-medium text-sm text-gray-900">자동 친구 추가</p>
                              <p className="text-xs text-gray-500">시스템 사용자 자동 연결</p>
                            </div>
                          </div>
                        </div>

                        <div className="bg-white rounded-lg p-3 border border-gray-200">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                              <MessageSquare className="w-4 h-4 text-purple-600" />
                            </div>
                            <div>
                              <p className="font-medium text-sm text-gray-900">DM 메시징</p>
                              <p className="text-xs text-gray-500">연결된 친구와 직접 소통</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="archive" className="h-full m-0">
                <div className="h-full flex items-center justify-center text-gray-500">
                  <p>저장소 내용은 우측 패널에서 확인하세요</p>
                </div>
              </TabsContent>
              
              <TabsContent value="settings" className="h-full m-0">
                <div className="h-full overflow-y-auto pb-24">
                  <div className="p-4">
                    {/* 프로필 섹션 */}
                    <div 
                      className="mb-6 bg-white rounded-xl p-4 shadow-sm border border-gray-200 hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => setRightPanelContent("profile")}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center relative">
                          <BookUser className="w-6 h-6 text-white" />
                          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-purple-600 rounded-full flex items-center justify-center">
                            <span className="text-xs text-white font-bold">D</span>
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
                  <h1 className="text-2xl font-bold text-gray-900">My Space</h1>
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
            <div className="flex-1 bg-gray-50 overflow-y-auto pb-24">
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
            <div className="flex-1 bg-gray-50 overflow-y-auto pb-24">
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
          ) : rightPanelContent === "digital-command" ? (
            <div className="flex-1 bg-gray-50 overflow-y-auto pb-24">
              <div className="max-w-4xl mx-auto p-6">
                <div className="flex items-center justify-between mb-6">
                  <h1 className="text-2xl font-bold text-gray-900">디지털 명함</h1>
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
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">내 명함 정보</h3>
                    <div className="space-y-4">
                      <div className="flex items-center space-x-4">
                        <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                          <BookUser className="w-8 h-8 text-white" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900">{user?.displayName}</h4>
                          <p className="text-gray-600">@{user?.username}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">이름</label>
                          <p className="text-gray-900">{user?.displayName}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">사용자명</label>
                          <p className="text-gray-900">@{user?.username}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">이메일</label>
                          <p className="text-gray-900">{user?.email || "미설정"}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">회사</label>
                          <p className="text-gray-900">미설정</p>
                        </div>
                      </div>
                      <Button 
                        className="w-full"
                        onClick={() => setRightPanelContent("profile-edit")}
                      >
                        명함 정보 수정
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
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
              <VaultLogo size="sm" />
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
                  isLocationChat={false}
                  onBackClick={() => {
                    setShowMobileChat(false);
                    setSelectedChatRoom(null);
                  }}
                />
              </div>
            </div>
          )}
          {activeMobileTab === "archive" && <ArchiveList />}
          {activeMobileTab === "digital-card" && (
            <div className="h-full overflow-hidden">
              <EnhancedBusinessCard />
            </div>
          )}

          {activeMobileTab === "explore" && (
            <div className="h-full bg-gradient-to-br from-blue-50 to-indigo-50 overflow-y-auto">
              <div className="p-6 space-y-6">
                <div className="text-center">
                  <h1 className="text-2xl font-bold text-gray-900 mb-2">Folder</h1>
                  <p className="text-gray-600">채팅방에 업로드한 모든 자료를 확인하세요</p>
                </div>

                {/* File Categories */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mb-3">
                      <Archive className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-1">문서</h3>
                    <p className="text-sm text-gray-500">PDF, DOC, PPT 파일</p>
                  </div>

                  <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                    <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center mb-3">
                      <Camera className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-1">이미지</h3>
                    <p className="text-sm text-gray-500">사진, 스크린샷</p>
                  </div>

                  <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center mb-3">
                      <MessageCircle className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-1">음성</h3>
                    <p className="text-sm text-gray-500">보이스 메시지</p>
                  </div>

                  <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                    <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center mb-3">
                      <Search className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-1">기타</h3>
                    <p className="text-sm text-gray-500">모든 파일 유형</p>
                  </div>
                </div>

                {/* Uploaded Files List */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">업로드된 파일</h3>
                    <Archive className="w-5 h-5 text-gray-400" />
                  </div>
                  <ArchiveList />
                </div>
              </div>
            </div>
          )}
          
          {activeMobileTab === "more" && (
            <ModernSettingsPage isMobile={true} />
          )}

          {activeMobileTab === "settings" && (
            <ModernSettingsPage isMobile={true} />
          )}
        </div>

        {/* Modern Mobile Bottom Navigation */}
        {!showMobileChat && activeMobileTab !== "digital-card" && (
          <div className="bg-white/95 backdrop-blur-lg border-t border-gray-100 pb-safe pt-2 px-4 fixed bottom-0 left-0 right-0 z-50 lg:hidden shadow-lg">
            <div className="flex justify-around items-center max-w-md mx-auto">
              <Button
                variant="ghost"
                className={cn(
                  "flex flex-col items-center py-3 px-4 rounded-xl transition-all duration-200 min-h-[56px] min-w-[64px]",
                  activeMobileTab === "contacts" 
                    ? "text-blue-600 bg-blue-100 scale-110 shadow-lg" 
                    : "text-gray-600 hover:text-gray-800 hover:bg-gray-100"
                )}
                onClick={() => setActiveMobileTab("contacts")}
              >
                <div className={cn(
                  "p-2 rounded-lg transition-colors",
                  activeMobileTab === "contacts" ? "bg-blue-200" : ""
                )}>
                  <BookUser className="h-6 w-6" />
                </div>
                <span className="text-xs mt-1 font-semibold">Cabinet</span>
              </Button>
              
              <Button
                variant="ghost"
                className={cn(
                  "flex flex-col items-center py-3 px-4 rounded-xl transition-all duration-200 relative min-h-[56px] min-w-[64px]",
                  activeMobileTab === "chats" 
                    ? "text-blue-600 bg-blue-100 scale-110 shadow-lg" 
                    : "text-gray-600 hover:text-gray-800 hover:bg-gray-100"
                )}
                onClick={() => setActiveMobileTab("chats")}
              >
                <div className={cn(
                  "p-2 rounded-lg transition-colors relative",
                  activeMobileTab === "chats" ? "bg-blue-200" : ""
                )}>
                  <MessageCircle className="h-6 w-6" />
                  {totalChatUnread > 0 && (
                    <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full min-w-[20px] h-[20px] flex items-center justify-center font-bold shadow-lg animate-pulse">
                      {totalChatUnread > 9 ? '9+' : totalChatUnread}
                    </div>
                  )}
                </div>
                <span className="text-xs mt-1 font-semibold">DM</span>
              </Button>

              <Button
                variant="ghost"
                className="flex flex-col items-center py-1 px-2 rounded-2xl transition-all duration-300 hover:scale-105 relative"
                onClick={() => setShowCamera(true)}
              >
                <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg hover:shadow-xl transition-all duration-300 border-4 border-white hover:from-blue-600 hover:to-purple-700 transform hover:scale-110">
                  <Camera className="h-7 w-7 text-white" />
                </div>
                <span className="text-xs mt-1 font-bold text-blue-600">명함 스캔</span>
                
                {/* Pulse animation ring */}
                <div className="absolute inset-0 rounded-full border-2 border-blue-400 opacity-0 animate-ping"></div>
              </Button>
              
              <Button
                variant="ghost"
                className={cn(
                  "flex flex-col items-center py-2 px-3 rounded-xl transition-all duration-200",
                  activeMobileTab === "explore" 
                    ? "text-blue-600 bg-blue-50 scale-105" 
                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                )}
                onClick={() => setActiveMobileTab("explore")}
              >
                <div className={cn(
                  "p-1 rounded-lg transition-colors",
                  activeMobileTab === "explore" ? "bg-blue-100" : ""
                )}>
                  <Search className="h-5 w-5" />
                </div>
                <span className="text-xs mt-1 font-medium">Folder</span>
              </Button>
              
              <Button
                variant="ghost"
                className={cn(
                  "flex flex-col items-center py-2 px-3 rounded-xl transition-all duration-200",
                  activeMobileTab === "more" 
                    ? "text-blue-600 bg-blue-50 scale-105" 
                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                )}
                onClick={() => setActiveMobileTab("more")}
              >
                <div className={cn(
                  "p-1 rounded-lg transition-colors",
                  activeMobileTab === "more" ? "bg-blue-100" : ""
                )}>
                  <Menu className="h-5 w-5" />
                </div>
                <span className="text-xs mt-1 font-medium">Setting</span>
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

      {/* Camera for business card scanning */}
      <CameraCapture
        isOpen={showCamera}
        onCapture={handleCameraCapture}
        onClose={() => setShowCamera(false)}
      />

    </div>
  );
}
