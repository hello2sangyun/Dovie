import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Send, Users, MessageCircle, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import InstantAvatar from "./InstantAvatar";
import { cn } from "@/lib/utils";

interface ChatRoom {
  id: number;
  name: string;
  profileImage?: string;
  isGroup: boolean;
  participants?: any[];
}

interface ForwardMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onForward: (chatRoomIds: number[]) => Promise<void>;
  messagePreview?: string;
}

export function ForwardMessageModal({ 
  isOpen, 
  onClose, 
  onForward,
  messagePreview 
}: ForwardMessageModalProps) {
  const [selectedChatRooms, setSelectedChatRooms] = useState<Set<number>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [isForwarding, setIsForwarding] = useState(false);

  const { data: chatRooms } = useQuery<ChatRoom[]>({
    queryKey: ['/api/chat-rooms'],
    enabled: isOpen,
  });

  const filteredChatRooms = chatRooms?.filter((room) =>
    room.name.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const handleToggleChatRoom = (chatRoomId: number) => {
    setSelectedChatRooms((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(chatRoomId)) {
        newSet.delete(chatRoomId);
      } else {
        newSet.add(chatRoomId);
      }
      return newSet;
    });
  };

  const handleForward = async () => {
    if (selectedChatRooms.size === 0) return;
    
    setIsForwarding(true);
    try {
      await onForward(Array.from(selectedChatRooms));
      setSelectedChatRooms(new Set());
      setSearchQuery("");
      onClose();
    } catch (error) {
      console.error("Forward error:", error);
    } finally {
      setIsForwarding(false);
    }
  };

  useEffect(() => {
    if (!isOpen) {
      setSelectedChatRooms(new Set());
      setSearchQuery("");
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">메시지 전달하기</DialogTitle>
        </DialogHeader>

        {/* Message Preview */}
        {messagePreview && (
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 mb-4 border border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">전달할 메시지:</p>
            <p className="text-sm line-clamp-2">{messagePreview}</p>
          </div>
        )}

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="채팅방 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Chat Rooms List */}
        <ScrollArea className="h-[300px] -mx-6 px-6">
          <div className="space-y-1">
            {filteredChatRooms.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <MessageCircle className="h-12 w-12 mx-auto mb-2 opacity-30" />
                <p className="text-sm">채팅방이 없습니다</p>
              </div>
            ) : (
              filteredChatRooms.map((room) => (
                <button
                  key={room.id}
                  onClick={() => handleToggleChatRoom(room.id)}
                  className={cn(
                    "w-full flex items-center gap-3 p-3 rounded-lg transition-colors",
                    "hover:bg-gray-100 dark:hover:bg-gray-800",
                    selectedChatRooms.has(room.id) && "bg-purple-50 dark:bg-purple-900/20"
                  )}
                >
                  <Checkbox
                    checked={selectedChatRooms.has(room.id)}
                    onCheckedChange={() => handleToggleChatRoom(room.id)}
                    className="pointer-events-none"
                  />

                  <div className="relative flex-shrink-0">
                    {room.profileImage ? (
                      <InstantAvatar
                        src={room.profileImage}
                        name={room.name}
                        size={40}
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center">
                        {room.isGroup ? (
                          <Users className="h-5 w-5 text-white" />
                        ) : (
                          <span className="text-white font-medium">
                            {room.name.charAt(0)}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex-1 text-left min-w-0">
                    <p className="font-medium text-sm truncate">{room.name}</p>
                    {room.isGroup && room.participants && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {room.participants.length}명
                      </p>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </ScrollArea>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t">
          <p className="text-sm text-gray-500">
            {selectedChatRooms.size}개 선택됨
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isForwarding}
            >
              취소
            </Button>
            <Button
              onClick={handleForward}
              disabled={selectedChatRooms.size === 0 || isForwarding}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {isForwarding ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  전달 중...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  전달하기
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
