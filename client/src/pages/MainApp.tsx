import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import VaultLogo from "@/components/VaultLogo";
import ContactsList from "@/components/ContactsList";
import ChatsList from "@/components/ChatsList";
import ArchiveList from "@/components/ArchiveList";
import ChatArea from "@/components/ChatArea";
import AddContactModal from "@/components/AddContactModal";
import CommandModal from "@/components/CommandModal";
import CreateGroupChatModal from "@/components/CreateGroupChatModal";

import SettingsPage from "@/components/SettingsPage";
import NearbyChats from "@/components/NearbyChats";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookUser, MessageCircle, Archive, Settings, Search, MessageSquare, Users, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

export default function MainApp() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("contacts");
  const [activeMobileTab, setActiveMobileTab] = useState("contacts");
  const [showSettings, setShowSettings] = useState(false);
  const [selectedChatRoom, setSelectedChatRoom] = useState<number | null>(null);
  const [showMobileChat, setShowMobileChat] = useState(false);
  const [modals, setModals] = useState({
    addContact: false,
    command: false,
    createGroup: false,
  });
  const [commandModalData, setCommandModalData] = useState<any>(null);
  const [messageDataForCommand, setMessageDataForCommand] = useState<any>(null);
  const [contactFilter, setContactFilter] = useState<number | null>(null);

  useWebSocket(user?.id);

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

  // Create or find existing chat room
  const createOrFindChatRoom = (contactUserId: number, contactUser: any) => {
    // Check if chat room already exists with this contact
    const existingChatRoom = chatRoomsData?.chatRooms?.find((room: any) => {
      return !room.isGroup && 
             room.participants?.some((p: any) => p.id === contactUserId) &&
             room.participants?.some((p: any) => p.id === user?.id);
    });

    if (existingChatRoom) {
      // Go to existing chat room
      setSelectedChatRoom(existingChatRoom.id);
      setActiveTab("chats");
      toast({
        title: "기존 채팅방으로 이동",
        description: `${contactUser.nickname || contactUser.displayName}님과의 채팅방으로 이동했습니다.`,
      });
    } else {
      // Create new chat room
      createChatRoomMutation.mutate({ contactUserId, contactUser });
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

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <div className="fixed inset-0 bg-white">
      {/* Desktop Layout */}
      <div className="hidden lg:flex h-full">
        {/* Sidebar */}
        <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-gray-200 purple-gradient">
            <div className="flex items-center justify-center space-x-3">
              <VaultLogo size="sm" />
              <h1 className="text-xl font-bold text-white">Vault Messenger</h1>
            </div>
          </div>

          {/* Navigation Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            <TabsList className="grid w-full grid-cols-5 border-b border-gray-200 rounded-none bg-transparent h-auto">
              <TabsTrigger 
                value="contacts" 
                className={cn(
                  "py-3 px-4 text-sm font-medium rounded-none border-b-2 border-transparent flex-col items-center gap-1",
                  "data-[state=active]:border-purple-600 data-[state=active]:bg-purple-50 data-[state=active]:text-purple-600"
                )}
              >
                <Users className="h-5 w-5" />
                <span className="text-xs">연락처</span>
              </TabsTrigger>
              <TabsTrigger 
                value="chats"
                className={cn(
                  "py-3 px-4 text-sm font-medium rounded-none border-b-2 border-transparent flex-col items-center gap-1",
                  "data-[state=active]:border-purple-600 data-[state=active]:bg-purple-50 data-[state=active]:text-purple-600"
                )}
              >
                <MessageSquare className="h-5 w-5" />
                <span className="text-xs">채팅방</span>
              </TabsTrigger>
              <TabsTrigger 
                value="nearby"
                className={cn(
                  "py-3 px-4 text-sm font-medium rounded-none border-b-2 border-transparent flex-col items-center gap-1",
                  "data-[state=active]:border-purple-600 data-[state=active]:bg-purple-50 data-[state=active]:text-purple-600"
                )}
              >
                <MapPin className="h-5 w-5" />
                <span className="text-xs">주변챗</span>
              </TabsTrigger>
              <TabsTrigger 
                value="archive"
                className={cn(
                  "py-3 px-4 text-sm font-medium rounded-none border-b-2 border-transparent flex-col items-center gap-1",
                  "data-[state=active]:border-purple-600 data-[state=active]:bg-purple-50 data-[state=active]:text-purple-600"
                )}
              >
                <Archive className="h-5 w-5" />
                <span className="text-xs">저장소</span>
              </TabsTrigger>
              <TabsTrigger 
                value="settings"
                className={cn(
                  "py-3 px-4 text-sm font-medium rounded-none border-b-2 border-transparent flex-col items-center gap-1",
                  "data-[state=active]:border-purple-600 data-[state=active]:bg-purple-50 data-[state=active]:text-purple-600"
                )}
              >
                <Settings className="h-5 w-5" />
                <span className="text-xs">설정</span>
              </TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-hidden">
              <TabsContent value="contacts" className="h-full m-0">
                <ContactsList 
                  onAddContact={() => openModal("addContact")}
                  onSelectContact={(contactUserId) => {
                    // Find the contact user data
                    const contact = contactsData?.contacts?.find((c: any) => c.contactUserId === contactUserId);
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
                />
              </TabsContent>
              
              <TabsContent value="nearby" className="h-full m-0">
                <NearbyChats onChatRoomSelect={handleChatRoomSelect} />
              </TabsContent>
              
              <TabsContent value="archive" className="h-full m-0">
                <ArchiveList />
              </TabsContent>
              
              <TabsContent value="settings" className="h-full m-0">
                <SettingsPage />
              </TabsContent>
            </div>
          </Tabs>
        </div>

        {/* Main Chat Area or Settings */}
        <div className="flex-1 flex flex-col">
          {showSettings ? (
            <div className="flex-1 bg-gray-50 overflow-y-auto">
              <div className="max-w-4xl mx-auto p-6">
                <div className="flex items-center justify-between mb-6">
                  <h1 className="text-2xl font-bold text-gray-900">설정</h1>
                  <Button
                    variant="outline"
                    onClick={() => setShowSettings(false)}
                  >
                    뒤로 가기
                  </Button>
                </div>
                <SettingsPage isMobile={false} />
              </div>
            </div>
          ) : selectedChatRoom ? (
            <ChatArea 
              chatRoomId={selectedChatRoom}
              onCreateCommand={handleCreateCommand}
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
                // 해당 친구가 포함된 채팅방들을 찾아서 채팅방 리스트로 이동
                setContactFilter(contactUserId);
                setActiveMobileTab("chats");
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
            />
          )}
          {activeMobileTab === "nearby" && (
            <NearbyChats onChatRoomSelect={(chatId) => {
              setSelectedChatRoom(chatId);
              setShowMobileChat(true);
              setActiveMobileTab("chats");
            }} />
          )}
          {showMobileChat && selectedChatRoom && (
            <div className="h-full flex flex-col overflow-hidden">
              <div className="flex-1 min-h-0">
                <ChatArea 
                  chatRoomId={selectedChatRoom}
                  onCreateCommand={handleCreateCommand}
                  showMobileHeader={true}
                  onBackClick={() => setShowMobileChat(false)}
                />
              </div>
            </div>
          )}
          {activeMobileTab === "archive" && <ArchiveList />}
          {activeMobileTab === "settings" && (
            <SettingsPage isMobile={true} />
          )}
        </div>

        {/* Fixed Mobile Bottom Navigation - Hide when in chat */}
        {!showMobileChat && (
          <div className="bg-white border-t border-gray-200 py-1 px-2 fixed bottom-0 left-0 right-0 z-40 lg:hidden">
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
                  "flex flex-col items-center py-1 px-2",
                  activeMobileTab === "chats" ? "text-purple-600" : "text-gray-400"
                )}
                onClick={() => setActiveMobileTab("chats")}
              >
                <MessageCircle className="h-4 w-4" />
                <span className="text-xs mt-0.5">채팅방</span>
              </Button>
              <Button
                variant="ghost"
                className={cn(
                  "flex flex-col items-center py-1 px-2",
                  activeMobileTab === "nearby" ? "text-purple-600" : "text-gray-400"
                )}
                onClick={() => setActiveMobileTab("nearby")}
              >
                <MapPin className="h-4 w-4" />
                <span className="text-xs mt-0.5">주변챗</span>
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
        chatRoomId={selectedChatRoom}
        fileData={commandModalData}
        messageData={messageDataForCommand}
      />
      <CreateGroupChatModal 
        open={modals.createGroup}
        onClose={closeModals}
        onSuccess={handleGroupChatSuccess}
      />

    </div>
  );
}
