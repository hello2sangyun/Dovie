import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  MessageCircle, 
  Users, 
  Settings, 
  Plus,
  Send,
  Search,
  Phone,
  Video,
  MoreVertical
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface User {
  id: number;
  username: string;
  displayName: string;
  email?: string;
  profilePicture?: string;
}

interface Contact {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  lastSeen?: string;
  isOnline?: boolean;
}

interface ChatRoom {
  id: number;
  name: string;
  isGroup: boolean;
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount?: number;
  participants: any[];
}

interface Message {
  id: number;
  content: string;
  senderId: number;
  senderName: string;
  timestamp: string;
  messageType: 'text' | 'file' | 'system';
  fileUrl?: string;
  fileName?: string;
}

export default function SimpleChatApp() {
  const [activeTab, setActiveTab] = useState("chats");
  const [selectedChat, setSelectedChat] = useState<number | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [newContactName, setNewContactName] = useState("");
  const [newContactEmail, setNewContactEmail] = useState("");
  const [newChatName, setNewChatName] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch user data
  const { data: user } = useQuery<User>({
    queryKey: ["/api/auth/me"]
  });

  // Fetch contacts
  const { data: contactsData } = useQuery({
    queryKey: ["/api/contacts"],
    refetchInterval: 30000
  });

  // Fetch chat rooms
  const { data: chatRoomsData } = useQuery({
    queryKey: ["/api/chat-rooms"],
    refetchInterval: 15000
  });

  // Fetch messages for selected chat
  const { data: messagesData } = useQuery({
    queryKey: ["/api/messages", selectedChat],
    enabled: !!selectedChat,
    refetchInterval: 5000
  });

  const contacts = (contactsData as any)?.contacts || [];
  const chatRooms = (chatRoomsData as any)?.chatRooms || [];
  const messages = (messagesData as any)?.messages || [];

  // Add contact mutation
  const addContactMutation = useMutation({
    mutationFn: (contactData: { name: string; email?: string }) => 
      apiRequest("/api/contacts", "POST", contactData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      setNewContactName("");
      setNewContactEmail("");
      toast({
        title: "연락처 추가 완료",
        description: "새 연락처가 추가되었습니다.",
      });
    }
  });

  // Create chat mutation
  const createChatMutation = useMutation({
    mutationFn: (chatData: { name: string; isGroup: boolean; participantIds?: number[] }) =>
      apiRequest("/api/chat-rooms", "POST", chatData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat-rooms"] });
      setNewChatName("");
      toast({
        title: "채팅방 생성 완료",
        description: "새 채팅방이 생성되었습니다.",
      });
    }
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: (messageData: { chatRoomId: number; content: string }) =>
      apiRequest("/api/messages", "POST", messageData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages", selectedChat] });
      queryClient.invalidateQueries({ queryKey: ["/api/chat-rooms"] });
      setNewMessage("");
    }
  });

  const handleSendMessage = () => {
    if (!newMessage.trim() || !selectedChat) return;
    
    sendMessageMutation.mutate({
      chatRoomId: selectedChat,
      content: newMessage.trim()
    });
  };

  const handleAddContact = () => {
    if (!newContactName.trim()) return;
    
    addContactMutation.mutate({
      name: newContactName.trim(),
      email: newContactEmail.trim() || undefined
    });
  };

  const handleCreateChat = () => {
    if (!newChatName.trim()) return;
    
    createChatMutation.mutate({
      name: newChatName.trim(),
      isGroup: false
    });
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('ko-KR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const selectedChatData = chatRooms.find(chat => chat.id === selectedChat);

  return (
    <div className="h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex">
      {/* Sidebar */}
      <div className="w-80 bg-white shadow-lg flex flex-col">
        {/* Header */}
        <div className="p-4 border-b bg-gradient-to-r from-blue-600 to-purple-600">
          <div className="flex items-center space-x-3">
            <Avatar className="w-10 h-10">
              <AvatarFallback className="bg-white text-blue-600 font-semibold">
                {user?.displayName?.charAt(0) || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="text-white">
              <h2 className="font-semibold">{user?.displayName || 'User'}</h2>
              <p className="text-sm opacity-90">Dovie Messenger</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          <TabsList className="grid w-full grid-cols-3 m-2">
            <TabsTrigger value="chats" className="text-xs">
              <MessageCircle className="w-4 h-4 mr-1" />
              채팅
            </TabsTrigger>
            <TabsTrigger value="contacts" className="text-xs">
              <Users className="w-4 h-4 mr-1" />
              연락처
            </TabsTrigger>
            <TabsTrigger value="settings" className="text-xs">
              <Settings className="w-4 h-4 mr-1" />
              설정
            </TabsTrigger>
          </TabsList>

          {/* Chat List */}
          <TabsContent value="chats" className="flex-1 overflow-hidden">
            <div className="p-2">
              <div className="flex space-x-2 mb-3">
                <Input
                  placeholder="새 채팅방 이름"
                  value={newChatName}
                  onChange={(e) => setNewChatName(e.target.value)}
                  className="text-sm"
                />
                <Button
                  size="sm"
                  onClick={handleCreateChat}
                  disabled={createChatMutation.isPending}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto">
              {chatRooms.map((chat: ChatRoom) => (
                <div
                  key={chat.id}
                  className={`p-3 cursor-pointer hover:bg-gray-50 border-b transition-colors ${
                    selectedChat === chat.id ? 'bg-blue-50 border-blue-200' : ''
                  }`}
                  onClick={() => setSelectedChat(chat.id)}
                >
                  <div className="flex items-center space-x-3">
                    <Avatar className="w-12 h-12">
                      <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500 text-white">
                        {chat.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium text-gray-900 truncate">{chat.name}</h3>
                        {chat.lastMessageTime && (
                          <span className="text-xs text-gray-500">
                            {formatTime(chat.lastMessageTime)}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 truncate">
                        {chat.lastMessage || '메시지가 없습니다'}
                      </p>
                    </div>
                    {chat.unreadCount && chat.unreadCount > 0 && (
                      <Badge variant="destructive" className="text-xs">
                        {chat.unreadCount}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
              
              {chatRooms.length === 0 && (
                <div className="p-8 text-center text-gray-500">
                  <MessageCircle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>채팅방이 없습니다</p>
                  <p className="text-sm">새 채팅방을 만들어보세요</p>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Contacts List */}
          <TabsContent value="contacts" className="flex-1 overflow-hidden">
            <div className="p-2">
              <div className="space-y-2 mb-3">
                <Input
                  placeholder="연락처 이름"
                  value={newContactName}
                  onChange={(e) => setNewContactName(e.target.value)}
                  className="text-sm"
                />
                <div className="flex space-x-2">
                  <Input
                    placeholder="이메일 (선택사항)"
                    value={newContactEmail}
                    onChange={(e) => setNewContactEmail(e.target.value)}
                    className="text-sm"
                  />
                  <Button
                    size="sm"
                    onClick={handleAddContact}
                    disabled={addContactMutation.isPending}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto">
              {contacts.map((contact: Contact) => (
                <div key={contact.id} className="p-3 hover:bg-gray-50 border-b">
                  <div className="flex items-center space-x-3">
                    <Avatar className="w-10 h-10">
                      <AvatarFallback className="bg-gray-200">
                        {contact.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{contact.name}</h3>
                      {contact.email && (
                        <p className="text-sm text-gray-600">{contact.email}</p>
                      )}
                    </div>
                    {contact.isOnline && (
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    )}
                  </div>
                </div>
              ))}
              
              {contacts.length === 0 && (
                <div className="p-8 text-center text-gray-500">
                  <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>연락처가 없습니다</p>
                  <p className="text-sm">새 연락처를 추가해보세요</p>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Settings */}
          <TabsContent value="settings" className="flex-1 p-4">
            <div className="space-y-4">
              <Card>
                <CardContent className="p-4">
                  <h3 className="font-semibold mb-2">계정 정보</h3>
                  <div className="space-y-2 text-sm">
                    <p><span className="font-medium">사용자명:</span> {user?.username}</p>
                    <p><span className="font-medium">표시명:</span> {user?.displayName}</p>
                    {user?.email && (
                      <p><span className="font-medium">이메일:</span> {user.email}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <h3 className="font-semibold mb-2">앱 정보</h3>
                  <div className="space-y-2 text-sm">
                    <p><span className="font-medium">버전:</span> 1.0.0</p>
                    <p><span className="font-medium">타입:</span> 채팅 중심 버전</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedChat ? (
          <>
            {/* Chat Header */}
            <div className="bg-white border-b p-4 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Avatar className="w-10 h-10">
                  <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500 text-white">
                    {selectedChatData?.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h2 className="font-semibold">{selectedChatData?.name}</h2>
                  <p className="text-sm text-gray-600">
                    {selectedChatData?.participants.length}명 참여
                  </p>
                </div>
              </div>
              
              <div className="flex space-x-2">
                <Button variant="ghost" size="sm">
                  <Phone className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm">
                  <Video className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message: Message) => (
                <div
                  key={message.id}
                  className={`flex ${message.senderId === user?.id ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                      message.senderId === user?.id
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-gray-900 shadow'
                    }`}
                  >
                    {message.senderId !== user?.id && (
                      <p className="text-xs font-medium mb-1 text-gray-600">
                        {message.senderName}
                      </p>
                    )}
                    <p className="text-sm">{message.content}</p>
                    <p
                      className={`text-xs mt-1 ${
                        message.senderId === user?.id ? 'text-blue-100' : 'text-gray-500'
                      }`}
                    >
                      {formatTime(message.timestamp)}
                    </p>
                  </div>
                </div>
              ))}
              
              {messages.length === 0 && (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center text-gray-500">
                    <MessageCircle className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                    <p className="text-lg">대화를 시작해보세요</p>
                    <p className="text-sm">첫 메시지를 보내보세요</p>
                  </div>
                </div>
              )}
            </div>

            {/* Message Input */}
            <div className="bg-white border-t p-4">
              <div className="flex space-x-3">
                <Input
                  placeholder="메시지를 입력하세요..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  className="flex-1"
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim() || sendMessageMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center text-gray-500">
              <MessageCircle className="w-24 h-24 mx-auto mb-6 text-gray-300" />
              <h2 className="text-2xl font-semibold mb-2">Dovie Messenger</h2>
              <p className="text-lg mb-4">채팅방을 선택해주세요</p>
              <p className="text-sm">왼쪽에서 채팅방을 선택하거나 새로 만들어보세요</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}