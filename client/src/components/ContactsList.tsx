import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { OptimizedAvatar } from "@/components/OptimizedAvatar";
import PrismAvatar from "@/components/PrismAvatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator 
} from "@/components/ui/dropdown-menu";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Search, Star, MoreVertical, UserX, Trash2, Shield, Mic } from "lucide-react";
import { cn, getInitials, getAvatarColor } from "@/lib/utils";

interface ContactsListProps {
  onAddContact: () => void;
  onSelectContact: (contactId: number) => void;
}

export default function ContactsList({ onAddContact, onSelectContact }: ContactsListProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("nickname");
  const [showBlockConfirm, setShowBlockConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [contactToBlock, setContactToBlock] = useState<any>(null);
  const [contactToDelete, setContactToDelete] = useState<any>(null);
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingContact, setRecordingContact] = useState<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // 길게 누르기 시작
  const handleLongPressStart = (contact: any) => {
    const timer = setTimeout(() => {
      startVoiceRecording(contact);
    }, 500); // 0.5초 후 녹음 시작
    
    setLongPressTimer(timer);
  };

  // 길게 누르기 끝
  const handleLongPressEnd = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
    
    if (isRecording) {
      stopVoiceRecording();
    }
  };

  // 음성 녹음 시작
  const startVoiceRecording = async (contact: any) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        sendVoiceMessage(contact, audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingContact(contact);
      
      toast({
        title: "음성 녹음 시작",
        description: `${contact.nickname || contact.contactUser.displayName}에게 음성 메시지를 녹음 중입니다.`,
      });
    } catch (error) {
      console.error('Voice recording failed:', error);
      toast({
        variant: "destructive",
        title: "녹음 실패",
        description: "마이크 권한을 확인해주세요.",
      });
    }
  };

  // 음성 녹음 중지
  const stopVoiceRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setRecordingContact(null);
    }
  };

  // 간편음성메세지 전송 (채팅방과 동일한 음성 처리)
  const sendVoiceMessage = async (contact: any, audioBlob: Blob) => {
    try {
      console.log('간편음성메세지 전송 시작:', contact.contactUserId);
      
      // 1:1 대화방 찾기 또는 생성
      const chatRoomResponse = await apiRequest('/api/chat-rooms/direct', 'POST', {
        participantId: contact.contactUserId
      });
      
      if (!chatRoomResponse.ok) {
        console.error('채팅방 생성/찾기 실패');
        return;
      }
      
      const chatRoomData = await chatRoomResponse.json();
      const chatRoomId = chatRoomData.chatRoom.id;
      
      console.log('채팅방 ID:', chatRoomId, '음성 파일 크기:', audioBlob.size);

      // FormData로 음성 파일 업로드 (채팅방과 동일한 방식)
      const formData = new FormData();
      const fileName = `voice_${Date.now()}_${Math.random().toString(36).substr(2, 11)}.webm`;
      formData.append('file', audioBlob, fileName);
      formData.append('messageType', 'voice');

      const uploadResponse = await fetch(`/api/chat-rooms/${chatRoomId}/upload`, {
        method: 'POST',
        headers: {
          'x-user-id': String(user?.id),
        },
        body: formData,
      });

      if (!uploadResponse.ok) {
        console.error('음성 파일 업로드 실패');
        return;
      }

      const uploadData = await uploadResponse.json();
      console.log('음성 파일 업로드 성공:', uploadData);

      // 업로드된 파일로 음성 메시지 전송 (텍스트 변환 포함)
      const messageResponse = await apiRequest(`/api/chat-rooms/${chatRoomId}/messages`, 'POST', {
        content: uploadData.transcription || '음성 메시지',
        messageType: 'voice',
        fileUrl: uploadData.fileUrl,
        fileName: uploadData.fileName,
        fileSize: uploadData.fileSize || audioBlob.size,
        voiceDuration: uploadData.duration || 3,
        detectedLanguage: uploadData.language || 'korean',
        confidence: uploadData.confidence || '0.9'
      });

      if (messageResponse.ok) {
        console.log('간편음성메세지 전송 성공 - 채팅방:', chatRoomId);
        
        // 채팅방 목록과 메시지 캐시 무효화
        await queryClient.invalidateQueries({ queryKey: ["/api/chat-rooms"] });
        await queryClient.invalidateQueries({ queryKey: [`/api/chat-rooms/${chatRoomId}/messages`] });
        await queryClient.invalidateQueries({ queryKey: ["/api/unread-counts"] });
        
        // 해당 대화방으로 이동
        setTimeout(() => {
          onSelectContact(contact.contactUserId);
        }, 200);
      } else {
        console.error('간편음성메세지 전송 실패 - 응답:', await messageResponse.text());
      }
    } catch (error) {
      console.error('간편음성메세지 전송 실패:', error);
    }
  };

  // Toggle favorite mutation
  const toggleFavoriteMutation = useMutation({
    mutationFn: async ({ contactId, isPinned }: { contactId: number; isPinned: boolean }) => {
      const response = await apiRequest(`/api/contacts/${contactId}`, "PATCH", { isPinned });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
    },
    onError: () => {
      // 즐겨찾기 설정 실패 - 알림 제거
    },
  });

  // Block contact mutation
  const blockContactMutation = useMutation({
    mutationFn: async (contactUserId: number) => {
      const response = await apiRequest(`/api/contacts/${contactUserId}/block`, "POST");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
    },
    onError: () => {
      // 차단 실패 - 알림 제거
    },
  });

  // Delete contact mutation
  const deleteContactMutation = useMutation({
    mutationFn: async (contactUserId: number) => {
      const response = await apiRequest(`/api/contacts/${contactUserId}`, "DELETE");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
    },
    onError: () => {
      // 삭제 실패 - 알림 제거
    },
  });

  const { data: contactsData, isLoading } = useQuery({
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

  // 최근 포스팅한 친구들 데이터 가져오기
  const { data: recentPostsData } = useQuery({
    queryKey: ["/api/contacts/recent-posts"],
    enabled: !!user,
    queryFn: async () => {
      const response = await fetch("/api/contacts/recent-posts", {
        headers: { "x-user-id": user!.id.toString() },
      });
      if (!response.ok) throw new Error("Failed to fetch recent posts");
      return response.json();
    },
    refetchInterval: 30000, // 30초마다 새로고침
  });

  const contacts = contactsData?.contacts || [];
  const recentPosts = recentPostsData || [];

  // 특정 사용자가 최근에 포스팅했는지 확인하는 함수
  const hasRecentPost = (userId: number) => {
    return recentPosts.some((post: any) => post.userId === userId);
  };

  const handleBlockContact = (contact: any) => {
    setContactToBlock(contact);
    setShowBlockConfirm(true);
  };

  const handleDeleteContact = (contact: any) => {
    setContactToDelete(contact);
    setShowDeleteConfirm(true);
  };

  const confirmBlockContact = () => {
    if (contactToBlock) {
      blockContactMutation.mutate(contactToBlock.contactUserId);
      setShowBlockConfirm(false);
      setContactToBlock(null);
    }
  };

  const confirmDeleteContact = () => {
    if (contactToDelete) {
      deleteContactMutation.mutate(contactToDelete.contactUserId);
      setShowDeleteConfirm(false);
      setContactToDelete(null);
    }
  };

  // 즐겨찾기 친구와 모든 친구 분리
  const favoriteContacts = contacts.filter((contact: any) => contact.isPinned);

  const filteredAndSortedContacts = contacts
    .filter((contact: any) => {
      // 본인 계정 제외
      if (contact.contactUser.id === user?.id) {
        return false;
      }
      
      const searchLower = searchTerm.toLowerCase();
      const nickname = contact.nickname || contact.contactUser.displayName;
      return nickname.toLowerCase().includes(searchLower) ||
             contact.contactUser.username.toLowerCase().includes(searchLower);
    })
    .sort((a: any, b: any) => {
      const aName = a.nickname || a.contactUser.displayName;
      const bName = b.nickname || b.contactUser.displayName;
      
      switch (sortBy) {
        case "nickname":
          return aName.localeCompare(bName);
        case "username":
          return a.contactUser.username.localeCompare(b.contactUser.username);
        case "lastSeen":
          return new Date(b.contactUser.lastSeen || 0).getTime() - new Date(a.contactUser.lastSeen || 0).getTime();
        default:
          return 0;
      }
    });

  const getInitials = (name: string) => {
    return name.charAt(0).toUpperCase();
  };

  const getOnlineStatus = (user: any) => {
    if (user.isOnline) return "온라인";
    if (!user.lastSeen) return "오프라인";
    
    const lastSeen = new Date(user.lastSeen);
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - lastSeen.getTime()) / (1000 * 60));
    
    if (diffMinutes < 60) return `${diffMinutes}분 전 접속`;
    if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)}시간 전 접속`;
    return `${Math.floor(diffMinutes / 1440)}일 전 접속`;
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-gray-500">연락처를 불러오는 중...</div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-3 border-b border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-gray-900 text-sm">연락처</h3>
          <Button
            variant="ghost"
            size="sm"
            className="text-purple-600 hover:text-purple-700 h-7 w-7 p-0"
            onClick={onAddContact}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="relative mb-2">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 h-3 w-3" />
          <Input
            type="text"
            placeholder="검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-7 h-7 text-xs"
          />
        </div>
        
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="h-7 text-xs">
            <SelectValue placeholder="정렬" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="nickname">닉네임순</SelectItem>
            <SelectItem value="username">이름순</SelectItem>
            <SelectItem value="lastSeen">접속순</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* 즐겨찾기 친구 버블 */}
      {favoriteContacts.length > 0 && (
        <div className="px-3 py-2 border-b border-gray-100">
          <div className="flex items-center space-x-2 mb-2">
            <h4 className="text-xs font-medium text-gray-600">즐겨찾기</h4>
          </div>
          <div className="flex space-x-3 overflow-x-auto scrollbar-none pb-1">
            {favoriteContacts.map((contact: any) => {
              const displayName = contact.nickname || contact.contactUser.displayName;
              return (
                <div key={contact.id} className="flex flex-col items-center space-y-1 flex-shrink-0">
                  <div 
                    className={cn(
                      "relative cursor-pointer hover:opacity-75 transition-opacity select-none",
                      isRecording && recordingContact?.id === contact.id && "ring-2 ring-red-300"
                    )}
                    style={{ 
                      userSelect: 'none',
                      WebkitUserSelect: 'none',
                      MozUserSelect: 'none',
                      msUserSelect: 'none',
                      WebkitTouchCallout: 'none'
                    }}
                    onClick={() => setLocation(`/friend/${contact.contactUserId}`)}
                    onMouseDown={() => handleLongPressStart(contact)}
                    onMouseUp={handleLongPressEnd}
                    onMouseLeave={handleLongPressEnd}
                    onTouchStart={() => handleLongPressStart(contact)}
                    onTouchEnd={handleLongPressEnd}
                    onContextMenu={(e) => e.preventDefault()}
                  >
                    <PrismAvatar
                      src={contact.contactUser.profilePicture}
                      fallback={getInitials(displayName)}
                      hasNewPost={hasRecentPost(contact.contactUserId)}
                      size="md"
                      className="shadow-md"
                    />
                    {contact.contactUser.isOnline && (
                      <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white rounded-full z-20"></div>
                    )}
                  </div>
                  <span 
                    className="text-xs text-gray-700 text-center max-w-[60px] truncate cursor-pointer hover:text-blue-600"
                    onClick={() => onSelectContact(contact.contactUserId)}
                  >
                    {displayName}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto max-h-[calc(100vh-240px)] scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
        {filteredAndSortedContacts.length === 0 ? (
          <div className="p-3 text-center text-gray-500 text-sm">
            {searchTerm ? "검색 결과가 없습니다" : "연락처가 없습니다"}
          </div>
        ) : (
          filteredAndSortedContacts.map((contact: any) => (
            <div
              key={contact.id}
              className={cn(
                "px-3 py-2 hover:bg-purple-50 border-b border-gray-100 transition-colors group",
                isRecording && recordingContact?.id === contact.id && "bg-red-50 ring-2 ring-red-300"
              )}
            >
              <div className="flex items-center space-x-2">
                <div 
                  className="cursor-pointer flex-1 flex items-center space-x-2 select-none"
                  style={{ 
                    userSelect: 'none',
                    WebkitUserSelect: 'none',
                    MozUserSelect: 'none',
                    msUserSelect: 'none',
                    WebkitTouchCallout: 'none'
                  }}
                  onClick={() => onSelectContact(contact.contactUserId)}
                  onMouseDown={() => handleLongPressStart(contact)}
                  onMouseUp={handleLongPressEnd}
                  onMouseLeave={handleLongPressEnd}
                  onTouchStart={() => handleLongPressStart(contact)}
                  onTouchEnd={handleLongPressEnd}
                  onContextMenu={(e) => e.preventDefault()}
                >
                  <div
                    className="cursor-pointer"
                    onClick={(e?: React.MouseEvent) => {
                      e?.stopPropagation();
                      setLocation(`/friend/${contact.contactUserId}`);
                    }}
                  >
                    <PrismAvatar
                      src={contact.contactUser.profilePicture}
                      fallback={getInitials(contact.nickname || contact.contactUser.displayName)}
                      hasNewPost={hasRecentPost(contact.contactUserId)}
                      size="sm"
                      className="hover:ring-2 hover:ring-blue-300 transition-all"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-gray-900 truncate text-sm">
                        {contact.nickname || contact.contactUser.displayName}
                      </p>
                      <div className={cn(
                        "w-2 h-2 rounded-full ml-2 flex-shrink-0",
                        contact.contactUser.isOnline ? "bg-green-500" : "bg-gray-300"
                      )} />
                    </div>
                    <p className="text-xs text-gray-500 truncate">@{contact.contactUser.username}</p>
                    <p className="text-xs text-gray-400 truncate">
                      {getOnlineStatus(contact.contactUser)}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-1">
                  {/* 즐겨찾기 버튼 */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity",
                      contact.isPinned && "opacity-100"
                    )}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavoriteMutation.mutate({
                        contactId: contact.id,
                        isPinned: !contact.isPinned
                      });
                    }}
                  >
                    <Star 
                      className={cn(
                        "h-4 w-4",
                        contact.isPinned 
                          ? "fill-yellow-400 text-yellow-400" 
                          : "text-gray-400 hover:text-yellow-400"
                      )} 
                    />
                  </Button>

                  {/* 옵션 메뉴 */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreVertical className="h-4 w-4 text-gray-400" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          handleBlockContact(contact);
                        }}
                        className="text-orange-600"
                      >
                        <Shield className="h-4 w-4 mr-2" />
                        차단하기
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteContact(contact);
                        }}
                        className="text-red-600"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        삭제하기
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 음성 녹음 상태 표시 */}
      {isRecording && recordingContact && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-gradient-to-br from-red-500 to-red-600 text-white p-8 rounded-2xl shadow-2xl flex flex-col items-center space-y-4 max-w-sm mx-4">
            {/* 마이크 아이콘과 펄스 애니메이션 */}
            <div className="relative">
              <div className="absolute inset-0 bg-red-400 rounded-full animate-ping opacity-75"></div>
              <div className="absolute inset-2 bg-red-300 rounded-full animate-ping opacity-50 animation-delay-200"></div>
              <div className="relative bg-red-600 p-4 rounded-full">
                <Mic className="h-8 w-8 text-white" />
              </div>
            </div>
            
            {/* 음성 파형 애니메이션 */}
            <div className="flex items-center space-x-1">
              <div className="w-1 bg-white/80 rounded-full waveform-bar" style={{animationDelay: '0ms'}}></div>
              <div className="w-1 bg-white/80 rounded-full waveform-bar" style={{animationDelay: '150ms'}}></div>
              <div className="w-1 bg-white/80 rounded-full waveform-bar" style={{animationDelay: '300ms'}}></div>
              <div className="w-1 bg-white/80 rounded-full waveform-bar" style={{animationDelay: '450ms'}}></div>
              <div className="w-1 bg-white/80 rounded-full waveform-bar" style={{animationDelay: '600ms'}}></div>
              <div className="w-1 bg-white/80 rounded-full waveform-bar" style={{animationDelay: '750ms'}}></div>
              <div className="w-1 bg-white/80 rounded-full waveform-bar" style={{animationDelay: '900ms'}}></div>
            </div>
            
            <div className="text-center">
              <p className="text-lg font-semibold">
                {recordingContact.nickname || recordingContact.contactUser.displayName}
              </p>
              <p className="text-sm text-red-100 mt-1">
                음성 메시지 녹음 중...
              </p>
              <p className="text-xs text-red-200 mt-2">
                손을 떼면 자동으로 전송됩니다
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 차단 확인 다이얼로그 */}
      <AlertDialog open={showBlockConfirm} onOpenChange={setShowBlockConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>연락처 차단</AlertDialogTitle>
            <AlertDialogDescription>
              {contactToBlock?.nickname || contactToBlock?.contactUser?.displayName}님을 차단하시겠습니까?
              차단된 연락처는 메시지를 보낼 수 없으며, 연락처 목록에서 숨겨집니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmBlockContact}
              className="bg-orange-600 hover:bg-orange-700"
            >
              차단하기
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 삭제 확인 다이얼로그 */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>연락처 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              {contactToDelete?.nickname || contactToDelete?.contactUser?.displayName}님을 연락처에서 삭제하시겠습니까?
              삭제된 연락처는 복구할 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteContact}
              className="bg-red-600 hover:bg-red-700"
            >
              삭제하기
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
