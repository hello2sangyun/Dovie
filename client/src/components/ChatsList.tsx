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
import { Plus, Search, Pin, Users, X, Trash2, LogOut, MoreVertical, Mic } from "lucide-react";
import { cn, getInitials, getAvatarColor } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import YoutubeSelectionModal from "./YoutubeSelectionModal";
// Unified smart suggestion system - copied inline to avoid import issues
interface SmartSuggestion {
  type: string;
  text: string;
  result?: string;
  icon: string;
  category: string;
  keyword?: string;
  confidence?: number;
}

const analyzeTextForSmartSuggestions = (text: string): SmartSuggestion[] => {
  if (!text || text.trim().length < 2) {
    return [];
  }

  const suggestions: SmartSuggestion[] = [];

  // YouTube 감지
  if (/유튜브|youtube|영상|비디오|뮤직비디오|mv|검색.*영상|영상.*검색|봐봐|보여.*영상/i.test(text)) {
    const keyword = text
      .replace(/유튜브|youtube|영상|비디오|뮤직비디오|mv|검색|찾아|보여|봐봐|해줘|하자|보자/gi, '')
      .trim();
    
    suggestions.push({
      type: 'youtube',
      text: `🎥 YouTube에서 "${keyword}" 검색하기`,
      result: `YouTube 영상을 검색합니다: ${keyword}`,
      icon: '🎥',
      category: 'YouTube 검색',
      keyword: keyword || '검색',
      confidence: 0.9
    });
  }

  // 위치 공유 감지
  if (/어디|위치|장소|주소|어디야|어디에|어디로|어디서|여기|거기|오세요|와|갈게|만나|위치공유|현재위치|gps/i.test(text)) {
    suggestions.push({
      type: 'location',
      text: '📍 현재 위치 공유하기',
      result: '현재 위치를 공유합니다',
      icon: '📍',
      category: '위치 공유',
      confidence: 0.85
    });
  }

  return suggestions;
};

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
  
  // 음성 메시지 관련 상태
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingChatRoom, setRecordingChatRoom] = useState<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [recordingStartTime, setRecordingStartTime] = useState(0);
  
  // YouTube 선택 모달 상태
  const [showYoutubeModal, setShowYoutubeModal] = useState(false);
  const [youtubeSearchQuery, setYoutubeSearchQuery] = useState("");

  // YouTube 비디오 선택 핸들러 - ChatArea와 동일한 구조로 수정
  const handleYoutubeVideoSelect = async (video: any) => {
    if (!recordingChatRoom) {
      console.error('❌ recordingChatRoom이 없음');
      return;
    }
    
    console.log('🎥 YouTube 비디오 선택됨:', video.title, 'for chat room:', recordingChatRoom.id);
    
    const youtubeMessage = {
      content: `📺 ${youtubeSearchQuery} 추천 영상\n${video.title}`,
      messageType: "text",
      youtubePreview: video
    };
    
    try {
      // 정확한 API 엔드포인트 사용
      const response = await fetch(`/api/chat-rooms/${recordingChatRoom.id}/messages`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': user!.id.toString(),
        },
        body: JSON.stringify(youtubeMessage)
      });
      
      if (response.ok) {
        console.log('✅ YouTube 영상 메시지 전송 성공');
        
        // 캐시 무효화
        queryClient.invalidateQueries({ queryKey: [`/api/chat-rooms/${recordingChatRoom.id}/messages`] });
        queryClient.invalidateQueries({ queryKey: ["/api/chat-rooms"] });
        
        // 모달 닫기 및 상태 초기화
        setShowYoutubeModal(false);
        setYoutubeSearchQuery("");
        setRecordingChatRoom(null);
        
        toast({
          title: "YouTube 영상 공유 완료",
          description: video.title,
        });
      } else {
        throw new Error(`Failed to send YouTube message: ${response.status}`);
      }
    } catch (error) {
      console.error('❌ YouTube 영상 메시지 전송 실패:', error);
      toast({
        variant: "destructive",
        title: "YouTube 영상 공유 실패",
        description: "다시 시도해주세요.",
      });
    }
  };

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

  // 길게 누르기 시작
  const handleLongPressStart = (chatRoom: any) => {
    console.log('🎯 채팅방 간편음성메세지 - 길게 누르기 시작:', getChatRoomDisplayName(chatRoom));
    
    const timer = setTimeout(() => {
      startVoiceRecording(chatRoom);
    }, 800); // 800ms 후 음성 녹음 시작
    
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

  // 스마트 추천 처리 함수
  const processSmartSuggestions = async (transcription: string, chatRoomId: number) => {
    const suggestions = getSmartSuggestions(transcription);
    
    if (suggestions.length > 0) {
      console.log('🤖 스마트 추천 발견:', suggestions.length, '개');
      
      // 자동 실행되는 추천 처리
      for (const suggestion of suggestions) {
        if (suggestion.type === 'youtube') {
          // YouTube 검색 및 영상 선택 모달 열기
          const searchQuery = transcription.replace(/유튜브|youtube|검색|찾아|보여|영상|봤어|봐봐/gi, '').trim();
          
          setYoutubeSearchQuery(searchQuery);
          setRecordingChatRoom({ id: chatRoomId });
          setShowYoutubeModal(true);
        } else if (suggestion.type === 'location') {
          // 위치 공유 요청 감지
          try {
            const position = await new Promise<GeolocationPosition>((resolve, reject) => {
              navigator.geolocation.getCurrentPosition(resolve, reject, {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 60000
              });
            });

            const { latitude, longitude } = position.coords;
            const googleMapsUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;

            const locationMessage = {
              content: `📍 현재 위치를 공유했습니다`,
              messageType: "text",
              locationShare: {
                latitude: latitude.toString(),
                longitude: longitude.toString(),
                googleMapsUrl,
                accuracy: position.coords.accuracy?.toString()
              }
            };

            setTimeout(async () => {
              await fetch(`/api/chat-rooms/${chatRoomId}/messages`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'x-user-id': user!.id.toString(),
                },
                body: JSON.stringify(locationMessage),
              });
            }, 500);
          } catch (error) {
            console.error('위치 공유 처리 실패:', error);
          }
        } else if (['translation', 'summary', 'search', 'news', 'calculation', 'currency'].includes(suggestion.type)) {
          // 기타 스마트 추천은 자동 메시지 전송하지 않음 (음성 메시지만 유지)
          console.log('🤖 스마트 추천 감지:', suggestion.type, '- 자동 메시지 전송 생략');
        }
      }
    }
  };

  // 스마트 추천 함수 (ChatArea에서 가져옴)
  const getSmartSuggestions = (text: string) => {
    const suggestions = [];
    const lowerText = text.toLowerCase();

    // YouTube 감지
    if (/유튜브|youtube|영상|비디오|뮤직비디오|mv/i.test(text)) {
      suggestions.push({
        type: 'youtube',
        text: '🎬 YouTube 영상',
        result: '영상을 검색해서 공유할게요',
        icon: '🎬',
        category: 'YouTube 검색'
      });
    }

    // 위치 관련 감지
    if (/어디|위치|장소|주소|어디야|어디에|어디로|어디서|여기|거기|오세요|와|갈게|만나|시간|위치공유/i.test(text)) {
      suggestions.push({
        type: 'location',
        text: '📍 위치 공유',
        result: '현재 위치를 공유할게요',
        icon: '📍',
        category: '위치 공유'
      });
    }

    // 번역 감지
    if (/번역|translate|영어로|한국어로|일본어로|중국어로/i.test(text)) {
      suggestions.push({
        type: 'translation',
        text: '🌐 번역',
        result: '번역해드릴게요',
        icon: '🌐',
        category: '번역'
      });
    }

    // 검색 감지
    if (/검색|찾아|알아봐|search|google/i.test(text)) {
      suggestions.push({
        type: 'search',
        text: '🔍 검색',
        result: '검색해드릴게요',
        icon: '🔍',
        category: '검색'
      });
    }

    // 요약 감지
    if (/요약|정리|summary|간단히/i.test(text)) {
      suggestions.push({
        type: 'summary',
        text: '📝 요약',
        result: '요약해드릴게요',
        icon: '📝',
        category: '요약'
      });
    }

    // 뉴스 감지
    if (/뉴스|news|기사|최신|오늘/i.test(text)) {
      suggestions.push({
        type: 'news',
        text: '📰 뉴스',
        result: '최신 뉴스를 찾아드릴게요',
        icon: '📰',
        category: '뉴스'
      });
    }

    // 계산 감지
    if (/계산|더하기|빼기|곱하기|나누기|\+|\-|\*|\/|\=|[0-9]/i.test(text)) {
      suggestions.push({
        type: 'calculation',
        text: '🔢 계산',
        result: '계산해드릴게요',
        icon: '🔢',
        category: '계산'
      });
    }

    // 환율 감지
    if (/환율|달러|엔|유로|원|currency|exchange/i.test(text)) {
      suggestions.push({
        type: 'currency',
        text: '💱 환율',
        result: '환율을 확인해드릴게요',
        icon: '💱',
        category: '환율'
      });
    }

    return suggestions;
  };

  // 음성 메시지 전송 (채팅방용) - 통합된 방식 사용
  const sendVoiceMessage = async (chatRoom: any, audioBlob: Blob) => {
    try {
      console.log('🎤 채팅방 간편음성메세지 - 통합 처리 시작:', getChatRoomDisplayName(chatRoom));
      
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
        return;
      }
      
      // 통합된 스마트 추천 사용 (서버에서 이미 분석 완료)
      console.log('🎙️ Voice transcription with integrated suggestions:', result.smartSuggestions?.length || 0);
      console.log('🎙️ Full smartSuggestions data:', result.smartSuggestions);
      
      // 서버에서 받은 스마트 추천과 클라이언트 분석 결합
      const serverSuggestions = result.smartSuggestions || [];
      const clientSuggestions = analyzeTextForSmartSuggestions(result.transcription || '');
      
      // 서버 추천이 없으면 클라이언트 분석 사용
      const voiceSuggestions = serverSuggestions.length > 0 ? serverSuggestions : clientSuggestions;
      
      // 스마트 추천 상세 로깅
      voiceSuggestions.forEach((suggestion: SmartSuggestion, index: number) => {
        console.log(`🎯 Suggestion ${index}:`, suggestion);
      });
      
      // 먼저 음성 메시지 전송
      const messageData = {
        content: result.transcription,
        messageType: "voice",
        fileUrl: result.audioUrl,
        fileName: "voice_message.webm",
        fileSize: 0,
        voiceDuration: Math.round(result.duration || 0),
        detectedLanguage: result.detectedLanguage || "korean",
        confidence: String(result.confidence || 0.9)
      };

      console.log('📨 메시지 전송 데이터:', messageData);

      // 메시지 전송
      const messageResponse = await fetch(`/api/chat-rooms/${chatRoom.id}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user!.id.toString(),
        },
        body: JSON.stringify(messageData),
      });

      if (messageResponse.ok) {
        console.log('✅ 채팅방 간편음성메세지 전송 성공!');
        
        // 캐시 무효화로 메시지 목록 새로고침
        queryClient.invalidateQueries({ queryKey: [`/api/chat-rooms/${chatRoom.id}/messages`] });
        queryClient.invalidateQueries({ queryKey: ["/api/chat-rooms"] });
        
        // 해당 채팅방으로 자동 이동
        onSelectChat(chatRoom.id);
        
        // 핵심 문제 해결: 채팅방 이동 전에 스마트 추천 처리해야 함
        if (voiceSuggestions.length > 0) {
          console.log('🎯 ChatsList 스마트 추천 처리 시작:', voiceSuggestions.length, '개');
          
          // YouTube 추천 우선 처리 (채팅방 이동 전)
          const youtubeSuggestion = voiceSuggestions.find((s: any) => s.type === 'youtube');
          if (youtubeSuggestion && youtubeSuggestion.keyword) {
            console.log('🎥 YouTube 추천 감지 - 키워드:', youtubeSuggestion.keyword);
            console.log('🎥 recordingChatRoom 설정:', chatRoom.id);
            
            // 상태 설정
            setYoutubeSearchQuery(youtubeSuggestion.keyword);
            setRecordingChatRoom(chatRoom);
            
            // 채팅방 이동 후 YouTube 모달 표시
            setTimeout(() => {
              console.log('🎥 YouTube 모달 표시 시도');
              console.log('🎥 현재 상태 - showYoutubeModal:', false, '→ true');
              console.log('🎥 현재 상태 - youtubeSearchQuery:', youtubeSuggestion.keyword);
              console.log('🎥 현재 상태 - recordingChatRoom:', chatRoom.id);
              setShowYoutubeModal(true);
            }, 500); // 더 긴 딜레이로 채팅방 전환 완료 대기
          }
          
          // 다른 스마트 추천들은 ChatArea에서 처리될 것임
          const otherSuggestions = voiceSuggestions.filter((s: any) => s.type !== 'youtube');
          if (otherSuggestions.length > 0) {
            console.log('🎯 다른 스마트 추천들 감지됨:', otherSuggestions.map(s => s.type).join(', '));
            console.log('🎯 이 추천들은 ChatArea에서 처리될 예정');
          }
        }
        
        toast({
          title: "음성 메시지 전송 완료",
          description: result.transcription ? `"${result.transcription}"` : "음성이 텍스트로 변환되어 전송되었습니다.",
        });
      } else {
        const errorText = await messageResponse.text();
        console.error('❌ 채팅방 간편음성메세지 전송 실패:', messageResponse.status, errorText);
      }
    } catch (error) {
      console.error('❌ 채팅방 간편음성메세지 전체 프로세스 실패:', error);
      console.error('❌ 오류 상세 정보:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        name: error instanceof Error ? error.name : 'Unknown'
      });
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

      {/* YouTube 선택 모달 */}
      <YoutubeSelectionModal
        isOpen={showYoutubeModal}
        onClose={() => {
          setShowYoutubeModal(false);
          setYoutubeSearchQuery("");
          setRecordingChatRoom(null);
        }}
        onSelect={handleYoutubeVideoSelect}
        initialQuery={youtubeSearchQuery}
      />
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
  hasDraft?: boolean;
  draftPreview?: string;
  isMultiSelectMode?: boolean;
  isChecked?: boolean;
  onLongPressStart?: (chatRoom: any) => void;
  onLongPressEnd?: () => void;
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
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
      onMouseDown={(e) => {
        if (!isMultiSelectMode && onLongPressStart) {
          onLongPressStart(chatRoom);
        }
      }}
      onMouseUp={() => {
        if (!isMultiSelectMode && onLongPressEnd) {
          onLongPressEnd();
        }
      }}
      onMouseLeave={() => {
        if (!isMultiSelectMode && onLongPressEnd) {
          onLongPressEnd();
        }
      }}
      onTouchStart={(e) => {
        if (!isMultiSelectMode && onLongPressStart) {
          onLongPressStart(chatRoom);
        }
      }}
      onTouchEnd={() => {
        if (!isMultiSelectMode && onLongPressEnd) {
          onLongPressEnd();
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
                  <InstantAvatar 
                    src={participant?.profilePicture}
                    fallbackText={participant?.displayName || participant?.username}
                    size="sm" 
                    className="purple-gradient"
                  />
                </div>
              );
            })}
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
