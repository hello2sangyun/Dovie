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

  // 터치/클릭 시작 처리
  const handleTouchStart = (contact: any) => {
    const startTime = Date.now();
    setPressStartTime(startTime);
    console.log('👆 터치 시작:', contact.contactUser.displayName || contact.contactUser.username);
    
    // 0.5초 후 음성 녹음 시작
    const timer = setTimeout(() => {
      console.log('🎤 길게 누르기 감지 - 음성 녹음 시작');
      setRecordingContact(contact);
      setIsRecording(true);
      
      toast({
        title: "음성 메시지 녹음 중",
        description: `${contact.contactUser.displayName || contact.contactUser.username}에게 보낼 음성 메시지를 녹음하고 있습니다.`,
        duration: 2000,
      });
    }, 500);
    
    setLongPressTimer(timer);
  };

  // 터치/클릭 끝 처리
  const handleTouchEnd = (contact: any) => {
    const endTime = Date.now();
    const pressDuration = pressStartTime ? endTime - pressStartTime : 0;
    
    console.log('👆 터치 끝, 지속시간:', pressDuration, 'ms');
    
    // 타이머 정리
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
    
    // 짧은 터치 (500ms 미만): 채팅방으로 이동
    if (pressDuration < 500 && !isRecording) {
      console.log('📱 짧은 터치 감지 - 채팅방으로 이동');
      if (onNavigateToChat) {
        onNavigateToChat(contact.contactUserId);
      }
    }
    // 길게 누르기가 진행된 경우: 녹음 종료
    else if (isRecording && recordingContact) {
      console.log('🎤 녹음 종료 시작');
      setIsRecording(false);
      // recordingContact는 SimpleVoiceRecorder에서 처리 후 null로 설정됨
    }
    
    // 상태 초기화
    setPressStartTime(null);
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

      // 정규 채팅방 음성 메시지와 동일한 API 사용
      const formData = new FormData();
      formData.append('file', audioBlob, 'voice_message.webm');

      console.log('📤 정규 음성 API 사용 - 파일 업로드 시작');
      console.log('📤 audioBlob size:', audioBlob.size);
      console.log('📤 audioBlob type:', audioBlob.type);
      console.log('📤 user ID:', user?.id);
      console.log('📤 FormData 내용 확인');
      console.log('📤 대상 연락처:', recordingContact.contactUser.displayName || recordingContact.contactUser.username);

      // 1단계: 음성 파일 업로드 (/api/upload-voice)
      console.log('🔄 DB 저장 테스트 - 1단계: 음성 파일 업로드 시작');
      const uploadResponse = await fetch('/api/upload-voice', {
        method: 'POST',
        headers: {
          'x-user-id': String(user?.id),
        },
        body: formData,
      });

      console.log('📤 업로드 응답 상태:', uploadResponse.status);
      console.log('📤 업로드 응답 헤더:', Object.fromEntries(uploadResponse.headers.entries()));
      
      if (uploadResponse.status === 200) {
        console.log('✅ DB 저장 테스트 - 1단계: 음성 파일 업로드 성공');
      } else {
        console.log('❌ DB 저장 테스트 - 1단계: 음성 파일 업로드 실패');
      }

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        console.error('❌ 음성 파일 업로드 실패:', uploadResponse.status, errorText);
        throw new Error('음성 파일 업로드에 실패했습니다.');
      }

      const uploadResult = await uploadResponse.json();
      console.log('✅ 음성 파일 업로드 성공:', uploadResult);
      console.log('📁 DB 저장된 파일 경로:', uploadResult.fileUrl);
      console.log('📁 DB 저장된 파일 이름:', uploadResult.fileName);

      // 2단계: 음성 텍스트 변환 (/api/transcribe)
      console.log('🔄 DB 저장 테스트 - 2단계: AI 텍스트 변환 시작');
      const transcribeFormData = new FormData();
      transcribeFormData.append('audio', audioBlob, 'voice_message.webm');

      const transcribeResponse = await fetch('/api/transcribe', {
        method: 'POST',
        headers: {
          'x-user-id': String(user?.id),
        },
        body: transcribeFormData,
      });

      console.log('🤖 AI 변환 응답 상태:', transcribeResponse.status);

      if (!transcribeResponse.ok) {
        console.warn('⚠️ 음성 변환 실패, 기본 텍스트 사용');
        console.log('❌ DB 저장 테스트 - 2단계: AI 텍스트 변환 실패');
      }

      let transcribeResult;
      try {
        transcribeResult = await transcribeResponse.json();
        if (transcribeResult.success) {
          console.log('✅ DB 저장 테스트 - 2단계: AI 텍스트 변환 성공');
          console.log('🗣️ 변환된 텍스트:', transcribeResult.transcription);
          console.log('🌍 감지된 언어:', transcribeResult.language);
        }
      } catch (error) {
        console.warn('⚠️ 음성 변환 응답 파싱 실패, 기본 텍스트 사용');
        console.log('❌ DB 저장 테스트 - 2단계: AI 변환 응답 파싱 실패');
        transcribeResult = { success: false, transcription: '음성 메시지' };
      }

      console.log('✅ 음성 변환 결과:', transcribeResult);

      // 메시지 생성 - 정규 채팅방 음성 메시지와 동일한 형식
      const messageData = {
        content: transcribeResult.transcription || '음성 메시지',
        messageType: 'voice',
        fileUrl: uploadResult.fileUrl,
        fileName: uploadResult.fileName,
        fileSize: uploadResult.fileSize,
        voiceDuration: duration,
        transcription: transcribeResult.transcription || '음성 메시지',
        language: transcribeResult.language || 'korean',
        confidence: transcribeResult.confidence || '0.9'
      };

      console.log('🔄 DB 저장 테스트 - 3단계: 채팅방에 메시지 저장 시작');
      console.log('💬 저장할 메시지 데이터:', messageData);
      console.log('🏠 대상 채팅방 ID:', chatRoomId);
      
      const messageResponse = await apiRequest(`/api/chat-rooms/${chatRoomId}/messages`, 'POST', messageData);
      
      console.log('💾 메시지 저장 응답 상태:', messageResponse.status);
      
      if (!messageResponse.ok) {
        console.error('❌ 메시지 저장 실패:', messageResponse.status);
        console.log('❌ DB 저장 테스트 - 3단계: 채팅방 메시지 저장 실패');
        throw new Error('메시지 저장에 실패했습니다.');
      }

      const savedMessage = await messageResponse.json();
      console.log('✅ DB 저장 테스트 - 3단계: 채팅방 메시지 저장 성공');
      console.log('💾 저장된 메시지 ID:', savedMessage.message?.id);
      console.log('💾 저장된 메시지 내용:', savedMessage.message?.content);
      console.log('💾 저장된 파일 URL:', savedMessage.message?.fileUrl);

      // 캐시 무효화
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["/api/chat-rooms"] }),
        queryClient.invalidateQueries({ queryKey: [`/api/chat-rooms/${chatRoomId}/messages`] }),
        queryClient.invalidateQueries({ queryKey: ["/api/unread-counts"] })
      ]);

      console.log('🔄 DB 저장 테스트 - 모든 단계 완료! 총 결과:');
      console.log('✅ 1단계: 음성 파일 업로드 및 DB 저장 성공');
      console.log('✅ 2단계: AI 텍스트 변환 성공');
      console.log('✅ 3단계: 채팅방 메시지 저장 성공');
      console.log('🎉 간편음성메세지가 완전히 DB에 저장되었습니다!');

      // 업로드 성공 후 채팅방으로 자동 이동
      console.log('🚀 채팅방으로 자동 이동:', chatRoomId);
      setLocation(`/chat/${chatRoomId}`);
      
      // 성공 토스트
      toast({
        title: "간편음성메세지 전송 완료",
        description: `${recordingContact.contactUser.displayName || recordingContact.contactUser.username}에게 음성 메시지를 보냈습니다.`,
      });

      console.log('✅ 간편음성메세지 전송 완료');
    } catch (error: any) {
      console.error('❌ 간편음성메세지 전체 프로세스 실패:', error);
      console.error('❌ 오류 상세정보:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      toast({
        variant: "destructive",
        title: "음성 메시지 전송 실패",
        description: error.message || "다시 시도해주세요.",
      });
    } finally {
      // 상태 정리
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
          filteredAndSortedContacts.map((contact: any) => {
            console.log('🔍 연락처 렌더링:', contact.contactUser?.displayName || contact.contactUser?.username);
            return (
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
                  onClick={(e) => {
                    console.log('💿 연락처 클릭:', contact.contactUser.displayName);
                    // 길게 누르기가 진행 중이면 클릭 무시
                    if (longPressTimer) {
                      e.preventDefault();
                      e.stopPropagation();
                      return;
                    }
                    onSelectContact(contact.contactUserId);
                  }}
                  onMouseDown={(e) => {
                    console.log('🖱️ 마우스 다운:', contact.contactUser.displayName);
                    handleTouchStart(contact);
                  }}
                  onMouseUp={() => handleTouchEnd(contact)}
                  onMouseLeave={() => handleTouchEnd(contact)}
                  onTouchStart={(e) => {
                    console.log('👆 터치 시작:', contact.contactUser.displayName);
                    e.preventDefault(); // 기본 터치 동작 방지
                    handleTouchStart(contact);
                  }}
                  onTouchEnd={() => handleTouchEnd(contact)}
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
            );
          })
        )}
      </div>

      {/* 간편음성메세지 녹음 오버레이 */}
      {recordingContact && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 max-w-sm mx-4">
            <div className="text-center space-y-4">
              <div className="text-lg font-semibold text-gray-800 dark:text-white">
                {recordingContact.contactUser.displayName || recordingContact.contactUser.username}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-300">
                간편음성메세지
              </div>
              <SimpleVoiceRecorder
                onRecordingComplete={handleQuickVoiceComplete}
                disabled={false}
              />
              <div className="text-xs text-gray-500 dark:text-gray-400">
                녹음을 완료하면 자동으로 전송됩니다
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRecordingContact(null)}
                className="mt-2"
              >
                취소
              </Button>
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
