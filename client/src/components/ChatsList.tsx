import { useState, useMemo } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useDebounce } from "@/hooks/useDebounce";
import { useVirtualization } from "@/hooks/useVirtualization";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserAvatar } from "@/components/UserAvatar";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Search, Pin, Users, X, Trash2, LogOut, MoreVertical } from "lucide-react";
import { cn, getInitials, getAvatarColor } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";

interface ChatsListProps {
  onSelectChat: (chatId: number) => void;
  selectedChatId: number | null;
  onCreateGroup?: () => void;
  contactFilter?: number | null;
  onClearFilter?: () => void;
  friendFilter?: number | null;
  onClearFriendFilter?: () => void;
}

export default function ChatsList({ onSelectChat, selectedChatId, onCreateGroup, contactFilter, onClearFilter, friendFilter, onClearFriendFilter }: ChatsListProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [selectedRoomIds, setSelectedRoomIds] = useState<number[]>([]);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [saveFiles, setSaveFiles] = useState(true);

  // 채팅방 나가기 mutation
  const leaveChatRoomMutation = useMutation({
    mutationFn: async ({ roomId, saveFiles }: { roomId: number; saveFiles: boolean }) => {
      const response = await apiRequest(`/api/chat-rooms/${roomId}/leave`, "POST", { saveFiles });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat-rooms"] });
      toast({
        title: "채팅방 나가기 완료",
        description: saveFiles ? "파일들이 저장소로 이동되었습니다." : "파일들이 삭제되었습니다.",
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "채팅방 나가기 실패",
        description: "다시 시도해주세요.",
      });
    },
  });

  // 다중 선택 관련 함수들
  const toggleMultiSelect = () => {
    setIsMultiSelectMode(!isMultiSelectMode);
    setSelectedRoomIds([]);
  };

  const toggleRoomSelection = (roomId: number) => {
    setSelectedRoomIds(prev => 
      prev.includes(roomId) 
        ? prev.filter(id => id !== roomId)
        : [...prev, roomId]
    );
  };

  const handleExitSelectedRooms = () => {
    if (selectedRoomIds.length === 0) return;
    setShowExitConfirm(true);
  };

  const confirmExit = async () => {
    for (const roomId of selectedRoomIds) {
      await leaveChatRoomMutation.mutateAsync({ roomId, saveFiles });
    }
    setShowExitConfirm(false);
    setIsMultiSelectMode(false);
    setSelectedRoomIds([]);
  };

  // 메시지 미리 로딩 함수
  const prefetchMessages = async (chatRoomId: number) => {
    await queryClient.prefetchQuery({
      queryKey: [`/api/chat-rooms/${chatRoomId}/messages`],
      queryFn: async () => {
        const response = await apiRequest(`/api/chat-rooms/${chatRoomId}/messages`);
        return response.json();
      },
      staleTime: 30 * 1000, // 30초간 신선한 상태로 유지
    });
  };

  // 명령어 미리 로딩 함수
  const prefetchCommands = async () => {
    await queryClient.prefetchQuery({
      queryKey: ["/api/commands"],
      queryFn: async () => {
        const response = await apiRequest("/api/commands");
        return response.json();
      },
      staleTime: 60 * 1000, // 1분간 신선한 상태로 유지
    });
  };

  // 임시 메시지 확인 함수
  const getDraftKey = (roomId: number) => `chat_draft_${roomId}`;
  
  const hasDraftMessage = (roomId: number): boolean => {
    try {
      const draft = localStorage.getItem(getDraftKey(roomId));
      return draft !== null && draft.trim().length > 0;
    } catch (error) {
      return false;
    }
  };

  const getDraftPreview = (roomId: number): string => {
    try {
      const draft = localStorage.getItem(getDraftKey(roomId));
      if (draft && draft.trim().length > 0) {
        return draft.length > 20 ? draft.substring(0, 20) + "..." : draft;
      }
      return "";
    } catch (error) {
      return "";
    }
  };

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

  // 연락처 정보 가져오기
  const { data: contactsData } = useQuery({
    queryKey: ["/api/contacts"],
    enabled: !!user,
    queryFn: async () => {
      const response = await fetch("/api/contacts", {
        headers: { "x-user-id": user!.id.toString() },
      });
      if (!response.ok) throw new Error("Failed to fetch contacts");
      return response.json();
    },
  });

  // 읽지 않은 메시지 수 가져오기
  const { data: unreadCountsData } = useQuery({
    queryKey: ["/api/unread-counts"],
    enabled: !!user,
    queryFn: async () => {
      const response = await fetch("/api/unread-counts", {
        headers: { "x-user-id": user!.id.toString() },
      });
      if (!response.ok) throw new Error("Failed to fetch unread counts");
      return response.json();
    },
  });

  const chatRooms = chatRoomsData?.chatRooms || [];
  const contacts = contactsData?.contacts || [];
  const unreadCounts = unreadCountsData?.unreadCounts || [];

  // 특정 채팅방의 읽지 않은 메시지 수 가져오기
  const getUnreadCount = (chatRoomId: number) => {
    const unreadData = unreadCounts.find((item: any) => item.chatRoomId === chatRoomId);
    return unreadData ? unreadData.unreadCount : 0;
  };

  // 채팅방 이름을 상대방의 닉네임으로 표시하는 함수
  const getChatRoomDisplayName = (chatRoom: any) => {
    // 그룹 채팅인 경우 그룹 이름 반환
    if (chatRoom.isGroup) {
      return chatRoom.name;
    }
    
    // 개인 채팅인 경우 상대방 찾기 (본인이 아닌 참가자)
    const otherParticipant = chatRoom.participants?.find((p: any) => p.id !== user?.id);
    
    if (!otherParticipant) {
      return chatRoom.name; // 기본 이름
    }

    // 연락처에서 해당 사용자의 닉네임 찾기
    const contact = contacts.find((c: any) => c.contactUserId === otherParticipant.id);
    
    if (contact && contact.nickname) {
      return contact.nickname; // 설정된 닉네임
    }
    
    return otherParticipant.displayName || otherParticipant.username; // 표시 이름 또는 사용자명
  };

  const filteredChatRooms = chatRooms.filter((chatRoom: any) => {
    const displayName = getChatRoomDisplayName(chatRoom);
    const matchesSearch = displayName.toLowerCase().includes(searchTerm.toLowerCase());
    
    // 연락처 필터가 활성화된 경우, 해당 연락처가 포함된 채팅방만 표시
    if (contactFilter) {
      const hasContact = chatRoom.participants?.some((p: any) => p.id === contactFilter);
      return matchesSearch && hasContact;
    }
    
    return matchesSearch;
  });

  // 최근 메시지 시간순으로 정렬 (최신순)
  const sortedChatRooms = [...filteredChatRooms].sort((a: any, b: any) => {
    const aTime = a.lastMessage ? new Date(a.lastMessage.createdAt).getTime() : 0;
    const bTime = b.lastMessage ? new Date(b.lastMessage.createdAt).getTime() : 0;
    return bTime - aTime; // 최신순 정렬
  });

  const pinnedChats = sortedChatRooms.filter((chat: any) => chat.isPinned);
  const regularChats = sortedChatRooms.filter((chat: any) => !chat.isPinned);

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
          <div className="flex items-center space-x-2">
            {isMultiSelectMode ? (
              <>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleExitSelectedRooms}
                  disabled={selectedRoomIds.length === 0}
                  className="text-xs"
                >
                  <LogOut className="h-4 w-4 mr-1" />
                  나가기 ({selectedRoomIds.length})
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleMultiSelect}
                  className="text-xs"
                >
                  취소
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-gray-600 hover:text-gray-700"
                  onClick={toggleMultiSelect}
                  title="채팅방 관리"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-purple-600 hover:text-purple-700"
                  onClick={onCreateGroup}
                  title="그룹 채팅 만들기"
                >
                  <Plus className="h-5 w-5" />
                </Button>
              </>
            )}
          </div>
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
        
        {/* 연락처 필터 표시 */}
        {contactFilter && (
          <div className="mt-3 p-2 bg-purple-50 rounded-lg flex items-center justify-between">
            <span className="text-sm text-purple-700">
              연락처별 채팅방 필터링 중
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearFilter}
              className="h-6 w-6 p-0 text-purple-600 hover:text-purple-700"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto max-h-[calc(100vh-280px)] scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
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
                displayName={getChatRoomDisplayName(chatRoom)}
                isSelected={selectedChatId === chatRoom.id}
                onClick={() => isMultiSelectMode ? toggleRoomSelection(chatRoom.id) : onSelectChat(chatRoom.id)}
                isPinned
                unreadCount={getUnreadCount(chatRoom.id)}
                hasDraft={hasDraftMessage(chatRoom.id)}
                draftPreview={getDraftPreview(chatRoom.id)}
                isMultiSelectMode={isMultiSelectMode}
                isChecked={selectedRoomIds.includes(chatRoom.id)}
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
                displayName={getChatRoomDisplayName(chatRoom)}
                isSelected={selectedChatId === chatRoom.id}
                onClick={() => isMultiSelectMode ? toggleRoomSelection(chatRoom.id) : onSelectChat(chatRoom.id)}
                unreadCount={getUnreadCount(chatRoom.id)}
                hasDraft={hasDraftMessage(chatRoom.id)}
                draftPreview={getDraftPreview(chatRoom.id)}
                isMultiSelectMode={isMultiSelectMode}
                isChecked={selectedRoomIds.includes(chatRoom.id)}
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

      {/* 나가기 확인 다이얼로그 */}
      <Dialog open={showExitConfirm} onOpenChange={setShowExitConfirm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>채팅방 나가기</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              선택한 {selectedRoomIds.length}개의 채팅방에서 나가시겠습니까?
            </p>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="save-files"
                checked={saveFiles}
                onCheckedChange={(checked) => setSaveFiles(checked === true)}
              />
              <label htmlFor="save-files" className="text-sm text-gray-700">
                공유된 파일들을 내 저장소로 이동
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowExitConfirm(false)}>
              취소
            </Button>
            <Button 
              variant="destructive" 
              onClick={confirmExit}
              disabled={leaveChatRoomMutation.isPending}
            >
              {leaveChatRoomMutation.isPending ? "처리중..." : "나가기"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ChatRoomItem({ 
  chatRoom, 
  displayName,
  isSelected, 
  onClick, 
  isPinned = false,
  unreadCount = 0,
  hasDraft = false,
  draftPreview = "",
  isMultiSelectMode = false,
  isChecked = false
}: {
  chatRoom: any;
  displayName: string;
  isSelected: boolean;
  onClick: () => void;
  isPinned?: boolean;
  unreadCount?: number;
  hasDraft?: boolean;
  draftPreview?: string;
  isMultiSelectMode?: boolean;
  isChecked?: boolean;
}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // 호버 시 메시지 미리 로딩
  const handleMouseEnter = async () => {
    try {
      await queryClient.prefetchQuery({
        queryKey: [`/api/chat-rooms/${chatRoom.id}/messages`],
        queryFn: async () => {
          const response = await apiRequest(`/api/chat-rooms/${chatRoom.id}/messages`);
          return response.json();
        },
        staleTime: 30 * 1000, // 30초간 신선한 상태로 유지
      });
    } catch (error) {
      // 미리 로딩 실패 시 무시 (사용자 경험에 영향 없음)
      console.log('메시지 미리 로딩 실패:', error);
    }
  };
  
  const getInitials = (name: string) => {
    return name.split(' ').map(word => word.charAt(0).toUpperCase()).join('').slice(0, 2);
  };

  const getOtherParticipant = (chatRoom: any) => {
    if (!chatRoom.participants || !user) return null;
    return chatRoom.participants.find((p: any) => p.id !== user.id);
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
        "p-4 hover:bg-purple-50 dark:hover:bg-gray-800 cursor-pointer border-b border-gray-100 dark:border-gray-700 transition-colors relative",
        isSelected && !isMultiSelectMode && "bg-purple-50 dark:bg-gray-800",
        isMultiSelectMode && isChecked && "bg-blue-50 dark:bg-blue-900"
      )}
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
    >
      {isPinned && !isMultiSelectMode && (
        <Pin className="absolute top-2 right-2 text-purple-500 h-3 w-3" />
      )}
      
      <div className="flex items-center space-x-3">
        {isMultiSelectMode && (
          <Checkbox
            checked={isChecked}
            onCheckedChange={() => onClick()}
            className="flex-shrink-0"
          />
        )}
        {chatRoom.isGroup ? (
          <div className="relative w-12 h-12 flex items-center justify-center">
            {chatRoom.participants.slice(0, 3).map((participant: any, index: number) => {
              // 삼각형 배치 좌표
              const trianglePositions = [
                { top: '2px', left: '50%', transform: 'translateX(-50%)' }, // 상단 중앙
                { bottom: '2px', left: '2px' }, // 하단 좌측
                { bottom: '2px', right: '2px' } // 하단 우측
              ];
              
              const position = trianglePositions[index] || trianglePositions[0];
              
              return (
                <div
                  key={participant.id}
                  className="absolute border-2 border-white dark:border-gray-700 rounded-full shadow-sm"
                  style={{
                    ...position,
                    zIndex: 3 - index
                  }}
                >
                  <UserAvatar 
                    user={participant} 
                    size="sm" 
                    fallbackClassName="purple-gradient"
                  />
                </div>
              );
            })}
          </div>
        ) : (
          <UserAvatar 
            user={getOtherParticipant(chatRoom)} 
            size="lg" 
            fallbackClassName={`bg-gradient-to-br ${getAvatarColor(displayName)}`}
          />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1 flex-1 min-w-0">
              {chatRoom.isGroup && (
                <Users className="h-4 w-4 text-purple-500 flex-shrink-0" />
              )}
              <p className="font-medium text-gray-900 dark:text-gray-100 truncate">{displayName}</p>
            </div>
            <div className="flex items-center space-x-2">
              {chatRoom.lastMessage && (
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {formatTime(chatRoom.lastMessage.createdAt)}
                </span>
              )}
              {hasDraft && (
                <Badge variant="outline" className="bg-orange-50 text-orange-600 border-orange-200 text-xs px-2 py-0.5">
                  ✏️ 임시저장
                </Badge>
              )}
              {unreadCount > 0 && (
                <Badge variant="default" className="bg-red-500 hover:bg-red-600 text-white text-xs px-2 py-1 min-w-[20px] h-5 flex items-center justify-center rounded-full">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Badge>
              )}
            </div>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-300 truncate">
            {hasDraft ? (
              <span className="text-orange-600 dark:text-orange-400 font-medium">
                📝 임시저장: {draftPreview}
              </span>
            ) : (
              getLastMessagePreview(chatRoom.lastMessage)
            )}
          </p>
          {chatRoom.isGroup && (
            <div className="flex items-center justify-between mt-1">
              <span className="text-xs text-gray-400 dark:text-gray-500">
                참여자 {chatRoom.participants.length}명
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
