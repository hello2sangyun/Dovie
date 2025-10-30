import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { UserAvatar } from "@/components/UserAvatar";
import InstantAvatar from "@/components/InstantAvatar";
import MediaPreview from "@/components/MediaPreview";
import { Paperclip, Hash, Send, Video, Phone, Info, Download, Upload, Reply, X, Search, FileText, FileImage, FileSpreadsheet, File, Languages, Calculator, Play, Pause, MoreVertical, LogOut, Settings, MapPin, Sparkles, Bell, Mic } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { cn, getInitials, getAvatarColor } from "@/lib/utils";
import AddFriendConfirmModal from "./AddFriendConfirmModal";
import MessageContextMenu from "./MessageContextMenu";
import CommandModal from "./CommandModal";
import LanguageSelectionModal from "./LanguageSelectionModal";
import CalculatorPreviewModal from "./CalculatorPreviewModal";
import PollCreationModal from "./PollCreationModal";
import PollMessage from "./PollMessage";
import PollBanner from "./PollBanner";
import PollDetailModal from "./PollDetailModal";
import TranslateModal from "./TranslateModal";
import VoiceRecorder from "./VoiceRecorder";
import { UnifiedSendButton } from "./UnifiedSendButton";
import { FileUploadModal } from "./FileUploadModal";
import { LinkPreview } from "./LinkPreview";

import { LocationShareModal } from "./LocationShareModal";
import ReminderTimeModal from "./ReminderTimeModal";
import { ConnectionStatusIndicator } from "./ConnectionStatusIndicator";
import { VoiceMessagePreviewModal } from "./VoiceMessagePreviewModal";
import VoiceMessageConfirmModal from "./VoiceMessageConfirmModal";
import GestureQuickReply from "./GestureQuickReply";
import { HashtagSuggestion } from "./HashtagSuggestion";
import { AIChatAssistantModal } from "./AIChatAssistantModal";
import AiNoticesModal from "./AiNoticesModal";
import { ForwardMessageModal } from "./ForwardMessageModal";

import TypingIndicator, { useTypingIndicator } from "./TypingIndicator";
import { 
  InteractiveButton,
  LoadingSpinner
} from "./MicroInteractions";
import { uploadFileWithProgress, UploadProgress } from "@/lib/uploadUtils";
import { FileUploadProgress } from "./FileUploadProgress";

interface ChatAreaProps {
  chatRoomId: number;
  onCreateCommand: (fileData?: any, messageData?: any) => void;
  showMobileHeader?: boolean;
  onBackClick?: () => void;
  isLocationChat?: boolean;
}

// URL detection utility
const detectUrls = (text: string | null | undefined): string[] => {
  if (!text) return [];
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return text.match(urlRegex) || [];
};

export default function ChatArea({ chatRoomId, onCreateCommand, showMobileHeader, onBackClick, isLocationChat }: ChatAreaProps) {
  const { user } = useAuth();
  
  // Use the isLocationChat prop directly
  const isLocationChatRoom = isLocationChat || false;
  
  // Debug logging
  console.log('ChatArea rendered:', {
    chatRoomId,
    isLocationChat,
    isLocationChatRoom,
    showMobileHeader
  });

  // 모바일 키보드 숨기기 유틸리티 함수
  const hideMobileKeyboard = () => {
    if (typeof window !== 'undefined' && window.navigator.userAgent.match(/Mobi|Android/i)) {
      const activeElement = document.activeElement as HTMLElement;
      if (activeElement && activeElement.blur) {
        activeElement.blur();
      }
      // 추가적으로 포커스를 다른 곳으로 이동
      setTimeout(() => {
        const chatArea = document.getElementById('chat-messages-area');
        if (chatArea) {
          chatArea.focus();
        }
      }, 100);
    }
  };


  const queryClient = useQueryClient();
  const [message, setMessage] = useState("");
  
  // Typing indicator and accessibility
  const { typingUsers, addTypingUser, removeTypingUser, clearAllTyping } = useTypingIndicator();
  const accessibilitySettings = { reducedMotion: false, hapticEnabled: true }; // Default accessibility settings
  
  // Typing indicator functionality for real users only

  // 백그라운드 프리페칭 함수들
  const prefetchRelatedData = async () => {
    try {
      // 미읽은 메시지 수 미리 로딩
      await queryClient.prefetchQuery({
        queryKey: ["/api/unread-counts"],
        queryFn: async () => {
          const response = await apiRequest("/api/unread-counts", "GET");
          return response.json();
        },
        staleTime: 30 * 1000,
      });

      // 채팅방 목록 미리 로딩
      await queryClient.prefetchQuery({
        queryKey: ["/api/chat-rooms"],
        queryFn: async () => {
          const response = await apiRequest("/api/chat-rooms", "GET");
          return response.json();
        },
        staleTime: 30 * 1000,
      });
    } catch (error) {
      // 백그라운드 로딩 실패는 무시
      console.log('백그라운드 프리페칭 실패:', error);
    }
  };

  // 컴포넌트 마운트 시 관련 데이터 미리 로딩
  useEffect(() => {
    if (user && chatRoomId) {
      const timer = setTimeout(() => {
        prefetchRelatedData();
      }, 1000); // 1초 후 백그라운드에서 로딩

      return () => clearTimeout(timer);
    }
  }, [user, chatRoomId]);

  // 임시 메시지 저장 관련 함수들
  const getDraftKey = (roomId: number) => `chat_draft_${roomId}`;
  
  const saveDraftMessage = (roomId: number, content: string) => {
    try {
      if (content.trim()) {
        localStorage.setItem(getDraftKey(roomId), content);
      } else {
        localStorage.removeItem(getDraftKey(roomId));
      }
    } catch (error) {
      console.warn('Failed to save draft message:', error);
    }
  };

  const loadDraftMessage = (roomId: number): string => {
    try {
      return localStorage.getItem(getDraftKey(roomId)) || "";
    } catch (error) {
      console.warn('Failed to load draft message:', error);
      return "";
    }
  };

  const clearDraftMessage = (roomId: number) => {
    try {
      localStorage.removeItem(getDraftKey(roomId));
    } catch (error) {
      console.warn('Failed to clear draft message:', error);
    }
  };

  // 리마인더 설정 핸들러
  const handleSetReminder = async (reminderTime: Date, reminderText: string) => {
    try {
      const response = await fetch('/api/reminders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user!.id.toString(),
        },
        body: JSON.stringify({
          chatRoomId: chatRoomId,
          reminderTime: reminderTime.toISOString(),
          reminderText: reminderText,
          userId: user!.id
        })
      });

      if (response.ok) {
      } else {
        throw new Error('리마인더 설정 실패');
      }
    } catch (error) {
      console.error('리마인더 설정 오류:', error);
    }
    
    setShowReminderModal(false);
    setReminderText('');
  };
  const [showCommandSuggestions, setShowCommandSuggestions] = useState(false);
  const [showChatCommands, setShowChatCommands] = useState(false);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [textToTranslate, setTextToTranslate] = useState("");
  const [showCalculatorModal, setShowCalculatorModal] = useState(false);
  const [calculatorData, setCalculatorData] = useState<{expression: string, result: string}>({expression: "", result: ""});
  const [showPollModal, setShowPollModal] = useState(false);
  const [pollQuestion, setPollQuestion] = useState("");
  const [showPollDetailModal, setShowPollDetailModal] = useState(false);
  const [activePoll, setActivePoll] = useState<any>(null);
  const [pollVotes, setPollVotes] = useState<{[key: number]: number}>({});
  const [userVote, setUserVote] = useState<number | null>(null);
  const [showFileUploadModal, setShowFileUploadModal] = useState(false);
  const [votedUsers, setVotedUsers] = useState<Set<number>>(new Set());
  const [explodedMessages, setExplodedMessages] = useState<Set<number>>(new Set());
  const [messageTimers, setMessageTimers] = useState<{[key: number]: number}>({});
  const [fileDataForCommand, setFileDataForCommand] = useState<any>(null);
  const [showAddFriendModal, setShowAddFriendModal] = useState(false);
  const [nonFriendUsers, setNonFriendUsers] = useState<any[]>([]);
  const [friendModalDismissed, setFriendModalDismissed] = useState(false);
  const [showTranslateModal, setShowTranslateModal] = useState(false);
  const [messageToTranslate, setMessageToTranslate] = useState<any>(null);
  const [translatedMessages, setTranslatedMessages] = useState<{[key: number]: {text: string, language: string}}>({});
  const [translatingMessages, setTranslatingMessages] = useState<Set<number>>(new Set());
  const [isTranslating, setIsTranslating] = useState(false);
  const [showOriginal, setShowOriginal] = useState<Set<number>>(new Set()); // 원문을 보여줄 메시지 ID들
  const [showLocationShareModal, setShowLocationShareModal] = useState(false);
  const [locationRequestId, setLocationRequestId] = useState<number | undefined>();
  
  // 리마인더 모달 상태
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [reminderText, setReminderText] = useState("");

  const [showAIAssistantModal, setShowAIAssistantModal] = useState(false);
  const [showAiNoticesModal, setShowAiNoticesModal] = useState(false);

  const [isProcessingVoice, setIsProcessingVoice] = useState(false);

  // Gesture-based quick reply handlers
  const handleQuickReply = async (messageId: number, content: string, type: 'reaction' | 'text') => {
    try {
      const response = await apiRequest(`/api/messages/${messageId}/quick-reply`, "POST", {
        content,
        type
      });
      
      if (response.ok) {
        // Invalidate messages to refresh the UI
        const queryKey = isLocationChatRoom ? "/api/location/chat-rooms" : "/api/chat-rooms";
        queryClient.invalidateQueries({ queryKey: [queryKey, chatRoomId, "messages"] });
      }
    } catch (error) {
      console.error('Quick reply error:', error);
    }
  };

  const handleSwipeReply = (messageId: number) => {
    // Find the message to reply to
    const messages = messagesData?.messages || [];
    const messageToReply = messages.find(m => m.id === messageId);
    
    if (messageToReply) {
      // Set the reply-to message and focus input
      setReplyToMessage(messageToReply);
      // Auto-scroll to input area
      setTimeout(() => {
        const inputElement = document.querySelector('textarea[placeholder*="메시지를 입력하세요"]');
        if (inputElement) {
          (inputElement as HTMLElement).focus();
        }
      }, 100);
    }
  };
  
  // Voice message preview modal state
  const [showVoicePreview, setShowVoicePreview] = useState(false);
  const [voicePreviewData, setVoicePreviewData] = useState<{
    audioBlob: Blob | null;
    transcribedText: string;
    duration: number;
    audioUrl?: string;
  }>({
    audioBlob: null,
    transcribedText: "",
    duration: 0,
    audioUrl: ""
  });
  
  // Voice Confirm Modal state
  const [showVoiceConfirmModal, setShowVoiceConfirmModal] = useState(false);
  const [voiceConfirmData, setVoiceConfirmData] = useState<{
    transcription: string;
    audioUrl: string;
    duration: number;
  } | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [playingAudio, setPlayingAudio] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const notificationSoundRef = useRef<HTMLAudioElement | null>(null);
  const mentionSoundRef = useRef<HTMLAudioElement | null>(null);
  const [lastMessageCount, setLastMessageCount] = useState(0);
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    message: any;
  }>({ visible: false, x: 0, y: 0, message: null });

  const [messageDataForCommand, setMessageDataForCommand] = useState<any>(null);
  const [replyToMessage, setReplyToMessage] = useState<any>(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState<number | null>(null);
  const [uploadingFiles, setUploadingFiles] = useState<Array<{id: string, fileName: string}>>([]);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([]);
  const [showChatSettings, setShowChatSettings] = useState(false);
  const chatSettingsRef = useRef<HTMLDivElement>(null);
  const [showMentions, setShowMentions] = useState(false);
  const [editingMessage, setEditingMessage] = useState<any>(null);
  const [editContent, setEditContent] = useState("");
  const [mentionSuggestions, setMentionSuggestions] = useState<any[]>([]);
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0);
  const [mentionStart, setMentionStart] = useState(-1);
  
  // Adaptive UI Flow states
  const [conversationMode, setConversationMode] = useState<'casual' | 'business' | 'creative' | 'support'>('casual');
  const [uiAdaptations, setUiAdaptations] = useState({
    showQuickReplies: false,
    showActionButtons: false,
    showMoodIndicator: false,
    showTimeAwareness: false,
    compactMode: false,
    focusMode: false
  });
  const [conversationContext, setConversationContext] = useState({
    topic: '',
    urgency: 'normal' as 'low' | 'normal' | 'high',
    participants: 0,
    lastActivity: Date.now(),
    messagePattern: 'text' as 'text' | 'media' | 'mixed'
  });
  const [adaptiveActions, setAdaptiveActions] = useState<any[]>([]);
  const [mentionPosition, setMentionPosition] = useState(0);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [currentSearchIndex, setCurrentSearchIndex] = useState(0);
  const [showHashtagSuggestion, setShowHashtagSuggestion] = useState(false);
  const [hashtagQuery, setHashtagQuery] = useState('');
  
  // 길게 터치 관련 상태
  const [touchTimer, setTouchTimer] = useState<NodeJS.Timeout | null>(null);
  const [isLongPress, setIsLongPress] = useState(false);
  const [touchStartData, setTouchStartData] = useState<{rect: DOMRect, message: any} | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatAreaRef = useRef<HTMLDivElement>(null);
  const messageRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});
  const messageInputRef = useRef<HTMLTextAreaElement>(null);
  
  // 텍스트박스 크기 초기화 헬퍼 함수
  const resetTextareaSize = () => {
    if (messageInputRef.current) {
      messageInputRef.current.style.height = '32px';
      messageInputRef.current.style.overflow = 'hidden';
    }
  };
  
  // Unread messages floating button state
  const [showUnreadButton, setShowUnreadButton] = useState(false);
  const [firstUnreadMessageId, setFirstUnreadMessageId] = useState<number | null>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Forward message modal state
  const [showForwardModal, setShowForwardModal] = useState(false);
  const [forwardMessageId, setForwardMessageId] = useState<number | null>(null);
  
  // Intelligent auto-scroll state
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const [lastScrollTop, setLastScrollTop] = useState(0);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const hasScrolledManually = useRef(false);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [unreadNewMessages, setUnreadNewMessages] = useState(0);
  const hasInitialScrolledRef = useRef(false);

  // Get chat room details (only for regular chats, not location chats)
  const { data: chatRoomsData } = useQuery({
    queryKey: ["/api/chat-rooms"],
    enabled: !!user && !isLocationChatRoom,
  });

  // Get location chat profile if this is a location chat
  const { data: locationChatProfile } = useQuery({
    queryKey: [`/api/location/chat-rooms/${chatRoomId}/profile`],
    enabled: !!user && isLocationChatRoom,
    retry: false,
  });

  // Get nearby chats to find the current location chat room details
  const { data: nearbyChatsData } = useQuery({
    queryKey: ["/api/location/nearby-chats"],
    enabled: !!user && isLocationChatRoom,
    retry: false,
  });

  const currentChatRoom = isLocationChatRoom 
    ? nearbyChatsData?.chatRooms?.find((room: any) => room.id === chatRoomId) || {
        id: chatRoomId,
        name: '주변챗',
        isGroup: true,
        participants: [{ id: user?.id, displayName: user?.displayName || '나' }],
        isLocationChat: true
      }
    : (chatRoomsData as any)?.chatRooms?.find((room: any) => room.id === chatRoomId);

  // Get contacts to check if other participants are friends (only for regular chats)
  const { data: contactsData } = useQuery({
    queryKey: ["/api/contacts"],
    enabled: !!user && !isLocationChatRoom,
    queryFn: async () => {
      const response = await fetch("/api/contacts", {
        headers: { "x-user-id": user!.id.toString() },
      });
      if (!response.ok) throw new Error("Failed to fetch contacts");
      return response.json();
    },
  });

  // Get messages with immediate refresh for PWA app behavior
  const { data: messagesData, isLoading, isFetching } = useQuery({
    queryKey: [isLocationChatRoom ? "/api/location/chat-rooms" : "/api/chat-rooms", chatRoomId, "messages"],
    enabled: !!chatRoomId,
    staleTime: 0, // Always fetch fresh data like native messaging apps
    refetchOnMount: true, // Always refresh when component mounts
    refetchOnWindowFocus: true, // Refresh when app becomes visible
    refetchInterval: 10000, // Poll every 10 seconds for real-time updates
    queryFn: async () => {
      const endpoint = isLocationChatRoom 
        ? `/api/location/chat-rooms/${chatRoomId}/messages`
        : `/api/chat-rooms/${chatRoomId}/messages`;
      
      const response = await fetch(endpoint, {
        headers: {
          'x-user-id': user?.id?.toString() || '',
        },
      });
      if (!response.ok) throw new Error("Failed to fetch messages");
      return response.json();
    },
  });

  // Get commands for suggestions (only for regular chats)
  const { data: commandsData } = useQuery({
    queryKey: ["/api/commands", { chatRoomId }],
    enabled: !!user && !!chatRoomId && !isLocationChatRoom,
    queryFn: async () => {
      const response = await fetch(`/api/commands?chatRoomId=${chatRoomId}`, {
        headers: { "x-user-id": user!.id.toString() },
      });
      if (!response.ok) throw new Error("Failed to fetch commands");
      return response.json();
    },
  });

  // Get unread AI notices count for this chat room
  const { data: aiNoticesData } = useQuery({
    queryKey: [`/api/chat-rooms/${chatRoomId}/ai-notices`],
    enabled: !!user && !!chatRoomId && !isLocationChatRoom,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const unreadAiNoticesCount = aiNoticesData?.filter((notice: any) => !notice.isRead).length || 0;

  // Get voice bookmark requests for this chat room
  const { data: voiceBookmarkRequestsData } = useQuery({
    queryKey: ['/api/voice-bookmark-requests'],
    enabled: !!user && !!chatRoomId && !isLocationChatRoom,
    refetchInterval: 10000, // Poll every 10 seconds for updates
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (messageData: any) => {
      const endpoint = isLocationChatRoom 
        ? `/api/location/chat-rooms/${chatRoomId}/messages`
        : `/api/chat-rooms/${chatRoomId}/messages`;
      
      // Check for location requests in the message content
      if (messageData.content && messageData.messageType === 'text') {
        try {
          const locationDetectionResponse = await apiRequest("/api/location/detect", "POST", {
            message: messageData.content
          });
          const { isLocationRequest } = await locationDetectionResponse.json();
          
          if (isLocationRequest) {
            // Trigger location sharing modal after a short delay
            setTimeout(() => {
              setShowLocationShareModal(true);
            }, 500);
          }
        } catch (error) {
          console.log("Location detection failed, continuing with message send");
        }
      }
      
      const response = await apiRequest(endpoint, "POST", messageData);
      return response.json();
    },
    onSuccess: () => {
      const queryKey = isLocationChatRoom ? "/api/location/chat-rooms" : "/api/chat-rooms";
      queryClient.invalidateQueries({ queryKey: [queryKey, chatRoomId, "messages"] });
      if (!isLocationChatRoom) {
        queryClient.invalidateQueries({ queryKey: ["/api/chat-rooms"] });
      }
      setMessage("");
      setShowCommandSuggestions(false);
      setReplyToMessage(null); // 회신 상태 초기화
      
      // 스마트 제안 숨기기
      setShowSmartSuggestions(false);
      setSmartSuggestions([]);
      setSelectedSuggestionIndex(0);
      if (suggestionTimeout) {
        clearTimeout(suggestionTimeout);
        setSuggestionTimeout(null);
      }

      // 메시지 전송 후 맨 아래로 즉시 이동
      setTimeout(() => {
        if (messagesEndRef.current) {
          messagesEndRef.current.scrollIntoView({ behavior: "instant" });
        }
      }, 50);
    },
    onError: (error) => {
    },
  });

  // 스마트 기능 실행 mutation
  const executeSmartMutation = useMutation({
    mutationFn: async ({ type, content, originalText }: { type: string; content: string; originalText?: string }) => {
      // 간단한 기능들은 로컬에서 처리
      if (type === 'calculation') {
        const result = evaluateExpression(originalText || content);
        return { success: true, result: result?.toString() || '계산 오류' };
      }
      
      if (type === 'currency') {
        // 실제 환율 API 연동 필요, 현재는 간단한 계산
        const match = (originalText || content).match(/(\d+)\s*(달러|USD|원|KRW)/i);
        if (match) {
          const amount = parseFloat(match[1]);
          const currency = match[2].toLowerCase();
          if (currency.includes('달러') || currency.includes('usd')) {
            return { success: true, result: `${amount}달러 ≈ ${(amount * 1300).toLocaleString()}원 (환율 1,300원 기준)` };
          } else {
            return { success: true, result: `${amount}원 ≈ ${(amount / 1300).toFixed(2)}달러 (환율 1,300원 기준)` };
          }
        }
      }

      // AI 기능들은 OpenAI API 필요
      if (['translation', 'emotion', 'summary', 'quote', 'decision', 'news', 'search', 'topic_info'].includes(type)) {
        try {
          const response = await fetch('/api/smart-suggestion', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type, content, originalText })
          });
          
          if (!response.ok) {
            throw new Error('API 요청 실패');
          }
          
          return await response.json();
        } catch (error) {
          // OpenAI API가 설정되지 않은 경우 기본 응답
          const defaultResponses = {
            translation: '번역 기능을 사용하려면 OpenAI API 키가 필요합니다.',
            emotion: '공감합니다! 힘내세요 💝',
            summary: '요약 기능을 사용하려면 OpenAI API 키가 필요합니다.',
            quote: '"성공은 준비가 기회를 만났을 때 일어난다." - 세네카',
            decision: '장점과 단점을 차근차근 생각해보세요. 신중한 결정이 좋은 결과를 만듭니다.',
            news: '뉴스 요약 기능을 사용하려면 OpenAI API 키가 필요합니다.',
            search: '검색 기능을 사용하려면 OpenAI API 키가 필요합니다.',
            topic_info: '정보 검색 기능을 사용하려면 OpenAI API 키가 필요합니다.'
          };
          return { success: true, result: defaultResponses[type as keyof typeof defaultResponses] || '기능을 실행할 수 없습니다.' };
        }
      }

      // 기타 기능들
      const otherResponses = {
        reminder: '30분 후 리마인드가 설정되었습니다 ⏰',
        food: '🍕 배달 앱을 확인해보세요!',
        unit: '단위 변환: 요청하신 변환을 처리했습니다',
        birthday: '🎉 축하 카드가 준비되었습니다!',
        meeting: '📹 화상회의 링크: https://meet.google.com/new',
        address: '📍 지도에서 위치를 확인하세요',
        poll: '📊 투표가 생성되었습니다',
        todo: '✅ 할 일이 추가되었습니다',
        timer: '⏰ 타이머가 설정되었습니다',
        category: '🏷️ 메시지가 분류되었습니다'
      };

      return { success: true, result: otherResponses[type as keyof typeof otherResponses] || '기능이 실행되었습니다.' };
    },
    onSuccess: (data, variables) => {
      if (data.success) {
        setSmartResultModal({
          show: true,
          title: variables.content,
          content: data.result
        });
      }
    },
    onError: () => {
    }
  });

  // Mark messages as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async (lastMessageId: number) => {
      return apiRequest(`/api/chat-rooms/${chatRoomId}/mark-read`, "POST", { lastMessageId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/unread-counts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/chat-rooms"] });
    },
  });

  // Leave chat room mutation
  const leaveChatRoomMutation = useMutation({
    mutationFn: async () => {
      return apiRequest(`/api/chat-rooms/${chatRoomId}/leave`, "POST", { saveFiles: false });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat-rooms"] });
      queryClient.invalidateQueries({ queryKey: ["/api/unread-counts"] });
      if (onBackClick) {
        onBackClick();
      }
    },
    onError: () => {
    },
  });

  // Edit message mutation
  const editMessageMutation = useMutation({
    mutationFn: async ({ messageId, content }: { messageId: number; content: string }) => {
      const response = await apiRequest(`/api/chat-rooms/${chatRoomId}/messages/${messageId}`, "PUT", { content });
      return response.json();
    },
    onSuccess: (data) => {
      // 즉시 메시지 목록을 다시 불러오기
      queryClient.invalidateQueries({ queryKey: [`/api/chat-rooms/${chatRoomId}/messages`] });
      // 채팅방 목록도 업데이트 (마지막 메시지 변경될 수 있음)
      queryClient.invalidateQueries({ queryKey: ["/api/chat-rooms"] });
      
      setEditingMessage(null);
      setEditContent("");
    },
    onError: () => {
    },
  });

  // Star/Unstar message mutation
  // Forward message mutation
  const forwardMessageMutation = useMutation({
    mutationFn: async ({ messageId, chatRoomIds }: { messageId: number; chatRoomIds: number[] }) => {
      const response = await apiRequest(`/api/messages/${messageId}/forward`, "POST", { chatRoomIds });
      return response.json();
    },
    onSuccess: () => {
      setShowForwardModal(false);
      setForwardMessageId(null);
      // Show success toast
      queryClient.invalidateQueries({ queryKey: ["/api/chat-rooms"] });
    },
  });

  // Add emoji reaction mutation
  const addReactionMutation = useMutation({
    mutationFn: async ({ messageId, emoji, emojiName }: { messageId: number; emoji: string; emojiName: string }) => {
      const response = await apiRequest(`/api/messages/${messageId}/reactions`, "POST", { emoji, emojiName });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/chat-rooms/${chatRoomId}/messages`] });
    },
  });

  // Translate message mutation
  const translateMessageMutation = useMutation({
    mutationFn: async ({ text, targetLanguage }: { text: string; targetLanguage: string }) => {
      const response = await apiRequest("/api/translate", "POST", { text, targetLanguage });
      return response.json();
    },
    onSuccess: (result, variables) => {
      if (result.success && messageToTranslate) {
        setTranslatedMessages(prev => ({
          ...prev,
          [messageToTranslate.id]: {
            text: result.translatedText,
            language: variables.targetLanguage
          }
        }));
        
        setTranslatingMessages(prev => {
          const newSet = new Set(prev);
          newSet.delete(messageToTranslate.id);
          return newSet;
        });
        
        // 번역 완료 후 해당 메시지로 스크롤 및 강조
        const messageId = messageToTranslate.id;
        setHighlightedMessageId(messageId);
        
        // 메시지로 스크롤
        setTimeout(() => {
          const messageElement = messageRefs.current[messageId];
          if (messageElement) {
            messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 100);
        
        // 2초 후 강조 효과 제거
        setTimeout(() => {
          setHighlightedMessageId(null);
        }, 2000);
      }
      setIsTranslating(false);
      setShowTranslateModal(false);
      setMessageToTranslate(null);
    },
    onError: () => {
      setIsTranslating(false);
      setShowTranslateModal(false);
      if (messageToTranslate) {
        setTranslatingMessages(prev => {
          const newSet = new Set(prev);
          newSet.delete(messageToTranslate.id);
          return newSet;
        });
      }
    },
  });

  // Voice transcription mutation
  const transcribeVoiceMutation = useMutation({
    mutationFn: async (audioBlob: Blob) => {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'voice_message.webm');
      
      console.log('📤 통합 음성 처리 API 호출 중...');
      
      // 통합된 음성 처리 (ContactsList, ChatsList와 동일한 방식)
      const response = await fetch("/api/transcribe", {
        method: "POST",
        headers: {
          "x-user-id": user?.id?.toString() || ""
        },
        body: formData
      });
      
      console.log('📡 통합 처리 응답 상태:', response.status);
      
      if (!response.ok) {
        throw new Error(`Transcription failed: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('✅ 통합 음성 처리 성공:', result);
      
      return result;
    },
    onSuccess: async (result) => {
      if (result.success && result.transcription) {
        // VoiceMessageConfirmModal 표시
        setVoiceConfirmData({
          transcription: result.transcription,
          audioUrl: result.audioUrl || "",
          duration: result.duration || 0
        });
        setShowVoiceConfirmModal(true);
        
        // 회신 모드 해제
        setReplyToMessage(null);
      } else if (result.error === "SILENT_RECORDING") {
        // 빈 음성 녹음의 경우 조용히 취소 (사용자에게 알리지 않음)
        console.log("🔇 빈 음성 녹음 감지됨, 메시지 전송 취소");
      } else {
      }
      setIsProcessingVoice(false);
    },
    onError: () => {
      setIsProcessingVoice(false);
    },
  });

  // Process command mutation
  const processCommandMutation = useMutation({
    mutationFn: async (commandText: string) => {
      const response = await apiRequest("/api/commands/process", "POST", { commandText });
      return response.json();
    },
    onSuccess: (result, commandText) => {
      if (result.success) {
        // Send the command result as a message
        if (result.type === 'json') {
          // Handle poll or other JSON responses
          try {
            const pollData = JSON.parse(result.content);
            sendMessageMutation.mutate({
              content: `Poll: ${pollData.question}`,
              messageType: "poll",
              pollData: result.content,
              replyToMessageId: replyToMessage?.id
            });
          } catch {
            sendMessageMutation.mutate({
              content: result.content,
              messageType: "text",
              replyToMessageId: replyToMessage?.id
            });
          }
        } else {
          sendMessageMutation.mutate({
            content: `${commandText}\n\n${result.content}`,
            messageType: "text",
            replyToMessageId: replyToMessage?.id
          });
        }
      } else {
      }
    },
    onError: (error) => {
    },
  });

  // 명령어용 번역 처리 함수
  const handleCommandTranslate = async (text: string, targetLanguage: string) => {
    try {
      const response = await apiRequest("/api/commands/process", "POST", { 
        commandText: `/translate ${text} to ${targetLanguage}` 
      });
      const result = await response.json();
      
      if (result.success) {
        // 번역 결과를 아이콘과 함께 표시
        sendMessageMutation.mutate({
          content: `🌐 ${result.content}`,
          messageType: "text",
          isTranslated: true,
          replyToMessageId: replyToMessage?.id
        });
      } else {
      }
    } catch (error) {
    }
  };

  // 전체 채팅방 번역 함수
  const handleChatTranslation = async (targetLanguage: string) => {
    if (!messages?.data?.messages) return;
    
    try {
      setIsTranslating(true);
      
      // 번역할 메시지들 수집 (텍스트 메시지만, 최근 20개)
      const textMessages = messages.data.messages
        .filter((msg: any) => msg.messageType === 'text' && msg.content.trim())
        .slice(-20);
      
      if (textMessages.length === 0) {
        return;
      }

      const languageMap: {[key: string]: string} = {
        'korean': 'Korean',
        'english': 'English', 
        'japanese': 'Japanese',
        'chinese': 'Chinese',
        'spanish': 'Spanish',
        'french': 'French',
        'german': 'German',
        'russian': 'Russian'
      };
      
      const targetLangName = languageMap[targetLanguage] || 'English';
      
      // 각 메시지를 개별적으로 번역
      const translationPromises = textMessages.map(async (msg: any) => {
        try {
          const response = await fetch("/api/translate", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-user-id": user?.id?.toString() || ""
            },
            body: JSON.stringify({
              text: msg.content,
              targetLanguage: targetLangName
            })
          });
          
          const result = await response.json();
          
          if (result.success) {
            return {
              messageId: msg.id,
              translatedText: result.translatedText,
              language: targetLangName
            };
          }
        } catch (error) {
          console.error('Translation error for message:', msg.id, error);
        }
        
        return null;
      });
      
      const results = await Promise.all(translationPromises);
      const successfulTranslations = results.filter(result => result !== null);
      
      if (successfulTranslations.length > 0) {
        // 번역 결과를 기존 번역 상태에 저장
        const newTranslations: {[key: number]: {text: string, language: string}} = {};
        successfulTranslations.forEach(translation => {
          if (translation) {
            newTranslations[translation.messageId] = {
              text: translation.translatedText,
              language: translation.language
            };
          }
        });
        
        setTranslatedMessages(prev => ({ ...prev, ...newTranslations }));
      } else {
      }
      
    } catch (error) {
    } finally {
      setIsTranslating(false);
    }
  };

  // 계산기 처리 함수
  const handleCalculatorCommand = async (expression: string) => {
    try {
      const response = await apiRequest("/api/commands/process", "POST", { 
        commandText: `/calculate ${expression}` 
      });
      const result = await response.json();
      
      if (result.success) {
        setCalculatorData({
          expression: expression,
          result: result.content
        });
        setShowCalculatorModal(true);
      } else {
      }
    } catch (error) {
    }
  };

  // 계산기 결과를 채팅방에 전송
  const handleSendCalculatorResult = (result: string) => {
    const expression = calculatorData.expression;
    sendMessageMutation.mutate({
      content: `🧮 ${expression} = ${result}`,
      messageType: "text",
      isCalculated: true,
      replyToMessageId: replyToMessage?.id
    });
  };

  // 폴 생성 핸들러
  const handleCreatePoll = async (question: string, options: string[], duration: number) => {
    try {
      // 투표 데이터 생성
      const pollData = {
        question,
        options,
        duration,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + duration * 60 * 60 * 1000).toISOString()
      };

      // 투표 메시지 전송
      sendMessageMutation.mutate({
        content: `📊 ${question}`,
        messageType: "poll",
        pollData: JSON.stringify(pollData),
        replyToMessageId: replyToMessage?.id
      });

      // 즉시 활성 투표로 설정
      setActivePoll(pollData);
    } catch (error) {
    }
  };

  // Quick reply mutation
  const quickReplyMutation = useMutation({
    mutationFn: async ({ messageId, content, type }: { messageId: number; content: string; type: 'reaction' | 'text' }) => {
      if (type === 'reaction') {
        // Add reaction to message
        const response = await apiRequest(`/api/messages/${messageId}/react`, "POST", { 
          reaction: content 
        });
        return response.json();
      } else {
        // Send quick text reply
        return sendMessageMutation.mutate({
          content,
          messageType: "text",
          replyToMessageId: messageId
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["/api/chat-rooms", chatRoomId, "messages"]);
    },
    onError: () => {
    },
  });



  // File upload mutation
  const uploadFileMutation = useMutation({
    mutationFn: async (file: File) => {
      console.log('📤 파일 업로드 시작:', file.name, `크기: ${(file.size / 1024 / 1024).toFixed(2)}MB`);
      
      try {
        const result = await uploadFileWithProgress(file, '/api/upload', {
          userId: user?.id?.toString(),
          onProgress: (progress) => {
            console.log(`📊 Single file upload progress for ${progress.fileName}:`, progress.progress + '%', `(${progress.loaded}/${progress.total})`);
            
            setUploadProgress(prev => {
              const existing = prev.find(p => p.fileId === progress.fileId);
              const newProgress = existing
                ? prev.map(p => p.fileId === progress.fileId ? progress : p)
                : [...prev, progress];
              
              console.log('📈 Updated uploadProgress state:', newProgress.length, 'items');
              return newProgress;
            });
          }
        });
        
        console.log('✅ 파일 업로드 성공:', result);
        
        // 업로드 완료 후 진행률 제거 (3초 후)
        setTimeout(() => {
          console.log('🗑️ Removing completed upload progress for:', file.name);
          setUploadProgress(prev => prev.filter(p => p.fileName !== file.name || p.status !== 'completed'));
        }, 3000);
        
        return result;
      } catch (error) {
        console.error('❌ 파일 업로드 오류:', error);
        
        // 에러 시 진행률 제거 (3초 후)
        setTimeout(() => {
          setUploadProgress(prev => prev.filter(p => p.fileName !== file.name || p.status !== 'error'));
        }, 3000);
        
        throw error;
      }
    },
    onSuccess: (uploadData) => {
      console.log('✅ 단일 파일 업로드 성공, 메시지 전송 중:', uploadData);
      sendMessageMutation.mutate({
        messageType: "file",
        fileUrl: uploadData.fileUrl,
        fileName: uploadData.fileName,
        fileSize: uploadData.fileSize,
        content: `📎 ${uploadData.fileName}`,
        replyToMessageId: replyToMessage?.id
      }, {
        onSuccess: (messageData) => {
          console.log('✅ 파일 메시지 전송 성공:', messageData);
          // 파일 업로드 후 자동으로 태그하기 모달 열기
          const fileData = {
            fileUrl: uploadData.fileUrl,
            fileName: uploadData.fileName,
            fileSize: uploadData.fileSize,
            messageId: messageData.message.id
          };
          onCreateCommand(fileData);
          
          // Clear reply state
          setReplyToMessage(null);
        },
        onError: (error) => {
          console.error('❌ 파일 메시지 전송 실패:', error);
        }
      });
    },
    onError: (error) => {
      console.error('❌ 파일 업로드 실패:', error);
    },
  });

  // Voice bookmark request mutations
  const handleVoiceBookmarkRequest = useMutation({
    mutationFn: async ({ requestId, action }: { requestId: number; action: 'approved' | 'rejected' }) => {
      const response = await apiRequest(`/api/voice-bookmark-requests/${requestId}`, 'PATCH', { status: action });
      return response.json();
    },
    onSuccess: () => {
      // 요청 목록 새로고침
      queryClient.invalidateQueries({ queryKey: ['/api/voice-bookmark-requests'] });
      // 북마크 목록도 새로고침 (승인 시 자동으로 북마크가 생성됨)
      queryClient.invalidateQueries({ queryKey: ['/api/bookmarks'] });
    },
    onError: (error) => {
      console.error('음성 북마크 요청 처리 실패:', error);
    }
  });

  // Bookmark creation mutation
  const createBookmarkMutation = useMutation({
    mutationFn: async ({ messageId, chatRoomId, bookmarkType }: { messageId: number; chatRoomId: number; bookmarkType: 'message' | 'file' | 'voice' }) => {
      const response = await apiRequest('/api/bookmarks', 'POST', {
        messageId,
        chatRoomId,
        bookmarkType
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || '북마크 생성 실패');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/bookmarks'] });
      console.log('✅ 북마크 생성 성공');
    },
    onError: (error) => {
      console.error('❌ 북마크 생성 실패:', error);
    }
  });

  // Handle sending voice message from preview modal
  const handleSendVoiceMessage = async (editedText: string) => {
    setShowVoicePreview(false);
    
    try {
      const messageData: any = {
        content: editedText,
        messageType: "voice",
        fileUrl: voicePreviewData.audioUrl || "",
        fileName: "voice_message.webm",
        fileSize: voicePreviewData.audioBlob?.size || 0,
        voiceDuration: Math.round(voicePreviewData.duration),
        detectedLanguage: "korean",
        confidence: "0.9"
      };

      // Include reply data if replying
      if (replyToMessage) {
        messageData.replyToMessageId = replyToMessage.id;
        messageData.replyToContent = replyToMessage.messageType === 'voice' && replyToMessage.transcription 
          ? replyToMessage.transcription 
          : replyToMessage.content;
        messageData.replyToSender = replyToMessage.sender.displayName;
      }

      sendMessageMutation.mutate(messageData);
      
      // 모바일 키보드 숨기기
      hideMobileKeyboard();
    } catch (error) {
      console.error('Voice message send failed:', error);
    }
    
    // Clear reply mode and state
    setReplyToMessage(null);
    setIsProcessingVoice(false);
    setVoicePreviewData({
      audioBlob: null,
      transcribedText: "",
      duration: 0
    });
  };

  const messages = messagesData?.messages || [];

  // Intelligent auto-scroll function with smooth transitions
  const scrollToBottom = (behavior: 'smooth' | 'instant' = 'smooth') => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ 
        behavior,
        block: 'end'
      });
    }
  };

  // Scroll event handler to detect user scrolling
  const handleScroll = () => {
    if (!chatScrollRef.current) return;
    
    const container = chatScrollRef.current;
    const scrollTop = container.scrollTop;
    const scrollHeight = container.scrollHeight;
    const clientHeight = container.clientHeight;
    
    // Check if user is near the bottom (within 100px)
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
    
    // Update isAtBottom state
    setIsAtBottom(isNearBottom);
    
    // Detect if user is manually scrolling
    const isScrollingUp = scrollTop < lastScrollTop;
    
    // 사용자가 수동으로 위로 스크롤하면
    if (isScrollingUp && !isNearBottom) {
      hasScrolledManually.current = true;
      setIsUserScrolling(true);
      setShouldAutoScroll(false);
      setIsInitialLoad(false); // 초기 로드 완료로 표시
    } else if (isNearBottom) {
      // 맨 아래 근처로 돌아오면 자동 스크롤 재활성화 및 새 메시지 카운터 초기화
      hasScrolledManually.current = false; // 수동 스크롤 플래그 리셋
      setIsUserScrolling(false);
      setShouldAutoScroll(true);
      setUnreadNewMessages(0); // 새 메시지 카운터 초기화
    }
    
    setLastScrollTop(scrollTop);
    
    // Clear the scroll timeout
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    
    // Set a timeout to reset user scrolling state
    scrollTimeoutRef.current = setTimeout(() => {
      setIsUserScrolling(false);
    }, 1000);
  };

  // Auto-scroll on new messages
  useEffect(() => {
    if (messages && messages.length > 0) {
      const messageCount = messages.length;
      
      // 초기 로드 시: 첫 메시지만 자동 스크롤 (그 이후는 사용자가 제어)
      if (isInitialLoad && messageCount > 0) {
        // 즉시 스크롤하여 움직임이 보이지 않도록 함
        requestAnimationFrame(() => {
          scrollToBottom('instant');
          setIsInitialLoad(false); // 초기 로드 완료
        });
      } 
      // 일반 메시지 수신 시
      else if (messageCount > lastMessageCount) {
        const newMessageCount = messageCount - lastMessageCount;
        
        // 맨 아래에 있으면 자동 스크롤
        if (!hasScrolledManually.current && shouldAutoScroll) {
          setTimeout(() => {
            scrollToBottom('smooth');
          }, 50);
        } 
        // 위에서 스크롤 중이면 새 메시지 카운터 증가
        else if (!isAtBottom) {
          setUnreadNewMessages(prev => prev + newMessageCount);
        }
      }
      
      setLastMessageCount(messageCount);
    }
  }, [messages, shouldAutoScroll, lastMessageCount, isInitialLoad, isAtBottom]);

  // Cleanup scroll timeout on unmount
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  // 채팅방 변경 시 초기 스크롤 플래그 리셋
  useEffect(() => {
    hasInitialScrolledRef.current = false;
  }, [chatRoomId]);

  // 읽지 않은 메시지 ID 계산
  useEffect(() => {
    if (messages && messages.length > 0 && user?.id) {
      // 마지막으로 읽은 시간을 기준으로 읽지 않은 메시지 찾기
      // 현재는 간단하게 가장 오래된 메시지를 기준으로 설정
      // 실제로는 사용자의 마지막 읽기 시간을 서버에서 가져와야 함
      const unreadMessages = messages.filter((msg: any) => {
        // 자신의 메시지는 제외
        if (msg.senderId === user.id) return false;
        
        // 현재는 모든 상대방 메시지를 읽지 않은 것으로 간주하는 대신
        // 실제로는 lastReadAt 시간을 비교해야 함
        const messageTime = new Date(msg.createdAt).getTime();
        const oneHourAgo = Date.now() - (60 * 60 * 1000); // 1시간 전
        
        // 1시간 이내의 상대방 메시지를 읽지 않은 것으로 간주
        return messageTime > oneHourAgo;
      });
      
      if (unreadMessages.length > 0) {
        setFirstUnreadMessageId(unreadMessages[0].id);
      } else {
        setFirstUnreadMessageId(null);
      }
    }
  }, [messages, user?.id]);
  const commands = commandsData?.commands || [];
  const contacts = contactsData?.contacts || [];

  // Get unread counts to detect first unread message (only for regular chats)
  const { data: unreadData, status: unreadStatus, isFetching: isUnreadFetching } = useQuery({
    queryKey: ["/api/unread-counts"],
    enabled: !!user && !isLocationChatRoom,
    refetchInterval: 5000, // Check every 5 seconds
  });

  // unread 데이터가 정착되었는지 확인 (로딩 완료 또는 에러)
  // locationChatRoom의 경우 쿼리가 비활성화되므로 즉시 settled로 간주
  const unreadSettled = isLocationChatRoom || unreadStatus === 'success' || (unreadStatus === 'error' && !isUnreadFetching);

  // chatRoomId 변경 시 즉시 unreadData refetch
  useEffect(() => {
    if (chatRoomId && user && !isLocationChatRoom) {
      queryClient.refetchQueries({ queryKey: ["/api/unread-counts"] });
    }
  }, [chatRoomId, user, isLocationChatRoom]);

  // 채팅방 진입 시 읽지 않은 메시지부터 표시하는 기능 (unread 데이터가 로드된 후에만)
  useEffect(() => {
    if (messages && messages.length > 0 && chatScrollRef.current && !isLoading && 
        !hasInitialScrolledRef.current && unreadSettled) {
      // firstUnreadMessageId가 있을 때만 스크롤 시도
      if (firstUnreadMessageId) {
        const attemptScroll = () => {
          const unreadElement = messageRefs.current[firstUnreadMessageId];
          if (unreadElement) {
            unreadElement.scrollIntoView({
              behavior: "instant",
              block: "center"
            });
            hasInitialScrolledRef.current = true;
            return true;
          }
          return false;
        };

        // 재시도 로직 (최대 20회, 약 1초)
        let retryCount = 0;
        const maxRetries = 20;
        const retryInterval = setInterval(() => {
          const success = attemptScroll();
          if (success || retryCount >= maxRetries) {
            clearInterval(retryInterval);
            // 최대 재시도 후에도 실패하면 하단으로 폴백
            if (!success && retryCount >= maxRetries) {
              messagesEndRef.current?.scrollIntoView({ behavior: "instant" });
              hasInitialScrolledRef.current = true;
            }
          }
          retryCount++;
        }, 50);

        return () => clearInterval(retryInterval);
      } else {
        // unread가 로드 완료되었고 firstUnreadMessageId가 null이면 하단으로 스크롤
        messagesEndRef.current?.scrollIntoView({ behavior: "instant" });
        hasInitialScrolledRef.current = true;
      }
    }
  }, [messages, isLoading, firstUnreadMessageId, unreadSettled]);

  // Unread message detection (updated when messages or unread data changes)
  useEffect(() => {
    if (messages.length > 0 && unreadData?.unreadCounts) {
      const currentRoomUnread = unreadData.unreadCounts.find((u: any) => u.chatRoomId === chatRoomId);
      
      if (currentRoomUnread && currentRoomUnread.unreadCount > 0) {
        // Find first unread message (assuming last N messages are unread)
        const unreadStartIndex = Math.max(0, messages.length - currentRoomUnread.unreadCount);
        const firstUnreadMessage = messages[unreadStartIndex];
        
        if (firstUnreadMessage) {
          setFirstUnreadMessageId(firstUnreadMessage.id);
        }
      } else {
        setFirstUnreadMessageId(null);
      }
    }
  }, [messages, unreadData, chatRoomId]);

  // Scroll detection for floating button
  useEffect(() => {
    const handleScroll = () => {
      if (chatScrollRef.current && firstUnreadMessageId) {
        const scrollContainer = chatScrollRef.current;
        const firstUnreadElement = messageRefs.current[firstUnreadMessageId];
        
        if (firstUnreadElement) {
          const containerRect = scrollContainer.getBoundingClientRect();
          const elementRect = firstUnreadElement.getBoundingClientRect();
          
          // Show button if first unread message is not visible
          const isVisible = elementRect.top >= containerRect.top && 
                           elementRect.bottom <= containerRect.bottom;
          setShowUnreadButton(!isVisible && firstUnreadMessageId !== null);
        }
      }
    };

    const scrollContainer = chatScrollRef.current;
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', handleScroll);
      return () => scrollContainer.removeEventListener('scroll', handleScroll);
    }
  }, [firstUnreadMessageId]);

  // 활성 투표 감지
  useEffect(() => {
    if (messages.length > 0) {
      const pollMessages = messages.filter((msg: any) => 
        msg.messageType === "poll" && msg.pollData
      );
      
      if (pollMessages.length > 0) {
        const latestPoll = pollMessages[pollMessages.length - 1];
        try {
          const pollData = JSON.parse(latestPoll.pollData);
          const isExpired = new Date() > new Date(pollData.expiresAt);
          
          if (!isExpired) {
            setActivePoll({
              ...pollData,
              messageId: latestPoll.id
            });
            
            // 투표 결과 초기화 (실제로는 서버에서 가져와야 함)
            const initialVotes: {[key: number]: number} = {};
            pollData.options.forEach((_: any, index: number) => {
              initialVotes[index] = Math.floor(Math.random() * 3); // 임시 더미 데이터
            });
            setPollVotes(initialVotes);
            
            // 사용자 투표 상태 초기화
            setUserVote(null);
            setVotedUsers(new Set());
          } else {
            setActivePoll(null);
          }
        } catch (error) {
          console.error("Poll data parsing error:", error);
        }
      } else if (!activePoll) {
        setActivePoll(null);
      }
    }
  }, [messages]);

  // 폭탄 메시지 타이머 관리 - 디버깅 버전
  useEffect(() => {
    console.log("🔍 Timer effect triggered, messages:", messages.length);
    
    const boomMessages = messages.filter((msg: any) => {
      const isBoom = msg.messageType === "boom";
      const hasExpiry = msg.expiresAt;
      const notExploded = !explodedMessages.has(msg.id);
      
      console.log(`📧 Message ${msg.id}: type=${msg.messageType}, isBoom=${isBoom}, hasExpiry=${hasExpiry}, notExploded=${notExploded}`);
      
      return isBoom && hasExpiry && notExploded;
    });

    console.log("💣 Found boom messages:", boomMessages.length);

    const timers: {[key: number]: NodeJS.Timeout} = {};

    boomMessages.forEach((msg: any) => {
      const expiresAt = new Date(msg.expiresAt).getTime();
      const now = Date.now();
      const timeLeft = Math.max(0, Math.ceil((expiresAt - now) / 1000));

      console.log(`⏰ Message ${msg.id}: expiresAt=${msg.expiresAt}, now=${new Date().toISOString()}, timeLeft=${timeLeft}s`);

      if (timeLeft > 0) {
        // 즉시 타이머 상태 설정
        setMessageTimers(prev => {
          console.log(`🔄 Setting timer for message ${msg.id}: ${timeLeft}s`);
          return { ...prev, [msg.id]: timeLeft };
        });
        
        // 1초마다 타이머 업데이트
        timers[msg.id] = setInterval(() => {
          setMessageTimers(prev => {
            const currentTime = Math.max(0, (prev[msg.id] || 0) - 1);
            
            console.log(`⏱️ Timer update for message ${msg.id}: ${currentTime}s remaining`);
            
            if (currentTime <= 0) {
              console.log(`💥 BOOM! Message ${msg.id} exploded!`);
              // 폭발!
              setExplodedMessages(prevExploded => {
                const newExploded = [...Array.from(prevExploded), msg.id];
                console.log(`💥 Updated exploded messages:`, newExploded);
                return new Set(newExploded);
              });
              clearInterval(timers[msg.id]);
              return { ...prev, [msg.id]: 0 };
            }
            
            return { ...prev, [msg.id]: currentTime };
          });
        }, 1000);
      } else {
        console.log(`💥 Message ${msg.id} already expired, marking as exploded`);
        // 이미 만료된 메시지
        setExplodedMessages(prev => {
          const newExploded = [...Array.from(prev), msg.id];
          return new Set(newExploded);
        });
      }
    });

    return () => {
      console.log("🧹 Cleaning up timers");
      Object.values(timers).forEach(timer => clearInterval(timer));
    };
  }, [messages, explodedMessages]);

  // 채팅방 이름을 올바르게 표시하는 함수
  const getChatRoomDisplayName = (chatRoom: any) => {
    if (!chatRoom) return "";
    
    // 그룹 채팅인 경우 그룹 이름 사용
    if (chatRoom.isGroup) {
      return chatRoom.name;
    }
    
    // 개인 채팅인 경우 상대방의 닉네임으로 표시
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

  const chatRoomDisplayName = getChatRoomDisplayName(currentChatRoom);

  // 메시지 변경 시 자동 스크롤 제거 (읽지 않은 메시지 로직에서 처리)





  // 채팅방 변경 시 임시 메시지 복원
  useEffect(() => {
    // 새 채팅방의 임시 메시지 불러오기
    const draftMessage = loadDraftMessage(chatRoomId);
    setMessage(draftMessage);
    
    // 채팅방 변경 시 초기 로드 플래그 리셋
    setIsInitialLoad(true);
    hasScrolledManually.current = false;
    setShouldAutoScroll(true);
  }, [chatRoomId]);

  const handleSendMessage = () => {
    if (!message.trim()) return;

    // 욕설 감지 확인
    const profanityDetection = detectProfanity(message);
    if (profanityDetection) {
      setProfanityMessage(message);
      setShowProfanityModal(true);
      return;
    }

    // Check if it's a chat command (starts with /)
    if (message.startsWith('/')) {
      // 특별한 번역 처리
      if (message.startsWith('/translate ')) {
        const textToTranslate = message.replace('/translate ', '').trim();
        if (textToTranslate) {
          setTextToTranslate(textToTranslate);
          setShowLanguageModal(true);
          setMessage("");
          resetTextareaSize();
          setShowChatCommands(false);
          return;
        }
      }
      
      // 특별한 계산기 처리
      if (message.startsWith('/calculate ')) {
        const expression = message.replace('/calculate ', '').trim();
        if (expression) {
          handleCalculatorCommand(expression);
          setMessage("");
          resetTextareaSize();
          setShowChatCommands(false);
          return;
        }
      }
      
      // 특별한 폴 처리
      if (message.startsWith('/poll ')) {
        const question = message.replace('/poll ', '').trim();
        if (question) {
          setPollQuestion(question);
          setShowPollModal(true);
          setMessage("");
          resetTextareaSize();
          setShowChatCommands(false);
          return;
        }
      }

      // SendBack 명령어 처리
      if (message.startsWith('/sendback ')) {
        const parts = message.replace('/sendback ', '').trim().split(' ');
        const messageId = parseInt(parts[0]);
        const feedback = parts.slice(1).join(' ');
        
        if (messageId && feedback) {
          const targetMessage = messages.find((msg: any) => msg.id === messageId);
          if (targetMessage) {
            // 피드백 메시지 전송 (작성자에게만 보임)
            sendMessageMutation.mutate({
              content: `↩️ 피드백: ${feedback}`,
              messageType: "sendback",
              targetUserId: targetMessage.senderId,
              replyToMessageId: messageId
            });
          } else {
          }
          setMessage("");
          setShowChatCommands(false);
          return;
        }
      }

      // Spotlight 명령어 처리
      if (message.startsWith('/spotlight ')) {
        const parts = message.replace('/spotlight ', '').trim().split(' ');
        const messageId = parseInt(parts[0]);
        const duration = parts[1] || '5분간';
        
        if (messageId) {
          const targetMessage = messages.find((msg: any) => msg.id === messageId);
          if (targetMessage) {
            // 스포트라이트 메시지 전송
            sendMessageMutation.mutate({
              content: `📌 주목: "${targetMessage.content}" (${duration} 고정)`,
              messageType: "spotlight",
              spotlightMessageId: messageId,
              spotlightDuration: duration
            });
          } else {
          }
          setMessage("");
          setShowChatCommands(false);
          return;
        }
      }

      // Boom 명령어 처리 (시한폭탄 메시지)
      if (message.startsWith('/boom ')) {
        const parts = message.replace('/boom ', '').trim().split(' ');
        const timeStr = parts[0];
        const boomMessage = parts.slice(1).join(' ');
        
        if (timeStr && boomMessage) {
          // 시간 파싱 (예: 10s, 5m, 1h)
          let seconds = 0;
          if (timeStr.endsWith('s')) {
            seconds = parseInt(timeStr.slice(0, -1));
          } else if (timeStr.endsWith('m')) {
            seconds = parseInt(timeStr.slice(0, -1)) * 60;
          } else if (timeStr.endsWith('h')) {
            seconds = parseInt(timeStr.slice(0, -1)) * 3600;
          }
          
          if (seconds > 0) {
            // 폭탄 메시지 전송
            const expirationTime = new Date(Date.now() + seconds * 1000);
            console.log(`🚀 Sending boom message: timer=${seconds}s, expires=${expirationTime.toISOString()}`);
            
            sendMessageMutation.mutate({
              content: `💣 ${boomMessage}`,
              messageType: "boom",
              boomTimer: seconds,
              expiresAt: expirationTime.toISOString()
            });
          } else {
          }
          setMessage("");
          setShowChatCommands(false);
          return;
        }
      }
      
      processCommandMutation.mutate(message);
      setMessage("");
      resetTextareaSize();
      setShowChatCommands(false); // AI 커맨드 창 닫기
      return;
    }

    // Check if it's a command recall
    if (message.startsWith('#')) {
      const commandName = message.slice(1);
      const command = commands.find((cmd: any) => cmd.commandName === commandName);
      
      if (command) {
        // 명령어 호출은 로컬에서만 처리 (다른 사용자에게 보이지 않음)
        const tempMessage = {
          id: Date.now(), // 임시 ID
          chatRoomId: chatRoomId,
          senderId: user?.id || 0,
          content: message,
          messageType: command.fileUrl ? "file" : "text",
          fileUrl: command.fileUrl,
          fileName: command.fileName,
          fileSize: command.fileSize,
          isCommandRecall: true,
          isLocalOnly: true, // 로컬 전용 메시지 표시
          createdAt: new Date().toISOString(),
          sender: {
            id: user?.id || 0,
            username: user?.username || '',
            displayName: user?.displayName || '',
            profilePicture: user?.profilePicture
          }
        };
        
        // QueryClient 캐시에 임시로 추가
        queryClient.setQueryData(["/api/chat-rooms", chatRoomId, "messages"], (oldData: any) => {
          if (!oldData) return { messages: [tempMessage] };
          return {
            ...oldData,
            messages: [...oldData.messages, tempMessage]
          };
        });
        
        setMessage("");
        setShowCommandSuggestions(false);
        return;
      }
    }

    // 멘션 감지 및 처리
    const mentions = detectMentions(message);
    const mentionedUsers = findMentionedUsers(mentions);
    const mentionAll = mentions.includes('all') && currentChatRoom?.isGroup;
    
    // 회신 메시지인 경우 회신 데이터 포함
    const messageData: any = {
      content: message,
      messageType: "text",
    };

    if (replyToMessage) {
      messageData.replyToMessageId = replyToMessage.id;
      // 음성 메시지인 경우 transcription 사용, 아니면 content 사용
      messageData.replyToContent = replyToMessage.messageType === 'voice' && replyToMessage.transcription 
        ? replyToMessage.transcription 
        : replyToMessage.content;
      messageData.replyToSender = replyToMessage.sender.displayName;
    }

    // 멘션 데이터 추가
    if (mentionedUsers.length > 0) {
      messageData.mentionedUserIds = JSON.stringify(mentionedUsers.map(u => u.id));
    }
    if (mentionAll) {
      messageData.mentionAll = true;
    }

    sendMessageMutation.mutate(messageData);
    
    // 메시지 전송 후 텍스트박스 크기 초기화
    resetTextareaSize();
    
    // 모바일 키보드 숨기기
    hideMobileKeyboard();
    
    // 메시지 전송 후 임시 저장된 내용 삭제
    clearDraftMessage(chatRoomId);
    setReplyToMessage(null); // 회신 모드 해제
  };

  const handleFileUpload = () => {
    setShowFileUploadModal(true);
  };

  const handleFileUploadWithHashtags = async (files: FileList, caption: string, description: string) => {
    console.log('📤 다중 파일 업로드 시작:', files.length, '개 파일');
    console.log('📝 캡션:', caption);
    console.log('📄 설명:', description);
    
    // 업로드 시작 즉시 각 파일에 대한 임시 메시지 생성
    const tempMessages = Array.from(files).map((file, index) => {
      let messageContent = `📎 ${file.name}`;
      
      if (index === 0 && caption) {
        messageContent += `\n\n${caption}`;
      }
      
      if (description.trim()) {
        messageContent += `\n\n${description}`;
      }
      
      return {
        id: Date.now() + index, // 임시 ID
        chatRoomId: chatRoomId,
        senderId: user?.id || 0,
        content: messageContent,
        messageType: "file" as const,
        fileName: file.name,
        fileSize: file.size,
        isUploading: true, // 업로드 중 표시
        uploadProgress: 0,
        createdAt: new Date().toISOString(),
        sender: {
          id: user?.id || 0,
          username: user?.username || '',
          displayName: user?.displayName || '',
          profilePicture: user?.profilePicture
        }
      };
    });
    
    // 임시 메시지들을 채팅에 즉시 표시
    queryClient.setQueryData([`/api/chat-rooms`, chatRoomId, "messages"], (oldData: any) => {
      if (!oldData) return { messages: tempMessages };
      return {
        ...oldData,
        messages: [...oldData.messages, ...tempMessages]
      };
    });
    
    try {
      // Process each file individually to match server expectation
      const uploadPromises = Array.from(files).map(async (file, index) => {
        const tempMessageId = tempMessages[index].id;
        console.log(`📁 파일 ${index + 1} 업로드:`, file.name);
        
        try {
          const uploadResult = await uploadFileWithProgress(file, '/api/upload', {
            userId: user?.id?.toString(),
            onProgress: (progress) => {
              console.log(`📊 Upload progress for ${progress.fileName}:`, progress.progress + '%', `(${progress.loaded}/${progress.total})`);
              
              // Update upload progress state
              setUploadProgress(prev => {
                const existing = prev.find(p => p.fileId === progress.fileId);
                const newProgress = existing 
                  ? prev.map(p => p.fileId === progress.fileId ? progress : p)
                  : [...prev, progress];
                
                console.log('📈 Updated uploadProgress state:', newProgress.length, 'items');
                return newProgress;
              });
              
              // Update message progress in chat
              queryClient.setQueryData([`/api/chat-rooms`, chatRoomId, "messages"], (oldData: any) => {
                if (!oldData) return oldData;
                return {
                  ...oldData,
                  messages: oldData.messages.map((msg: any) => 
                    msg.id === tempMessageId 
                      ? { ...msg, uploadProgress: progress.progress }
                      : msg
                  )
                };
              });
            }
          });
          
          console.log(`✅ 파일 ${index + 1} 업로드 성공:`, uploadResult);
          
          // Remove from upload progress after completion (with longer delay)
          setTimeout(() => {
            console.log('🗑️ Removing completed upload progress for:', file.name);
            setUploadProgress(prev => prev.filter(p => p.fileName !== file.name || p.status !== 'completed'));
          }, 3000);
          
          return {
            ...uploadResult,
            originalFile: file,
            tempMessageId
          };
        } catch (error) {
          console.error(`❌ 파일 ${index + 1} 업로드 실패:`, error);
          
          // 실패한 임시 메시지 제거
          queryClient.setQueryData([`/api/chat-rooms`, chatRoomId, "messages"], (oldData: any) => {
            if (!oldData) return oldData;
            return {
              ...oldData,
              messages: oldData.messages.filter((msg: any) => msg.id !== tempMessageId)
            };
          });
          
          // Remove from upload progress after error (with delay to show error)
          setTimeout(() => {
            setUploadProgress(prev => prev.filter(p => p.fileName !== file.name || p.status !== 'error'));
          }, 3000);
          
          throw error;
        }
      });
      
      const uploadResults = await Promise.all(uploadPromises);
      console.log('✅ 모든 파일 업로드 완료:', uploadResults.length, '개');
      
      // Send each file as a separate message with caption and description
      const messagePromises = uploadResults.map(async (uploadData, index) => {
        // Include description in all file messages, caption only in first
        let messageContent = `📎 ${uploadData.fileName}`;
        
        if (index === 0 && caption) {
          messageContent += `\n\n${caption}`;
        }
        
        if (description.trim()) {
          messageContent += `\n\n${description}`;
        }
        
        console.log('📤 File upload message content:', messageContent);
        console.log('📄 Description being sent:', description);
        
        const realMessage = await sendMessageMutation.mutateAsync({
          messageType: "file",
          fileUrl: uploadData.fileUrl,
          fileName: uploadData.fileName,
          fileSize: uploadData.fileSize,
          content: messageContent,
          replyToMessageId: replyToMessage?.id
        });
        
        // 임시 메시지를 실제 메시지로 교체
        queryClient.setQueryData([`/api/chat-rooms`, chatRoomId, "messages"], (oldData: any) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            messages: oldData.messages.map((msg: any) => 
              msg.id === uploadData.tempMessageId 
                ? { ...realMessage, sender: msg.sender }
                : msg
            )
          };
        });
        
        return realMessage;
      });
      
      await Promise.all(messagePromises);
      console.log('✅ 모든 메시지 전송 완료');
      
      // Clear reply state
      setReplyToMessage(null);
      
      // Refresh chat data to ensure consistency
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: [`/api/chat-rooms`, chatRoomId, "messages"] });
        queryClient.invalidateQueries({ queryKey: ["/api/chat-rooms"] });
      }, 500);
      
    } catch (error) {
      console.error('❌ 파일 업로드 오류:', error);
      
      // 실패 시 모든 임시 메시지 제거
      queryClient.setQueryData([`/api/chat-rooms`, chatRoomId, "messages"], (oldData: any) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          messages: oldData.messages.filter((msg: any) => !msg.isUploading)
        };
      });
      
      throw error;
    }
  };

  // Optimized drag and drop handlers for chat area
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // 파일이 포함된 경우에만 드래그 오버 상태 활성화
    if (e.dataTransfer.types && e.dataTransfer.types.length > 0) {
      const hasFiles = Array.from(e.dataTransfer.types).some(type => 
        type === 'Files' || type === 'application/x-moz-file'
      );
      if (hasFiles) {
        setIsDragOver(true);
      }
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // 채팅 영역을 완전히 벗어날 때만 드래그 오버 상태 해제
    const rect = chatAreaRef.current?.getBoundingClientRect();
    if (rect) {
      const x = e.clientX;
      const y = e.clientY;
      if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
        setIsDragOver(false);
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // 파일 드래그인 경우 복사 효과 설정
    if (e.dataTransfer.types && e.dataTransfer.types.length > 0) {
      const hasFiles = Array.from(e.dataTransfer.types).some(type => 
        type === 'Files' || type === 'application/x-moz-file'
      );
      if (hasFiles) {
        e.dataTransfer.dropEffect = "copy";
      } else {
        e.dataTransfer.dropEffect = "none";
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      const file = files[0];
      const maxSize = 500 * 1024 * 1024; // 500MB
      
      if (file.size > maxSize) {
        return;
      }
      
      uploadFileMutation.mutate(file);
    }
  };

  // 번역 관련 핸들러들
  const handleTranslateMessage = (message?: any) => {
    const targetMessage = message || contextMenu.message;
    if (targetMessage) {
      // 음성 메시지는 transcription 필드에서 텍스트 가져오기
      let textToTranslate = targetMessage.content;
      
      if (targetMessage.messageType === "voice") {
        textToTranslate = targetMessage.transcription || targetMessage.content;
      }
      
      // 번역할 텍스트가 있는 경우에만 모달 표시
      if (textToTranslate && textToTranslate.trim()) {
        // transcription을 content로 임시 설정하여 번역 모달에서 사용
        const messageForTranslation = {
          ...targetMessage,
          content: textToTranslate
        };
        setMessageToTranslate(messageForTranslation);
        setShowTranslateModal(true);
      }
    }
  };

  const handleTranslate = (targetLanguage: string) => {
    if (!messageToTranslate) return;
    
    setIsTranslating(true);
    setTranslatingMessages(prev => new Set(prev).add(messageToTranslate.id));
    
    translateMessageMutation.mutate({
      text: messageToTranslate.content,
      targetLanguage
    });
  };

  // 음성 녹음 완료 핸들러
  const handleVoiceRecordingComplete = (audioBlob: Blob, duration: number) => {
    setIsProcessingVoice(true);
    transcribeVoiceMutation.mutate(audioBlob);
  }



  // 이어폰 감지 및 자동 재생 함수
  const checkEarphonesAndAutoPlay = async () => {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioOutputs = devices.filter(device => device.kind === 'audiooutput');
        
        // 이어폰/헤드폰 감지
        const hasEarphones = audioOutputs.some(device => 
          device.label.toLowerCase().includes('headphone') ||
          device.label.toLowerCase().includes('earphone') ||
          device.label.toLowerCase().includes('bluetooth') ||
          (device.deviceId !== 'default' && device.deviceId !== 'communications')
        );
        
        return hasEarphones;
      }
    } catch (error) {
      console.log('Earphone detection failed:', error);
    }
    return false;
  };

  // 음성 메시지 재생/일시정지 함수
  const handleVoicePlayback = async (messageId: number, audioUrl?: string, voiceDuration?: number, senderId?: number) => {
    if (playingAudio === messageId) {
      // 현재 재생 중인 음성을 일시정지
      if (audioRef.current) {
        audioRef.current.pause();
        setPlayingAudio(null);
      }
    } else {
      try {
        // 메시지 찾기 및 발신자 정보 확인
        const message = messages?.find(m => m.id === messageId);
        const messageSenderId = senderId || message?.senderId;
        
        // 자신의 음성 메시지는 항상 재생 가능
        if (messageSenderId && messageSenderId !== user?.id) {
          // 발신자의 음성 재생 허용 설정 확인
          const senderInfo = message?.sender;
          if (senderInfo && senderInfo.allowVoicePlayback === false) {
            return;
          }
        }
        
        // 이전 오디오 정지
        if (audioRef.current) {
          audioRef.current.pause();
        }
        
        // 실제 음성 파일이 있으면 재생
        if (audioUrl) {
          const audio = new Audio(audioUrl);
          audioRef.current = audio;
          
          audio.onended = () => {
            setPlayingAudio(null);
          };
          
          audio.onerror = () => {
            console.error("Audio file could not be loaded:", audioUrl);
            setPlayingAudio(null);
          };
          
          setPlayingAudio(messageId);
          await audio.play();
        } else {
        }
        
      } catch (error) {
        console.error("Audio playback error:", error);
        setPlayingAudio(null);
      }
    }
  };

  // 새 음성 메시지 자동 재생 체크 (이어폰 착용 시)
  useEffect(() => {
    if (user?.autoPlayVoiceMessages && messages && messages.length > 0) {
      const latestMessage = messages[messages.length - 1];
      
      // 새로운 음성 메시지이고 다른 사용자가 보낸 것인 경우
      if (latestMessage.messageType === 'voice' && 
          latestMessage.senderId !== user.id && 
          latestMessage.sender?.allowVoicePlayback !== false) {
        
        // 이어폰 감지 후 자동 재생
        checkEarphonesAndAutoPlay().then(hasEarphones => {
          if (hasEarphones && latestMessage.fileUrl) {
            setTimeout(() => {
              handleVoicePlayback(latestMessage.id, latestMessage.fileUrl, latestMessage.voiceDuration, latestMessage.senderId);
            }, 500); // 500ms 지연 후 자동 재생
          }
        });
      }
    }
  }, [messages, user?.autoPlayVoiceMessages]);

  // 채팅 설정 메뉴 밖 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (chatSettingsRef.current && !chatSettingsRef.current.contains(event.target as Node)) {
        setShowChatSettings(false);
      }
    };

    if (showChatSettings) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showChatSettings]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const maxSize = 500 * 1024 * 1024; // 500MB
      
      if (file.size > maxSize) {
        // Reset file input
        event.target.value = '';
        return;
      }
      
      uploadFileMutation.mutate(file);
    }
  };

  // 스마트 채팅 상태
  const [smartSuggestions, setSmartSuggestions] = useState<Array<{
    type: 'calculation' | 'currency' | 'schedule' | 'translation' | 'address' | 'poll' | 'todo' | 'timer' | 'emotion' | 'food' | 'youtube' | 'news' | 'unit' | 'search' | 'birthday' | 'meeting' | 'reminder' | 'quote' | 'question' | 'followup' | 'summary' | 'decision' | 'category' | 'file_summary' | 'topic_info' | 'mannertone' | 'file_request';
    text: string;
    result: string;
    amount?: number;
    fromCurrency?: string;
    toCurrency?: string;
    rate?: number;
    icon?: string;
    category?: string;
    action?: () => void;
  }>>([]);
  const [showSmartSuggestions, setShowSmartSuggestions] = useState(false);
  const [suggestionTimeout, setSuggestionTimeout] = useState<NodeJS.Timeout | null>(null);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(0);
  const [isNavigatingWithKeyboard, setIsNavigatingWithKeyboard] = useState(false);
  const [isHoveringOverSuggestions, setIsHoveringOverSuggestions] = useState(false);
  const [smartResultModal, setSmartResultModal] = useState<{show: boolean, title: string, content: string}>({
    show: false,
    title: '',
    content: ''
  });
  const [showHashSuggestions, setShowHashSuggestions] = useState(false);
  const [hashSuggestions, setHashSuggestions] = useState<string[]>([]);
  const [selectedHashIndex, setSelectedHashIndex] = useState(0);
  // 음성 메시지 임시 저장 상태 (스마트 추천 선택 대기)
  const [pendingVoiceMessage, setPendingVoiceMessage] = useState<any>(null);
  // 채팅방별 저장된 명령어들을 태그로 사용
  const savedCommands = (commandsData as any)?.commands || [];
  const storedTags = savedCommands.map((cmd: any) => cmd.commandName);

  // 천 단위 마침표로 숫자 포맷팅
  const formatNumber = (num: number): string => {
    return num.toLocaleString('ko-KR');
  };

  // 한글 숫자를 숫자로 변환하는 함수
  const parseKoreanNumber = (text: string): number | null => {
    try {
      // 이미 숫자인 경우
      const directNumber = parseFloat(text.replace(/,/g, ''));
      if (!isNaN(directNumber)) {
        return directNumber;
      }

      // 한글 숫자 단위 변환
      const koreanUnits: { [key: string]: number } = {
        '천': 1000,
        '만': 10000,
        '십만': 100000,
        '백만': 1000000,
        '천만': 10000000,
        '억': 100000000,
        '십억': 1000000000,
        '백억': 10000000000,
        '천억': 100000000000,
        '조': 1000000000000
      };

      let result = 0;
      let currentNumber = '';
      let i = 0;

      while (i < text.length) {
        const char = text[i];
        
        // 숫자 문자 수집
        if (/\d/.test(char)) {
          currentNumber += char;
          i++;
          continue;
        }

        // 단위 찾기
        let foundUnit = false;
        for (const [unit, multiplier] of Object.entries(koreanUnits)) {
          if (text.substring(i, i + unit.length) === unit) {
            const baseNumber = currentNumber ? parseInt(currentNumber) : 1;
            result += baseNumber * multiplier;
            currentNumber = '';
            i += unit.length;
            foundUnit = true;
            break;
          }
        }

        if (!foundUnit) {
          i++;
        }
      }

      // 남은 숫자 처리
      if (currentNumber) {
        result += parseInt(currentNumber);
      }

      return result > 0 ? result : null;
    } catch {
      return null;
    }
  };

  // 안전한 계산식 평가 함수
  const evaluateExpression = (expr: string): number | null => {
    try {
      // 안전한 문자만 허용 (숫자, 연산자, 괄호, 공백, 소수점)
      if (!/^[\d\+\-\*\/\(\)\.\s]+$/.test(expr)) {
        return null;
      }
      
      // eval 대신 Function 생성자 사용 (더 안전)
      const result = Function(`"use strict"; return (${expr})`)();
      
      if (typeof result === 'number' && isFinite(result)) {
        return Math.round(result * 100000) / 100000; // 소수점 5자리까지
      }
      
      return null;
    } catch {
      return null;
    }
  };

  // 사용 빈도 추적을 위한 로컬 스토리지 키
  const CURRENCY_USAGE_KEY = 'currency_usage_history';

  // 통화 사용 빈도 가져오기
  const getCurrencyUsage = (): { [key: string]: number } => {
    try {
      const stored = localStorage.getItem(CURRENCY_USAGE_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  };

  // 통화 사용 빈도 업데이트
  const updateCurrencyUsage = (fromCurrency: string, toCurrency: string) => {
    try {
      const usage = getCurrencyUsage();
      const key = `${fromCurrency}_${toCurrency}`;
      usage[key] = (usage[key] || 0) + 1;
      localStorage.setItem(CURRENCY_USAGE_KEY, JSON.stringify(usage));
    } catch {
      // 로컬 스토리지 오류 무시
    }
  };

  // 확장된 화폐 패턴 및 환율 정보 (국기 포함)
  const currencyPatterns = {
    'KRW': { symbols: ['원', '₩'], name: '한국 원', flag: '🇰🇷' },
    'USD': { symbols: ['달러', '$', 'dollar'], name: '미국 달러', flag: '🇺🇸' },
    'EUR': { symbols: ['유로', '€', 'euro'], name: '유로', flag: '🇪🇺' },
    'JPY': { symbols: ['엔', '¥', 'yen'], name: '일본 엔', flag: '🇯🇵' },
    'CNY': { symbols: ['위안', '¥', 'yuan'], name: '중국 위안', flag: '🇨🇳' },
    'GBP': { symbols: ['파운드', '£', 'pound'], name: '영국 파운드', flag: '🇬🇧' },
    'HUF': { symbols: ['포린트', 'huf'], name: '헝가리 포린트', flag: '🇭🇺' },
    'CZK': { symbols: ['크루나', 'czk'], name: '체코 크루나', flag: '🇨🇿' },
    'PLN': { symbols: ['즐로티', 'zł', 'pln'], name: '폴란드 즐로티', flag: '🇵🇱' }
  };

  // 고정 환율 (실제 API 실패 시 사용할 기본값)
  const fallbackRates: { [key: string]: { [key: string]: number } } = {
    'USD': { 'KRW': 1300, 'EUR': 0.85, 'JPY': 150, 'CNY': 7.2, 'GBP': 0.79, 'HUF': 350, 'CZK': 23, 'PLN': 4.0 },
    'EUR': { 'USD': 1.18, 'KRW': 1530, 'JPY': 176, 'CNY': 8.5, 'GBP': 0.93, 'HUF': 412, 'CZK': 27, 'PLN': 4.7 },
    'KRW': { 'USD': 0.00077, 'EUR': 0.00065, 'JPY': 0.115, 'CNY': 0.0055, 'GBP': 0.00061, 'HUF': 0.27, 'CZK': 0.018, 'PLN': 0.0031 },
    'JPY': { 'USD': 0.0067, 'EUR': 0.0057, 'KRW': 8.7, 'CNY': 0.048, 'GBP': 0.0053, 'HUF': 2.33, 'CZK': 0.15, 'PLN': 0.027 },
    'CNY': { 'USD': 0.139, 'EUR': 0.118, 'KRW': 181, 'JPY': 20.8, 'GBP': 0.11, 'HUF': 48.6, 'CZK': 3.2, 'PLN': 0.56 },
    'GBP': { 'USD': 1.27, 'EUR': 1.08, 'KRW': 1650, 'JPY': 190, 'CNY': 9.1, 'HUF': 443, 'CZK': 29, 'PLN': 5.1 },
    'HUF': { 'USD': 0.0029, 'EUR': 0.0024, 'KRW': 3.7, 'JPY': 0.43, 'CNY': 0.021, 'GBP': 0.0023, 'CZK': 0.066, 'PLN': 0.011 },
    'CZK': { 'USD': 0.043, 'EUR': 0.037, 'KRW': 56, 'JPY': 6.5, 'CNY': 0.31, 'GBP': 0.034, 'HUF': 15.2, 'PLN': 0.17 },
    'PLN': { 'USD': 0.25, 'EUR': 0.21, 'KRW': 325, 'JPY': 37.5, 'CNY': 1.8, 'GBP': 0.20, 'HUF': 87.5, 'CZK': 5.8 }
  };

  // 환율 가져오기 함수 (확장된 통화 지원 및 사용 빈도 추적)
  const getExchangeRates = async (fromCurrency: string, amount: number) => {
    let rates: { [key: string]: number } = {};
    let usingFallback = false;
    
    try {
      // 실제 환율 API 사용 시도
      const response = await fetch(`https://api.exchangerate-api.com/v4/latest/${fromCurrency}`);
      const data = await response.json();
      rates = data.rates || {};
    } catch (error) {
      console.log('실제 환율 API 실패, 고정 환율 사용');
      usingFallback = true;
    }
    
    // API 실패 또는 일부 통화 누락 시 고정 환율 사용
    if (usingFallback || Object.keys(rates).length < 5) {
      rates = fallbackRates[fromCurrency] || {};
      usingFallback = true;
    }
    
    const usage = getCurrencyUsage();
    const suggestions = [];
    
    // 지원되는 모든 통화
    const allCurrencies = ['USD', 'EUR', 'JPY', 'CNY', 'KRW', 'GBP', 'HUF', 'CZK', 'PLN'];
    const targetCurrencies = allCurrencies.filter(c => c !== fromCurrency);
    
    // 사용 빈도와 함께 변환 결과 생성
    const conversions = [];
    for (const toCurrency of targetCurrencies) {
      let rate = rates[toCurrency];
      
      // 환율이 없으면 고정 환율에서 찾기
      if (!rate && fallbackRates[fromCurrency] && fallbackRates[fromCurrency][toCurrency]) {
        rate = fallbackRates[fromCurrency][toCurrency];
      }
      
      if (rate) {
        const convertedAmount = amount * rate;
        const usageKey = `${fromCurrency}_${toCurrency}`;
        const usageCount = usage[usageKey] || 0;
        
        const fromFlag = currencyPatterns[fromCurrency]?.flag || '💱';
        const toFlag = currencyPatterns[toCurrency]?.flag || '💱';
        
        conversions.push({
          toCurrency,
          rate,
          convertedAmount,
          usageCount,
          text: `${fromFlag} ${formatNumber(amount)} ${fromCurrency} → ${toFlag} ${formatNumber(Math.round(convertedAmount * 100) / 100)} ${toCurrency}`,
          result: `${fromFlag} ${formatNumber(amount)} ${fromCurrency} = ${toFlag} ${formatNumber(Math.round(convertedAmount * 100) / 100)} ${toCurrency}`
        });
      }
    }
    
    // 사용 빈도순으로 정렬 후 모든 변환 표시 (최대 8개)
    conversions.sort((a, b) => b.usageCount - a.usageCount);
    const topConversions = conversions.slice(0, 8);
    
    // 제안 형태로 변환
    for (const conversion of topConversions) {
      suggestions.push({
        type: 'currency' as const,
        text: conversion.text,
        result: conversion.result,
        amount,
        fromCurrency,
        toCurrency: conversion.toCurrency,
        rate: conversion.rate
      });
    }
    
    return suggestions;
  };

  // 화폐 감지 함수 (확장된 통화 지원)
  const detectCurrency = (text: string): { amount: number; currency: string } | null => {
    const patterns = [
      /(\d+(?:,\d{3})*(?:\.\d+)?)\s*(원|₩|KRW)/i,
      /(\d+(?:,\d{3})*(?:\.\d+)?)\s*(달러|\$|dollar|USD)/i,
      /(\d+(?:,\d{3})*(?:\.\d+)?)\s*(유로|€|euro|EUR)/i,
      /(\d+(?:,\d{3})*(?:\.\d+)?)\s*(엔|¥|yen|JPY)/i,
      /(\d+(?:,\d{3})*(?:\.\d+)?)\s*(위안|yuan|CNY)/i,
      /(\d+(?:,\d{3})*(?:\.\d+)?)\s*(파운드|£|pound|GBP)/i,
      /(\d+(?:,\d{3})*(?:\.\d+)?)\s*(포린트|HUF)/i,
      /(\d+(?:,\d{3})*(?:\.\d+)?)\s*(크루나|CZK)/i,
      /(\d+(?:,\d{3})*(?:\.\d+)?)\s*(즐로티|zł|PLN)/i,
      /\$(\d+(?:,\d{3})*(?:\.\d+)?)/i,
      /€(\d+(?:,\d{3})*(?:\.\d+)?)/i,
      /¥(\d+(?:,\d{3})*(?:\.\d+)?)/i,
      /£(\d+(?:,\d{3})*(?:\.\d+)?)/i
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        const amount = parseFloat(match[1] || match[2]);
        if (amount > 0) {
          const currencyText = (match[2] || match[1]).toLowerCase();
          
          for (const [code, info] of Object.entries(currencyPatterns)) {
            if (info.symbols.some(symbol => currencyText.includes(symbol.toLowerCase()))) {
              return { amount, currency: code };
            }
          }
        }
      }
    }
    return null;
  };



  // 외국어 감지 함수 (상대방 언어에 맞춰 번역)
  const detectForeignLanguage = (text: string) => {
    const patterns = {
      english: { regex: /^[a-zA-Z\s\.,!?'"]+$/, target: '영어로 번역하기' },
      chinese: { regex: /[\u4e00-\u9fff]/, target: '중국어로 번역하기' },
      japanese: { regex: /[\u3040-\u309f\u30a0-\u30ff]/, target: '일본어로 번역하기' },
      korean: { regex: /[가-힣]/, target: '한국어로 번역하기' }
    };

    // 상대방이 자주 사용하는 언어 감지 (임시로 영어로 설정)
    const preferredLanguage = 'english'; // 실제로는 상대방의 이전 메시지 분석 필요

    for (const [lang, config] of Object.entries(patterns)) {
      if (config.regex.test(text) && text.length > 5 && lang !== preferredLanguage) {
        return {
          type: 'translation' as const,
          text: patterns[preferredLanguage].target,
          result: `번역: ${text}`,
          icon: '🌐',
          category: '번역'
        };
      }
    }
    return null;
  };





  // 기억 회상 기능 - 이전 대화에서 관련 파일이나 메시지 찾기
  const detectMemoryRecall = (text: string) => {
    const memoryPatterns = [
      /지난번|이전에|전에|예전에/i,
      /보낸\s*(파일|표|문서|이미지)/i,
      /공유.*했던/i,
      /올렸던|업로드/i,
      /기억.*나/i
    ];

    for (const pattern of memoryPatterns) {
      if (pattern.test(text)) {
        return {
          type: 'memory_recall' as const,
          text: '이전 대화에서 찾아볼까요?',
          result: `관련 메시지: 2025년 4월 18일에 공유된 파일일까요?`,
          icon: '🧠',
          category: '기억'
        };
      }
    }
    return null;
  };

  // 욕설 감지 함수
  const detectProfanity = (text: string) => {
    const profanityPatterns = [
      /시발|씨발|새끼|병신|개새/i,
      /좆|지랄|염병|엿먹/i,
      /미친놈|미친년|또라이/i,
      /fuck|shit|damn|bitch/i
    ];

    for (const pattern of profanityPatterns) {
      if (pattern.test(text)) {
        return {
          type: 'profanity_warning' as const,
          text: '정말 욕설을 올리시겠어요?',
          result: '메시지 전송을 다시 생각해보세요.',
          icon: '⚠️',
          category: '주의'
        };
      }
    }
    return null;
  };

  // 비즈니스 톤 변환 감지
  const detectBusinessTone = (text: string) => {
    const casualPatterns = [
      /이건\s*좀\s*아닌\s*것\s*같아/i,
      /별로야|안\s*좋아|마음에\s*안\s*들/i,
      /안\s*될\s*것\s*같/i,
      /힘들\s*것\s*같/i,
      /못\s*하겠/i
    ];

    for (const pattern of casualPatterns) {
      if (pattern.test(text)) {
        return {
          type: 'business_tone' as const,
          text: '비즈니스 톤으로 변환할까요?',
          result: '해당 제안에 대해 추가 검토가 필요할 것 같습니다.',
          icon: '💼',
          category: '비즈니스'
        };
      }
    }
    return null;
  };

  // 중복 질문 감지
  const detectDuplicateQuestion = (text: string) => {
    const questionPatterns = [
      /몇\s*개|얼마나|언제|어떻게/i,
      /\?\s*$|궁금/i
    ];

    // 간단한 중복 감지 (실제로는 이전 메시지와 비교 필요)
    for (const pattern of questionPatterns) {
      if (pattern.test(text) && text.length > 5) {
        return {
          type: 'duplicate_question' as const,
          text: '이전에도 같은 질문이 있었습니다. 다시 보여드릴까요?',
          result: '이전 답변 보기 (2025.05.25)',
          icon: '🔄',
          category: '중복 질문'
        };
      }
    }
    return null;
  };

  // 대화 연결 제안
  const detectConversationContinuation = (text: string) => {
    const continuationPatterns = [
      /다음에|나중에|이따가/i,
      /또\s*얘기|다시\s*논의/i,
      /보류|미룰게/i
    ];

    for (const pattern of continuationPatterns) {
      if (pattern.test(text)) {
        return {
          type: 'conversation_continuation' as const,
          text: '리마인드를 설정할까요?',
          result: '지난번 논의하던 "견적 협의" 이어서 진행할까요?',
          icon: '💭',
          category: '대화 연결'
        };
      }
    }
    return null;
  };

  // 시간대 감지 (늦은 시간 메시지)
  const detectLateNightMessage = () => {
    const currentHour = new Date().getHours();
    if (currentHour >= 22 || currentHour <= 6) {
      return {
        type: 'late_night' as const,
        text: '지금은 늦은 시간입니다. 예약 발송으로 아침 8시에 보내시겠어요?',
        result: '예약 발송 설정됨',
        icon: '🌙',
        category: '시간 배려'
      };
    }
    return null;
  };



  // 유튜브 감지 함수
  const detectYoutube = (text: string) => {
    const patterns = [
      /유튜브|youtube|영상.*봤|동영상/i,
      /이.*영상.*봤/i,
      /.*채널.*구독/i
    ];

    for (const pattern of patterns) {
      if (pattern.test(text)) {
        const searchQuery = text.replace(/유튜브|youtube|검색|찾아|보여/gi, '').trim();
        const youtubeSearchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(searchQuery)}`;
        
        return {
          type: 'youtube' as const,
          text: `YouTube에서 "${searchQuery}" 검색`,
          result: `📺 YouTube 검색: ${searchQuery}\n🔗 ${youtubeSearchUrl}`,
          icon: '📺',
          category: '동영상',
          action: () => window.open(youtubeSearchUrl, '_blank')
        };
      }
    }
    return null;
  };

  // 뉴스 감지 함수
  const detectNews = (text: string) => {
    const patterns = [
      /뉴스.*뭐.*있|오늘.*뉴스/i,
      /기사.*봤|신문.*봤/i,
      /뉴스.*요약|요약.*해줘/i
    ];

    for (const pattern of patterns) {
      if (pattern.test(text)) {
        return {
          type: 'news' as const,
          text: '오늘 뉴스 3줄 요약',
          result: `뉴스 요약: ${text}`,
          icon: '📰',
          category: '뉴스'
        };
      }
    }
    return null;
  };

  // 단위 변환 감지 함수
  const detectUnit = (text: string) => {
    const patterns = [
      /(\d+)\s*(마일|mile).*km/i,
      /(\d+)\s*kg.*파운드|pound/i,
      /(\d+)\s*도.*화씨|섭씨/i,
      /(\d+)\s*피트|feet.*미터/i
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        return {
          type: 'unit' as const,
          text: '단위 변환하기',
          result: `단위 변환: ${text}`,
          icon: '📏',
          category: '변환'
        };
      }
    }
    return null;
  };

  // 검색 감지 함수
  const detectSearch = (text: string) => {
    const patterns = [
      /.*가\s*뭐야\?|.*이\s*뭐야\?/i,
      /.*에\s*대해.*알려줘|.*설명.*해줘/i,
      /.*찾아줘|.*검색.*해줘/i
    ];

    for (const pattern of patterns) {
      if (pattern.test(text)) {
        return {
          type: 'search' as const,
          text: '검색하기',
          result: `검색: ${text}`,
          icon: '🔍',
          category: '검색'
        };
      }
    }
    return null;
  };

  // 생일/기념일 감지 함수


  // 미팅/회의 감지 함수


  // 지연 답변 감지 함수
  const detectDelayedResponse = (text: string) => {
    const patterns = [
      /이따가.*알려|나중에.*말해|잠깐만.*기다려/i,
      /곧.*연락|잠시.*후에|금방.*답변/i,
      /확인.*후.*연락|알아보고.*말해/i
    ];

    for (const pattern of patterns) {
      if (pattern.test(text)) {
        return {
          type: 'reminder' as const,
          text: '30분 후 리마인드 설정',
          result: `리마인드: ${text}`,
          icon: '⏰',
          category: '리마인더'
        };
      }
    }
    return null;
  };



  // 질문 감지 및 답변 포맷 제안 함수
  const detectQuestion = (text: string) => {
    const patterns = [
      /.*몇\s*시.*에/i,
      /.*언제.*해/i,
      /.*어디서.*만날/i,
      /.*뭐.*먹을/i,
      /.*어떻게.*생각/i
    ];

    for (const pattern of patterns) {
      if (pattern.test(text)) {
        return {
          type: 'question' as const,
          text: '정중한 답변 포맷 제안',
          result: `답변: ${text}`,
          icon: '❓',
          category: '질문 답변'
        };
      }
    }
    return null;
  };

  // 긴 메시지 요약 감지 함수 (비활성화 - 컨텍스트 메뉴에서 사용)
  const detectLongMessage = (text: string) => {
    // 요약 기능은 메시지 컨텍스트 메뉴에서만 사용
    return null;
  };

  // 의사결정 도우미 감지 함수
  const detectDecision = (text: string) => {
    const patterns = [
      /.*할까.*말까/i,
      /고민.*되|어떻게.*할지/i,
      /선택.*해야|결정.*해야/i,
      /.*vs.*|.*아니면.*/i
    ];

    for (const pattern of patterns) {
      if (pattern.test(text)) {
        return {
          type: 'decision' as const,
          text: '장단점 정리해볼까요?',
          result: `의사결정: ${text}`,
          icon: '⚖️',
          category: '의사결정'
        };
      }
    }
    return null;
  };

  // 카테고리 분류 감지 함수
  const detectCategory = (text: string) => {
    const categories = {
      '계약': /계약|협의|조건|계약서/i,
      '배송': /배송|택배|주문|도착/i,
      '일정': /일정|스케줄|회의|약속/i,
      '업무': /업무|프로젝트|회사|직장/i,
      '개인': /개인.*적|사적.*인|개인.*정보/i
    };

    for (const [category, pattern] of Object.entries(categories)) {
      if (pattern.test(text)) {
        return {
          type: 'category' as const,
          text: `[${category}] 카테고리로 정리할까요?`,
          result: `분류: ${text}`,
          icon: '🏷️',
          category: '분류'
        };
      }
    }
    return null;
  };

  // 주제별 정보 추천 감지 함수
  const detectTopicInfo = (text: string) => {
    const topics = {
      '전기차': /전기차|배터리|충전|테슬라/i,
      '부동산': /부동산|집값|아파트|전세/i,
      '주식': /주식|투자|코스피|증권/i,
      '암호화폐': /비트코인|암호화폐|블록체인/i,
      'IT': /AI|인공지능|개발|프로그래밍/i
    };

    for (const [topic, pattern] of Object.entries(topics)) {
      if (pattern.test(text)) {
        return {
          type: 'topic_info' as const,
          text: `${topic} 관련 최신 정보 찾아볼까요?`,
          result: `정보: ${text}`,
          icon: '📊',
          category: '정보 검색'
        };
      }
    }
    return null;
  };

  // 매너톤 감지 함수
  const detectMannertone = (text: string) => {
    const casualPatterns = [
      /이거\s*왜\s*이렇게\s*늦었어/i,
      /빨리\s*해줘/i,
      /대체\s*뭐\s*하는\s*거야/i,
      /언제까지\s*기다려야/i,
      /진짜\s*답답해/i,
      /또\s*안\s*됐어/i,
      /말이\s*안\s*돼/i,
      /이상하네/i,
      /뭔가\s*이상해/i
    ];

    const businessAlternatives = {
      '이거 왜 이렇게 늦었어요?': '혹시 진행 상황을 다시 확인해주실 수 있을까요?',
      '빨리 해줘요': '가능한 빠른 시일 내에 처리해주시면 감사하겠습니다.',
      '대체 뭐 하는 거예요?': '현재 진행 상황에 대해 설명해주실 수 있나요?',
      '언제까지 기다려야 해요?': '예상 완료 시점을 알려주실 수 있을까요?',
      '진짜 답답해요': '조금 더 구체적인 설명을 부탁드립니다.',
      '또 안 됐어요': '다른 해결 방법이 있는지 검토해볼까요?',
      '말이 안 돼요': '좀 더 자세한 설명이 필요할 것 같습니다.',
      '이상하네요': '확인이 필요한 부분이 있는 것 같습니다.',
      '뭔가 이상해요': '검토가 필요한 사항이 있는 것 같습니다.'
    };

    for (const pattern of casualPatterns) {
      if (pattern.test(text)) {
        const suggestion = Object.values(businessAlternatives)[0];
        return {
          type: 'mannertone' as const,
          text: '비즈니스 톤으로 정중하게 바꿔보시겠어요?',
          result: suggestion,
          icon: '💼',
          category: '매너톤'
        };
      }
    }
    return null;
  };

  // 파일 요청/공유 감지 함수
  const detectFileRequest = (text: string) => {
    const filePatterns = [
      /보고서.*보내줄?\s*수\s*있어/i,
      /파일.*다시.*보내/i,
      /문서.*공유/i,
      /자료.*전달/i,
      /첨부.*파일/i,
      /엑셀.*파일/i,
      /pdf.*보내/i,
      /이미지.*공유/i,
      /사진.*보내/i
    ];

    for (const pattern of filePatterns) {
      if (pattern.test(text)) {
        return {
          type: 'file_request' as const,
          text: '최근 공유된 파일을 다시 보내드릴까요?',
          result: '최근 파일 목록을 확인하겠습니다.',
          icon: '📎',
          category: '파일 공유',
          action: () => {
            // 실제로는 최근 파일 목록을 가져와서 표시
          }
        };
      }
    }
    return null;
  };



  // 주소 감지 함수
  const detectAddress = (text: string) => {
    const patterns = [
      /[가-힣]+시\s*[가-힣]+구\s*[가-힣]+로/i,
      /[가-힣]+동\s*\d+번지/i,
      /[가-힣]+역\s*근처/i,
      /서울|부산|대구|인천|광주|대전|울산|세종/i
    ];

    for (const pattern of patterns) {
      if (pattern.test(text)) {
        return {
          type: 'address' as const,
          text: '지도에서 보기',
          result: `위치: ${text}`,
          icon: '📍',
          category: '위치'
        };
      }
    }
    return null;
  };

  // 언어 감지 함수
  const detectLanguage = (text: string): string => {
    // 한글 감지
    if (/[가-힣]/.test(text)) {
      return 'korean';
    }
    
    // 일본어 감지 (히라가나, 가타카나)
    if (/[ひらがなカタカナ]/.test(text) || /[ぁ-ゔァ-ヴー]/.test(text)) {
      return 'japanese';
    }
    
    // 중국어 감지 (간체/번체)
    if (/[\u4e00-\u9fff]/.test(text)) {
      return 'chinese';
    }
    
    // 스페인어 패턴
    if (/[ñáéíóúü]/i.test(text) || /\b(el|la|es|de|que|y|en|un|con|para|por|como|muy|pero|todo|más|puede|hacer|tiempo|si|donde|estar|hola|gracias|por favor)\b/i.test(text)) {
      return 'spanish';
    }
    
    // 프랑스어 패턴
    if (/[àâäéèêëïîôöùûüÿç]/i.test(text) || /\b(le|la|de|et|à|un|il|être|et|en|avoir|que|pour|dans|ce|son|une|sur|avec|ne|se|pas|tout|plus|pouvoir|par|plus|grand|nouveau|gouvernement|bonjour|merci|s'il vous plaît)\b/i.test(text)) {
      return 'french';
    }
    
    // 독일어 패턴
    if (/[äöüß]/i.test(text) || /\b(der|die|das|und|in|den|von|zu|mit|sich|auf|für|ist|im|dem|nicht|ein|eine|als|auch|es|an|werden|aus|er|hat|dass|sie|nach|wird|bei|einer|um|am|sind|noch|wie|einem|über|einen|so|zum|war|haben|nur|oder|aber|vor|zur|bis|unter|während|hallo|danke|bitte)\b/i.test(text)) {
      return 'german';
    }
    
    // 러시아어 감지
    if (/[а-яё]/i.test(text)) {
      return 'russian';
    }
    
    // 기본값은 영어
    return 'english';
  };

  // 사용자별 언어 히스토리 추적을 위한 상태
  const [userLanguageHistory, setUserLanguageHistory] = useState<{[userId: number]: string[]}>({});

  // 번역 필요성 감지 함수
  const shouldSuggestTranslation = (currentText: string, messages: any[]): { shouldSuggest: boolean; targetLanguage?: string; languageName?: string } => {
    const currentLanguage = detectLanguage(currentText);
    
    // 최근 10개 메시지에서 다른 사용자들의 언어 패턴 분석
    const recentMessages = messages.slice(-10);
    const otherUsersLanguages = new Set<string>();
    
    recentMessages.forEach(msg => {
      if (msg.senderId !== user?.id && msg.messageType === 'text') {
        const msgLanguage = detectLanguage(msg.content);
        otherUsersLanguages.add(msgLanguage);
      }
    });
    
    // 현재 사용자가 쓰는 언어와 다른 언어를 사용하는 사용자가 있는지 확인
    const otherLangsArray = Array.from(otherUsersLanguages);
    for (const otherLang of otherLangsArray) {
      if (otherLang !== currentLanguage) {
        const languageNames: {[key: string]: string} = {
          'korean': '한국어',
          'english': 'English',
          'japanese': '日本語',
          'chinese': '中文',
          'spanish': 'Español',
          'french': 'Français',
          'german': 'Deutsch',
          'russian': 'Русский'
        };
        
        return {
          shouldSuggest: true,
          targetLanguage: otherLang,
          languageName: languageNames[otherLang] || otherLang
        };
      }
    }
    
    return { shouldSuggest: false };
  };

  // 선택지/투표 감지 함수


  // 할 일 감지 함수


  // 타이머 감지 함수
  const detectTimer = (text: string) => {
    const patterns = [
      /(\d+)분\s*(뒤에|후에|있다가)\s*(알려|깨워|알림)/i,
      /(\d+)시간\s*(뒤에|후에|있다가)\s*(알려|깨워|알림)/i,
      /(알림|타이머).*(\d+)(분|시간)/i
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        return {
          type: 'timer' as const,
          text: '타이머 설정하기',
          result: `타이머: ${text}`,
          icon: '⏰',
          category: '타이머'
        };
      }
    }
    return null;
  };

  // 스마트 제안 선택 처리 (YouTube와 리마인더)
  const handleSmartSuggestionSelect = async (suggestion: typeof smartSuggestions[0]) => {
    // 음성 메시지 대기 중인 경우 처리
    if (pendingVoiceMessage) {
      // 타이머 취소
      if (suggestionTimeout) {
        clearTimeout(suggestionTimeout);
        setSuggestionTimeout(null);
      }
      
      if (suggestion.type === 'reminder') {
        // 리마인더 설정 모달 열기
        setReminderText(pendingVoiceMessage.content);
        setShowReminderModal(true);
        
        // 원본 음성메시지 전송
        sendMessageMutation.mutate(pendingVoiceMessage);
      } else {
        // 다른 타입의 제안은 원본 음성메시지만 전송
        sendMessageMutation.mutate(pendingVoiceMessage);
      }
      
      setPendingVoiceMessage(null);
    } else {
      // 일반 텍스트 입력 시 처리
      if (suggestion.type === 'reminder') {
        // 리마인더 설정 모달 열기
        setReminderText(message);
        setShowReminderModal(true);
        setMessage("");
      }
    }
    
    setShowSmartSuggestions(false);
    setSmartSuggestions([]);
  };

  const handleMessageChange = async (value: string) => {
    setMessage(value);
    
    // 입력할 때마다 자동으로 임시 저장
    saveDraftMessage(chatRoomId, value);
    
    // # 태그 감지 및 추천 (모든 언어 지원)
    const hashMatch = value.match(/#([^#\s]*)$/);
    if (hashMatch) {
      const currentTag = hashMatch[1].toLowerCase();
      const filteredTags = storedTags.filter((tag: string) => 
        tag.toLowerCase().includes(currentTag)
      );
      setHashSuggestions(filteredTags);
      setShowHashSuggestions(filteredTags.length > 0);
      setSelectedHashIndex(0); // 선택 인덱스 초기화
      return; // 태그 모드일 때는 다른 로직 실행하지 않음
    } else {
      setShowHashSuggestions(false);
      setHashSuggestions([]);
      setSelectedHashIndex(0);
    }
  };

  // 창 밖 클릭 시 커맨드 창 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showChatCommands || showCommandSuggestions) {
        const chatArea = document.querySelector('.chat-input-area');
        if (chatArea && !chatArea.contains(event.target as Node)) {
          setShowChatCommands(false);
          setShowCommandSuggestions(false);
        }
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowChatCommands(false);
        setShowCommandSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showChatCommands, showCommandSuggestions]);

  const insertHashtag = () => {
    setMessage(prev => prev + '#');
    setShowCommandSuggestions(true);
  };

  // Message context menu handlers - position next to message bubble
  const handleMessageRightClick = (e: React.MouseEvent, message: any) => {
    e.preventDefault();
    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    
    // Position menu to the right of received messages, left of sent messages
    const isOwnMessage = message.senderId === user?.id;
    const x = isOwnMessage ? rect.left - 10 : rect.right + 10;
    const y = rect.top;
    
    setContextMenu({
      visible: true,
      x,
      y,
      message,
    });
  };

  const handleMessageLongPress = (e: React.TouchEvent, message: any) => {
    e.preventDefault();
    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    
    // Position menu to the right of received messages, left of sent messages
    const isOwnMessage = message.senderId === user?.id;
    const x = isOwnMessage ? rect.left - 10 : rect.right + 10;
    const y = rect.top;
    
    setContextMenu({
      visible: true,
      x,
      y,
      message,
    });
  };

  const handleSaveMessage = async () => {
    if (!contextMenu.message || !user) return;

    const message = contextMenu.message;
    
    // 음성 메시지인지 확인
    const isVoiceMessage = message.messageType === 'voice' || 
                          (message.messageType === 'file' && message.fileUrl?.includes('voice_'));
    
    if (isVoiceMessage) {
      // 메시지 발신자 찾기
      const sender = currentChatRoom?.participants?.find((p: any) => p.id === message.senderId);
      
      // 발신자가 음성 북마크를 허용하지 않는 경우 (명시적으로 false인 경우에만)
      if (sender?.allowVoiceBookmarks === false) {
        // 음성 북마크 요청 생성
        try {
          const response = await apiRequest('/api/voice-bookmark-requests', 'POST', {
            messageId: message.id,
            targetUserId: message.senderId
          });

          if (response.ok) {
            console.log(`음성 북마크 요청을 ${sender.displayName}님에게 보냈습니다.`);
            // 요청 목록 새로고침
            queryClient.invalidateQueries({ queryKey: ['/api/voice-bookmark-requests'] });
          }
        } catch (error) {
          console.error('음성 북마크 요청 실패:', error);
        }
        setContextMenu({ ...contextMenu, visible: false });
        return;
      }
    }
    
    // 북마크 타입 결정
    let bookmarkType: 'message' | 'file' | 'voice' = 'message';
    if (isVoiceMessage) {
      bookmarkType = 'voice';
    } else if (message.messageType === 'file') {
      bookmarkType = 'file';
    }
    
    // 북마크 직접 생성
    createBookmarkMutation.mutate({
      messageId: message.id,
      chatRoomId: message.chatRoomId,
      bookmarkType
    });
    
    // 컨텍스트 메뉴 닫기
    setContextMenu({ ...contextMenu, visible: false });
  };

  const handleReplyMessage = () => {
    if (contextMenu.message) {
      setReplyToMessage(contextMenu.message);
    }
  };

  const handleCopyText = () => {
    if (contextMenu.message?.content) {
      navigator.clipboard.writeText(contextMenu.message.content).then(() => {
      }).catch(() => {
      });
    }
  };



  // 메시지 편집 핸들러
  const handleEditMessage = (message: any) => {
    if (message.senderId === user?.id) {
      setEditingMessage(message.id);
      setEditContent(message.content);
      setContextMenu({ ...contextMenu, visible: false });
    }
  };

  // 메시지 편집 저장
  const handleSaveEdit = () => {
    if (editingMessage && editContent.trim()) {
      editMessageMutation.mutate({
        messageId: editingMessage,
        content: editContent.trim()
      });
    }
  };

  // 메시지 편집 취소
  const handleCancelEdit = () => {
    setEditingMessage(null);
    setEditContent("");
  };

  // 욕설 방지 모달 상태
  const [showProfanityModal, setShowProfanityModal] = useState(false);
  const [profanityMessage, setProfanityMessage] = useState("");

  // 욕설 감지 후 메시지 전송 확인
  const handleProfanityConfirm = () => {
    setShowProfanityModal(false);
    // 실제 메시지 전송
    sendMessageMutation.mutate({
      content: profanityMessage,
      messageType: "text",
      replyToMessageId: replyToMessage?.id
    });
    setMessage("");
    setProfanityMessage("");
    setReplyToMessage(null);
  };

  // Adaptive Conversation UI Flow functions
  const analyzeConversationContext = (messages: any[]) => {
    if (!messages || messages.length === 0) return;

    const recentMessages = messages.slice(-10);
    const lastHour = Date.now() - (60 * 60 * 1000);
    const recentActivity = recentMessages.filter(msg => new Date(msg.createdAt).getTime() > lastHour);

    // Detect conversation mode based on content patterns
    const businessKeywords = ['회의', '프로젝트', '일정', '업무', '보고서', '회사', '미팅', '계약', '제안'];
    const supportKeywords = ['문제', '도움', '해결', '오류', '버그', '지원', '문의', '질문'];
    const creativeKeywords = ['아이디어', '창의적', '브레인스토밍', '디자인', '예술', '창작', '영감'];

    const content = recentMessages.map(m => m.content || '').join(' ').toLowerCase();
    
    let detectedMode: 'casual' | 'business' | 'creative' | 'support' = 'casual';
    
    if (businessKeywords.some(keyword => content.includes(keyword))) {
      detectedMode = 'business';
    } else if (supportKeywords.some(keyword => content.includes(keyword))) {
      detectedMode = 'support';
    } else if (creativeKeywords.some(keyword => content.includes(keyword))) {
      detectedMode = 'creative';
    }

    // Detect urgency based on message patterns
    const urgentPatterns = ['긴급', '급한', '즉시', '빨리', '중요', '!!', '!!!'];
    const hasUrgentContent = urgentPatterns.some(pattern => content.includes(pattern));
    const highFrequency = recentActivity.length > 5;

    const urgency = hasUrgentContent || highFrequency ? 'high' : recentActivity.length > 2 ? 'normal' : 'low';

    // Detect message patterns
    const mediaCount = recentMessages.filter(m => m.messageType === 'file' || m.messageType === 'voice').length;
    const textCount = recentMessages.filter(m => m.messageType === 'text').length;
    
    let messagePattern: 'text' | 'media' | 'mixed' = 'text';
    if (mediaCount > textCount) messagePattern = 'media';
    else if (mediaCount > 0 && textCount > 0) messagePattern = 'mixed';

    // Update conversation context
    setConversationContext({
      topic: extractTopicFromMessages(recentMessages),
      urgency,
      participants: currentChatRoom?.participants?.length || 0,
      lastActivity: Date.now(),
      messagePattern
    });

    setConversationMode(detectedMode);
    updateUIAdaptations(detectedMode, urgency, messagePattern);
  };

  const extractTopicFromMessages = (messages: any[]) => {
    // Simple topic extraction based on frequent words
    const words = messages
      .map(m => m.content || '')
      .join(' ')
      .toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 3 && !['그런데', '그리고', '하지만'].includes(word));
    
    const wordCount = words.reduce((acc, word) => {
      acc[word] = (acc[word] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topWord = Object.entries(wordCount)
      .sort(([,a], [,b]) => b - a)[0];
    
    return topWord ? topWord[0] : '';
  };

  const updateUIAdaptations = (mode: string, urgency: string, pattern: string) => {
    const adaptations = {
      showQuickReplies: mode === 'business' || urgency === 'high',
      showActionButtons: mode === 'support' || mode === 'business',
      showMoodIndicator: mode === 'creative' || mode === 'casual',
      showTimeAwareness: urgency === 'high',
      compactMode: pattern === 'media' || urgency === 'high',
      focusMode: mode === 'business' && urgency === 'high'
    };

    setUiAdaptations(adaptations);
    generateAdaptiveActions(mode, urgency);
  };

  const generateAdaptiveActions = (mode: string, urgency: string) => {
    const actions = [];

    if (mode === 'business') {
      actions.push(
        { id: 'schedule', icon: '📅', label: '일정 추가', action: () => setMessage('/일정 ') },
        { id: 'task', icon: '✅', label: '할 일 생성', action: () => setMessage('/할일 ') },
        { id: 'meeting', icon: '🎯', label: '회의 요약', action: () => setMessage('/요약 ') }
      );
    }

    if (mode === 'support') {
      actions.push(
        { id: 'faq', icon: '❓', label: 'FAQ 검색', action: () => setMessage('/검색 ') },
        { id: 'ticket', icon: '🎫', label: '티켓 생성', action: () => setMessage('/티켓 ') },
        { id: 'escalate', icon: '⚡', label: '상급자 호출', action: () => setMessage('@all 도움 필요: ') }
      );
    }

    if (mode === 'creative') {
      actions.push(
        { id: 'brainstorm', icon: '💡', label: '아이디어 생성', action: () => setMessage('/아이디어 ') },
        { id: 'inspire', icon: '✨', label: '영감 찾기', action: () => setMessage('/영감 ') },
        { id: 'moodboard', icon: '🎨', label: '무드보드', action: () => setMessage('/무드보드 ') }
      );
    }

    if (urgency === 'high') {
      actions.unshift(
        { id: 'urgent', icon: '🚨', label: '긴급 알림', action: () => setMessage('@all 🚨 긴급: ') }
      );
    }

    setAdaptiveActions(actions);
  };

  // 멘션 기능 관련 함수들
  const detectMentions = (text: string) => {
    const mentionRegex = /@(\w+)/g;
    const mentions = [];
    let match;
    
    while ((match = mentionRegex.exec(text)) !== null) {
      mentions.push(match[1]);
    }
    
    return mentions;
  };

  const findMentionedUsers = (mentionNames: string[]) => {
    if (!currentChatRoom?.participants) return [];
    
    return currentChatRoom.participants.filter((participant: any) => 
      mentionNames.some(name => 
        participant.username.toLowerCase().includes(name.toLowerCase()) ||
        participant.displayName?.toLowerCase().includes(name.toLowerCase())
      )
    );
  };

  const handleMentionSearch = (query: string, cursorPosition: number) => {
    // @ 문자 이후의 텍스트 찾기
    const beforeCursor = message.substring(0, cursorPosition);
    const mentionMatch = beforeCursor.match(/@(\w*)$/);
    
    if (mentionMatch) {
      const searchTerm = mentionMatch[1].toLowerCase();
      setMentionStart(mentionMatch.index || 0);
      
      if (!currentChatRoom?.participants) {
        setMentionSuggestions([]);
        setShowMentions(false);
        return;
      }

      let suggestions = [];
      
      // @all 옵션 추가 (그룹 채팅인 경우)
      if (currentChatRoom.isGroup && 'all'.includes(searchTerm)) {
        suggestions.push({
          id: 'all',
          username: 'all',
          displayName: '전체 멤버',
          isSpecial: true
        });
      }

      // 사용자 검색
      const userSuggestions = currentChatRoom.participants
        .filter((participant: any) => participant.id !== user?.id) // 자신 제외
        .filter((participant: any) => 
          participant.username.toLowerCase().includes(searchTerm) ||
          participant.displayName?.toLowerCase().includes(searchTerm)
        )
        .slice(0, 5); // 최대 5명까지

      suggestions = [...suggestions, ...userSuggestions];
      
      setMentionSuggestions(suggestions);
      setShowMentions(suggestions.length > 0);
      setSelectedMentionIndex(0);
    } else {
      setShowMentions(false);
      setMentionSuggestions([]);
    }
  };

  const selectMention = (user: any) => {
    if (mentionStart === -1) return;
    
    const beforeMention = message.substring(0, mentionStart);
    const afterMention = message.substring(mentionStart).replace(/@\w*/, `@${user.username} `);
    
    setMessage(beforeMention + afterMention);
    setShowMentions(false);
    setMentionSuggestions([]);
    setMentionStart(-1);
    messageInputRef.current?.focus();
  };

  // 회신 메시지 클릭 시 원본 메시지로 이동
  const scrollToMessage = (messageId: number) => {
    const messageElement = messageRefs.current[messageId];
    if (messageElement) {
      messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      
      // 메시지 강조 효과
      setHighlightedMessageId(messageId);
      setTimeout(() => {
        setHighlightedMessageId(null);
      }, 3000);
    }
  };

  // 길게 터치 이벤트 핸들러
  const handleTouchStart = (e: React.TouchEvent, message: any) => {
    setIsLongPress(false);
    
    // 터치 시작 시점에 element의 위치 정보를 미리 저장
    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    setTouchStartData({ rect, message });
    
    const timer = setTimeout(() => {
      setIsLongPress(true);
      
      // 저장된 위치 정보와 메시지로 메뉴 표시
      const isOwnMessage = message.senderId === user?.id;
      const x = isOwnMessage ? rect.left - 10 : rect.right + 10;
      const y = rect.top;
      
      setContextMenu({
        visible: true,
        x,
        y,
        message
      });
      
      navigator.vibrate?.(50); // 햅틱 피드백
    }, 500); // 500ms 길게 터치
    
    setTouchTimer(timer);
  };

  const handleTouchEnd = () => {
    if (touchTimer) {
      clearTimeout(touchTimer);
      setTouchTimer(null);
    }
    setTouchStartData(null);
    setTimeout(() => setIsLongPress(false), 100);
  };

  const handleTouchMove = () => {
    if (touchTimer) {
      clearTimeout(touchTimer);
      setTouchTimer(null);
    }
    setTouchStartData(null);
  };

  // Sound notification functions
  const playNotificationSound = () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.1, audioContext.currentTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    } catch (error) {
      console.log('알림 소리 재생 실패');
    }
  };

  const playSirenSound = () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator1 = audioContext.createOscillator();
      const oscillator2 = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator1.connect(gainNode);
      oscillator2.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator1.frequency.setValueAtTime(400, audioContext.currentTime);
      oscillator1.frequency.linearRampToValueAtTime(800, audioContext.currentTime + 0.5);
      oscillator1.frequency.linearRampToValueAtTime(400, audioContext.currentTime + 1);
      
      oscillator2.frequency.setValueAtTime(600, audioContext.currentTime);
      oscillator2.frequency.linearRampToValueAtTime(1000, audioContext.currentTime + 0.5);
      oscillator2.frequency.linearRampToValueAtTime(600, audioContext.currentTime + 1);
      
      oscillator1.type = 'sine';
      oscillator2.type = 'sine';
      
      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.15, audioContext.currentTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 1);
      
      oscillator1.start(audioContext.currentTime);
      oscillator2.start(audioContext.currentTime);
      oscillator1.stop(audioContext.currentTime + 1);
      oscillator2.stop(audioContext.currentTime + 1);
    } catch (error) {
      console.log('사이렌 소리 재생 실패');
    }
  };

  // Monitor new messages for notifications
  useEffect(() => {
    if (messages.length > 0 && user) {
      const currentCount = messages.length;
      
      if (lastMessageCount > 0 && currentCount > lastMessageCount) {
        // New message detected
        const newMessages = messages.slice(lastMessageCount);
        
        newMessages.forEach((message: any) => {
          // Don't play sound for own messages
          if (message.senderId !== user.id) {
            // Check if message mentions the current user
            const isMentioned = message.content?.includes(`@${user.username}`) || 
                              message.content?.includes(`@${user.email}`);
            
            if (isMentioned) {
              // Play siren sound for mentions
              setTimeout(() => {
                playSirenSound();
              }, 100);
            } else {
              // Play normal notification for other messages
              setTimeout(() => {
                playNotificationSound();
              }, 100);
            }
          }
        });
      }
      
      setLastMessageCount(currentCount);
    }
  }, [messages, user, lastMessageCount]);

  // Mark messages as read when viewing chat
  useEffect(() => {
    if (messages.length > 0) {
      const latestMessage = messages[messages.length - 1];
      markAsReadMutation.mutate(latestMessage.id);
    }
  }, [messages, chatRoomId]);

  // Close chat settings when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showChatSettings && !(event.target as Element).closest('.relative')) {
        setShowChatSettings(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showChatSettings]);;

  const selectCommand = (commandName: string) => {
    setMessage(`#${commandName}`);
    setShowCommandSuggestions(false);
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(word => word.charAt(0).toUpperCase()).join('').slice(0, 2);
  };

  // 파일 타입별 아이콘 반환 함수
  const getFileIcon = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'pdf':
        return <FileText className="h-8 w-8 text-red-500" />;
      case 'doc':
      case 'docx':
        return <FileText className="h-8 w-8 text-blue-600" />;
      case 'xls':
      case 'xlsx':
        return <FileSpreadsheet className="h-8 w-8 text-green-600" />;
      case 'ppt':
      case 'pptx':
        return <FileText className="h-8 w-8 text-orange-500" />;
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
      case 'bmp':
      case 'webp':
        return <FileImage className="h-8 w-8 text-purple-500" />;
      case 'mp4':
      case 'avi':
      case 'mov':
      case 'wmv':
        return <Video className="h-8 w-8 text-pink-500" />;
      default:
        return <File className="h-8 w-8 text-gray-500" />;
    }
  };

  // 링크 감지 및 클릭 가능하게 만드는 함수
  const renderMessageWithLinks = (content: string | null | undefined) => {
    if (!content) return null;
    // Combined regex for URLs and mentions
    const combinedRegex = /(https?:\/\/[^\s]+)|(@\w+)/g;
    const parts = content.split(combinedRegex);
    
    return parts.map((part, index) => {
      if (!part) return null;
      
      // Check if it's a URL
      if (/https?:\/\/[^\s]+/.test(part)) {
        return (
          <a
            key={index}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:text-blue-700 underline break-all"
            onClick={(e) => e.stopPropagation()}
          >
            {part}
          </a>
        );
      }
      
      // Check if it's a mention
      if (/@\w+/.test(part)) {
        const username = part.slice(1); // Remove @ symbol
        const isCurrentUser = username === user?.username;
        const isMentionAll = username === 'all';
        
        return (
          <span
            key={index}
            className={`font-medium px-1 py-0.5 rounded cursor-pointer transition-colors ${
              isCurrentUser 
                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 hover:bg-blue-200' 
                : isMentionAll
                ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 hover:bg-purple-200'
                : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200'
            }`}
            onClick={(e) => {
              e.stopPropagation();
              if (!isMentionAll && username !== user?.username) {
                // Navigate to user profile
                console.log(`Navigate to @${username} profile`);
              }
            }}
          >
            {part}
          </span>
        );
      }
      
      return part;
    }).filter(Boolean);
  };

  // 검색 기능
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    const results = messages.filter((message: any) => 
      message.content?.toLowerCase().includes(query.toLowerCase()) ||
      message.fileName?.toLowerCase().includes(query.toLowerCase())
    );
    setSearchResults(results);
    setCurrentSearchIndex(0);
  };



  // Check if other participants are friends when entering chat room
  useEffect(() => {
    if (currentChatRoom && contactsData && user && !friendModalDismissed) {
      const otherParticipants = currentChatRoom.participants?.filter((p: any) => p.id !== user.id) || [];
      const contacts = contactsData.contacts || [];
      
      // 친구가 아닌 모든 참가자 찾기
      const nonFriends = otherParticipants.filter((participant: any) => {
        return !contacts.some((contact: any) => contact.contactUserId === participant.id);
      });
      
      if (nonFriends.length > 0) {
        setNonFriendUsers(nonFriends);
        setShowAddFriendModal(true);
      }
    }
  }, [currentChatRoom, contactsData, user, friendModalDismissed]);

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('ko-KR', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false
    });
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <div className="text-gray-500">메시지를 불러오는 중...</div>
      </div>
    );
  }

  if (!currentChatRoom) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <div className="text-gray-500">채팅방을 찾을 수 없습니다</div>
      </div>
    );
  }



  return (
    <div 
      ref={chatAreaRef}
      data-chat-area="true"
      className={cn(
        "h-full flex flex-col relative mb-0 pb-0 animate-slide-in-left",
        isDragOver ? 'bg-purple-50' : ''
      )}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >

      
      {/* Drag Overlay */}
      {isDragOver && (
        <div className="absolute inset-0 bg-purple-100 bg-opacity-80 border-2 border-dashed border-purple-400 z-50 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-purple-500 rounded-full flex items-center justify-center">
              <Upload className="h-8 w-8 text-white" />
            </div>
            <p className="text-lg font-medium text-purple-600">파일을 여기에 드롭하세요</p>
            <p className="text-sm text-purple-500 mt-1">파일을 놓으면 자동으로 업로드됩니다</p>
          </div>
        </div>
      )}

      {/* Voice Processing Overlay */}
      {isProcessingVoice && (
        <div className="absolute inset-0 bg-white bg-opacity-95 z-50 flex items-center justify-center backdrop-blur-sm">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-purple-500 rounded-full flex items-center justify-center animate-pulse">
              <Mic className="h-8 w-8 text-white" />
            </div>
            <p className="text-lg font-medium text-purple-600">음성을 처리하고 있습니다...</p>
            <p className="text-sm text-purple-500 mt-1">잠시만 기다려 주세요</p>
          </div>
        </div>
      )}

      {/* Clean Chat Header */}
      <div className={cn(
        "flex-shrink-0 sticky top-0 z-10 bg-white border-b border-slate-200",
        showMobileHeader ? "px-4 py-3" : "px-6 py-4"
      )}>
        <div className="flex items-center justify-between min-h-0">
          <div className="flex items-center flex-1 min-w-0 space-x-2">
            {showMobileHeader && onBackClick && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onBackClick}
                className="p-2 -ml-1 lg:hidden flex-shrink-0 hover:bg-gray-100 rounded-full transition-colors"
              >
                <svg 
                  width="20" 
                  height="20" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                  className="text-gray-700"
                >
                  <path d="m15 18-6-6 6-6"/>
                </svg>
              </Button>
            )}
            {currentChatRoom.isGroup ? (
              <div className={cn(
                "relative flex items-center justify-center flex-shrink-0",
                showMobileHeader ? "w-8 h-8" : "w-10 h-10"
              )}>
                {currentChatRoom.participants.slice(0, Math.min(5, currentChatRoom.participants.length)).map((participant: any, index: number) => {
                  const totalAvatars = Math.min(5, currentChatRoom.participants.length);
                  const isStackLayout = totalAvatars <= 3;
                  const avatarSize = showMobileHeader ? "w-6 h-6" : "w-7 h-7";
                  
                  if (isStackLayout) {
                    return (
                      <div
                        key={participant.id}
                        className={cn(
                          "rounded-full border-2 border-white shadow-sm bg-slate-500 flex items-center justify-center text-white font-medium",
                          avatarSize,
                          showMobileHeader ? "text-[10px]" : "text-xs",
                          index > 0 ? "-ml-1" : ""
                        )}
                        style={{ zIndex: totalAvatars - index }}
                      >
                        <InstantAvatar 
                          src={participant.profilePicture}
                          alt={participant.displayName}
                          fallbackText={participant.displayName}
                          size="sm"
                          className="w-full h-full"
                        />
                      </div>
                    );
                  } else {
                    const positions = [
                      'top-0 left-0',
                      'top-0 right-0', 
                      'bottom-0 left-0',
                      'bottom-0 right-0',
                      'top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10'
                    ];
                    
                    return (
                      <div
                        key={participant.id}
                        className={cn(
                          "absolute rounded-full border border-white shadow-sm purple-gradient flex items-center justify-center text-white font-semibold text-[8px]",
                          showMobileHeader ? "w-4 h-4" : "w-5 h-5",
                          positions[index]
                        )}
                      >
                        <InstantAvatar 
                          src={participant.profilePicture}
                          alt={participant.displayName}
                          fallbackText={participant.displayName}
                          size="sm"
                          className="w-full h-full"
                        />
                      </div>
                    );
                  }
                })}
              </div>
            ) : (
              <InstantAvatar
                src={currentChatRoom.participants?.find((p: any) => p.id !== user?.id)?.profilePicture}
                alt={chatRoomDisplayName}
                fallbackText={chatRoomDisplayName}
                size={showMobileHeader ? "sm" : "md"}
                className={cn(
                  "flex-shrink-0",
                  showMobileHeader ? "w-8 h-8" : "w-10 h-10"
                )}
                data-testid="avatar-chat-header"
              />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-1 min-w-0">
                <h3 className={cn(
                  "font-semibold truncate flex-1 min-w-0 flex items-center space-x-2",
                  showMobileHeader ? "text-base" : "text-lg",
                  // 주변챗용 특별한 색상
                  isLocationChatRoom ? "text-blue-700" : "text-gray-900"
                )}
                title={chatRoomDisplayName}
                >
                  {!currentChatRoom.isGroup && currentChatRoom.participants.length === 2 ? (
                    <Link 
                      href={`/profile/${currentChatRoom.participants.find((p: any) => p.id !== user?.id)?.id || ''}`}
                      className="truncate font-bold hover:text-purple-600 transition-colors cursor-pointer"
                      data-testid="link-profile"
                    >
                      {chatRoomDisplayName}
                    </Link>
                  ) : currentChatRoom.isGroup ? (
                    <Link 
                      href={`/group-info/${chatRoomId}`}
                      className="truncate font-bold hover:text-purple-600 transition-colors cursor-pointer"
                      data-testid="link-group-info"
                    >
                      {chatRoomDisplayName}
                    </Link>
                  ) : (
                    <span className="truncate font-bold">{chatRoomDisplayName}</span>
                  )}
                  {isLocationChatRoom && (
                    <span className="flex-shrink-0 text-blue-600 text-lg" title="주변챗">
                      📍
                    </span>
                  )}
                </h3>
                
                {/* Compact Indicators for Mobile */}
                <div className="flex items-center space-x-1 flex-shrink-0">
                  {conversationMode !== 'casual' && (
                    <span className={cn(
                      "px-1.5 py-0.5 rounded-full text-[10px] font-medium flex-shrink-0",
                      showMobileHeader && "px-1 py-0.5",
                      conversationMode === 'business' && "bg-blue-100 text-blue-800",
                      conversationMode === 'support' && "bg-orange-100 text-orange-800", 
                      conversationMode === 'creative' && "bg-purple-100 text-purple-800"
                    )}>
                      {conversationMode === 'business' && (showMobileHeader ? '💼' : '💼 업무')}
                      {conversationMode === 'support' && (showMobileHeader ? '🆘' : '🆘 지원')}
                      {conversationMode === 'creative' && (showMobileHeader ? '🎨' : '🎨 창작')}
                    </span>
                  )}

                  {conversationContext.urgency === 'high' && uiAdaptations.showTimeAwareness && (
                    <span className="px-1 py-0.5 rounded-full text-[10px] font-medium bg-red-100 text-red-800 animate-pulse flex-shrink-0">
                      🚨
                    </span>
                  )}
                </div>
              </div>
              
              {!showMobileHeader && (
                <div className="flex items-center space-x-2 mt-0.5">
                  <p className="text-xs text-gray-500">
                    {currentChatRoom.participants?.length}명 참여
                  </p>
                  
                  {conversationContext.topic && (
                    <span className="text-xs text-gray-400 truncate">
                      주제: {conversationContext.topic}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {!isLocationChatRoom && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-gray-400 hover:text-purple-600"
                onClick={() => setShowSearch(!showSearch)}
                data-testid="button-search"
              >
                <Search className="h-4 w-4" />
              </Button>
            )}

            {/* 주변챗용 특별한 정보 버튼 */}
            {isLocationChatRoom ? (
              <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700">
                <MapPin className="h-4 w-4" />
              </Button>
            ) : (
              <Button variant="ghost" size="sm" className="text-gray-400 hover:text-purple-600">
                <Info className="h-4 w-4" />
              </Button>
            )}
            <div className="relative">
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-gray-400 hover:text-purple-600"
                onClick={() => setShowChatSettings(!showChatSettings)}
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
              
              {/* Chat Settings Dropdown */}
              {showChatSettings && (
                <div ref={chatSettingsRef} className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 w-56">
                  <div className="py-1">
                    {/* 음성 재생 허용 설정 */}
                    <div className="px-4 py-2 border-b border-gray-100">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-gray-700">음성 재생 허용</span>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={user?.allowVoicePlayback !== false}
                            onChange={async (e) => {
                              try {
                                const response = await fetch('/api/auth/voice-settings', {
                                  method: 'PATCH',
                                  headers: {
                                    'Content-Type': 'application/json',
                                    'x-user-id': user!.id.toString()
                                  },
                                  body: JSON.stringify({
                                    allowVoicePlayback: e.target.checked
                                  })
                                });
                                
                                if (response.ok) {
                                  queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
                                }
                              } catch (error) {
                              }
                            }}
                            className="sr-only"
                          />
                          <div className="w-9 h-5 bg-gray-200 rounded-full peer peer-checked:bg-purple-600 peer-focus:ring-2 peer-focus:ring-purple-300 transition-colors">
                            <div className="w-4 h-4 bg-white rounded-full shadow transform peer-checked:translate-x-4 transition-transform absolute top-0.5 left-0.5"></div>
                          </div>
                        </label>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {user?.allowVoicePlayback !== false 
                          ? "다른 사용자가 내 음성을 재생할 수 있습니다" 
                          : "내 음성은 텍스트로만 표시됩니다"}
                      </p>
                    </div>

                    <button
                      onClick={() => {
                        setShowChatSettings(false);
                        if (window.confirm('정말로 이 채팅방을 나가시겠습니까?')) {
                          leaveChatRoomMutation.mutate();
                        }
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2"
                    >
                      <LogOut className="h-4 w-4" />
                      <span>채팅방 나가기</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Search Bar */}
        {showSearch && (
          <div className="px-4 py-2 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center space-x-2">
              <Input
                type="text"
                placeholder="메시지 검색..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="flex-1"
              />
              {searchResults.length > 0 && (
                <div className="flex items-center space-x-1 text-sm text-gray-500">
                  <span>{currentSearchIndex + 1}/{searchResults.length}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const newIndex = Math.max(0, currentSearchIndex - 1);
                      setCurrentSearchIndex(newIndex);
                      scrollToMessage(searchResults[newIndex].id);
                    }}
                    disabled={currentSearchIndex === 0}
                  >
                    ↑
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const newIndex = Math.min(searchResults.length - 1, currentSearchIndex + 1);
                      setCurrentSearchIndex(newIndex);
                      scrollToMessage(searchResults[newIndex].id);
                    }}
                    disabled={currentSearchIndex === searchResults.length - 1}
                  >
                    ↓
                  </Button>
                </div>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowSearch(false);
                  setSearchQuery("");
                  setSearchResults([]);
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Active Poll Banner */}
      {activePoll && (
        <div className="px-4 py-2 border-b border-gray-200 bg-white">
          <PollBanner
            pollData={activePoll}
            voteResults={pollVotes}
            totalParticipants={currentChatRoom?.participants?.length || 1}
            userVote={userVote}
            onClick={() => setShowPollDetailModal(true)}
          />
        </div>
      )}

      {/* Voice Bookmark Request Banners */}
      {voiceBookmarkRequestsData?.requests && voiceBookmarkRequestsData.requests.length > 0 && (
        <div className="border-b border-gray-200">
          {voiceBookmarkRequestsData.requests
            .filter((request: any) => {
              // Filter requests for this chat room
              const message = messages.find(m => m.id === request.messageId);
              return message && message.chatRoomId === chatRoomId;
            })
            .map((request: any) => {
              const isIncoming = request.targetUserId === user?.id; // 내가 받은 요청
              const isOutgoing = request.requesterId === user?.id; // 내가 보낸 요청
              
              if (!isIncoming && !isOutgoing) return null;
              
              if (isIncoming && request.status === 'pending') {
                // 내가 받은 보류 중인 요청
                const requester = currentChatRoom?.participants?.find((p: any) => p.id === request.requesterId);
                return (
                  <div 
                    key={request.id}
                    className="px-4 py-3 bg-blue-50 border-b border-blue-200"
                    data-testid="banner-voice-bookmark-request-incoming"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Bell className="w-4 h-4 text-blue-600" />
                        <span className="text-sm text-blue-900 font-medium">
                          {requester?.displayName || '사용자'}님이 음성 메시지를 북마크하고 싶어합니다
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="bg-white hover:bg-green-50 text-green-700 border-green-300"
                          onClick={() => handleVoiceBookmarkRequest.mutate({ requestId: request.id, action: 'approved' })}
                          disabled={handleVoiceBookmarkRequest.isPending}
                          data-testid="button-approve-voice-bookmark"
                        >
                          승인
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="bg-white hover:bg-red-50 text-red-700 border-red-300"
                          onClick={() => handleVoiceBookmarkRequest.mutate({ requestId: request.id, action: 'rejected' })}
                          disabled={handleVoiceBookmarkRequest.isPending}
                          data-testid="button-reject-voice-bookmark"
                        >
                          거부
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              } else if (isOutgoing && request.status === 'pending') {
                // 내가 보낸 보류 중인 요청
                const targetUser = currentChatRoom?.participants?.find((p: any) => p.id === request.targetUserId);
                return (
                  <div 
                    key={request.id}
                    className="px-4 py-3 bg-yellow-50 border-b border-yellow-200"
                    data-testid="banner-voice-bookmark-request-outgoing"
                  >
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                      <span className="text-sm text-yellow-900 font-medium">
                        {targetUser?.displayName || '사용자'}님에게 음성 북마크 요청 대기 중...
                      </span>
                    </div>
                  </div>
                );
              }
              return null;
            })}
        </div>
      )}

      {/* Chat Messages */}
      <div 
        id="chat-messages-area"
        ref={chatScrollRef}
        className="flex-1 overflow-y-auto overflow-x-hidden pl-1.5 pr-3 py-2 space-y-0.5 min-h-0 overscroll-behavior-y-contain overscroll-behavior-x-none pb-32 scrollbar-thin scrollbar-thumb-purple-300 scrollbar-track-gray-100 relative w-full"
        style={{ wordBreak: 'break-word' }}
        onScroll={handleScroll}
        tabIndex={0}
      >
        {/* Security Notice - WhatsApp Style */}
        <div className="flex justify-center mb-2 px-2">
          <div className="bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-200 rounded-lg px-2 py-1 max-w-sm mx-auto shadow-sm transition-all duration-200 backdrop-blur-sm">
            <div className="flex items-center justify-center space-x-2">
              <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse shadow-sm"></div>
              <p className="text-xs text-yellow-800 text-center font-semibold">
                🔒 메시지와 파일이 종단간 암호화됩니다
              </p>
              <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse shadow-sm"></div>
            </div>
            <p className="text-xs text-yellow-700 text-center mt-1 opacity-90 font-medium">
              Dovie Messenger에서만 확인할 수 있습니다
            </p>
          </div>
        </div>

        {isLoading && !messages.length ? (
          // 캐시된 메시지가 없을 때만 로딩 스켈레톤 표시
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-start space-x-3">
                <div className="w-10 h-10 bg-gray-200 rounded-full animate-pulse"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded animate-pulse w-1/4"></div>
                  <div className="h-16 bg-gray-200 rounded-lg animate-pulse w-3/4"></div>
                </div>
              </div>
            ))}
          </div>
        ) : !messages || messages.length === 0 ? (
          <div className="text-center text-gray-500 mt-8">
            {messagesData ? "대화를 시작해보세요!" : "메시지를 불러오는 중..."}
          </div>
        ) : (
          <>
            {messages.map((msg: any, index: number) => {
            const isMe = msg.senderId === user?.id;
            const showDate = index === 0 || 
              new Date(messages[index - 1].createdAt).toDateString() !== new Date(msg.createdAt).toDateString();
            const isFirstUnread = firstUnreadMessageId === msg.id;

            return (
              <div key={msg.id}>
                {showDate && (
                  <div className="flex items-center justify-center mb-4">
                    <span className="bg-white px-4 py-2 rounded-full text-xs text-gray-500 shadow-sm border">
                      {new Date(msg.createdAt).toLocaleDateString('ko-KR')}
                    </span>
                  </div>
                )}
                
                {/* 읽지 않은 메시지 시작 표시 */}
                {isFirstUnread && (
                  <div className="flex items-center justify-center my-4">
                    <div className="flex-1 h-px bg-gradient-to-r from-transparent via-blue-300 to-transparent"></div>
                    <span className="bg-blue-500 text-white px-4 py-1 rounded-full text-xs font-medium shadow-md mx-4">
                      여기까지 읽으셨습니다
                    </span>
                    <div className="flex-1 h-px bg-gradient-to-r from-transparent via-blue-300 to-transparent"></div>
                  </div>
                )}
                
                <div className={cn("flex w-full", isMe ? "justify-end" : "justify-start")}>
                  <div 
                    id={`message-${msg.id}`}
                    ref={(el) => messageRefs.current[msg.id] = el}
                    className={cn(
                      "flex items-end mb-2 transition-all duration-500 group max-w-[92%]",
                      isMe ? "space-x-0 flex-row-reverse space-x-reverse" : "space-x-2",
                      highlightedMessageId === msg.id && "bg-yellow-100/50 rounded-xl p-2 -mx-2"
                    )}
                  >
                  <div className="flex flex-col items-center flex-shrink-0">
                    {isLocationChatRoom ? (
                      // 주변챗에서는 임시 프로필 표시
                      <div className="w-8 h-8 rounded-full border-2 border-white shadow-lg ring-2 ring-white/50 group-hover:scale-105 transition-transform duration-200">
                        {isMe && locationChatProfile?.profileImageUrl ? (
                          <img 
                            src={locationChatProfile.profileImageUrl} 
                            alt="프로필" 
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : !isMe && msg.locationProfile?.profileImageUrl ? (
                          <img 
                            src={msg.locationProfile.profileImageUrl} 
                            alt="프로필" 
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          <div className={`w-full h-full rounded-full bg-gradient-to-br ${getAvatarColor(isMe ? (locationChatProfile?.nickname || "나") : (msg.locationProfile?.nickname || msg.sender.displayName))} flex items-center justify-center text-white text-xs font-bold shadow-inner`}>
                            {(isMe ? (locationChatProfile?.nickname || "나") : (msg.locationProfile?.nickname || msg.sender.displayName)).charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                    ) : (
                      // 일반 채팅에서는 원래 프로필 표시 - 컴팩트하게
                      <div className="w-8 h-8 rounded-full shadow-lg ring-2 ring-white/50 group-hover:scale-105 transition-transform duration-200 overflow-hidden">
                        <InstantAvatar 
                          src={isMe ? user?.profilePicture : msg.sender?.profilePicture}
                          alt={isMe ? (user?.displayName || "Me") : msg.sender.displayName}
                          fallbackText={isMe ? (user?.displayName || "Me") : msg.sender.displayName}
                          size="sm" 
                          className={`w-full h-full bg-gradient-to-br ${getAvatarColor(isMe ? (user?.displayName || "Me") : msg.sender.displayName)} text-xs font-bold shadow-inner`}
                        />
                      </div>
                    )}
                  </div>
                  
                  <div className={cn(
                    "flex flex-col",
                    "",
                    isMe ? "items-end" : "items-start",
                    "min-w-0 break-words"
                  )}>
                    {!isMe && (
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="text-xs font-semibold text-gray-700">
                          {isLocationChatRoom 
                            ? (msg.locationProfile?.nickname || msg.sender.displayName)
                            : msg.sender.displayName
                          }
                        </span>
                        <span className="text-xs text-gray-400 font-medium">
                          {formatTime(msg.createdAt)}
                        </span>
                      </div>
                    )}
                    
                    {isMe && (
                      <div className="flex items-center space-x-2 mb-0.5">
                        <span className="text-xs text-gray-400 font-medium">
                          {formatTime(msg.createdAt)}
                        </span>
                      </div>
                    )}

                    <GestureQuickReply
                      messageId={msg.id}
                      onQuickReply={handleQuickReply}
                      onSwipeReply={handleSwipeReply}
                    >
                      <div 
                        className={cn(
                          "rounded-2xl px-3 py-2 w-fit break-words cursor-pointer select-none relative overflow-hidden",
                          // Enhanced shadows and modern design
                          // 시스템 메시지 (리마인더)는 해시태그 회상과 같은 스타일 적용
                          msg.isSystemMessage
                            ? "bg-gradient-to-br from-teal-50 to-cyan-50 text-teal-900 shadow-md border border-teal-200/50 backdrop-blur-sm"
                            : msg.isCommandRecall && msg.isLocalOnly
                              ? isMe 
                                ? "bg-gradient-to-br from-teal-500 to-teal-600 text-white shadow-lg shadow-teal-500/25 border border-teal-400/30 rounded-tr-md backdrop-blur-sm" 
                                : "bg-gradient-to-br from-teal-50 to-cyan-50 text-teal-900 shadow-md border border-teal-200/50 rounded-tl-md backdrop-blur-sm"
                              : isMe 
                                ? "bg-gradient-to-br from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-500/25 rounded-tr-md backdrop-blur-sm hover:shadow-xl hover:shadow-purple-500/30 transition-all duration-300" 
                                : "bg-gradient-to-br from-white to-gray-50 text-gray-900 shadow-md shadow-gray-200/50 border border-gray-200/80 rounded-tl-md backdrop-blur-sm hover:shadow-lg hover:shadow-gray-300/40 transition-all duration-300"
                        )}
                        style={{ 
                          userSelect: 'none',
                          WebkitUserSelect: 'none',
                          MozUserSelect: 'none',
                          msUserSelect: 'none',
                        WebkitTouchCallout: 'none'
                      }}
                      onContextMenu={(e) => handleMessageRightClick(e, msg)}
                      onTouchStart={(e) => {
                        const target = e.target as HTMLElement;
                        
                        // 실제 버튼이나 링크를 직접 터치한 경우만 차단
                        if (target.tagName === 'BUTTON' || target.tagName === 'A' || target.closest('.reaction-buttons')) {
                          return;
                        }
                        
                        handleTouchStart(e, msg);
                      }}
                      onTouchEnd={(e) => {
                        const target = e.target as HTMLElement;
                        
                        // 실제 버튼이나 링크를 직접 터치한 경우만 차단
                        if (target.tagName === 'BUTTON' || target.tagName === 'A' || target.closest('.reaction-buttons')) {
                          return;
                        }
                        
                        handleTouchEnd();
                      }}
                      onTouchMove={(e) => {
                        handleTouchMove();
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        // 길게 터치가 아닌 경우에만 일반 클릭 동작
                        if (!isLongPress) {
                          // 일반 클릭 시 아무 동작 안함 (메뉴 열리지 않음)
                        }
                      }}
                    >
                      {/* 회신 메시지 표시 - 개선된 UI */}
                      {msg.replyToMessageId && (
                        <div 
                          className={cn(
                            "reply-area mb-1 p-1 border-l-3 rounded-r-lg cursor-pointer transition-all duration-200 hover:shadow-md select-auto",
                            isMe 
                              ? "border-white bg-white/20 hover:bg-white/30 backdrop-blur-sm" 
                              : "border-purple-500 bg-gradient-to-r from-purple-50 to-blue-50 hover:from-purple-100 hover:to-blue-100 shadow-sm"
                          )}
                          style={{ 
                            userSelect: 'auto',
                            WebkitUserSelect: 'auto',
                            MozUserSelect: 'auto',
                            msUserSelect: 'auto',
                            WebkitTouchCallout: 'default'
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            scrollToMessage(msg.replyToMessageId);
                          }}
                        >
                          <div className="flex items-center space-x-2 mb-2">
                            <Reply className={cn(
                              "h-4 w-4",
                              isMe ? "text-white" : "text-purple-600"
                            )} />
                            <span className={cn(
                              "text-sm font-semibold",
                              isMe ? "text-white" : "text-purple-700"
                            )}>
                              {msg.replyToSender || "사용자"}
                            </span>
                            <span className={cn(
                              "text-xs px-2 py-0.5 rounded-full",
                              isMe ? "bg-white/30 text-white" : "bg-purple-100 text-purple-600"
                            )}>
                              회신
                            </span>
                          </div>
                          
                          {/* 원본 메시지 내용 - 타입별 렌더링 */}
                          {(() => {
                            // 원본 메시지 찾기
                            const originalMessage = messages.find(m => m.id === msg.replyToMessageId);
                            const replyContent = msg.replyToContent || originalMessage?.content || "원본 메시지";
                            
                            // 음성 메시지인 경우 - 컴팩트한 디스플레이
                            if (originalMessage?.messageType === 'voice' || replyContent.includes('🎵') || replyContent.includes('음성 메시지')) {
                              // 원본 음성 메시지의 텍스트 내용만 표시
                              const voiceMessageText = originalMessage?.content || replyContent;
                              const displayText = voiceMessageText && voiceMessageText !== '음성 메시지' && !voiceMessageText.includes('🎵')
                                ? voiceMessageText.length > 60 
                                  ? voiceMessageText.substring(0, 60) + "..." 
                                  : voiceMessageText
                                : "음성 메시지";
                              
                              return (
                                <p className={cn(
                                  "text-sm leading-relaxed max-w-[250px]",
                                  isMe ? "text-white/90" : "text-gray-700"
                                )}>
                                  {displayText}
                                </p>
                              );
                            }
                            
                            // 파일 메시지인 경우
                            if (replyContent.includes('📎') || replyContent.includes('파일')) {
                              return (
                                <div className="flex items-center space-x-2">
                                  <FileText className={cn(
                                    "h-4 w-4",
                                    isMe ? "text-white/80" : "text-gray-600"
                                  )} />
                                  <p className={cn(
                                    "text-sm truncate max-w-[200px]",
                                    isMe ? "text-white/90" : "text-gray-700"
                                  )}>
                                    {replyContent}
                                  </p>
                                </div>
                              );
                            }
                            
                            // 일반 텍스트 메시지
                            const truncatedContent = replyContent.length > 50 
                              ? replyContent.substring(0, 50) + "..." 
                              : replyContent;
                            return (
                              <p className={cn(
                                "text-sm leading-relaxed max-w-[250px]",
                                isMe ? "text-white/90" : "text-gray-700"
                              )}>
                                {truncatedContent}
                              </p>
                            );
                          })()}
                        </div>
                      )}
                      
                      {msg.messageType === "voice" ? (
                        <div className="flex items-center space-x-3 min-w-0">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleVoicePlayback(msg.id, msg.fileUrl, msg.voiceDuration, msg.senderId);
                            }}
                            className={cn(
                              "clickable w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-105 select-auto flex-shrink-0 shadow-sm",
                              isMe ? "bg-white/20 hover:bg-white/30" : "bg-purple-100 hover:bg-purple-200"
                            )}
                            style={{ 
                              userSelect: 'auto',
                              WebkitUserSelect: 'auto',
                              MozUserSelect: 'auto',
                              msUserSelect: 'auto',
                              WebkitTouchCallout: 'default'
                            }}
                          >
                            {playingAudio === msg.id ? (
                              <Pause className={cn(
                                "h-5 w-5",
                                isMe ? "text-white" : "text-purple-600"
                              )} />
                            ) : (
                              <Play className={cn(
                                "h-5 w-5",
                                isMe ? "text-white" : "text-purple-600"
                              )} />
                            )}
                          </button>
                          
                          {/* 오디오 파형 그래프 영역 */}
                          <div className="flex-1 min-w-0 max-w-xs">
                            {/* 음성 라벨을 우측 상단에 배치 */}
                            <div className="flex items-center justify-end space-x-1 mb-1">
                              <div className={cn(
                                "px-1.5 py-0.5 rounded-full text-xs font-medium",
                                isMe ? "bg-white/20 text-white" : "bg-purple-100 text-purple-600"
                              )}>
                                음성
                              </div>
                              {msg.voiceDuration && (
                                <span className={cn(
                                  "text-xs px-1.5 py-0.5 rounded-full",
                                  isMe ? "bg-white/20 text-white/70" : "bg-gray-100 text-gray-500"
                                )}>
                                  {msg.voiceDuration}초
                                </span>
                              )}
                            </div>
                            
                            {/* 컴팩트한 정적 오디오 파형 */}
                            <div className="flex items-center space-x-0.5 h-2 mb-1">
                              {(() => {
                                // 정적 파형 (15개 막대, 더 컴팩트)
                                const staticHeights = [0.3, 0.6, 0.4, 0.8, 0.3, 0.7, 0.5, 0.9, 0.4, 0.6, 0.3, 0.5, 0.7, 0.2, 0.4];
                                
                                return staticHeights.map((height, i) => (
                                  <div
                                    key={i}
                                    className={cn(
                                      "rounded-full flex-shrink-0 opacity-60",
                                      isMe
                                        ? "bg-white/40"
                                        : "bg-purple-200"
                                    )}
                                    style={{
                                      width: '1.5px',
                                      height: `${height * 8}px`,
                                      minHeight: '1.5px'
                                    }}
                                  />
                                ));
                              })()}
                            </div>
                            
                            {/* 번역 상태에 따른 전사 텍스트 표시 */}
                            {translatedMessages[msg.id] ? (
                              // 번역된 음성 메시지 표시
                              <div className="animate-in fade-in-0 zoom-in-95 duration-300">
                                <button
                                  onClick={() => {
                                    setShowOriginal(prev => {
                                      const newSet = new Set(prev);
                                      if (newSet.has(msg.id)) {
                                        newSet.delete(msg.id);
                                      } else {
                                        newSet.add(msg.id);
                                      }
                                      return newSet;
                                    });
                                  }}
                                  className={cn(
                                    "mb-2 px-2 py-1 text-xs rounded-md transition-all duration-200 hover:scale-105 flex items-center space-x-1",
                                    isMe 
                                      ? "bg-white/20 hover:bg-white/30 text-white" 
                                      : "bg-purple-100 hover:bg-purple-200 text-purple-700"
                                  )}
                                  data-testid={`toggle-translation-${msg.id}`}
                                >
                                  <Languages className="h-3 w-3" />
                                  <span>{showOriginal.has(msg.id) ? '번역 보기' : '원문 보기'}</span>
                                </button>
                                
                                <div className="transition-all duration-300 ease-in-out">
                                  <div className={cn(
                                    "text-sm leading-relaxed mb-2",
                                    isMe ? "text-white/90" : "text-gray-800"
                                  )}>
                                    {showOriginal.has(msg.id) 
                                      ? (msg.transcription || msg.content)
                                      : translatedMessages[msg.id].text
                                    }
                                  </div>
                                  <div className={cn(
                                    "text-xs opacity-70 flex items-center space-x-1",
                                    isMe ? "text-white/70" : "text-gray-600"
                                  )}>
                                    <Languages className="h-3 w-3" />
                                    <span>ChatGPT 번역완료</span>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              // 원본 전사 텍스트 표시
                              (msg.transcription || msg.content) && (
                                <div className={cn(
                                  "text-sm leading-relaxed",
                                  isMe ? "text-white/90" : "text-gray-800"
                                )}>
                                  {msg.transcription || msg.content}
                                </div>
                              )
                            )}
                          </div>
                        </div>

                      ) : msg.messageType === "file" ? (
                        <div className="relative">
                          <MediaPreview
                            fileUrl={msg.fileUrl}
                            fileName={msg.fileName}
                            fileSize={msg.fileSize}
                            messageContent={msg.content}
                            isMe={isMe}
                            className="mb-2"
                          />
                          
                          {/* 원형 업로드 진행률 오버레이 */}
                          {(msg as any).isUploading && (msg as any).uploadProgress < 100 && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm rounded-lg">
                              <div className="relative flex items-center justify-center">
                                {/* SVG 원형 진행률 */}
                                <svg className="transform -rotate-90" width="60" height="60">
                                  <defs>
                                    <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                      <stop offset="0%" stopColor="#9333ea" />
                                      <stop offset="100%" stopColor="#c026d3" />
                                    </linearGradient>
                                  </defs>
                                  {/* 배경 원 */}
                                  <circle
                                    cx="30"
                                    cy="30"
                                    r="26"
                                    stroke="rgba(255, 255, 255, 0.2)"
                                    strokeWidth="4"
                                    fill="none"
                                  />
                                  {/* 진행률 원 */}
                                  <circle
                                    cx="30"
                                    cy="30"
                                    r="26"
                                    stroke="url(#progressGradient)"
                                    strokeWidth="4"
                                    fill="none"
                                    strokeLinecap="round"
                                    strokeDasharray={`${2 * Math.PI * 26}`}
                                    strokeDashoffset={`${2 * Math.PI * 26 * (1 - ((msg as any).uploadProgress || 0) / 100)}`}
                                    className="transition-all duration-300 ease-out"
                                  />
                                </svg>
                                {/* 중앙 퍼센트 텍스트 */}
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <span className="text-white font-bold text-sm">
                                    {(msg as any).uploadProgress || 0}%
                                  </span>
                                </div>
                              </div>
                            </div>
                          )}
                          
                          {msg.isCommandRecall && (
                            <div className={cn(
                              "mt-2 pt-2 border-t",
                              msg.isLocalOnly
                                ? isMe ? "border-white/20" : "border-teal-300"
                                : isMe ? "border-white/20" : "border-gray-100"
                            )}>
                              <span className={cn(
                                "px-2 py-1 rounded text-xs font-medium",
                                msg.isLocalOnly
                                  ? isMe 
                                    ? "bg-white/20 text-white" 
                                    : "bg-teal-200 text-teal-800"
                                  : isMe 
                                    ? "bg-white/20 text-white" 
                                    : "bg-purple-100 text-purple-700"
                              )}>
                                {msg.content}
                              </span>
                              <p className={cn(
                                "text-xs mt-1",
                                msg.isLocalOnly
                                  ? isMe ? "text-white/70" : "text-teal-600"
                                  : isMe ? "text-white/70" : "text-gray-500"
                              )}>
                                {msg.isLocalOnly ? "태그로 불러옴 (나만 보임)" : "명령어로 불러옴"}
                              </p>
                            </div>
                          )}
                        </div>
                      ) : msg.messageType === "poll" && msg.pollData ? (
                        <PollMessage
                          pollData={JSON.parse(msg.pollData)}
                          isMe={isMe}
                          onVote={(optionIndex) => {
                            console.log('Vote for option:', optionIndex, 'in poll:', msg.id);
                          }}
                        />
                      ) : msg.messageType === "boom" ? (
                        explodedMessages.has(msg.id) ? (
                          // 폭발한 메시지
                          <div className="text-center py-4">
                            <div className="inline-flex items-center space-x-2 bg-gray-100 rounded-lg px-4 py-2 border-2 border-dashed border-gray-300">
                              <span className="text-2xl animate-bounce">💥</span>
                              <span className="text-sm text-gray-600 font-medium">이 메시지는 폭발했습니다</span>
                              <span className="text-xs text-gray-400">(삭제됨)</span>
                            </div>
                          </div>
                        ) : (
                          // 활성 폭탄 메시지 (카운트다운)
                          <div className="relative">
                            <div className={cn(
                              "flex items-center space-x-3 p-3 rounded-lg border-2",
                              messageTimers[msg.id] <= 5 
                                ? "border-red-500 bg-red-50 animate-pulse" 
                                : "border-orange-500 bg-orange-50"
                            )}>
                              <div className={cn(
                                "text-2xl",
                                messageTimers[msg.id] <= 3 ? "animate-bounce" : ""
                              )}>
                                💣
                              </div>
                              <div className="flex-1">
                                <p className="text-sm font-medium text-gray-800 mb-2">
                                  {msg.content.replace('💣 ', '')}
                                </p>
                                <div className="flex items-center space-x-2">
                                  <div className={cn(
                                    "px-3 py-1 rounded-full text-sm font-bold min-w-[60px] text-center",
                                    messageTimers[msg.id] <= 5 
                                      ? "bg-red-500 text-white animate-pulse" 
                                      : "bg-orange-500 text-white"
                                  )}>
                                    {messageTimers[msg.id] || 0}초
                                  </div>
                                  <span className="text-xs text-gray-600">후 폭발</span>
                                  {messageTimers[msg.id] <= 3 && (
                                    <span className="text-xs text-red-600 font-bold animate-pulse">⚠️ 위험!</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      ) : msg.messageType === "sendback" ? (
                        // SendBack 메시지 (작성자에게만 보임)
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                          <div className="flex items-center space-x-2 mb-2">
                            <span className="text-lg">↩️</span>
                            <span className="text-xs text-yellow-700 font-medium">작성자만 볼 수 있는 피드백</span>
                          </div>
                          <p className="text-sm text-yellow-800">
                            {msg.content.replace('↩️ 피드백: ', '')}
                          </p>
                        </div>
                      ) : msg.messageType === "spotlight" ? (
                        // Spotlight 메시지
                        <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                          <div className="flex items-center space-x-2 mb-2">
                            <span className="text-lg">📌</span>
                            <span className="text-xs text-purple-700 font-medium">주목 메시지</span>
                          </div>
                          <p className="text-sm text-purple-800">
                            {msg.content}
                          </p>
                        </div>
                      ) : (
                        <div className={cn(
                          "text-sm relative",
                          msg.isSystemMessage ? "text-teal-900" : isMe ? "text-white" : "text-gray-900"
                        )}>
                          {/* 시스템 리마인더 메시지 특별 처리 */}
                          {msg.isSystemMessage && msg.content && msg.content.includes('⏰ 리마인더:') && (
                            <div 
                              className="mb-2 cursor-pointer hover:bg-teal-25 rounded-lg p-2 transition-colors"
                              onClick={() => {
                                // 원문 메시지로 스크롤 (originalMessageId가 있다면)
                                if (msg.originalMessageId) {
                                  const messageElement = messageRefs.current[msg.originalMessageId];
                                  if (messageElement) {
                                    messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                    setHighlightedMessageId(msg.originalMessageId);
                                    setTimeout(() => {
                                      setHighlightedMessageId(null);
                                    }, 3000);
                                  }
                                }
                              }}
                            >
                              <div className="flex items-center space-x-2 mb-2">
                                <span className="text-sm font-medium text-teal-700">⏰ 리마인더</span>
                              </div>
                              <div className="text-sm text-teal-800">
                                {msg.content.replace('⏰ 리마인더: ', '')}
                              </div>
                              <p className="text-xs mt-1 text-teal-600">
                                클릭하여 원문으로 이동
                              </p>
                            </div>
                          )}
                          
                          {/* 일반 메시지 내용 (시스템 메시지가 아닌 경우에만 표시) */}
                          {!msg.isSystemMessage && (
                            <>
                              {/* YouTube Preview */}
                          {(msg as any).youtubePreview && (
                            <div className="mb-3 rounded-lg overflow-hidden bg-white shadow-sm border">
                              <div className="relative">
                                <img 
                                  src={(msg as any).youtubePreview.thumbnailUrl || (msg as any).youtubePreview.thumbnail}
                                  alt={(msg as any).youtubePreview.title}
                                  className="w-full h-48 object-cover"
                                  onError={(e) => {
                                    e.currentTarget.src = `https://img.youtube.com/vi/${(msg as any).youtubePreview.videoId}/hqdefault.jpg`;
                                  }}
                                />
                                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30">
                                  <button
                                    onClick={() => window.open((msg as any).youtubePreview.url, '_blank')}
                                    className="clickable w-16 h-16 rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center text-white transition-all hover:scale-105"
                                  >
                                    <svg className="w-8 h-8 ml-1" fill="currentColor" viewBox="0 0 24 24">
                                      <path d="M8 5v14l11-7z"/>
                                    </svg>
                                  </button>
                                </div>
                              </div>
                              <div className="p-3">
                                <h3 className="font-medium text-gray-900 text-sm line-clamp-2 mb-1">
                                  {(msg as any).youtubePreview.title}
                                </h3>
                                <p className="text-xs text-gray-600 mb-2">
                                  {(msg as any).youtubePreview.channelTitle}
                                </p>
                                <button
                                  onClick={() => window.open((msg as any).youtubePreview.url, '_blank')}
                                  className="clickable text-xs text-blue-600 hover:text-blue-800 font-medium"
                                >
                                  YouTube에서 보기 →
                                </button>
                              </div>
                            </div>
                          )}
                          
                          {/* Mood Indicator for Creative/Casual Conversations */}
                          {uiAdaptations.showMoodIndicator && msg.senderId === user?.id && (
                            <div className="flex items-center space-x-1 mb-1">
                              {msg.content && msg.content.includes('!') && (
                                <span className="text-xs">😊</span>
                              )}
                              {msg.content && msg.content.includes('?') && (
                                <span className="text-xs">🤔</span>
                              )}
                              {msg.content && (msg.content.includes('아이디어') || msg.content.includes('창작')) && (
                                <span className="text-xs">💡</span>
                              )}
                            </div>
                          )}

                          {/* 번역 상태에 따른 메시지 표시 */}
                          <div className={cn(
                            "transition-all duration-500 ease-in-out",
                            translatingMessages.has(msg.id) ? "animate-pulse" : "",
                            translatedMessages[msg.id] ? "transform perspective-1000" : "",
                            uiAdaptations.compactMode && "text-sm leading-tight"
                          )}>
                            {translatedMessages[msg.id] ? (
                              // 번역된 메시지 표시 - 토글 가능
                              <div className="animate-in fade-in-0 zoom-in-95 duration-300">
                                <div className="flex items-start space-x-1">
                                  <div className="flex-1">
                                    {/* 토글 버튼 */}
                                    <button
                                      onClick={() => {
                                        setShowOriginal(prev => {
                                          const newSet = new Set(prev);
                                          if (newSet.has(msg.id)) {
                                            newSet.delete(msg.id);
                                          } else {
                                            newSet.add(msg.id);
                                          }
                                          return newSet;
                                        });
                                      }}
                                      className="mb-2 px-2 py-1 text-xs rounded-md transition-all duration-200 hover:scale-105 flex items-center space-x-1 bg-purple-100 hover:bg-purple-200 text-purple-700 dark:bg-purple-900/30 dark:hover:bg-purple-900/50 dark:text-purple-300"
                                      data-testid={`toggle-translation-${msg.id}`}
                                    >
                                      <Languages className="h-3 w-3" />
                                      <span>{showOriginal.has(msg.id) ? '번역 보기' : '원문 보기'}</span>
                                    </button>
                                    
                                    {/* 메시지 내용 - 부드러운 전환 애니메이션 */}
                                    <div className="transition-all duration-300 ease-in-out">
                                      <div className="mb-2">
                                        {showOriginal.has(msg.id) 
                                          ? renderMessageWithLinks(msg.messageType === 'voice' ? (msg.transcription || msg.content) : msg.content)
                                          : renderMessageWithLinks(translatedMessages[msg.id].text)
                                        }
                                      </div>
                                      <div className="text-xs opacity-70 flex items-center space-x-1">
                                        <Languages className="h-3 w-3" />
                                        <span>ChatGPT 번역완료</span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              // 원본 메시지 표시
                              <div className="flex items-start space-x-1">
                                <div className="flex-1">
                                  {editingMessage?.id === msg.id ? (
                                    // 인라인 편집 모드
                                    <div className="space-y-2">
                                      <Textarea
                                        value={editContent}
                                        onChange={(e) => setEditContent(e.target.value)}
                                        className={cn(
                                          "min-h-[60px] resize-none text-sm border-2 focus:ring-2",
                                          isMe 
                                            ? "bg-white/90 text-gray-900 border-white/50 focus:border-white focus:ring-white/30" 
                                            : "bg-gray-50 text-gray-900 border-gray-300 focus:border-purple-500 focus:ring-purple-200"
                                        )}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Escape') {
                                            setEditingMessage(null);
                                            setEditContent("");
                                          }
                                          if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                                            e.preventDefault();
                                            if (editContent.trim() && editContent !== msg.content) {
                                              editMessageMutation.mutate({
                                                messageId: msg.id,
                                                content: editContent.trim()
                                              });
                                            } else {
                                              setEditingMessage(null);
                                              setEditContent("");
                                            }
                                          }
                                        }}
                                        autoFocus
                                      />
                                      <div className="flex items-center justify-between">
                                        <span className="text-xs text-gray-500">
                                          Ctrl+Enter로 저장, Esc로 취소
                                        </span>
                                        <div className="flex items-center space-x-2">
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => {
                                              setEditingMessage(null);
                                              setEditContent("");
                                            }}
                                            className={cn(
                                              "h-6 text-xs",
                                              isMe ? "text-white/70 hover:text-white hover:bg-white/10" : "text-gray-500 hover:text-gray-700"
                                            )}
                                          >
                                            취소
                                          </Button>
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => {
                                              if (editContent.trim() && editContent !== msg.content) {
                                                editMessageMutation.mutate({
                                                  messageId: msg.id,
                                                  content: editContent.trim()
                                                });
                                              } else {
                                                setEditingMessage(null);
                                                setEditContent("");
                                              }
                                            }}
                                            disabled={!editContent.trim() || editContent === msg.content}
                                            className={cn(
                                              "h-6 text-xs",
                                              isMe ? "text-white hover:bg-white/10" : "text-purple-600 hover:bg-purple-50"
                                            )}
                                          >
                                            저장
                                          </Button>
                                        </div>
                                      </div>
                                    </div>
                                  ) : (
                                    <>
                                      {/* 업로드 진행상황 표시 (파일이 아닌 경우에만) */}
                                      {(msg as any).isUploading && msg.messageType !== 'file' && (
                                        <div className="mb-2">
                                          <div className="flex items-center space-x-2 mb-1">
                                            <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full"></div>
                                            <span className={cn(
                                              "text-sm font-medium",
                                              isMe ? "text-white/90" : "text-gray-700"
                                            )}>
                                              업로드 중... {(msg as any).uploadProgress || 0}%
                                            </span>
                                          </div>
                                          <div className={cn(
                                            "w-full h-1.5 rounded-full overflow-hidden",
                                            isMe ? "bg-white/20" : "bg-gray-200"
                                          )}>
                                            <div 
                                              className={cn(
                                                "h-full transition-all duration-300 ease-out",
                                                isMe ? "bg-white/80" : "bg-purple-500"
                                              )}
                                              style={{ 
                                                width: `${(msg as any).uploadProgress || 0}%` 
                                              }}
                                            />
                                          </div>
                                        </div>
                                      )}
                                      
                                      <div>
                                        {renderMessageWithLinks(msg.content)}
                                        {/* Link Previews */}
                                        {(() => {
                                          const urls = detectUrls(msg.content);
                                          return urls.map((url, index) => (
                                            <LinkPreview 
                                              key={index} 
                                              url={url} 
                                              className="mt-2"
                                            />
                                          ));
                                        })()}
                                      </div>
                                      {msg.isEdited && (
                                        <span className={cn(
                                          "text-xs ml-2 opacity-70 italic",
                                          isMe ? "text-white/60" : "text-gray-500"
                                        )}>
                                          (편집됨)
                                        </span>
                                      )}
                                    </>
                                  )}
                                </div>
                                {msg.isTranslated && (
                                  <div className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/30 flex-shrink-0 mt-0.5">
                                    <Languages className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                            </>
                          )}
                        </div>
                      )}
                    </div>
                    </GestureQuickReply>
                  </div>
                </div>
                </div>
              </div>
            );
          })}
          
          {/* 업로드 중인 파일들을 로딩 메시지로 표시 */}
          {uploadingFiles.map((uploadingFile) => (
            <div key={uploadingFile.id} className="flex items-start space-x-3 flex-row-reverse space-x-reverse mb-4">
              <InstantAvatar 
                src={user?.profilePicture}
                alt={user?.displayName || "Me"}
                fallbackText={user?.displayName || "Me"}
                size="md" 
                className="purple-gradient"
              />
              
              <div className="flex flex-col items-end max-w-xs lg:max-w-md">
                <div className="bg-purple-600 text-white p-3 rounded-lg shadow-sm">
                  <div className="flex items-center space-x-3">
                    {/* 3개 점 애니메이션 - 순차적으로 커졌다 작아짐 */}
                    <div className="flex space-x-1.5">
                      <div className="w-2 h-2 bg-white rounded-full dot-pulse" style={{ animationDelay: '0s' }}></div>
                      <div className="w-2 h-2 bg-white rounded-full dot-pulse" style={{ animationDelay: '0.2s' }}></div>
                      <div className="w-2 h-2 bg-white rounded-full dot-pulse" style={{ animationDelay: '0.4s' }}></div>
                    </div>
                    <span className="text-sm">📎 {uploadingFile.fileName} 업로드 중...</span>
                  </div>
                </div>
                <span className="text-xs text-gray-500 mt-1">
                  {new Date().toLocaleTimeString('ko-KR', { 
                    hour: '2-digit', 
                    minute: '2-digit',
                    hour12: false
                  })}
                </span>
              </div>
            </div>
          ))}
        </>
        )}
        
        {/* Typing Indicator */}
        <TypingIndicator
          typingUsers={typingUsers}
          accessibilityMode={accessibilitySettings.reducedMotion}
          animationStyle={accessibilitySettings.reducedMotion ? 'minimal' : 'enhanced'}
          showUserNames={true}
        />
        
        {/* 하단 여유 공간 - 맨 아래 메시지가 입력창에 가려지지 않도록 */}
        <div className="h-24" />
        
        <div ref={messagesEndRef} />
      </div>

      {/* New Messages Banner - Telegram Style */}
      {!isAtBottom && unreadNewMessages > 0 && (
        <div 
          className="absolute bottom-32 left-1/2 transform -translate-x-1/2 z-40 cursor-pointer"
          onClick={() => {
            setUnreadNewMessages(0);
            setShouldAutoScroll(true);
            setIsAtBottom(true);
            scrollToBottom('smooth');
          }}
          data-testid="banner-new-messages"
        >
          <div className="bg-purple-600 hover:bg-purple-700 text-white px-5 py-2.5 rounded-full shadow-lg flex items-center space-x-2 transition-all duration-200 transform hover:scale-105">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
            <span className="font-medium text-sm">
              새로운 메시지 {unreadNewMessages > 1 ? `${unreadNewMessages}개` : ''}
            </span>
          </div>
        </div>
      )}

      {/* Floating Scroll to Bottom Button */}
      {!shouldAutoScroll && unreadNewMessages === 0 && (
        <button
          onClick={() => {
            setShouldAutoScroll(true);
            scrollToBottom('smooth');
          }}
          className="fixed bottom-24 right-6 z-40 bg-purple-500 hover:bg-purple-600 text-white rounded-full p-3 shadow-lg transition-all duration-200 transform hover:scale-105"
          aria-label="최신 메시지로 이동"
          data-testid="button-scroll-to-bottom"
        >
          <svg 
            className="w-5 h-5" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M19 14l-7 7m0 0l-7-7m7 7V3" 
            />
          </svg>
        </button>
      )}

      {/* Floating Button for Unread Messages - Moved much higher to avoid covering other buttons */}
      {showUnreadButton && firstUnreadMessageId && (
        <div className="absolute bottom-60 left-1/2 transform -translate-x-1/2 z-20">
          <Button
            variant="default"
            size="sm"
            className="bg-purple-600 hover:bg-purple-700 text-white shadow-lg rounded-full px-4 py-2 flex items-center space-x-2"
            onClick={() => {
              const messageElement = messageRefs.current[firstUnreadMessageId];
              if (messageElement) {
                messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                setShowUnreadButton(false);
              }
            }}
          >
            <span className="text-sm">읽지 않은 메시지</span>
            <span className="bg-white text-purple-600 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">
              ↑
            </span>
          </Button>
        </div>
      )}

      {/* Chat Input - Fixed to absolute bottom */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-20">
        {/* Reply Preview */}
        {replyToMessage && (
          <div className="px-2 py-1 border-b border-gray-200 bg-gray-50">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-1">
                  <Reply className="h-4 w-4 text-purple-600" />
                  <span className="text-sm font-medium text-purple-600">
                    {replyToMessage.sender.displayName}님에게 회신
                  </span>
                </div>
                <p className="text-sm text-gray-600 truncate">
                  {replyToMessage.content}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-gray-400 hover:text-gray-600 p-1"
                onClick={() => setReplyToMessage(null)}
              >
                ✕
              </Button>
            </div>
          </div>
        )}
        
        {/* Adaptive Quick Actions */}
        {uiAdaptations.showActionButtons && adaptiveActions.length > 0 && (
          <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
            <div className="flex items-center space-x-2 overflow-x-auto">
              <span className="text-xs text-gray-500 whitespace-nowrap mr-2">빠른 작업:</span>
              {adaptiveActions.map((action) => (
                <Button
                  key={action.id}
                  variant="outline"
                  size="sm"
                  className="flex items-center space-x-1 whitespace-nowrap"
                  onClick={action.action}
                >
                  <span>{action.icon}</span>
                  <span className="text-xs">{action.label}</span>
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Quick Replies for Business/Urgent Conversations */}
        {uiAdaptations.showQuickReplies && (
          <div className="px-4 py-2 bg-blue-50 border-b border-blue-200">
            <div className="flex items-center space-x-2 overflow-x-auto">
              <span className="text-xs text-blue-600 whitespace-nowrap mr-2">빠른 답장:</span>
              {conversationMode === 'business' && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs whitespace-nowrap bg-white"
                    onClick={() => setMessage('확인했습니다. ')}
                  >
                    ✅ 확인
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs whitespace-nowrap bg-white"
                    onClick={() => setMessage('검토 후 회신드리겠습니다. ')}
                  >
                    📋 검토 중
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs whitespace-nowrap bg-white"
                    onClick={() => setMessage('회의를 잡겠습니다. ')}
                  >
                    📅 회의 요청
                  </Button>
                </>
              )}
              {conversationContext.urgency === 'high' && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs whitespace-nowrap bg-white"
                    onClick={() => setMessage('즉시 처리하겠습니다. ')}
                  >
                    🚀 즉시 처리
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs whitespace-nowrap bg-white"
                    onClick={() => setMessage('지금 확인 중입니다. ')}
                  >
                    👀 확인 중
                  </Button>
                </>
              )}
            </div>
          </div>
        )}

        {/* File Upload Progress Display */}
        {uploadProgress.length > 0 && (
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
            <FileUploadProgress uploads={uploadProgress} />
          </div>
        )}

        <div className={cn(
          "px-4 py-2 chat-input-area flex items-center justify-center",
          // 주변챗용 특별한 디자인
          isLocationChatRoom 
            ? "bg-gradient-to-r from-blue-50 to-indigo-50 border-t-2 border-blue-200" 
            : "bg-white border-t border-gray-200"
        )}>
          <div className="flex items-center gap-3 w-full max-w-4xl mx-auto">
          {/* Enhanced left buttons group */}
          <div className="flex items-center gap-1">
            {/* AI Assistant Button with sparkle animation */}
            <InteractiveButton
              type="hover"
              intensity="moderate"
              accessibilityMode={accessibilitySettings.reducedMotion}
              hapticFeedback={accessibilitySettings.hapticEnabled}
              className="text-purple-500 hover:text-purple-600 hover:bg-purple-50 p-2 h-9 w-9 rounded-lg transition-all duration-200 flex items-center justify-center"
              onClick={() => setShowAIAssistantModal(true)}
              aria-label="AI 어시스턴트"
              data-testid="button-ai-assistant"
            >
              <Sparkles className="h-4 w-4" />
            </InteractiveButton>
            
            <InteractiveButton
              type="hover"
              intensity="moderate"
              accessibilityMode={accessibilitySettings.reducedMotion}
              hapticFeedback={accessibilitySettings.hapticEnabled}
              className="text-gray-500 hover:text-purple-600 hover:bg-purple-50 p-2 h-9 w-9 rounded-lg transition-all duration-200 flex items-center justify-center"
              onClick={handleFileUpload}
              disabled={uploadFileMutation.isPending}
              aria-label="파일 첨부"
            >
              {uploadFileMutation.isPending ? (
                <div className="animate-spin h-4 w-4 border-2 border-purple-600 border-t-transparent rounded-full" />
              ) : (
                <Paperclip className="h-4 w-4" />
              )}
            </InteractiveButton>

          </div>
          
          <div className="flex-1 relative max-w-2xl mx-2">
            {/* 멘션 자동완성 */}
            {showMentions && mentionSuggestions.length > 0 && (
              <div className="absolute bottom-full left-0 right-0 mb-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-48 overflow-y-auto z-50">
                {mentionSuggestions.map((user, index) => (
                  <div
                    key={user.id}
                    className={`px-3 py-2 cursor-pointer transition-colors flex items-center gap-2 ${
                      index === selectedMentionIndex 
                        ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' 
                        : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                    onClick={() => selectMention(user)}
                  >
                    {user.isSpecial ? (
                      <>
                        <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
                          <span className="text-white text-xs">@</span>
                        </div>
                        <div>
                          <div className="font-medium text-blue-600 dark:text-blue-400">@{user.username}</div>
                          <div className="text-xs text-gray-500">{user.displayName}</div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="w-6 h-6 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
                          <span className="text-xs font-medium">
                            {user.displayName?.[0] || user.username[0]}
                          </span>
                        </div>
                        <div>
                          <div className="font-medium">@{user.username}</div>
                          {user.displayName && (
                            <div className="text-xs text-gray-500">{user.displayName}</div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
            
            <Textarea
              ref={messageInputRef}
              placeholder={isLocationChatRoom ? "📍 주변챗에 메시지를 입력하세요..." : "메시지를 입력하세요..."}
              value={message}
              onChange={(e) => {
                const newValue = e.target.value;
                setMessage(newValue);
                handleMessageChange(newValue);
                
                // 텍스트 높이에 따른 자동 크기 조절
                const textarea = e.target;
                const maxHeight = Math.min(window.innerHeight * 0.5, 200); // 화면 높이의 50% 또는 200px 중 작은 값
                
                // 높이 초기화 후 스크롤 높이 측정
                textarea.style.height = '32px';
                const scrollHeight = textarea.scrollHeight;
                
                if (scrollHeight > 32) {
                  // 텍스트가 한 줄을 넘을 때만 높이 조절
                  if (scrollHeight <= maxHeight) {
                    // 최대 높이 이하일 때는 높이 자동 조절
                    textarea.style.height = scrollHeight + 'px';
                    textarea.style.overflow = 'hidden';
                  } else {
                    // 최대 높이 초과 시 고정 높이와 스크롤
                    textarea.style.height = maxHeight + 'px';
                    textarea.style.overflow = 'auto';
                  }
                } else {
                  // 한 줄일 때는 기본 높이와 스크롤 숨김
                  textarea.style.height = '32px';
                  textarea.style.overflow = 'hidden';
                }
                
                // 멘션 감지 및 자동완성
                const cursorPosition = e.target.selectionStart || 0;
                handleMentionSearch(newValue, cursorPosition);
                
                // 일반 텍스트 입력 시 키보드 네비게이션 상태 해제
                setIsNavigatingWithKeyboard(false);
              }}
              onKeyDown={(e) => {
                // 멘션 추천이 표시된 상태에서 키보드 네비게이션
                if (showMentions && mentionSuggestions.length > 0) {
                  if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    setSelectedMentionIndex(prev => 
                      prev < mentionSuggestions.length - 1 ? prev + 1 : 0
                    );
                    return;
                  }
                  if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    setSelectedMentionIndex(prev => 
                      prev > 0 ? prev - 1 : mentionSuggestions.length - 1
                    );
                    return;
                  }
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    const selectedUser = mentionSuggestions[selectedMentionIndex];
                    if (selectedUser) {
                      selectMention(selectedUser);
                    }
                    return;
                  }
                  if (e.key === 'Escape') {
                    e.preventDefault();
                    setShowMentions(false);
                    setMentionSuggestions([]);
                    return;
                  }
                }
                
                // 태그 추천이 표시된 상태에서 키보드 네비게이션
                if (showHashSuggestions && hashSuggestions.length > 0) {
                  if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    setSelectedHashIndex(prev => 
                      prev < hashSuggestions.length - 1 ? prev + 1 : 0
                    );
                    return;
                  }
                  if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    setSelectedHashIndex(prev => 
                      prev > 0 ? prev - 1 : hashSuggestions.length - 1
                    );
                    return;
                  }
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    const selectedTag = hashSuggestions[selectedHashIndex];
                    if (selectedTag) {
                      const currentMessage = message.replace(/#[^#\s]*$/, `#${selectedTag}`);
                      setMessage(currentMessage);
                      setShowHashSuggestions(false);
                      setHashSuggestions([]);
                      setSelectedHashIndex(0);
                      messageInputRef.current?.focus();
                    }
                    return;
                  }
                  if (e.key === 'Escape') {
                    e.preventDefault();
                    setShowHashSuggestions(false);
                    setHashSuggestions([]);
                    setSelectedHashIndex(0);
                    return;
                  }
                }
                
                // 스마트 제안이 표시된 상태에서 키보드 네비게이션
                if (showSmartSuggestions && smartSuggestions.length > 0) {
                  if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    setIsNavigatingWithKeyboard(true);
                    setSelectedSuggestionIndex(prev => 
                      prev < smartSuggestions.length - 1 ? prev + 1 : 0
                    );
                    // 키보드 사용 중에는 자동 숨김 타이머 정지
                    if (suggestionTimeout) {
                      clearTimeout(suggestionTimeout);
                      setSuggestionTimeout(null);
                    }
                    return;
                  }
                  if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    setIsNavigatingWithKeyboard(true);
                    setSelectedSuggestionIndex(prev => 
                      prev > 0 ? prev - 1 : smartSuggestions.length - 1
                    );
                    // 키보드 사용 중에는 자동 숨김 타이머 정지
                    if (suggestionTimeout) {
                      clearTimeout(suggestionTimeout);
                      setSuggestionTimeout(null);
                    }
                    return;
                  }
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    const selectedSuggestion = smartSuggestions[selectedSuggestionIndex];
                    if (selectedSuggestion) {
                      // 제안 텍스트를 메시지 입력창으로 복사
                      setMessage(selectedSuggestion.text);
                      setShowSmartSuggestions(false);
                      setSmartSuggestions([]);
                      setSelectedSuggestionIndex(0);
                      if (suggestionTimeout) {
                        clearTimeout(suggestionTimeout);
                        setSuggestionTimeout(null);
                      }
                      // 입력창에 포커스 유지
                      messageInputRef.current?.focus();
                    }
                    return;
                  }
                  if (e.key === 'Escape') {
                    e.preventDefault();
                    setShowSmartSuggestions(false);
                    setSmartSuggestions([]);
                    setSelectedSuggestionIndex(0);
                    if (suggestionTimeout) {
                      clearTimeout(suggestionTimeout);
                      setSuggestionTimeout(null);
                    }
                    return;
                  }
                }
                
                // 일반적인 엔터키 처리
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              className="resize-none min-h-[32px] py-1.5 px-3 text-base"
              style={{ 
                fontSize: '16px', 
                lineHeight: '1.3',
                height: '32px',
                overflow: 'hidden'
              }}
            />
            
            {/* # 태그 추천 */}
            {showHashSuggestions && hashSuggestions.length > 0 && (
              <div className="absolute bottom-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg mb-1 max-h-32 overflow-y-auto z-50">
                <div className="p-1">
                  <div className="text-xs font-medium text-gray-500 mb-1 px-2"># 태그 추천</div>
                  {hashSuggestions.map((tag, index) => (
                    <div
                      key={tag}
                      className={`flex items-center p-2 cursor-pointer rounded text-sm ${
                        index === selectedHashIndex 
                          ? 'bg-purple-100 text-purple-900' 
                          : 'hover:bg-gray-50 text-gray-700'
                      }`}
                      onClick={() => {
                        const currentMessage = message.replace(/#[^#\s]*$/, `#${tag}`);
                        setMessage(currentMessage);
                        setShowHashSuggestions(false);
                        setHashSuggestions([]);
                        setSelectedHashIndex(0);
                        messageInputRef.current?.focus();
                      }}
                    >
                      <Hash className={`h-3 w-3 mr-1 ${
                        index === selectedHashIndex ? 'text-purple-600' : 'text-purple-500'
                      }`} />
                      <span>{tag}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 음성 메시지 스마트 추천 팝업 - 새로운 UX/UI 디자인 */}
            {pendingVoiceMessage && showSmartSuggestions && smartSuggestions.length > 0 && (
              <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden border border-gray-100">
                  {/* 헤더 섹션 */}
                  <div className="bg-gradient-to-r from-purple-500 to-indigo-600 p-4 text-white">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-sm">알림 설정 추천</h3>
                        <p className="text-xs text-white/80">스마트 알림을 설정하시겠습니까?</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* 메시지 내용 */}
                  <div className="p-4 bg-gray-50">
                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <svg className="w-4 h-4 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 leading-relaxed">
                          "{pendingVoiceMessage.content}"
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {/* 추천 섹션 */}
                  <div className="p-4 space-y-3">
                    {smartSuggestions.slice(0, 1).map((suggestion, index) => (
                      <div
                        key={index}
                        className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-xl p-4 cursor-pointer hover:from-purple-100 hover:to-indigo-100 transition-all duration-200 hover:shadow-md"
                        onClick={() => handleSmartSuggestionSelect(suggestion)}
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-sm">
                            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                            </svg>
                          </div>
                          <div className="flex-1">
                            <p className="font-semibold text-purple-800 text-sm">
                              나중에 알림 설정
                            </p>
                            <p className="text-xs text-purple-600 mt-1">
                              30분 후 자동으로 알림을 보내드립니다
                            </p>
                          </div>
                          <div className="text-purple-500">
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                            </svg>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* 버튼 섹션 */}
                  <div className="p-4 bg-gray-50 border-t border-gray-100 space-y-2">
                    <button
                      onClick={() => {
                        // 원본 음성 메시지 전송
                        if (suggestionTimeout) {
                          clearTimeout(suggestionTimeout);
                          setSuggestionTimeout(null);
                        }
                        sendMessageMutation.mutate(pendingVoiceMessage);
                        setPendingVoiceMessage(null);
                        setShowSmartSuggestions(false);
                        setSmartSuggestions([]);
                      }}
                      className="w-full px-4 py-3 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors text-sm font-medium shadow-sm"
                    >
                      알림 없이 바로 전송
                    </button>
                    <button
                      onClick={() => {
                        // 취소 (메시지 삭제)
                        if (suggestionTimeout) {
                          clearTimeout(suggestionTimeout);
                          setSuggestionTimeout(null);
                        }
                        setPendingVoiceMessage(null);
                        setShowSmartSuggestions(false);
                        setSmartSuggestions([]);
                      }}
                      className="w-full px-4 py-2 text-gray-500 hover:text-gray-700 transition-colors text-sm"
                    >
                      취소
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 일반 텍스트 입력 스마트 채팅 제안 - 컴팩트 디자인 */}
            {!pendingVoiceMessage && showSmartSuggestions && smartSuggestions.length > 0 && (
              <div 
                className="absolute bottom-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg mb-1 max-h-60 overflow-y-auto z-50"
                onMouseEnter={() => {
                  setIsHoveringOverSuggestions(true);
                  // 호버 시 타이머 정지
                  if (suggestionTimeout) {
                    clearTimeout(suggestionTimeout);
                    setSuggestionTimeout(null);
                  }
                }}
                onMouseLeave={() => {
                  setIsHoveringOverSuggestions(false);
                  // 호버 해제 시 타이머 재시작 (키보드 네비게이션 중이 아닐 때만)
                  if (!isNavigatingWithKeyboard) {
                    const timeout = setTimeout(() => {
                      if (!isHoveringOverSuggestions && !isNavigatingWithKeyboard) {
                        setShowSmartSuggestions(false);
                        setSmartSuggestions([]);
                      }
                    }, 2000); // 호버 해제 후 2초 여유
                    setSuggestionTimeout(timeout);
                  }
                }}
              >
                <div className="p-1">
                  <div className="text-xs font-medium text-gray-500 mb-1 px-2">스마트 제안</div>
                  {smartSuggestions.map((suggestion, index) => (
                    <div
                      key={index}
                      className={`p-2 rounded-md cursor-pointer transition-colors border ${
                        index === selectedSuggestionIndex 
                          ? 'bg-blue-100 border-blue-300' 
                          : 'border-transparent hover:border-blue-200 hover:bg-blue-50'
                      }`}
                      onClick={() => {
                        // 환율 변환일 경우 사용 빈도 추적
                        if (suggestion.type === 'currency' && suggestion.fromCurrency && suggestion.toCurrency) {
                          updateCurrencyUsage(suggestion.fromCurrency, suggestion.toCurrency);
                        }
                        
                        // 제안 텍스트를 메시지 입력창으로 복사
                        setMessage(suggestion.text);
                        setShowSmartSuggestions(false);
                        setSmartSuggestions([]);
                        setSelectedSuggestionIndex(0);
                        setIsNavigatingWithKeyboard(false);
                        if (suggestionTimeout) {
                          clearTimeout(suggestionTimeout);
                          setSuggestionTimeout(null);
                        }
                        // 입력창에 포커스
                        messageInputRef.current?.focus();
                      }}
                    >
                      <div className="flex items-center space-x-2">
                        <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${
                          suggestion.type === 'calculation' ? 'bg-blue-100' :
                          suggestion.type === 'currency' ? 'bg-green-100' :
                          suggestion.type === 'schedule' ? 'bg-purple-100' :
                          suggestion.type === 'translation' ? 'bg-indigo-100' :
                          suggestion.type === 'emotion' ? 'bg-pink-100' :
                          suggestion.type === 'food' ? 'bg-orange-100' :
                          suggestion.type === 'youtube' ? 'bg-red-100' :
                          suggestion.type === 'news' ? 'bg-blue-100' :
                          suggestion.type === 'unit' ? 'bg-purple-100' :
                          suggestion.type === 'search' ? 'bg-yellow-100' :
                          suggestion.type === 'birthday' ? 'bg-pink-100' :
                          suggestion.type === 'meeting' ? 'bg-green-100' :
                          suggestion.type === 'address' ? 'bg-red-100' :
                          suggestion.type === 'poll' ? 'bg-cyan-100' :
                          suggestion.type === 'todo' ? 'bg-emerald-100' :
                          suggestion.type === 'timer' ? 'bg-amber-100' :
                          suggestion.type === 'reminder' ? 'bg-violet-100' :
                          suggestion.type === 'quote' ? 'bg-rose-100' :
                          suggestion.type === 'question' ? 'bg-sky-100' :
                          suggestion.type === 'summary' ? 'bg-slate-100' :
                          suggestion.type === 'decision' ? 'bg-teal-100' :
                          suggestion.type === 'category' ? 'bg-lime-100' :
                          suggestion.type === 'topic_info' ? 'bg-indigo-100' :
                          'bg-gray-100'
                        }`}>
                          <span className={`text-xs ${
                            suggestion.type === 'calculation' ? 'text-blue-600' :
                            suggestion.type === 'currency' ? 'text-green-600' :
                            suggestion.type === 'schedule' ? 'text-purple-600' :
                            suggestion.type === 'translation' ? 'text-indigo-600' :
                            suggestion.type === 'emotion' ? 'text-pink-600' :
                            suggestion.type === 'food' ? 'text-orange-600' :
                            suggestion.type === 'youtube' ? 'text-red-600' :
                            suggestion.type === 'news' ? 'text-blue-600' :
                            suggestion.type === 'unit' ? 'text-purple-600' :
                            suggestion.type === 'search' ? 'text-yellow-600' :
                            suggestion.type === 'birthday' ? 'text-pink-600' :
                            suggestion.type === 'meeting' ? 'text-green-600' :
                            suggestion.type === 'address' ? 'text-red-600' :
                            suggestion.type === 'poll' ? 'text-cyan-600' :
                            suggestion.type === 'todo' ? 'text-emerald-600' :
                            suggestion.type === 'timer' ? 'text-amber-600' :
                            suggestion.type === 'reminder' ? 'text-violet-600' :
                            suggestion.type === 'quote' ? 'text-rose-600' :
                            suggestion.type === 'question' ? 'text-sky-600' :
                            suggestion.type === 'summary' ? 'text-slate-600' :
                            suggestion.type === 'decision' ? 'text-teal-600' :
                            suggestion.type === 'category' ? 'text-lime-600' :
                            suggestion.type === 'topic_info' ? 'text-indigo-600' :
                            'text-gray-600'
                          }`}>
                            {suggestion.icon || (suggestion.type === 'calculation' ? '🧮' : '💱')}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs text-gray-700 leading-snug">
                            {suggestion.text}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          {/* 스마트 제안 결과 모달 */}
          {smartResultModal.show && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg max-w-md w-full max-h-96 overflow-hidden">
                <div className="p-4 border-b">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">스마트 결과</h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSmartResultModal({ show: false, title: '', content: '' })}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="p-4 overflow-y-auto max-h-80">
                  <div className="mb-3">
                    <span className="text-sm text-gray-600">요청:</span>
                    <p className="text-sm font-medium">{smartResultModal.title}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">결과:</span>
                    <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm whitespace-pre-wrap">{smartResultModal.content}</p>
                    </div>
                  </div>
                </div>
                <div className="p-4 border-t flex justify-end space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(smartResultModal.content);
                    }}
                  >
                    복사
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      setMessage(smartResultModal.content);
                      setSmartResultModal({ show: false, title: '', content: '' });
                    }}
                  >
                    메시지로 전송
                  </Button>
                </div>
              </div>
            </div>
          )}
          
          {/* 통합된 음성/텍스트 전송 버튼 */}
          <UnifiedSendButton
            onSendMessage={handleSendMessage}
            onVoiceRecordingComplete={handleVoiceRecordingComplete}
            message={message}
            disabled={sendMessageMutation.isPending || isProcessingVoice}
            isPending={sendMessageMutation.isPending}
            accessibilitySettings={accessibilitySettings}
          />
          </div>
        </div>
      </div>

      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        className="hidden"
        multiple={false}
      />

      {/* Add Friend Confirmation Modal */}
      {nonFriendUsers.length > 0 && (
        <AddFriendConfirmModal
          open={showAddFriendModal}
          onClose={(addedUserIds) => {
            setShowAddFriendModal(false);
            // 추가된 사용자들을 nonFriendUsers에서 즉시 제거
            if (addedUserIds && addedUserIds.length > 0) {
              setNonFriendUsers(prev => prev.filter(user => !addedUserIds.includes(user.id)));
            } else {
              setNonFriendUsers([]);
            }
            setFriendModalDismissed(true);
          }}
          users={nonFriendUsers}
        />
      )}

      {/* Message Context Menu */}
      <MessageContextMenu
        x={contextMenu.x}
        y={contextMenu.y}
        visible={contextMenu.visible}
        canEdit={contextMenu.message?.senderId === user?.id}
        onClose={() => setContextMenu({ ...contextMenu, visible: false })}
        onReplyMessage={() => {
          handleReplyMessage();
          setContextMenu({ ...contextMenu, visible: false });
        }}
        onEditMessage={() => {
          if (contextMenu.message) {
            setEditingMessage(contextMenu.message);
            setEditContent(contextMenu.message.content);
            setContextMenu({ ...contextMenu, visible: false });
          }
        }}
        onSaveMessage={() => {
          handleSaveMessage();
          setContextMenu({ ...contextMenu, visible: false });
        }}
        onTranslateMessage={() => {
          handleTranslateMessage(contextMenu.message);
          setContextMenu({ ...contextMenu, visible: false });
        }}
        onCopyText={() => {
          if (contextMenu.message?.content) {
            navigator.clipboard.writeText(contextMenu.message.content);
          }
          setContextMenu({ ...contextMenu, visible: false });
        }}
        onForwardMessage={() => {
          if (contextMenu.message) {
            setForwardMessageId(contextMenu.message.id);
            setShowForwardModal(true);
            setContextMenu({ ...contextMenu, visible: false });
          }
        }}
        onReaction={(emoji, emojiName) => {
          if (contextMenu.message) {
            addReactionMutation.mutate({ messageId: contextMenu.message.id, emoji, emojiName });
            setContextMenu({ ...contextMenu, visible: false });
          }
        }}
      />

      {/* 욕설 방지 모달 */}
      {showProfanityModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="text-center mb-4">
              <div className="w-16 h-16 mx-auto mb-4 bg-yellow-100 rounded-full flex items-center justify-center">
                <span className="text-2xl">⚠️</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                정말 욕설을 올리시겠어요?
              </h3>
              <p className="text-gray-600">
                메시지 전송을 다시 생각해보세요.
              </p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowProfanityModal(false);
                  setProfanityMessage("");
                }}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
              >
                취소
              </button>
              <button
                onClick={handleProfanityConfirm}
                className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
              >
                전송
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Language Selection Modal */}
      <LanguageSelectionModal
        open={showLanguageModal}
        onClose={() => setShowLanguageModal(false)}
        originalText={textToTranslate}
        onTranslate={handleCommandTranslate}
      />

      {/* Translate Modal */}
      <TranslateModal
        open={showTranslateModal}
        onClose={() => setShowTranslateModal(false)}
        originalText={messageToTranslate?.content || ""}
        onTranslate={handleTranslate}
        isTranslating={isTranslating}
      />

      {/* Calculator Preview Modal */}
      <CalculatorPreviewModal
        open={showCalculatorModal}
        onClose={() => setShowCalculatorModal(false)}
        expression={calculatorData.expression}
        result={calculatorData.result}
        onSendToChat={handleSendCalculatorResult}
      />

      {/* Poll Creation Modal */}
      <PollCreationModal
        open={showPollModal}
        onClose={() => setShowPollModal(false)}
        question={pollQuestion}
        onCreatePoll={handleCreatePoll}
      />

      {/* Poll Detail Modal */}
      {activePoll && (
        <PollDetailModal
          open={showPollDetailModal}
          onClose={() => setShowPollDetailModal(false)}
          pollData={activePoll}
          userVote={userVote}
          voteResults={pollVotes}
          totalParticipants={currentChatRoom?.participants?.length || 1}
          onVote={(optionIndex) => {
            // 중복 투표 방지: 이미 투표한 사용자는 투표할 수 없음
            if (userVote !== null) {
              return;
            }

            // 투표 처리
            console.log('Vote submitted:', optionIndex);
            
            // 사용자 투표 상태 업데이트
            setUserVote(optionIndex);
            setVotedUsers(prev => new Set([...Array.from(prev), user!.id]));
            
            // 투표 결과 업데이트
            setPollVotes(prev => ({
              ...prev,
              [optionIndex]: (prev[optionIndex] || 0) + 1
            }));
          }}
        />
      )}

      {/* Smart Result Modal */}
      <Dialog open={smartResultModal.show} onOpenChange={(open) => setSmartResultModal(prev => ({ ...prev, show: open }))}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{smartResultModal.title}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <p className="text-sm whitespace-pre-wrap">{smartResultModal.content}</p>
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={() => setSmartResultModal({ show: false, title: '', content: '' })}
            >
              닫기
            </Button>
            <Button
              onClick={() => {
                if (smartResultModal.content && smartResultModal.content !== '잠시만 기다려주세요...') {
                  sendMessageMutation.mutate({
                    content: smartResultModal.content,
                    messageType: "text"
                  });
                }
                setSmartResultModal({ show: false, title: '', content: '' });
              }}
              disabled={!smartResultModal.content || smartResultModal.content === '잠시만 기다려주세요...'}
            >
              채팅으로 전송
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Message Context Menu */}
      <MessageContextMenu
        visible={contextMenu.visible}
        x={contextMenu.x}
        y={contextMenu.y}
        onClose={() => setContextMenu({ visible: false, x: 0, y: 0, message: null })}
        onSaveMessage={handleSaveMessage}
        onReplyMessage={handleReplyMessage}
        onTranslateMessage={() => handleTranslateMessage()}
        onEditMessage={contextMenu.message?.senderId === user?.id ? () => handleEditMessage(contextMenu.message) : undefined}
        onCopyText={handleCopyText}
        onForwardMessage={() => {
          if (contextMenu.message) {
            setForwardMessageId(contextMenu.message.id);
            setShowForwardModal(true);
            setContextMenu({ visible: false, x: 0, y: 0, message: null });
          }
        }}
        onReaction={(emoji, emojiName) => {
          if (contextMenu.message) {
            addReactionMutation.mutate({ messageId: contextMenu.message.id, emoji, emojiName });
            setContextMenu({ visible: false, x: 0, y: 0, message: null });
          }
        }}
        canEdit={contextMenu.message?.senderId === user?.id}
      />

      {/* Forward Message Modal */}
      <ForwardMessageModal
        isOpen={showForwardModal}
        onClose={() => {
          setShowForwardModal(false);
          setForwardMessageId(null);
        }}
        onForward={async (chatRoomIds) => {
          if (forwardMessageId) {
            await forwardMessageMutation.mutateAsync({ messageId: forwardMessageId, chatRoomIds });
          }
        }}
        messagePreview={
          forwardMessageId
            ? messages?.find((m: any) => m.id === forwardMessageId)?.content || ""
            : ""
        }
      />

      {/* File Upload Modal with Hashtag Support */}
      <FileUploadModal
        isOpen={showFileUploadModal}
        onClose={() => setShowFileUploadModal(false)}
        onUpload={handleFileUploadWithHashtags}
        maxFiles={10}
      />

      {/* Location Share Modal */}
      <LocationShareModal
        isOpen={showLocationShareModal}
        onClose={() => setShowLocationShareModal(false)}
        chatRoomId={chatRoomId}
        requestId={locationRequestId}
      />

      {/* AI Chat Assistant Modal */}
      <AIChatAssistantModal
        isOpen={showAIAssistantModal}
        onClose={() => setShowAIAssistantModal(false)}
        chatRoomId={chatRoomId}
      />

      <AiNoticesModal
        open={showAiNoticesModal}
        onOpenChange={setShowAiNoticesModal}
        chatRoomId={chatRoomId}
        onNoticeClick={(messageId) => {
          setShowAiNoticesModal(false);
          setTimeout(() => {
            const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
            if (messageElement) {
              messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
              messageElement.classList.add('bg-yellow-100');
              setTimeout(() => {
                messageElement.classList.remove('bg-yellow-100');
              }, 2000);
            }
          }, 100);
        }}
      />

      {/* Reminder Time Selection Modal */}
      <ReminderTimeModal
        isOpen={showReminderModal}
        onClose={() => {
          setShowReminderModal(false);
          setReminderText('');
        }}
        onSetReminder={handleSetReminder}
        reminderText={reminderText}
      />

      {/* Voice Message Preview Modal */}
      <VoiceMessagePreviewModal
        isOpen={showVoicePreview}
        onClose={() => setShowVoicePreview(false)}
        onSend={handleSendVoiceMessage}
        audioBlob={voicePreviewData.audioBlob}
        transcribedText={voicePreviewData.transcribedText}
        duration={voicePreviewData.duration}
        isProcessing={isProcessingVoice}
      />

      {/* Voice Message Confirm Modal */}
      {voiceConfirmData && (
        <VoiceMessageConfirmModal
          isOpen={showVoiceConfirmModal}
          onClose={() => {
            setShowVoiceConfirmModal(false);
            setVoiceConfirmData(null);
            setIsProcessingVoice(false);
          }}
          transcription={voiceConfirmData.transcription}
          audioUrl={voiceConfirmData.audioUrl}
          duration={voiceConfirmData.duration}
          chatRoomId={chatRoomId}
          onSend={async (editedText: string) => {
            try {
              const messageData: any = {
                content: editedText,
                messageType: "voice",
                fileUrl: voiceConfirmData.audioUrl,
                fileName: "voice_message.webm",
                fileSize: 0,
                voiceDuration: Math.round(voiceConfirmData.duration),
                detectedLanguage: "korean",
                confidence: "0.9"
              };

              if (replyToMessage) {
                messageData.replyToMessageId = replyToMessage.id;
                messageData.replyToContent = replyToMessage.messageType === 'voice' && replyToMessage.transcription 
                  ? replyToMessage.transcription 
                  : replyToMessage.content;
                messageData.replyToSender = replyToMessage.sender.displayName;
              }

              await sendMessageMutation.mutateAsync(messageData);
              
              setShowVoiceConfirmModal(false);
              setVoiceConfirmData(null);
              setReplyToMessage(null);
              setIsProcessingVoice(false);
            } catch (error) {
              console.error('❌ 음성 메시지 전송 실패:', error);
              setIsProcessingVoice(false);
              throw error;
            }
          }}
          onReRecord={() => {
            setShowVoiceConfirmModal(false);
            setVoiceConfirmData(null);
            setIsProcessingVoice(false);
          }}
        />
      )}

    </div>
  );
}
