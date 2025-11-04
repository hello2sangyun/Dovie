import { useState, useMemo, useRef } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useDebounce } from "@/hooks/useDebounce";
import { useVirtualization } from "@/hooks/useVirtualization";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserAvatar } from "@/components/UserAvatar";
import ZeroDelayAvatar from "@/components/ZeroDelayAvatar";
import InstantAvatar from "@/components/InstantAvatar";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Search, Pin, Users, X, Trash2, LogOut, MoreVertical, Mic, Bell } from "lucide-react";
import { cn, getInitials, getAvatarColor } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import VoiceMessageConfirmModal from "./VoiceMessageConfirmModal";
import LoadingScreen from "./LoadingScreen";

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
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [selectedRoomIds, setSelectedRoomIds] = useState<number[]>([]);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [saveFiles, setSaveFiles] = useState(true);
  
  // 음성 메시지 관련 상태
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingChatRoom, setRecordingChatRoom] = useState<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [recordingStartTime, setRecordingStartTime] = useState(0);
  
  // 스크롤 감지 - useRef로 동기적 업데이트
  const touchStartYRef = useRef<number>(0);
  const isScrollingRef = useRef<boolean>(false);
  
  // Voice Confirm Modal 상태
  const [showVoiceConfirmModal, setShowVoiceConfirmModal] = useState(false);
  const [voiceConfirmData, setVoiceConfirmData] = useState<{
    transcription: string;
    audioUrl: string;
    duration: number;
    chatRoomId: number;
  } | null>(null);
  
  // 음성 처리 로딩 상태
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);

  // Voice Confirm Modal 콜백 함수들
  const handleVoiceMessageSend = async (editedText: string) => {
    if (!voiceConfirmData) return;
    
    try {
      console.log('📨 편집된 음성 메시지 전송:', editedText);
      
      const messageData = {
        content: editedText,
        messageType: "voice",
        fileUrl: voiceConfirmData.audioUrl,
        fileName: "voice_message.webm",
        fileSize: 0,
        voiceDuration: Math.round(voiceConfirmData.duration),
        detectedLanguage: "korean",
        confidence: String(0.9)
      };

      const messageResponse = await fetch(`/api/chat-rooms/${voiceConfirmData.chatRoomId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user!.id.toString(),
        },
        body: JSON.stringify(messageData),
      });

      if (messageResponse.ok) {
        console.log('✅ 음성 메시지 전송 성공!');
        
        // 캐시 무효화
        queryClient.invalidateQueries({ queryKey: [`/api/chat-rooms/${voiceConfirmData.chatRoomId}/messages`] });
        queryClient.invalidateQueries({ queryKey: ["/api/chat-rooms"] });
        
        // 해당 채팅방으로 자동 이동
        onSelectChat(voiceConfirmData.chatRoomId);
        
        // 모달 닫기 (성공 시에만)
        setShowVoiceConfirmModal(false);
        setVoiceConfirmData(null);
      } else {
        throw new Error('Failed to send message');
      }
    } catch (error) {
      console.error('❌ 음성 메시지 전송 실패:', error);
      // 에러를 다시 throw하여 모달이 닫히지 않도록 함
      throw error;
    }
  };

  const handleVoiceReRecord = () => {
    console.log('🔄 다시 녹음 시작');
    
    // 모달 닫기
    setShowVoiceConfirmModal(false);
    
    // 녹음 시작 (현재 chatRoom context 유지)
    if (voiceConfirmData) {
      const chatRoom = (chatRoomsData as any)?.chatRooms?.find((room: any) => room.id === voiceConfirmData.chatRoomId);
      if (chatRoom) {
        setTimeout(() => {
          startVoiceRecording(chatRoom);
        }, 300);
      }
    }
    
    setVoiceConfirmData(null);
  };

  const handleVoiceModalClose = () => {
    console.log('❌ Voice Confirm Modal 닫기');
    setShowVoiceConfirmModal(false);
    setVoiceConfirmData(null);
  };

  // 채팅방 나가기 mutation
  const leaveChatRoomMutation = useMutation({
    mutationFn: async ({ roomId, saveFiles }: { roomId: number; saveFiles: boolean }) => {
      const response = await apiRequest(`/api/chat-rooms/${roomId}/leave`, "POST", { saveFiles });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat-rooms"] });
    },
    onError: () => {
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

  // 길게 누르기 시작
  const handleLongPressStart = (chatRoom: any, e?: React.TouchEvent | React.MouseEvent) => {
    // iOS에서 길게 누르기가 작동하도록 preventDefault 추가
    if (e) {
      e.preventDefault();
      
      // 터치 이벤트일 경우 시작 Y 좌표 저장 (동기적)
      if ('touches' in e) {
        touchStartYRef.current = e.touches[0].clientY;
      }
    }
    
    console.log('🎯 채팅방 간편음성메세지 - 길게 누르기 시작:', getChatRoomDisplayName(chatRoom));
    
    // 스크롤 감지 초기화 (동기적)
    isScrollingRef.current = false;
    
    const timer = setTimeout(() => {
      // 스크롤 중이 아닐 때만 음성 녹음 시작 (ref.current로 최신 값 확인)
      if (!isScrollingRef.current) {
        startVoiceRecording(chatRoom);
      } else {
        console.log('🚫 스크롤 중이므로 음성 녹음 취소');
      }
    }, 800); // 800ms 후 음성 녹음 시작
    
    longPressTimerRef.current = timer;
  };

  // 터치 이동 감지 (스크롤 감지) - useRef로 동기적 처리
  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isScrollingRef.current && touchStartYRef.current > 0) {
      const moveY = Math.abs(e.touches[0].clientY - touchStartYRef.current);
      
      // 7px 이상 세로로 움직이면 스크롤로 간주 (자연스러운 터치 허용, 의도적인 스크롤 감지)
      if (moveY > 7) {
        isScrollingRef.current = true;
        
        // 스크롤 중이면 타이머 즉시 취소 (동기적)
        if (longPressTimerRef.current) {
          clearTimeout(longPressTimerRef.current);
          longPressTimerRef.current = null;
          console.log('🚫 스크롤 감지 - 음성 녹음 타이머 취소');
        }
      }
    }
  };

  // 길게 누르기 끝
  const handleLongPressEnd = (e: React.TouchEvent | React.MouseEvent, chatRoomId: number) => {
    // iOS에서 길게 누르기가 작동하도록 preventDefault 추가
    e.preventDefault();
    const wasShortPress = longPressTimerRef.current !== null;
    
    // 타이머 취소 (동기적)
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    
    if (isRecording) {
      // 녹음 중이었다면 click 이벤트 차단하고 녹음 중지
      e.stopPropagation();
      stopVoiceRecording();
    } else if (wasShortPress && !isScrollingRef.current) {
      // 짧게 클릭한 경우 (800ms 이내) AND 스크롤이 아닐 때만 - 채팅방으로 이동
      onSelectChat(chatRoomId);
    }
    
    setRecordingChatRoom(null);
    
    // 스크롤 감지 초기화 (동기적)
    isScrollingRef.current = false;
    touchStartYRef.current = 0;
  };

  // 음성 녹음 시작
  const startVoiceRecording = async (chatRoom: any) => {
    console.log('🎤 채팅방 음성 녹음 시작:', getChatRoomDisplayName(chatRoom));
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm;codecs=opus' });
        const duration = Math.max(1, Math.round((Date.now() - recordingStartTime) / 1000));
        
        console.log('📞 duration:', duration);
        console.log('🎤 채팅방 간편음성메세지 전송 시작:', chatRoom.id, '파일 크기:', audioBlob.size, '지속시간:', duration);
        
        if (audioBlob.size > 0) {
          sendVoiceMessage(chatRoom, audioBlob);
        } else {
          console.error('❌ Empty audio blob created');
        }
        
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.onerror = (event) => {
        console.error('❌ MediaRecorder error:', event);
      };

      // Start recording with timeslice for regular data events
      mediaRecorder.start(1000); // Collect data every 1 second
      setIsRecording(true);
      setRecordingChatRoom(chatRoom);
      setRecordingStartTime(Date.now());
      
      console.log('🎤 음성 녹음 시작:', getChatRoomDisplayName(chatRoom));
    } catch (error) {
      console.error('❌ Voice recording failed:', error);
    }
  };

  // 음성 녹음 중지
  const stopVoiceRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      console.log('🛑 음성 녹음 중지');
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setRecordingChatRoom(null);
    }
  };

  // 음성 메시지 전송 (채팅방용) - 통합된 방식 사용
  const sendVoiceMessage = async (chatRoom: any, audioBlob: Blob) => {
    try {
      console.log('🎤 채팅방 간편음성메세지 - 통합 처리 시작:', getChatRoomDisplayName(chatRoom));
      
      // 로딩 화면 표시
      setIsProcessingVoice(true);
      
      // FormData로 파일 업로드
      const formData = new FormData();
      formData.append('audio', audioBlob, 'voice_message.webm');
      
      console.log('📤 통합 음성 처리 API 호출 중...');
      
      // 통합된 음성 처리 (ChatArea와 동일한 방식)
      const transcribeResponse = await fetch('/api/transcribe', {
        method: 'POST',
        headers: {
          'x-user-id': user!.id.toString(),
        },
        body: formData,
      });
      
      console.log('📡 통합 처리 응답 상태:', transcribeResponse.status);
      
      if (!transcribeResponse.ok) {
        throw new Error(`Transcription failed: ${transcribeResponse.status}`);
      }
      
      const result = await transcribeResponse.json();
      console.log('✅ 통합 음성 처리 성공:', result);
      
      // 빈 음성 녹음 감지 시 조용히 취소
      if (result.error === "SILENT_RECORDING") {
        console.log("🔇 빈 음성 녹음 감지됨 (ChatsList), 메시지 전송 취소");
        setIsProcessingVoice(false);
        return;
      }
      
      // 로딩 화면 숨김
      setIsProcessingVoice(false);
      
      // 모달 데이터 설정 및 모달 표시
      console.log('📋 Voice Confirm Modal 표시');
      setVoiceConfirmData({
        transcription: result.transcription || '',
        audioUrl: result.audioUrl,
        duration: result.duration || 0,
        chatRoomId: chatRoom.id
      });
      setShowVoiceConfirmModal(true);
    } catch (error) {
      console.error('❌ 채팅방 간편음성메세지 전체 프로세스 실패:', error);
      console.error('❌ 오류 상세 정보:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        name: error instanceof Error ? error.name : 'Unknown'
      });
      setIsProcessingVoice(false);
    }
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
    staleTime: 0, // Always fetch fresh data like native messaging apps
    refetchOnMount: true, // Always refresh when component mounts
    refetchOnWindowFocus: true, // Refresh when app becomes visible
    refetchInterval: 15000, // Poll every 15 seconds
    queryFn: async () => {
      const response = await fetch("/api/chat-rooms", {
        headers: { "x-user-id": user!.id.toString() },
      });
      if (!response.ok) throw new Error("Failed to fetch chat rooms");
      return response.json();
    },
  });

  // 연락처 정보 가져오기 - immediate refresh like native apps
  const { data: contactsData } = useQuery({
    queryKey: ["/api/contacts"],
    enabled: !!user,
    staleTime: 0, // Always fetch fresh data
    refetchOnMount: true, // Always refresh when component mounts
    refetchOnWindowFocus: true, // Refresh when app becomes visible
    refetchInterval: 30000, // Poll every 30 seconds
    queryFn: async () => {
      const response = await fetch("/api/contacts", {
        headers: { "x-user-id": user!.id.toString() },
      });
      if (!response.ok) throw new Error("Failed to fetch contacts");
      return response.json();
    },
  });

  // 읽지 않은 메시지 수 가져오기 - immediate refresh for real-time badges
  const { data: unreadCountsData } = useQuery({
    queryKey: ["/api/unread-counts"],
    enabled: !!user,
    staleTime: 0, // Always fetch fresh data for real-time unread counts
    refetchOnMount: true, // Always refresh when component mounts
    refetchOnWindowFocus: true, // Refresh when app becomes visible
    refetchInterval: 10000, // Poll every 10 seconds for unread counts
    queryFn: async () => {
      const response = await fetch("/api/unread-counts", {
        headers: { "x-user-id": user!.id.toString() },
      });
      if (!response.ok) throw new Error("Failed to fetch unread counts");
      return response.json();
    },
  });

  // AI 알림 가져오기
  const { data: aiNoticesData } = useQuery({
    queryKey: ["/api/ai-notices"],
    enabled: !!user,
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    refetchInterval: 30000, // Poll every 30 seconds
    queryFn: async () => {
      const response = await fetch("/api/ai-notices", {
        headers: { "x-user-id": user!.id.toString() },
      });
      if (!response.ok) throw new Error("Failed to fetch AI notices");
      return response.json();
    },
  });

  const chatRooms = chatRoomsData?.chatRooms || [];
  const contacts = contactsData?.contacts || [];
  const unreadCounts = unreadCountsData?.unreadCounts || [];
  const aiNotices = aiNoticesData || [];

  // 특정 채팅방의 읽지 않은 메시지 수 가져오기
  const getUnreadCount = (chatRoomId: number) => {
    const unreadData = unreadCounts.find((item: any) => item.chatRoomId === chatRoomId);
    return unreadData ? unreadData.unreadCount : 0;
  };

  // 특정 채팅방의 읽지 않은 AI 알림 수 가져오기
  const getAiNoticeCount = (chatRoomId: number) => {
    const roomNotices = aiNotices.filter((notice: any) => 
      notice.chatRoomId === chatRoomId && !notice.isRead
    );
    return roomNotices.length;
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
    
    // 친구 필터가 활성화된 경우, 해당 친구가 포함된 채팅방만 표시
    if (friendFilter) {
      const hasFriend = chatRoom.participants?.some((p: any) => p.id === friendFilter);
      return matchesSearch && hasFriend;
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

  // 음성 처리 중 로딩 화면
  if (isProcessingVoice) {
    return <LoadingScreen message="음성을 처리하고 있습니다" />;
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 pt-[calc(1rem+var(--safe-area-inset-top))] border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xl font-bold text-gray-900">채팅방</h3>
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
                  className="text-gray-600 hover:text-gray-700 h-8 w-8 p-0"
                  onClick={toggleMultiSelect}
                  title="채팅방 관리"
                >
                  <MoreVertical className="h-5 w-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-purple-600 hover:text-purple-700 h-8 w-8 p-0"
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
        
        {/* 친구 필터 표시 */}
        {friendFilter && (
          <div className="mt-3 p-2 bg-blue-50 rounded-lg flex items-center justify-between">
            <span className="text-sm text-blue-700">
              선택한 친구와의 채팅방만 표시 중
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearFriendFilter}
              className="h-6 w-6 p-0 text-blue-600 hover:text-blue-700"
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
                aiNoticeCount={getAiNoticeCount(chatRoom.id)}
                hasDraft={hasDraftMessage(chatRoom.id)}
                draftPreview={getDraftPreview(chatRoom.id)}
                isMultiSelectMode={isMultiSelectMode}
                isChecked={selectedRoomIds.includes(chatRoom.id)}
                onLongPressStart={handleLongPressStart}
                onLongPressEnd={handleLongPressEnd}
                isRecording={isRecording && recordingChatRoom?.id === chatRoom.id}
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
                aiNoticeCount={getAiNoticeCount(chatRoom.id)}
                hasDraft={hasDraftMessage(chatRoom.id)}
                draftPreview={getDraftPreview(chatRoom.id)}
                isMultiSelectMode={isMultiSelectMode}
                isChecked={selectedRoomIds.includes(chatRoom.id)}
                onLongPressStart={handleLongPressStart}
                onLongPressEnd={handleLongPressEnd}
                isRecording={isRecording && recordingChatRoom?.id === chatRoom.id}
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

      {/* Voice Message Confirm Modal */}
      {voiceConfirmData && (
        <VoiceMessageConfirmModal
          isOpen={showVoiceConfirmModal}
          onClose={handleVoiceModalClose}
          transcription={voiceConfirmData.transcription}
          audioUrl={voiceConfirmData.audioUrl}
          duration={voiceConfirmData.duration}
          chatRoomId={voiceConfirmData.chatRoomId}
          onSend={handleVoiceMessageSend}
          onReRecord={handleVoiceReRecord}
        />
      )}
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
  aiNoticeCount = 0,
  hasDraft = false,
  draftPreview = "",
  isMultiSelectMode = false,
  isChecked = false,
  onLongPressStart,
  onLongPressEnd,
  isRecording = false
}: {
  chatRoom: any;
  displayName: string;
  isSelected: boolean;
  onClick: () => void;
  isPinned?: boolean;
  unreadCount?: number;
  aiNoticeCount?: number;
  hasDraft?: boolean;
  draftPreview?: string;
  isMultiSelectMode?: boolean;
  isChecked?: boolean;
  onLongPressStart?: (chatRoom: any, e?: React.TouchEvent | React.MouseEvent) => void;
  onLongPressEnd?: (e?: React.TouchEvent | React.MouseEvent) => void;
  isRecording?: boolean;
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
        "p-4 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer border-b border-slate-200 dark:border-slate-700 transition-colors relative select-none",
        isSelected && !isMultiSelectMode && "bg-slate-50 dark:bg-slate-800",
        isMultiSelectMode && isChecked && "bg-blue-50 dark:bg-blue-900",
        isRecording && "bg-red-50 dark:bg-red-900 border-red-200 dark:border-red-700"
      )}
      style={{ 
        userSelect: 'none',
        WebkitUserSelect: 'none',
        msUserSelect: 'none',
        WebkitTouchCallout: 'none'
      }}
      onClick={(e) => {
        // 다중 선택 모드일 때만 onClick 사용
        if (isMultiSelectMode) {
          onClick();
        }
      }}
      onMouseEnter={handleMouseEnter}
      onMouseDown={(e) => {
        if (!isMultiSelectMode && onLongPressStart) {
          onLongPressStart(chatRoom, e);
        }
      }}
      onMouseUp={(e) => {
        if (!isMultiSelectMode && onLongPressEnd) {
          onLongPressEnd(e, chatRoom.id);
        }
      }}
      onMouseLeave={(e) => {
        if (!isMultiSelectMode && onLongPressEnd) {
          onLongPressEnd(e, chatRoom.id);
        }
      }}
      onTouchStart={(e) => {
        if (!isMultiSelectMode && onLongPressStart) {
          onLongPressStart(chatRoom, e);
        }
      }}
      onTouchMove={(e) => {
        if (!isMultiSelectMode) {
          handleTouchMove(e);
        }
      }}
      onTouchEnd={(e) => {
        if (!isMultiSelectMode && onLongPressEnd) {
          onLongPressEnd(e, chatRoom.id);
        }
      }}
    >
      {isPinned && !isMultiSelectMode && (
        <Pin className="absolute top-2 right-2 text-purple-500 h-3 w-3" />
      )}
      
      {isRecording && (
        <div className="absolute inset-0 bg-red-500/10 border-2 border-red-500 rounded-lg flex items-center justify-center">
          <div className="bg-red-500 text-white px-3 py-1 rounded-full text-sm font-medium flex items-center space-x-2">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
            <span>음성 녹음 중...</span>
          </div>
        </div>
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
            {chatRoom.participants.slice(0, 2).map((participant: any, index: number) => {
              // 깔끔한 수평 겹침 배치 (2명만 표시)
              const horizontalPositions = [
                { top: '50%', left: '0px', transform: 'translateY(-50%)' },
                { top: '50%', right: '0px', transform: 'translateY(-50%)' }
              ];
              
              const position = horizontalPositions[index];
              
              return (
                <div
                  key={participant.id}
                  className="absolute border-2 border-white dark:border-gray-800 rounded-full shadow-md"
                  style={{
                    ...position,
                    zIndex: 2 - index
                  }}
                >
                  <InstantAvatar 
                    src={participant?.profilePicture}
                    fallbackText={participant?.displayName || participant?.username}
                    size="sm" 
                    className="purple-gradient"
                  />
                </div>
              );
            })}
            {chatRoom.participants.length > 2 && (
              <div 
                className="absolute bottom-0 right-0 bg-purple-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold shadow-md border-2 border-white dark:border-gray-800"
                style={{ zIndex: 3 }}
              >
                +{chatRoom.participants.length - 2}
              </div>
            )}
          </div>
        ) : (
          <InstantAvatar 
            src={getOtherParticipant(chatRoom)?.profilePicture}
            fallbackText={displayName}
            size="lg" 
            className={`bg-gradient-to-br ${getAvatarColor(displayName)}`}
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
                <Badge variant="default" className="bg-red-500 hover:bg-red-600 text-white text-xs px-2 py-1 min-w-[20px] h-5 flex items-center justify-center rounded-full" data-testid={`badge-unread-${chatRoom.id}`}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Badge>
              )}
              {aiNoticeCount > 0 && (
                <Badge variant="default" className="bg-purple-500 hover:bg-purple-600 text-white text-xs px-2 py-1 min-w-[20px] h-5 flex items-center justify-center rounded-full" data-testid={`badge-ai-notice-${chatRoom.id}`}>
                  <Bell className="h-3 w-3 mr-0.5" />
                  {aiNoticeCount}
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
