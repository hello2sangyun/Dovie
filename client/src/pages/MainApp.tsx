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
import SettingsModal from "@/components/SettingsModal";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookUser, MessageCircle, Archive, Settings, Search } from "lucide-react";
import { cn } from "@/lib/utils";

export default function MainApp() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("contacts");
  const [activeMobileTab, setActiveMobileTab] = useState("contacts");
  const [selectedChatRoom, setSelectedChatRoom] = useState<number | null>(null);
  const [showMobileChat, setShowMobileChat] = useState(false);
  const [modals, setModals] = useState({
    addContact: false,
    command: false,
    settings: false,
  });

  useWebSocket(user?.id);

  // Get contacts to find contact user data
  const { data: contactsData } = useQuery({
    queryKey: ["/api/contacts"],
    enabled: !!user,
  });

  // Create chat room mutation
  const createChatRoomMutation = useMutation({
    mutationFn: async ({ contactUserId, contactUser }: { contactUserId: number, contactUser: any }) => {
      const response = await apiRequest("POST", "/api/chat-rooms", {
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

  const openModal = (modal: keyof typeof modals) => {
    setModals(prev => ({ ...prev, [modal]: true }));
  };

  const closeModals = () => {
    setModals({ addContact: false, command: false, settings: false });
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
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <VaultLogo size="sm" />
                <h1 className="text-xl font-bold text-white">Vault Messenger</h1>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-white hover:text-purple-200 hover:bg-white/10"
                onClick={() => openModal("settings")}
              >
                <Settings className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            <TabsList className="grid w-full grid-cols-3 border-b border-gray-200 rounded-none bg-transparent h-auto">
              <TabsTrigger 
                value="contacts" 
                className={cn(
                  "py-3 px-4 text-sm font-medium rounded-none border-b-2 border-transparent",
                  "data-[state=active]:border-purple-600 data-[state=active]:bg-purple-50 data-[state=active]:text-purple-600"
                )}
              >
                <BookUser className="mr-2 h-4 w-4" />
                연락처
              </TabsTrigger>
              <TabsTrigger 
                value="chats"
                className={cn(
                  "py-3 px-4 text-sm font-medium rounded-none border-b-2 border-transparent",
                  "data-[state=active]:border-purple-600 data-[state=active]:bg-purple-50 data-[state=active]:text-purple-600"
                )}
              >
                <MessageCircle className="mr-2 h-4 w-4" />
                채팅방
              </TabsTrigger>
              <TabsTrigger 
                value="archive"
                className={cn(
                  "py-3 px-4 text-sm font-medium rounded-none border-b-2 border-transparent",
                  "data-[state=active]:border-purple-600 data-[state=active]:bg-purple-50 data-[state=active]:text-purple-600"
                )}
              >
                <Archive className="mr-2 h-4 w-4" />
                저장소
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
                      createChatRoomMutation.mutate({
                        contactUserId,
                        contactUser: contact.contactUser
                      });
                    }
                  }}
                />
              </TabsContent>
              
              <TabsContent value="chats" className="h-full m-0">
                <ChatsList 
                  onSelectChat={setSelectedChatRoom}
                  selectedChatId={selectedChatRoom}
                />
              </TabsContent>
              
              <TabsContent value="archive" className="h-full m-0">
                <ArchiveList />
              </TabsContent>
            </div>
          </Tabs>
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col">
          {selectedChatRoom ? (
            <ChatArea 
              chatRoomId={selectedChatRoom}
              onCreateCommand={() => openModal("command")}
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
        {/* Mobile Header */}
        <div className="purple-gradient p-4 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <VaultLogo size="sm" />
              <h1 className="text-lg font-bold">Vault Messenger</h1>
            </div>
            <Button variant="ghost" size="sm" className="text-white">
              <Search className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Mobile Content */}
        <div className="flex-1 overflow-hidden">
          {activeMobileTab === "contacts" && (
            <ContactsList 
              onAddContact={() => openModal("addContact")}
              onSelectContact={() => {}}
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
          {showMobileChat && selectedChatRoom && (
            <div className="h-full flex flex-col">
              <div className="bg-white border-b border-gray-200 p-4 flex items-center">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowMobileChat(false)}
                  className="mr-3"
                >
                  ←
                </Button>
                <h3 className="font-semibold">채팅</h3>
              </div>
              <div className="flex-1">
                <ChatArea 
                  chatRoomId={selectedChatRoom}
                  onCreateCommand={() => openModal("command")}
                />
              </div>
            </div>
          )}
          {activeMobileTab === "archive" && <ArchiveList />}
          {activeMobileTab === "settings" && (
            <div className="p-4">
              <Button 
                onClick={() => openModal("settings")}
                className="w-full purple-gradient"
              >
                설정 열기
              </Button>
            </div>
          )}
        </div>

        {/* Mobile Bottom Navigation - Hide when in chat */}
        {!showMobileChat && (
          <div className="bg-white border-t border-gray-200 p-2">
            <div className="flex justify-around">
              <Button
                variant="ghost"
                className={cn(
                  "flex flex-col items-center p-2",
                  activeMobileTab === "contacts" ? "text-purple-600" : "text-gray-400"
                )}
                onClick={() => setActiveMobileTab("contacts")}
              >
                <BookUser className="h-5 w-5 mb-1" />
                <span className="text-xs">연락처</span>
              </Button>
              <Button
                variant="ghost"
                className={cn(
                  "flex flex-col items-center p-2",
                  activeMobileTab === "chats" ? "text-purple-600" : "text-gray-400"
                )}
                onClick={() => setActiveMobileTab("chats")}
              >
                <MessageCircle className="h-5 w-5 mb-1" />
                <span className="text-xs">채팅방</span>
              </Button>
              <Button
                variant="ghost"
                className={cn(
                  "flex flex-col items-center p-2",
                  activeMobileTab === "archive" ? "text-purple-600" : "text-gray-400"
                )}
                onClick={() => setActiveMobileTab("archive")}
              >
                <Archive className="h-5 w-5 mb-1" />
                <span className="text-xs">저장소</span>
              </Button>
              <Button
                variant="ghost"
                className={cn(
                  "flex flex-col items-center p-2",
                  activeMobileTab === "settings" ? "text-purple-600" : "text-gray-400"
                )}
                onClick={() => setActiveMobileTab("settings")}
              >
                <Settings className="h-5 w-5 mb-1" />
                <span className="text-xs">설정</span>
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
      />
      <SettingsModal 
        open={modals.settings}
        onClose={closeModals}
      />
    </div>
  );
}
