import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Plus, Search, Pin } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatsListProps {
  onSelectChat: (chatId: number) => void;
  selectedChatId: number | null;
}

export default function ChatsList({ onSelectChat, selectedChatId }: ChatsListProps) {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");

  const { data: chatRoomsData, isLoading } = useQuery({
    queryKey: ["/api/chat-rooms"],
    enabled: !!user,
    queryFn: async () => {
      const response = await fetch("/api/chat-rooms", {
        headers: { "x-user-id": user!.id.toString() },
      });
      if (!response.ok) throw new Error("Failed to fetch chat rooms");
      return response.json();
    },
  });

  const chatRooms = chatRoomsData?.chatRooms || [];

  const filteredChatRooms = chatRooms.filter((chatRoom: any) =>
    chatRoom.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const pinnedChats = filteredChatRooms.filter((chat: any) => chat.isPinned);
  const regularChats = filteredChatRooms.filter((chat: any) => !chat.isPinned);

  const getInitials = (name: string) => {
    return name.split(' ').map(word => word.charAt(0).toUpperCase()).join('').slice(0, 2);
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('ko-KR', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false
    });
  };

  const getLastMessagePreview = (lastMessage: any) => {
    if (!lastMessage) return "메시지가 없습니다";
    
    if (lastMessage.messageType === "file") {
      return `📎 ${lastMessage.fileName}`;
    }
    
    if (lastMessage.isCommandRecall) {
      return `🏷️ ${lastMessage.content}`;
    }
    
    return lastMessage.content;
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-gray-500">채팅방을 불러오는 중...</div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-900">채팅방</h3>
          <Button
            variant="ghost"
            size="sm"
            className="text-purple-600 hover:text-purple-700"
          >
            <Plus className="h-5 w-5" />
          </Button>
        </div>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            type="text"
            placeholder="채팅방 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {pinnedChats.length > 0 && (
          <>
            <div className="p-3 bg-gray-50">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                고정된 채팅
              </p>
            </div>
            {pinnedChats.map((chatRoom: any) => (
              <ChatRoomItem
                key={chatRoom.id}
                chatRoom={chatRoom}
                isSelected={selectedChatId === chatRoom.id}
                onClick={() => onSelectChat(chatRoom.id)}
                isPinned
              />
            ))}
          </>
        )}

        {regularChats.length > 0 && (
          <>
            <div className="p-3 bg-gray-50">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                모든 채팅
              </p>
            </div>
            {regularChats.map((chatRoom: any) => (
              <ChatRoomItem
                key={chatRoom.id}
                chatRoom={chatRoom}
                isSelected={selectedChatId === chatRoom.id}
                onClick={() => onSelectChat(chatRoom.id)}
              />
            ))}
          </>
        )}

        {filteredChatRooms.length === 0 && (
          <div className="p-4 text-center text-gray-500">
            {searchTerm ? "검색 결과가 없습니다" : "채팅방이 없습니다"}
          </div>
        )}
      </div>
    </div>
  );
}

function ChatRoomItem({ 
  chatRoom, 
  isSelected, 
  onClick, 
  isPinned = false 
}: {
  chatRoom: any;
  isSelected: boolean;
  onClick: () => void;
  isPinned?: boolean;
}) {
  const getInitials = (name: string) => {
    return name.split(' ').map(word => word.charAt(0).toUpperCase()).join('').slice(0, 2);
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('ko-KR', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false
    });
  };

  const getLastMessagePreview = (lastMessage: any) => {
    if (!lastMessage) return "메시지가 없습니다";
    
    if (lastMessage.messageType === "file") {
      return `📎 ${lastMessage.fileName}`;
    }
    
    if (lastMessage.isCommandRecall) {
      return `🏷️ ${lastMessage.content}`;
    }
    
    return `${lastMessage.sender.displayName}: ${lastMessage.content}`;
  };

  return (
    <div
      className={cn(
        "p-4 hover:bg-purple-50 cursor-pointer border-b border-gray-100 transition-colors relative",
        isSelected && "bg-purple-50"
      )}
      onClick={onClick}
    >
      {isPinned && (
        <Pin className="absolute top-2 right-2 text-purple-500 h-3 w-3" />
      )}
      
      <div className="flex items-center space-x-3">
        <div className="w-12 h-12 purple-gradient rounded-full flex items-center justify-center text-white font-semibold">
          {getInitials(chatRoom.name)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <p className="font-medium text-gray-900 truncate">{chatRoom.name}</p>
            {chatRoom.lastMessage && (
              <span className="text-xs text-gray-500">
                {formatTime(chatRoom.lastMessage.createdAt)}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-600 truncate">
            {getLastMessagePreview(chatRoom.lastMessage)}
          </p>
          {chatRoom.isGroup && (
            <div className="flex items-center justify-between mt-1">
              <span className="text-xs text-gray-400">
                참여자 {chatRoom.participants.length}명
              </span>
              {/* Unread count placeholder */}
              <span className="bg-purple-500 text-white text-xs rounded-full px-2 py-1">
                2
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
