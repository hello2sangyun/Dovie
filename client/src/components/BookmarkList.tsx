import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageCircle, File, Mic, Search, Trash2, Bookmark } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface BookmarkData {
  id: number;
  userId: number;
  messageId: number;
  chatRoomId: number;
  bookmarkType: "message" | "file" | "voice";
  note: string | null;
  createdAt: string;
  message: {
    id: number;
    chatRoomId: number;
    senderId: number;
    content: string | null;
    messageType: string;
    fileUrl: string | null;
    fileName: string | null;
    fileSize: number | null;
    voiceDuration: string | null;
    createdAt: string;
  } | null;
}

export default function BookmarkList() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch bookmarks
  const { data: bookmarksData, isLoading } = useQuery<{ bookmarks: BookmarkData[] }>({
    queryKey: ["/api/bookmarks"],
    enabled: !!user,
  });

  // Fetch chat rooms to get room names
  const { data: chatRoomsData } = useQuery<{ chatRooms: any[] }>({
    queryKey: ["/api/chat-rooms"],
    enabled: !!user,
  });

  // Delete bookmark mutation
  const deleteBookmarkMutation = useMutation({
    mutationFn: async (bookmarkId: number) => {
      const response = await apiRequest(`/api/bookmarks/${bookmarkId}`, "DELETE");
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to delete bookmark");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookmarks"] });
      toast({
        title: "북마크 삭제 완료",
        description: "북마크가 삭제되었습니다.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "북마크 삭제 실패",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Get chat room name by ID
  const getChatRoomName = (chatRoomId: number) => {
    const chatRoom = chatRoomsData?.chatRooms?.find((room) => room.id === chatRoomId);
    if (!chatRoom) return "알 수 없는 채팅방";
    
    if (chatRoom.isGroup) {
      return chatRoom.name;
    } else {
      // For 1:1 chats, show the other participant's name
      const otherParticipant = chatRoom.participants?.find((p: any) => p.id !== user?.id);
      return otherParticipant?.nickname || otherParticipant?.displayName || chatRoom.name;
    }
  };

  // Filter and sort bookmarks
  const filteredBookmarks = useMemo(() => {
    if (!bookmarksData?.bookmarks) return [];
    
    let filtered = bookmarksData.bookmarks;
    
    // Apply search filter
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter((bookmark) => {
        const content = bookmark.message?.content?.toLowerCase() || "";
        const fileName = bookmark.message?.fileName?.toLowerCase() || "";
        const roomName = getChatRoomName(bookmark.chatRoomId).toLowerCase();
        const note = bookmark.note?.toLowerCase() || "";
        
        return (
          content.includes(searchLower) ||
          fileName.includes(searchLower) ||
          roomName.includes(searchLower) ||
          note.includes(searchLower)
        );
      });
    }
    
    // Sort by newest first
    filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    return filtered;
  }, [bookmarksData?.bookmarks, searchTerm, chatRoomsData]);

  // Get icon for bookmark type
  const getBookmarkIcon = (type: string) => {
    switch (type) {
      case "message":
        return MessageCircle;
      case "file":
        return File;
      case "voice":
        return Mic;
      default:
        return MessageCircle;
    }
  };

  // Get type label
  const getTypeLabel = (type: string) => {
    switch (type) {
      case "message":
        return "메시지";
      case "file":
        return "파일";
      case "voice":
        return "음성";
      default:
        return "메시지";
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return date.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
    } else if (date.toDateString() === yesterday.toDateString()) {
      return "어제";
    } else {
      return date.toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
    }
  };

  // Get message preview
  const getMessagePreview = (bookmark: BookmarkData) => {
    if (!bookmark.message) return "메시지를 불러올 수 없습니다";
    
    const { message } = bookmark;
    
    if (bookmark.bookmarkType === "file" && message.fileName) {
      return message.fileName;
    }
    
    if (bookmark.bookmarkType === "voice") {
      return `음성 메시지 (${message.voiceDuration || "0"}초)`;
    }
    
    if (message.content) {
      return message.content.length > 100
        ? `${message.content.substring(0, 100)}...`
        : message.content;
    }
    
    return "내용 없음";
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full" data-testid="bookmark-loading">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-50" data-testid="bookmark-list">
      {/* Search bar */}
      <div className="p-4 bg-white border-b border-gray-200">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder="북마크 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
            data-testid="input-bookmark-search"
          />
        </div>
      </div>

      {/* Bookmarks list */}
      <div className="flex-1 overflow-y-auto">
        {filteredBookmarks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500" data-testid="bookmark-empty-state">
            <Bookmark className="h-16 w-16 mb-4 text-gray-300" />
            <p className="text-lg font-medium">
              {searchTerm ? "검색 결과가 없습니다" : "북마크가 없습니다"}
            </p>
            {searchTerm && (
              <p className="text-sm text-gray-400 mt-1">다른 검색어를 시도해보세요</p>
            )}
            {!searchTerm && (
              <p className="text-sm text-gray-400 mt-1">
                메시지를 길게 눌러 북마크에 추가하세요
              </p>
            )}
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {filteredBookmarks.map((bookmark) => {
              const Icon = getBookmarkIcon(bookmark.bookmarkType);
              const typeLabel = getTypeLabel(bookmark.bookmarkType);
              const chatRoomName = getChatRoomName(bookmark.chatRoomId);
              const messagePreview = getMessagePreview(bookmark);
              const formattedDate = formatDate(bookmark.createdAt);

              return (
                <div
                  key={bookmark.id}
                  className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer"
                  data-testid={`bookmark-card-${bookmark.id}`}
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <Icon className="h-4 w-4 text-purple-600" data-testid={`icon-${bookmark.bookmarkType}`} />
                      </div>
                      <div>
                        <p className="text-xs text-purple-600 font-medium" data-testid={`text-bookmark-type-${bookmark.id}`}>
                          {typeLabel}
                        </p>
                        <p className="text-sm text-gray-600" data-testid={`text-chatroom-name-${bookmark.id}`}>
                          📁 {chatRoomName}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-gray-400" data-testid={`text-bookmark-date-${bookmark.id}`}>
                        {formattedDate}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteBookmarkMutation.mutate(bookmark.id);
                        }}
                        className="h-8 w-8 p-0 hover:bg-red-50 hover:text-red-600"
                        data-testid={`button-delete-bookmark-${bookmark.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Message preview */}
                  <div className="mt-2">
                    <p className="text-sm text-gray-700 line-clamp-2" data-testid={`text-message-preview-${bookmark.id}`}>
                      {messagePreview}
                    </p>
                  </div>

                  {/* Note if exists */}
                  {bookmark.note && (
                    <div className="mt-2 pt-2 border-t border-gray-100">
                      <p className="text-xs text-gray-500" data-testid={`text-bookmark-note-${bookmark.id}`}>
                        📝 {bookmark.note}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
