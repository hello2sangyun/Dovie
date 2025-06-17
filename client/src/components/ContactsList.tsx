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
import SimpleVoiceRecorder from "./SimpleVoiceRecorder";
import { cn, getInitials, getAvatarColor } from "@/lib/utils";

interface ContactsListProps {
  onAddContact: () => void;
  onSelectContact: (contactId: number) => void;
  onNavigateToChat?: (contactUserId: number) => void;
}

export default function ContactsList({ onAddContact, onSelectContact, onNavigateToChat }: ContactsListProps) {
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
  const [pressStartTime, setPressStartTime] = useState<number | null>(null);
  const voiceRecorderRef = useRef<any>(null);

  // 연락처 데이터 가져오기
  const { data: contactsData, isLoading: contactsLoading } = useQuery({
    queryKey: ["/api/contacts"],
    staleTime: 5 * 60 * 1000,
  });

  // 최근 포스트 데이터
  const { data: recentPostsData } = useQuery({
    queryKey: ["/api/contacts/recent-posts"],
    staleTime: 30 * 60 * 1000,
  });

  const contacts = contactsData?.contacts || [];

  // 터치 이벤트 핸들러
  const handleTouchStart = (contact: any) => {
    if (isRecording) return;
    
    const startTime = Date.now();
    setPressStartTime(startTime);
    
    const timer = setTimeout(() => {
      // 500ms 이상 누르면 음성 녹음 시작
      console.log('🎤 Long press detected - starting voice recording for:', contact.contactUser.displayName);
      setIsRecording(true);
      setRecordingContact(contact);
    }, 500);
    
    setLongPressTimer(timer);
  };

  const handleTouchEnd = (contact: any) => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
    
    if (pressStartTime) {
      const pressDuration = Date.now() - pressStartTime;
      setPressStartTime(null);
      
      // 현재 녹음 중인 경우 녹음 완료 처리
      if (isRecording && recordingContact?.id === contact.id) {
        console.log('🎤 Touch end during recording - stopping recording automatically');
        // 지연 후 녹음 중단 (최소 녹음 시간 확보)
        setTimeout(() => {
          if (voiceRecorderRef.current && voiceRecorderRef.current.stopRecording) {
            voiceRecorderRef.current.stopRecording();
          }
        }, 100);
        return;
      }
      
      // 짧은 터치 (500ms 미만)인 경우 채팅방으로 이동
      if (pressDuration < 500 && !isRecording) {
        console.log('👆 Short touch detected - navigating to chat with:', contact.contactUser.displayName);
        onNavigateToChat?.(contact.contactUserId);
      }
    }
  };

  // 간편음성메세지 완료 처리 - 채팅방 음성 메시지와 동일한 방식 사용
  const handleQuickVoiceComplete = async (audioBlob: Blob, duration: number) => {
    console.log('📞 handleQuickVoiceComplete 시작');
    console.log('📞 recordingContact:', recordingContact);
    console.log('📞 audioBlob:', audioBlob);
    console.log('📞 audioBlob.size:', audioBlob.size);
    console.log('📞 audioBlob.type:', audioBlob.type);
    console.log('📞 duration:', duration);
    
    if (!recordingContact) {
      console.error('❌ 녹음 대상 연락처가 없습니다');
      return;
    }

    try {
      console.log('🎤 간편음성메세지 전송 시작:', recordingContact.contactUserId, '파일 크기:', audioBlob.size, '지속시간:', duration);
      
      // 오디오 블롭 유효성 검사
      if (!audioBlob || audioBlob.size === 0) {
        throw new Error('음성 녹음이 비어있습니다. 다시 시도해주세요.');
      }

      // 1:1 대화방 찾기 또는 생성
      const chatRoomResponse = await apiRequest('/api/chat-rooms/direct', 'POST', {
        participantId: recordingContact.contactUserId
      });
      
      if (!chatRoomResponse.ok) {
        console.error('❌ 채팅방 생성/찾기 실패:', chatRoomResponse.status);
        throw new Error('채팅방을 찾을 수 없습니다.');
      }
      
      const chatRoomData = await chatRoomResponse.json();
      const chatRoomId = chatRoomData.chatRoom.id;
      
      console.log('📁 채팅방 확인 완료 - ID:', chatRoomId);

      // 직접 채팅방 음성 업로드 엔드포인트 사용 (더 안정적)
      const formData = new FormData();
      formData.append('file', audioBlob, 'voice_message.webm');
      formData.append('messageType', 'voice');

      console.log('🔄 채팅방 음성 업로드 시작 - chatRoomId:', chatRoomId);

      const uploadResponse = await fetch(`/api/chat-rooms/${chatRoomId}/upload`, {
        method: 'POST',
        headers: {
          'x-user-id': String(user?.id),
        },
        body: formData,
      });

      console.log('📤 업로드 응답 상태:', uploadResponse.status);
      
      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        console.error('❌ 음성 파일 업로드 실패:', uploadResponse.status, errorText);
        throw new Error(`음성 파일 업로드에 실패했습니다: ${errorText}`);
      }

      const uploadResult = await uploadResponse.json();
      console.log('✅ 채팅방 음성 업로드 완료:', uploadResult);
      
      // 채팅방 업로드 엔드포인트는 이미 변환과 메시지 저장을 모두 처리함
      const messageContent = uploadResult.transcription || '음성 메시지';
      
      console.log('📤 최종 메시지:', messageContent);
      console.log('💾 저장된 메시지 처리 완료');
      
      // 캐시 무효화
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["/api/chat-rooms"] }),
        queryClient.invalidateQueries({ queryKey: [`/api/chat-rooms/${chatRoomId}/messages`] }),
        queryClient.invalidateQueries({ queryKey: ["/api/unread-counts"] })
      ]);
      
      toast({
        title: "간편음성메세지 전송 완료",
        description: `${recordingContact.contactUser.displayName || recordingContact.contactUser.username}에게 음성 메시지를 전송했습니다.`,
      });

      // 채팅방으로 이동
      console.log('🔄 채팅방 네비게이션 시작');
      onNavigateToChat?.(recordingContact.contactUserId);
      console.log('✅ 모든 단계 완료 - 간편음성메세지 성공');

    } catch (error) {
      console.error('❌ 간편음성메세지 전송 실패:', error);
      toast({
        variant: "destructive",
        title: "음성 메시지 전송 실패",
        description: error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.",
      });
    } finally {
      setIsRecording(false);
      setRecordingContact(null);
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
  });

  const hasRecentPost = (userId: number) => {
    if (!recentPostsData || !Array.isArray(recentPostsData)) return false;
    return recentPostsData.some((post: any) => post.userId === userId);
  };

  const handleToggleFavorite = (contact: any) => {
    toggleFavoriteMutation.mutate({
      contactId: contact.id,
      isPinned: !contact.isPinned
    });
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

  if (contactsLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-2"></div>
          <p className="text-sm text-gray-500">연락처를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* 음성 녹음 모달 */}
      {isRecording && recordingContact && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
            <div className="text-center">
              <div className="mb-4">
                <PrismAvatar
                  src={recordingContact.contactUser.profilePicture}
                  fallback={getInitials(recordingContact.contactUser.displayName)}
                  size="lg"
                  className="mx-auto mb-2"
                />
                <h3 className="font-medium">{recordingContact.contactUser.displayName}</h3>
                <p className="text-sm text-gray-500">간편음성메세지 녹음 중...</p>
              </div>
              <SimpleVoiceRecorder
                onRecordingComplete={handleQuickVoiceComplete}
                onCancel={() => {
                  setIsRecording(false);
                  setRecordingContact(null);
                }}
                autoStart={true}
              />
            </div>
          </div>
        </div>
      )}

      {/* 헤더 */}
      <div className="flex-shrink-0 p-3 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">연락처</h2>
          <Button 
            onClick={onAddContact}
            size="sm"
            className="h-8 w-8 p-0 purple-gradient"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        
        {/* 검색 및 정렬 */}
        <div className="flex items-center space-x-2">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-gray-400" />
            <Input
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
                    onMouseDown={() => handleTouchStart(contact)}
                    onMouseUp={() => handleTouchEnd(contact)}
                    onMouseLeave={() => handleTouchEnd(contact)}
                    onTouchStart={() => handleTouchStart(contact)}
                    onTouchEnd={() => handleTouchEnd(contact)}
                    onContextMenu={(e) => e.preventDefault()}
                  >
                    <PrismAvatar
                      src={contact.contactUser.profilePicture}
                      fallback={getInitials(displayName)}
                      hasNewPost={hasRecentPost(contact.contactUserId)}
                      size="md"
                      className="shadow-sm"
                    />
                    <div className="absolute -top-1 -right-1">
                      <Star className="h-3 w-3 text-yellow-500 fill-current" />
                    </div>
                  </div>
                  <span className="text-xs text-gray-700 truncate max-w-[60px]">
                    {displayName}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 연락처 목록 */}
      <div className="flex-1 overflow-y-auto">
        {filteredAndSortedContacts.length === 0 ? (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                <Plus className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">연락처가 없습니다</h3>
              <p className="text-sm text-gray-500 mb-4">새로운 친구를 추가해보세요!</p>
              <Button onClick={onAddContact} className="purple-gradient">
                <Plus className="h-4 w-4 mr-2" />
                연락처 추가
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-1">
            {filteredAndSortedContacts.map((contact: any) => {
              const displayName = contact.nickname || contact.contactUser.displayName;
              return (
                <div
                  key={contact.id}
                  className={cn(
                    "flex items-center space-x-3 p-3 hover:bg-gray-50 cursor-pointer select-none",
                    isRecording && recordingContact?.id === contact.id && "bg-red-50 ring-1 ring-red-200"
                  )}
                  style={{ 
                    userSelect: 'none',
                    WebkitUserSelect: 'none',
                    MozUserSelect: 'none',
                    msUserSelect: 'none',
                    WebkitTouchCallout: 'none'
                  }}
                  onMouseDown={() => handleTouchStart(contact)}
                  onMouseUp={() => handleTouchEnd(contact)}
                  onMouseLeave={() => handleTouchEnd(contact)}
                  onTouchStart={() => handleTouchStart(contact)}
                  onTouchEnd={() => handleTouchEnd(contact)}
                  onContextMenu={(e) => e.preventDefault()}
                >
                  <div className="relative">
                    <PrismAvatar
                      src={contact.contactUser.profilePicture}
                      fallback={getInitials(displayName)}
                      hasNewPost={hasRecentPost(contact.contactUserId)}
                      size="sm"
                    />
                    {contact.isPinned && (
                      <div className="absolute -top-1 -right-1">
                        <Star className="h-3 w-3 text-yellow-500 fill-current" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {displayName}
                      </p>
                      {contact.contactUser.isOnline && (
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 truncate">
                      @{contact.contactUser.username}
                    </p>
                    {contact.contactUser.lastSeen && (
                      <p className="text-xs text-gray-400">
                        {new Date(contact.contactUser.lastSeen).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleFavorite(contact);
                        }}
                      >
                        <Star className="h-4 w-4 mr-2" />
                        {contact.isPinned ? "즐겨찾기 해제" : "즐겨찾기 추가"}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleBlockContact(contact);
                        }}
                        className="text-yellow-600"
                      >
                        <Shield className="h-4 w-4 mr-2" />
                        차단하기
                      </DropdownMenuItem>
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
              );
            })}
          </div>
        )}
      </div>

      {/* 차단 확인 다이얼로그 */}
      <AlertDialog open={showBlockConfirm} onOpenChange={setShowBlockConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>연락처 차단</AlertDialogTitle>
            <AlertDialogDescription>
              {contactToBlock?.contactUser.displayName || contactToBlock?.contactUser.username}님을 차단하시겠습니까?
              차단된 사용자는 메시지를 보낼 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmBlockContact}
              className="bg-yellow-600 hover:bg-yellow-700"
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
              {contactToDelete?.contactUser.displayName || contactToDelete?.contactUser.username}님을 연락처에서 삭제하시겠습니까?
              이 작업은 되돌릴 수 없습니다.
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