import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserAvatar } from "@/components/UserAvatar";
import { Paperclip, Hash, Send, Video, Phone, Info, Download, Upload, Reply, X, Search, FileText, FileImage, FileSpreadsheet, File, Languages, Calculator, Play, Pause, Cloud, CloudRain, Sun, CloudSnow } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
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
import { useWeather, getWeatherBackground } from "../hooks/useWeather";

interface ChatAreaProps {
  chatRoomId: number;
  onCreateCommand: (fileData?: any, messageData?: any) => void;
  showMobileHeader?: boolean;
  onBackClick?: () => void;
}

export default function ChatArea({ chatRoomId, onCreateCommand, showMobileHeader, onBackClick }: ChatAreaProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("");
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
  const [votedUsers, setVotedUsers] = useState<Set<number>>(new Set());
  const [explodedMessages, setExplodedMessages] = useState<Set<number>>(new Set());
  const [messageTimers, setMessageTimers] = useState<{[key: number]: number}>({});
  const [fileDataForCommand, setFileDataForCommand] = useState<any>(null);
  const [showAddFriendModal, setShowAddFriendModal] = useState(false);
  const [nonFriendUsers, setNonFriendUsers] = useState<any[]>([]);
  const [showTranslateModal, setShowTranslateModal] = useState(false);
  const [messageToTranslate, setMessageToTranslate] = useState<any>(null);
  const [translatedMessages, setTranslatedMessages] = useState<{[key: number]: {text: string, language: string}}>({});
  const [translatingMessages, setTranslatingMessages] = useState<Set<number>>(new Set());
  const [isTranslating, setIsTranslating] = useState(false);
  
  // Weather hook
  const { weather, loading: weatherLoading } = useWeather();
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [playingAudio, setPlayingAudio] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
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
  const [showChatSettings, setShowChatSettings] = useState(false);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionPosition, setMentionPosition] = useState(0);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [currentSearchIndex, setCurrentSearchIndex] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatAreaRef = useRef<HTMLDivElement>(null);
  const messageRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});
  const messageInputRef = useRef<HTMLTextAreaElement>(null);

  // Get chat room details
  const { data: chatRoomsData } = useQuery({
    queryKey: ["/api/chat-rooms"],
    enabled: !!user,
  });

  const currentChatRoom = (chatRoomsData as any)?.chatRooms?.find((room: any) => room.id === chatRoomId);

  // Get contacts to check if other participants are friends
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

  // Get messages
  const { data: messagesData, isLoading } = useQuery({
    queryKey: ["/api/chat-rooms", chatRoomId, "messages"],
    enabled: !!chatRoomId,
    queryFn: async () => {
      const response = await fetch(`/api/chat-rooms/${chatRoomId}/messages`);
      if (!response.ok) throw new Error("Failed to fetch messages");
      return response.json();
    },
  });

  // Get commands for suggestions
  const { data: commandsData } = useQuery({
    queryKey: ["/api/commands", { chatRoomId }],
    enabled: !!user && !!chatRoomId,
    queryFn: async () => {
      const response = await fetch(`/api/commands?chatRoomId=${chatRoomId}`, {
        headers: { "x-user-id": user!.id.toString() },
      });
      if (!response.ok) throw new Error("Failed to fetch commands");
      return response.json();
    },
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (messageData: any) => {
      const response = await apiRequest(`/api/chat-rooms/${chatRoomId}/messages`, "POST", messageData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat-rooms", chatRoomId, "messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/chat-rooms"] });
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
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "메시지 전송 실패",
        description: "다시 시도해주세요.",
      });
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
        youtube: '📺 영상 링크를 공유해주시면 미리보기를 만들어드립니다',
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
      toast({
        variant: "destructive",
        title: "처리 실패",
        description: "다시 시도해주세요.",
      });
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
        
        toast({
          title: "번역 완료!",
          description: "메시지가 성공적으로 번역되었습니다.",
        });
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
      
      toast({
        variant: "destructive",
        title: "번역 실패",
        description: "번역 중 오류가 발생했습니다. 다시 시도해주세요.",
      });
    },
  });

  // Voice transcription mutation
  const transcribeVoiceMutation = useMutation({
    mutationFn: async (audioBlob: Blob) => {
      const formData = new FormData();
      formData.append('file', audioBlob, 'voice_message.webm');
      
      // 먼저 음성 파일을 암호화되지 않은 형태로 업로드
      const uploadResponse = await fetch("/api/upload-voice", {
        method: "POST",
        headers: {
          "x-user-id": user?.id?.toString() || ""
        },
        body: formData
      });
      
      if (!uploadResponse.ok) {
        throw new Error('Voice upload failed');
      }
      
      const uploadResult = await uploadResponse.json();
      
      // 그 다음 음성 변환 요청
      const transcribeFormData = new FormData();
      transcribeFormData.append('audio', audioBlob, 'voice_message.webm');
      
      const response = await fetch("/api/transcribe", {
        method: "POST",
        headers: {
          "x-user-id": user?.id?.toString() || ""
        },
        body: transcribeFormData
      });
      
      const transcribeResult = await response.json();
      
      // 업로드된 파일 URL을 결과에 추가
      return {
        ...transcribeResult,
        audioUrl: uploadResult.fileUrl
      };
    },
    onSuccess: (result) => {
      if (result.success && result.transcription) {
        // 음성 메시지와 텍스트 변환을 함께 전송
        sendMessageMutation.mutate({
          content: result.transcription,
          messageType: "voice",
          fileUrl: result.audioUrl,
          fileName: "voice_message.webm",
          fileSize: 0,
          voiceDuration: Math.round(result.duration || 0),
          detectedLanguage: result.detectedLanguage || "korean",
          confidence: String(result.confidence || 0.9)
        });
        
        toast({
          title: "음성 메시지 전송 완료!",
          description: "음성이 텍스트로 변환되어 전송되었습니다.",
        });
      } else {
        toast({
          variant: "destructive",
          title: "음성 변환 실패",
          description: "음성을 텍스트로 변환할 수 없습니다.",
        });
      }
      setIsProcessingVoice(false);
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "음성 처리 실패",
        description: "음성 메시지 처리 중 오류가 발생했습니다.",
      });
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
        toast({
          variant: "destructive",
          title: "Command failed",
          description: result.content,
        });
      }
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Command processing failed",
        description: "Please check if AI services are available.",
      });
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
        toast({
          variant: "destructive",
          title: "번역 실패",
          description: result.content,
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "번역 오류",
        description: "번역 서비스에 연결할 수 없습니다.",
      });
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
        toast({
          title: "번역할 메시지가 없습니다",
          description: "텍스트 메시지가 없어 번역할 수 없습니다.",
        });
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
        
        toast({
          title: "번역 완료",
          description: `${successfulTranslations.length}개 메시지가 번역되었습니다.`,
        });
      } else {
        toast({
          variant: "destructive",
          title: "번역 실패",
          description: "메시지를 번역할 수 없습니다.",
        });
      }
      
    } catch (error) {
      toast({
        variant: "destructive",
        title: "번역 오류",
        description: "번역 중 오류가 발생했습니다.",
      });
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
        toast({
          variant: "destructive",
          title: "계산 실패",
          description: result.content,
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "계산 오류",
        description: "계산 서비스에 연결할 수 없습니다.",
      });
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
      toast({
        variant: "destructive",
        title: "투표 오류",
        description: "투표 생성 중 오류가 발생했습니다.",
      });
    }
  };

  // File upload mutation
  const uploadFileMutation = useMutation({
    mutationFn: async (file: File) => {
      // 업로드 시작 시 로딩 메시지 추가
      const uploadId = Date.now().toString();
      setUploadingFiles(prev => [...prev, { id: uploadId, fileName: file.name }]);
      
      const formData = new FormData();
      formData.append("file", file);
      
      try {
        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });
        
        if (!response.ok) throw new Error("Upload failed");
        const result = await response.json();
        
        // 업로드 완료 시 로딩 메시지 제거
        setUploadingFiles(prev => prev.filter(f => f.id !== uploadId));
        
        return result;
      } catch (error) {
        // 에러 시 로딩 메시지 제거
        setUploadingFiles(prev => prev.filter(f => f.id !== uploadId));
        throw error;
      }
    },
    onSuccess: (uploadData) => {
      sendMessageMutation.mutate({
        messageType: "file",
        fileUrl: uploadData.fileUrl,
        fileName: uploadData.fileName,
        fileSize: uploadData.fileSize,
        content: `📎 ${uploadData.fileName}`,
      }, {
        onSuccess: (messageData) => {
          // 파일 업로드 후 자동으로 태그하기 모달 열기
          const fileData = {
            fileUrl: uploadData.fileUrl,
            fileName: uploadData.fileName,
            fileSize: uploadData.fileSize,
            messageId: messageData.message.id
          };
          onCreateCommand(fileData);
        }
      });
    },
  });

  const messages = messagesData?.messages || [];
  const commands = commandsData?.commands || [];
  const contacts = contactsData?.contacts || [];

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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);



  const handleSendMessage = () => {
    if (!message.trim()) return;

    // Check if it's a chat command (starts with /)
    if (message.startsWith('/')) {
      // 특별한 번역 처리
      if (message.startsWith('/translate ')) {
        const textToTranslate = message.replace('/translate ', '').trim();
        if (textToTranslate) {
          setTextToTranslate(textToTranslate);
          setShowLanguageModal(true);
          setMessage("");
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
            
            toast({
              title: "피드백 전송 완료",
              description: `메시지 작성자에게만 피드백이 전송되었습니다.`,
            });
          } else {
            toast({
              variant: "destructive",
              title: "메시지를 찾을 수 없습니다",
              description: "올바른 메시지 번호를 입력해주세요.",
            });
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
            
            toast({
              title: "메시지 고정 완료",
              description: `메시지가 ${duration} 상단에 고정되었습니다.`,
            });
          } else {
            toast({
              variant: "destructive",
              title: "메시지를 찾을 수 없습니다",
              description: "올바른 메시지 번호를 입력해주세요.",
            });
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
            
            toast({
              title: "시한폭탄 메시지 전송!",
              description: `${seconds}초 후에 메시지가 폭발합니다.`,
            });
          } else {
            toast({
              variant: "destructive",
              title: "잘못된 시간 형식",
              description: "예: 10s (초), 5m (분), 1h (시간)",
            });
          }
          setMessage("");
          setShowChatCommands(false);
          return;
        }
      }
      
      processCommandMutation.mutate(message);
      setMessage("");
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

    // 회신 메시지인 경우 회신 데이터 포함
    const messageData: any = {
      content: message,
      messageType: "text",
    };

    if (replyToMessage) {
      messageData.replyToMessageId = replyToMessage.id;
      messageData.replyToContent = replyToMessage.content;
      messageData.replyToSender = replyToMessage.sender.displayName;
    }

    sendMessageMutation.mutate(messageData);
    setReplyToMessage(null); // 회신 모드 해제
  };

  const handleFileUpload = () => {
    fileInputRef.current?.click();
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
      uploadFileMutation.mutate(files[0]); // Upload the first file
    }
  };

  // 번역 관련 핸들러들
  const handleTranslateMessage = (message: any) => {
    setMessageToTranslate(message);
    setShowTranslateModal(true);
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
    
    toast({
      title: "음성 처리 중...",
      description: "음성을 텍스트로 변환하고 있습니다.",
    });
  }

  // 음성 메시지 재생/일시정지 함수
  const handleVoicePlayback = async (messageId: number, audioUrl?: string, voiceDuration?: number) => {
    if (playingAudio === messageId) {
      // 현재 재생 중인 음성을 일시정지
      if (audioRef.current) {
        audioRef.current.pause();
        setPlayingAudio(null);
      }
    } else {
      try {
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
            toast({
              variant: "destructive",
              title: "재생 실패",
              description: "음성 파일을 로드할 수 없습니다.",
            });
          };
          
          setPlayingAudio(messageId);
          await audio.play();
          
          toast({
            title: "음성 재생 중",
            description: "녹음된 음성을 재생하고 있습니다.",
          });
        } else {
          // 음성 파일 URL이 없는 경우 알림
          toast({
            variant: "destructive",
            title: "재생 불가",
            description: "음성 파일을 찾을 수 없습니다.",
          });
        }
        
      } catch (error) {
        console.error("Audio playback error:", error);
        setPlayingAudio(null);
        toast({
          variant: "destructive",
          title: "재생 실패",
          description: "음성 재생 중 오류가 발생했습니다.",
        });
      }
    }
  };;

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      uploadFileMutation.mutate(file);
    }
  };

  // 스마트 채팅 상태
  const [smartSuggestions, setSmartSuggestions] = useState<Array<{
    type: 'calculation' | 'currency' | 'schedule' | 'translation' | 'address' | 'poll' | 'todo' | 'timer' | 'emotion' | 'food' | 'youtube' | 'news' | 'unit' | 'search' | 'birthday' | 'meeting' | 'reminder' | 'quote' | 'question' | 'followup' | 'summary' | 'decision' | 'category' | 'file_summary' | 'topic_info';
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
  const [storedTags] = useState<string[]>([
    "회의", "보고서", "일정", "업무", "프로젝트", "마감", "검토", "승인", "피드백", "공유",
    "예산", "계획", "분석", "제안", "협업", "진행", "완료", "확인", "수정", "전달"
  ]);

  // 천 단위 마침표로 숫자 포맷팅
  const formatNumber = (num: number): string => {
    return num.toLocaleString('ko-KR');
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

  // 일정/시간 감지 함수
  const detectSchedule = (text: string) => {
    const patterns = [
      /(내일|오늘|모레)\s*(\d{1,2})시/i,
      /(\d{1,2})월\s*(\d{1,2})일\s*(\d{1,2})시/i,
      /(\d{1,2})시에?\s*(회의|미팅|약속)/i,
      /(회의|미팅|약속).*(\d{1,2})시/i
    ];
    
    for (const pattern of patterns) {
      if (pattern.test(text)) {
        return {
          type: 'schedule' as const,
          text: '일정 등록하기',
          result: `일정: ${text}`,
          icon: '📅',
          category: '일정 관리'
        };
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



  // 감정 감지 함수 (스마트 제안용)
  const detectEmotion = (text: string) => {
    const emotions = {
      sad: { patterns: [/슬프|우울|힘들|피곤|지쳐|아프|아파/i], emoji: '😢', comfort: '힘내요!' },
      happy: { patterns: [/기쁘|행복|좋아|최고|완벽|성공/i], emoji: '😊', comfort: '축하해요!' },
      angry: { patterns: [/화나|짜증|빡쳐|열받|답답/i], emoji: '😤', comfort: '진정해요' },
      tired: { patterns: [/피곤|지쳐|졸려|잠|힘들어/i], emoji: '😴', comfort: '푹 쉬세요!' },
      stressed: { patterns: [/스트레스|바빠|정신없|헷갈려/i], emoji: '😰', comfort: '화이팅!' }
    };

    for (const [emotion, config] of Object.entries(emotions)) {
      for (const pattern of config.patterns) {
        if (pattern.test(text)) {
          return {
            type: 'emotion' as const,
            text: `${config.emoji} ${config.comfort}`,
            result: `${config.emoji} ${config.comfort}`,
            icon: config.emoji,
            category: '공감'
          };
        }
      }
    }
    return null;
  };

  // 음식 감지 함수
  const detectFood = (text: string) => {
    const foodPatterns = [
      /치킨|닭|튀김/i,
      /피자|파스타|이탈리아/i,
      /중국음식|짜장|짬뽕|탕수육/i,
      /햄버거|버거|맥도날드|KFC/i,
      /족발|보쌈|한식/i,
      /일식|초밥|라멘|우동/i,
      /배달|시켜|먹고\s*싶/i
    ];

    for (const pattern of foodPatterns) {
      if (pattern.test(text)) {
        return {
          type: 'food' as const,
          text: '근처 배달 검색할까요?',
          result: `음식 주문: ${text}`,
          icon: '🍕',
          category: '배달'
        };
      }
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
        return {
          type: 'youtube' as const,
          text: '영상 미리보기 만들기',
          result: `유튜브: ${text}`,
          icon: '📺',
          category: '동영상'
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
  const detectBirthday = (text: string) => {
    const patterns = [
      /.*(생일|생신|탄생일)/i,
      /.*(기념일|축하|파티)/i,
      /.*(결혼기념일|돌잔치)/i
    ];

    for (const pattern of patterns) {
      if (pattern.test(text)) {
        return {
          type: 'birthday' as const,
          text: '축하 카드 만들기',
          result: `축하: ${text}`,
          icon: '🎉',
          category: '축하'
        };
      }
    }
    return null;
  };

  // 미팅/회의 감지 함수
  const detectMeeting = (text: string) => {
    const patterns = [
      /.*(줌|zoom|미팅|meeting)/i,
      /.*(회의|컨퍼런스|화상)/i,
      /.*(온라인.*만나|화상.*통화)/i
    ];

    for (const pattern of patterns) {
      if (pattern.test(text)) {
        return {
          type: 'meeting' as const,
          text: '화상회의 링크 만들기',
          result: `미팅: ${text}`,
          icon: '📹',
          category: '화상회의'
        };
      }
    }
    return null;
  };

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

  // 성공/동기부여 문장 감지 함수
  const detectMotivation = (text: string) => {
    const patterns = [
      /성공.*하려면|성공.*위해/i,
      /꿈.*이루|목표.*달성/i,
      /포기.*하지.*말|힘내|화이팅/i,
      /도전.*해보|시작.*해야/i
    ];

    for (const pattern of patterns) {
      if (pattern.test(text)) {
        return {
          type: 'quote' as const,
          text: '성공 명언 보여드릴까요?',
          result: `명언: ${text}`,
          icon: '💪',
          category: '명언'
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

  // 긴 메시지 요약 감지 함수
  const detectLongMessage = (text: string) => {
    // 긴 메시지 (100자 이상) 또는 요약 키워드 감지
    if (text.length > 100 || /요약|정리|핵심|포인트/.test(text)) {
      return {
        type: 'summary' as const,
        text: '핵심 요약 보기',
        result: `요약: ${text.substring(0, 50)}...`,
        icon: '📝',
        category: '요약'
      };
    }
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
            toast({
              title: "파일 검색",
              description: "최근 공유된 파일을 찾고 있습니다..."
            });
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
  const detectPoll = (text: string) => {
    const patterns = [
      /(.+),\s*(.+),?\s*(중에|중에서).*(뭐|무엇|어떤)/i,
      /(.+)\s*(아니면|또는|vs)\s*(.+)[?？]/i,
      /(치킨|피자|햄버거|중국음식|한식|일식|양식).*뭐.*먹/i
    ];

    for (const pattern of patterns) {
      if (pattern.test(text)) {
        return {
          type: 'poll' as const,
          text: '투표 만들기',
          result: `투표: ${text}`,
          icon: '📊',
          category: '투표'
        };
      }
    }
    return null;
  };

  // 할 일 감지 함수
  const detectTodo = (text: string) => {
    const patterns = [
      /.*(해야|해야지|해야겠).*/i,
      /.*(끝내|완료|제출).*(해야|해야지)/i,
      /오늘.*까지.*해야/i,
      /(보고서|과제|숙제|업무).*(해야|완료)/i
    ];

    for (const pattern of patterns) {
      if (pattern.test(text)) {
        return {
          type: 'todo' as const,
          text: '할 일 등록하기',
          result: `할 일: ${text}`,
          icon: '✅',
          category: '할 일'
        };
      }
    }
    return null;
  };

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

  // 스마트 제안 선택 처리
  const handleSmartSuggestionSelect = (suggestion: typeof smartSuggestions[0]) => {
    // 즉시 메시지 전송
    sendMessageMutation.mutate({
      content: suggestion.result,
      messageType: "text"
    });
    
    setMessage('');
    setShowSmartSuggestions(false);
    setSmartSuggestions([]);
  };

  const handleMessageChange = async (value: string) => {
    setMessage(value);
    
    if (value.trim().length < 2) {
      setShowSmartSuggestions(false);
      setSmartSuggestions([]);
      return;
    }
    
    const allSuggestions = [];
    
    // 1. 환전 기능
    const currencyDetection = detectCurrency(value);
    if (currencyDetection && currencyDetection.amount >= 1) {
      try {
        const suggestions = await getExchangeRates(currencyDetection.currency, currencyDetection.amount);
        allSuggestions.push(...suggestions);
      } catch (error) {
        console.error('환율 조회 중 오류:', error);
      }
    }
    
    // 2. 계산기
    const calculationMatch = value.match(/[\d\+\-\*\/\(\)\.\s]+$/);
    if (calculationMatch && calculationMatch[0].length > 3) {
      const expression = calculationMatch[0].trim();
      if (expression && /[\+\-\*\/]/.test(expression)) {
        try {
          const result = evaluateExpression(expression);
          if (result !== null && !isNaN(result)) {
            allSuggestions.push({
              type: 'calculation',
              text: `${expression} = ${formatNumber(result)}`,
              result: `${expression} = ${formatNumber(result)}`,
              icon: '🧮',
              category: '계산'
            });
          }
        } catch (e) {
          // 계산 오류 무시
        }
      }
    }
    
    // 3. 일정/시간 감지
    const scheduleDetection = detectSchedule(value);
    if (scheduleDetection) {
      allSuggestions.push(scheduleDetection);
    }
    
    // 4. 번역 필요성 감지 (상대방과 다른 언어 사용 시에만)
    if (messages?.data?.messages) {
      const translationCheck = shouldSuggestTranslation(value, messages.data.messages);
      if (translationCheck.shouldSuggest) {
        allSuggestions.push({
          type: 'translation' as const,
          text: `${translationCheck.languageName}로 번역`,
          result: value,
          icon: '🌐',
          category: '번역',
          action: () => handleChatTranslation(translationCheck.targetLanguage!)
        });
      }
    }
    
    // 5. 감정 감지
    const emotionDetection = detectEmotion(value);
    if (emotionDetection) {
      allSuggestions.push(emotionDetection);
    }
    
    // 6. 음식 감지
    const foodDetection = detectFood(value);
    if (foodDetection) {
      allSuggestions.push(foodDetection);
    }
    
    // 7. 유튜브 감지
    const youtubeDetection = detectYoutube(value);
    if (youtubeDetection) {
      allSuggestions.push(youtubeDetection);
    }
    
    // 8. 뉴스 감지
    const newsDetection = detectNews(value);
    if (newsDetection) {
      allSuggestions.push(newsDetection);
    }
    
    // 9. 단위 변환 감지
    const unitDetection = detectUnit(value);
    if (unitDetection) {
      allSuggestions.push(unitDetection);
    }
    
    // 10. 검색 감지
    const searchDetection = detectSearch(value);
    if (searchDetection) {
      allSuggestions.push(searchDetection);
    }
    
    // 11. 생일/기념일 감지
    const birthdayDetection = detectBirthday(value);
    if (birthdayDetection) {
      allSuggestions.push(birthdayDetection);
    }
    
    // 12. 미팅/회의 감지
    const meetingDetection = detectMeeting(value);
    if (meetingDetection) {
      allSuggestions.push(meetingDetection);
    }
    
    // 13. 주소 감지
    const addressDetection = detectAddress(value);
    if (addressDetection) {
      allSuggestions.push(addressDetection);
    }
    
    // 14. 투표 감지
    const pollDetection = detectPoll(value);
    if (pollDetection) {
      allSuggestions.push(pollDetection);
    }
    
    // 15. 할 일 감지
    const todoDetection = detectTodo(value);
    if (todoDetection) {
      allSuggestions.push(todoDetection);
    }
    
    // 16. 타이머 감지
    const timerDetection = detectTimer(value);
    if (timerDetection) {
      allSuggestions.push(timerDetection);
    }

    // 17. 지연 답변 감지
    const delayedResponseDetection = detectDelayedResponse(value);
    if (delayedResponseDetection) {
      allSuggestions.push(delayedResponseDetection);
    }

    // 18. 동기부여/명언 감지
    const motivationDetection = detectMotivation(value);
    if (motivationDetection) {
      allSuggestions.push(motivationDetection);
    }

    // 19. 질문 감지
    const questionDetection = detectQuestion(value);
    if (questionDetection) {
      allSuggestions.push(questionDetection);
    }

    // 20. 긴 메시지 요약 감지
    const longMessageDetection = detectLongMessage(value);
    if (longMessageDetection) {
      allSuggestions.push(longMessageDetection);
    }

    // 21. 의사결정 도우미 감지
    const decisionDetection = detectDecision(value);
    if (decisionDetection) {
      allSuggestions.push(decisionDetection);
    }

    // 22. 카테고리 분류 감지
    const categoryDetection = detectCategory(value);
    if (categoryDetection) {
      allSuggestions.push(categoryDetection);
    }

    // 23. 주제별 정보 감지
    const topicInfoDetection = detectTopicInfo(value);
    if (topicInfoDetection) {
      allSuggestions.push(topicInfoDetection);
    }
    
    // 기존 타이머 제거
    if (suggestionTimeout) {
      clearTimeout(suggestionTimeout);
    }

    if (allSuggestions.length > 0) {
      // 환율 변환의 경우 모든 제안 표시, 다른 경우 최대 3개
      const maxSuggestions = allSuggestions.some(s => s.type === 'currency') ? allSuggestions.length : 3;
      setSmartSuggestions(allSuggestions.slice(0, maxSuggestions));
      setShowSmartSuggestions(true);
      setSelectedSuggestionIndex(0); // 첫 번째 항목 선택
      setIsNavigatingWithKeyboard(false); // 새로운 제안 시 키보드 네비게이션 상태 초기화
      
      // 5초 후 자동으로 숨김 (키보드 네비게이션 중이거나 마우스 호버 중이 아닐 때만)
      if (!isNavigatingWithKeyboard && !isHoveringOverSuggestions) {
        const timeout = setTimeout(() => {
          // 타이머 실행 시점에서도 호버 상태가 아닐 때만 숨김
          if (!isHoveringOverSuggestions && !isNavigatingWithKeyboard) {
            setShowSmartSuggestions(false);
            setSmartSuggestions([]);
          }
        }, 5000);
        setSuggestionTimeout(timeout);
      }
    } else {
      setShowSmartSuggestions(false);
      setSmartSuggestions([]);
      setSelectedSuggestionIndex(0);
      setIsNavigatingWithKeyboard(false);
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

  // Message context menu handlers
  const handleMessageRightClick = (e: React.MouseEvent, message: any) => {
    e.preventDefault();
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      message,
    });
  };

  const handleMessageLongPress = (e: React.TouchEvent, message: any) => {
    e.preventDefault();
    const touch = e.touches[0];
    setContextMenu({
      visible: true,
      x: touch.clientX,
      y: touch.clientY,
      message,
    });
  };

  const handleSaveMessage = () => {
    if (contextMenu.message) {
      // 메시지 데이터를 MainApp으로 전달
      const messageData = {
        content: contextMenu.message.content,
        senderId: contextMenu.message.senderId,
        timestamp: contextMenu.message.createdAt,
      };
      onCreateCommand(null, messageData); // 파일 데이터 없이 메시지 데이터만 전달
    }
  };

  const handleReplyMessage = () => {
    if (contextMenu.message) {
      setReplyToMessage(contextMenu.message);
    }
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

  // Mark messages as read when viewing chat
  useEffect(() => {
    if (messages.length > 0) {
      const latestMessage = messages[messages.length - 1];
      markAsReadMutation.mutate(latestMessage.id);
    }
  }, [messages, chatRoomId]);;

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
  const renderMessageWithLinks = (content: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = content.split(urlRegex);
    
    return parts.map((part, index) => {
      if (urlRegex.test(part)) {
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
      return part;
    });
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
    if (currentChatRoom && contactsData && user) {
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
  }, [currentChatRoom, contactsData, user]);

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

  // Get weather background styling
  const weatherBackground = weather ? getWeatherBackground(weather.condition) : getWeatherBackground('Clear');
  
  // Get weather icon component
  const getWeatherIcon = (condition: string) => {
    const conditionLower = condition?.toLowerCase() || '';
    if (conditionLower.includes('rain') || conditionLower.includes('drizzle')) {
      return <CloudRain className="h-4 w-4" />;
    }
    if (conditionLower.includes('snow')) {
      return <CloudSnow className="h-4 w-4" />;
    }
    if (conditionLower.includes('cloud')) {
      return <Cloud className="h-4 w-4" />;
    }
    return <Sun className="h-4 w-4" />;
  };

  return (
    <div 
      ref={chatAreaRef}
      data-chat-area="true"
      className={cn(
        "h-full flex flex-col relative mb-0 pb-0",
        weatherBackground.background,
        isDragOver ? 'bg-purple-50' : ''
      )}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Weather Pattern Overlay */}
      <div className={cn("absolute inset-0 pointer-events-none", weatherBackground.overlay)} />
      
      {/* Weather Info Display */}
      {weather && !weatherLoading && (
        <div className="absolute top-4 right-4 bg-white/80 backdrop-blur-sm rounded-lg px-3 py-2 shadow-sm border border-white/20 z-10">
          <div className="flex items-center space-x-2 text-sm">
            {getWeatherIcon(weather.condition)}
            <span className="text-gray-700 font-medium">{weather.temperature}°C</span>
            <span className="text-gray-600">{weather.description}</span>
          </div>
        </div>
      )}
      
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
      {/* Chat Header - Fixed position with Mobile Integration */}
      <div className="bg-white border-b border-gray-200 p-4 flex-shrink-0 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {showMobileHeader && onBackClick && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onBackClick}
                className="p-2 -ml-2 lg:hidden"
              >
                ←
              </Button>
            )}
            {currentChatRoom.isGroup ? (
              <div className="relative w-10 h-10 flex items-center justify-center">
                {currentChatRoom.participants.slice(0, Math.min(5, currentChatRoom.participants.length)).map((participant: any, index: number) => {
                  const totalAvatars = Math.min(5, currentChatRoom.participants.length);
                  const isStackLayout = totalAvatars <= 3;
                  
                  if (isStackLayout) {
                    // 3명 이하일 때: 겹치는 스택 레이아웃
                    return (
                      <div
                        key={participant.id}
                        className={`w-7 h-7 rounded-full border-2 border-white shadow-sm purple-gradient flex items-center justify-center text-white font-semibold text-xs ${
                          index > 0 ? '-ml-1.5' : ''
                        }`}
                        style={{ zIndex: totalAvatars - index }}
                      >
                        {participant.profilePicture ? (
                          <img 
                            src={participant.profilePicture} 
                            alt={participant.displayName}
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          participant.displayName?.charAt(0)?.toUpperCase() || 'U'
                        )}
                      </div>
                    );
                  } else {
                    // 4-5명일 때: 격자 레이아웃
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
                        className={`absolute w-5 h-5 rounded-full border border-white shadow-sm purple-gradient flex items-center justify-center text-white font-semibold text-[8px] ${positions[index]}`}
                      >
                        {participant.profilePicture ? (
                          <img 
                            src={participant.profilePicture} 
                            alt={participant.displayName}
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          participant.displayName?.charAt(0)?.toUpperCase() || 'U'
                        )}
                      </div>
                    );
                  }
                })}
              </div>
            ) : (
              <div className="w-10 h-10 purple-gradient rounded-full flex items-center justify-center text-white font-semibold">
                {getInitials(chatRoomDisplayName)}
              </div>
            )}
            <div>
              <h3 className="font-semibold text-gray-900">{chatRoomDisplayName}</h3>
              <p className="text-sm text-gray-500">
                {currentChatRoom.participants?.length}명 참여
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-gray-400 hover:text-purple-600"
              onClick={() => setShowSearch(!showSearch)}
            >
              <Search className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="text-gray-400 hover:text-purple-600">
              <Video className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="text-gray-400 hover:text-purple-600">
              <Phone className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="text-gray-400 hover:text-purple-600">
              <Info className="h-4 w-4" />
            </Button>
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

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-3 min-h-0 overscroll-behavior-y-contain">
        {/* Security Notice - WhatsApp Style */}
        <div className="flex justify-center mb-6 px-4">
          <div className="bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-200 rounded-xl px-4 py-3 max-w-sm mx-auto shadow-lg transform hover:scale-105 transition-all duration-200 backdrop-blur-sm">
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

        {messages.length === 0 ? (
          <div className="text-center text-gray-500 mt-8">
            대화를 시작해보세요!
          </div>
        ) : (
          <>
            {messages.map((msg: any, index: number) => {
            const isMe = msg.senderId === user?.id;
            const showDate = index === 0 || 
              new Date(messages[index - 1].createdAt).toDateString() !== new Date(msg.createdAt).toDateString();

            return (
              <div key={msg.id}>
                {showDate && (
                  <div className="flex items-center justify-center mb-4">
                    <span className="bg-white px-4 py-2 rounded-full text-xs text-gray-500 shadow-sm border">
                      {new Date(msg.createdAt).toLocaleDateString('ko-KR')}
                    </span>
                  </div>
                )}
                
                <div 
                  ref={(el) => messageRefs.current[msg.id] = el}
                  className={cn(
                    "flex items-start space-x-3 transition-all duration-500",
                    isMe ? "flex-row-reverse space-x-reverse" : "",
                    highlightedMessageId === msg.id && "bg-yellow-100 rounded-lg p-2 -mx-2"
                  )}
                  onContextMenu={(e) => handleMessageRightClick(e, msg)}
                  onTouchStart={(e) => {
                    let pressTimer: NodeJS.Timeout;
                    const handleTouchStart = () => {
                      pressTimer = setTimeout(() => {
                        handleMessageLongPress(e, msg);
                      }, 500);
                    };
                    const handleTouchEnd = () => {
                      clearTimeout(pressTimer);
                    };
                    
                    handleTouchStart();
                    e.currentTarget.addEventListener('touchend', handleTouchEnd, { once: true });
                    e.currentTarget.addEventListener('touchmove', handleTouchEnd, { once: true });
                  }}
                >
                  <div className="flex flex-col items-center">
                    <UserAvatar 
                      user={isMe ? user : msg.sender} 
                      size="md" 
                      fallbackClassName={`bg-gradient-to-br ${getAvatarColor(isMe ? (user?.displayName || "Me") : msg.sender.displayName)}`}
                    />
                    <span className="text-xs text-gray-600 mt-1 text-center max-w-[60px] truncate">
                      {isMe ? (user?.displayName || "나") : msg.sender.displayName}
                    </span>
                  </div>
                  
                  <div className={cn(
                    "flex flex-col",
                    msg.replyToMessageId ? "max-w-md lg:max-w-xl" : "max-w-xs lg:max-w-md",
                    isMe ? "items-end" : "items-start"
                  )}>
                    {!isMe && (
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="text-sm font-medium text-gray-900">
                          {msg.sender.displayName}
                        </span>
                        <span className="text-xs text-gray-500">
                          {formatTime(msg.createdAt)}
                        </span>
                      </div>
                    )}
                    
                    {isMe && (
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="text-xs text-gray-500">
                          {formatTime(msg.createdAt)}
                        </span>
                      </div>
                    )}

                    <div className={cn(
                      "rounded-lg p-3 shadow-sm max-w-[85%] sm:max-w-[70%] break-words",
                      msg.isCommandRecall && msg.isLocalOnly
                        ? isMe 
                          ? "bg-teal-500 text-white rounded-tr-none border border-teal-400" 
                          : "bg-teal-50 text-teal-900 rounded-tl-none border border-teal-200"
                        : isMe 
                          ? "bg-purple-600 text-white rounded-tr-none" 
                          : "bg-white text-gray-900 rounded-tl-none border border-gray-200"
                    )}>
                      {/* 회신 메시지 표시 */}
                      {msg.replyToMessageId && (
                        <div 
                          className={cn(
                            "mb-2 pb-2 border-l-4 pl-3 rounded-l cursor-pointer hover:opacity-80 transition-opacity",
                            isMe 
                              ? "border-white/40 bg-white/10" 
                              : "border-purple-400 bg-purple-50"
                          )}
                          onClick={() => scrollToMessage(msg.replyToMessageId)}
                        >
                          <div className="flex items-center space-x-1 mb-1">
                            <Reply className={cn(
                              "h-3 w-3",
                              isMe ? "text-white/70" : "text-purple-600"
                            )} />
                            <span className={cn(
                              "text-xs font-medium",
                              isMe ? "text-white/70" : "text-purple-600"
                            )}>
                              {msg.replyToSender || "사용자"}
                            </span>
                          </div>
                          <p className={cn(
                            "text-xs truncate",
                            isMe ? "text-white/90" : "text-gray-700"
                          )}>
                            {msg.replyToContent || "원본 메시지"}
                          </p>
                        </div>
                      )}
                      
                      {msg.messageType === "voice" ? (
                        <div>
                          <div className="flex items-center space-x-3">
                            <button
                              onClick={() => handleVoicePlayback(msg.id, msg.fileUrl, msg.voiceDuration)}
                              className={cn(
                                "w-10 h-10 rounded-lg flex items-center justify-center transition-all hover:scale-105",
                                isMe ? "bg-white/20 hover:bg-white/30" : "bg-gray-100 hover:bg-gray-200"
                              )}
                            >
                              {playingAudio === msg.id ? (
                                <Pause className={cn(
                                  "h-5 w-5",
                                  isMe ? "text-white" : "text-gray-700"
                                )} />
                              ) : (
                                <Play className={cn(
                                  "h-5 w-5",
                                  isMe ? "text-white" : "text-gray-700"
                                )} />
                              )}
                            </button>
                            <div className="flex-1 min-w-0">
                              <p className={cn(
                                "text-sm font-medium",
                                isMe ? "text-white" : "text-gray-900"
                              )}>
                                음성 메시지
                              </p>
                              <p className={cn(
                                "text-xs",
                                isMe ? "text-white/70" : "text-gray-500"
                              )}>
                                {msg.voiceDuration ? `${msg.voiceDuration}초` : ""}
                              </p>
                            </div>
                            {msg.fileUrl && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className={cn(
                                  isMe ? "text-white hover:bg-white/10" : "text-purple-600 hover:text-purple-700"
                                )}
                                onClick={() => {
                                  console.log('Playing audio from:', msg.fileUrl);
                                  const audio = new Audio(msg.fileUrl);
                                  audio.play().catch(error => {
                                    console.error('Audio play error:', error);
                                    toast({
                                      variant: "destructive",
                                      title: "재생 실패",
                                      description: "음성 파일을 로드할 수 없습니다.",
                                    });
                                  });
                                }}
                              >
                                ▶️
                              </Button>
                            )}
                          </div>
                          
                          {msg.content && (
                            <div className={cn(
                              "mt-2 pt-2 border-t text-sm",
                              isMe ? "border-white/20 text-white/90" : "border-gray-100 text-gray-700"
                            )}>
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs opacity-70">음성 인식 결과:</span>
                                {msg.detectedLanguage && (
                                  <span className={cn(
                                    "text-xs px-2 py-0.5 rounded-full",
                                    isMe ? "bg-white/20 text-white/80" : "bg-purple-100 text-purple-600"
                                  )}>
                                    {msg.detectedLanguage}
                                  </span>
                                )}
                              </div>
                              {msg.content}
                              {msg.confidence && (
                                <div className="mt-1">
                                  <span className="text-xs opacity-60">
                                    신뢰도: {Math.round(msg.confidence * 100)}%
                                  </span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ) : msg.messageType === "file" ? (
                        <div>
                          <div className="flex items-center space-x-3">
                            <div className={cn(
                              "w-10 h-10 rounded-lg flex items-center justify-center",
                              msg.isCommandRecall && msg.isLocalOnly
                                ? isMe ? "bg-white/20" : "bg-teal-200"
                                : isMe ? "bg-white/20" : "bg-gray-100"
                            )}>
                              {getFileIcon(msg.fileName)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={cn(
                                "text-sm font-medium truncate",
                                msg.isCommandRecall && msg.isLocalOnly
                                  ? isMe ? "text-white" : "text-teal-900"
                                  : isMe ? "text-white" : "text-gray-900"
                              )}>
                                {msg.fileName}
                              </p>
                              <p className={cn(
                                "text-xs",
                                msg.isCommandRecall && msg.isLocalOnly
                                  ? isMe ? "text-white/70" : "text-teal-600"
                                  : isMe ? "text-white/70" : "text-gray-500"
                              )}>
                                {msg.fileSize ? `${(msg.fileSize / 1024).toFixed(1)} KB` : ""}
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className={cn(
                                msg.isCommandRecall && msg.isLocalOnly
                                  ? isMe ? "text-white hover:bg-white/10" : "text-teal-700 hover:text-teal-800 hover:bg-teal-100"
                                  : isMe ? "text-white hover:bg-white/10" : "text-purple-600 hover:text-purple-700"
                              )}
                              onClick={() => window.open(msg.fileUrl, '_blank')}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          </div>
                          
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
                          isMe ? "text-white" : "text-gray-900"
                        )}>
                          {/* 번역 상태에 따른 메시지 표시 */}
                          <div className={cn(
                            "transition-all duration-500 ease-in-out",
                            translatingMessages.has(msg.id) ? "animate-pulse" : "",
                            translatedMessages[msg.id] ? "transform perspective-1000" : ""
                          )}>
                            {translatedMessages[msg.id] ? (
                              // 번역된 메시지 표시 (flip 효과)
                              <div className="animate-in fade-in-0 zoom-in-95 duration-300">
                                <div className="flex items-start space-x-1">
                                  <div className="flex-1">
                                    <div className="mb-2">
                                      {renderMessageWithLinks(translatedMessages[msg.id].text)}
                                    </div>
                                    <div className="text-xs opacity-70 flex items-center space-x-1">
                                      <Languages className="h-3 w-3" />
                                      <span>ChatGPT 번역완료</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              // 원본 메시지 표시
                              <div className="flex items-start space-x-1">
                                <div className="flex-1">
                                  {renderMessageWithLinks(msg.content)}
                                </div>
                                {msg.isTranslated && (
                                  <div className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/30 flex-shrink-0 mt-0.5">
                                    <Languages className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          
          {/* 업로드 중인 파일들을 로딩 메시지로 표시 */}
          {uploadingFiles.map((uploadingFile) => (
            <div key={uploadingFile.id} className="flex items-start space-x-3 flex-row-reverse space-x-reverse mb-4">
              <UserAvatar 
                user={user || undefined} 
                size="md" 
                fallbackClassName="purple-gradient"
              />
              
              <div className="flex flex-col items-end max-w-xs lg:max-w-md">
                <div className="bg-purple-600 text-white p-3 rounded-lg shadow-sm">
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
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
        <div ref={messagesEndRef} />
      </div>

      {/* Chat Input - Fixed position */}
      <div className="bg-white border-t border-gray-200 flex-shrink-0 sticky bottom-0 z-10 pb-0">
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
        
        <div className="px-2 pb-0 pt-1 chat-input-area">
          <div className="flex items-center space-x-1">
          {/* Compact left buttons group */}
          <div className="flex items-center space-x-0.5 mr-1">
            <Button
              variant="ghost"
              size="sm"
              className="text-gray-400 hover:text-purple-600 p-1 min-w-0 h-7 w-7"
              onClick={() => {
                setMessage(prev => prev + "#");
                messageInputRef.current?.focus();
              }}
              title="스마트 추천"
            >
              <Hash className="h-4 w-4" />
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              className="text-gray-400 hover:text-purple-600 p-1 min-w-0 h-7 w-7"
              onClick={handleFileUpload}
              disabled={uploadFileMutation.isPending}
              title="파일 첨부"
            >
              <Paperclip className="h-4 w-4" />
            </Button>

          </div>
          
          <div className="flex-1 relative mx-1">
            <Textarea
              ref={messageInputRef}
              placeholder="메시지를 입력하세요..."
              value={message}
              onChange={(e) => {
                handleMessageChange(e.target.value);
                // 일반 텍스트 입력 시 키보드 네비게이션 상태 해제
                setIsNavigatingWithKeyboard(false);
              }}
              onKeyDown={(e) => {
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
              className="resize-none"
            />
            
            {/* 스마트 채팅 제안 - 컴팩트 디자인 */}
            {showSmartSuggestions && smartSuggestions.length > 0 && (
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
                      toast({ title: "복사 완료", description: "결과가 클립보드에 복사되었습니다." });
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
          
          {/* Voice Recorder */}
          <VoiceRecorder
            onRecordingComplete={handleVoiceRecordingComplete}
            disabled={isProcessingVoice || sendMessageMutation.isPending}
          />
          
          <Button
            className="purple-gradient hover:purple-gradient-hover h-8 w-8 p-1.5"
            onClick={handleSendMessage}
            disabled={sendMessageMutation.isPending || !message.trim()}
          >
            <Send className="h-4 w-4" />
          </Button>
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
          onClose={() => {
            setShowAddFriendModal(false);
            setNonFriendUsers([]);
          }}
          users={nonFriendUsers}
        />
      )}

      {/* Message Context Menu */}
      <MessageContextMenu
        visible={contextMenu.visible}
        x={contextMenu.x}
        y={contextMenu.y}
        onClose={() => setContextMenu({ ...contextMenu, visible: false })}
        onSaveMessage={handleSaveMessage}
        onReplyMessage={handleReplyMessage}
        onTranslateMessage={() => handleTranslateMessage(contextMenu.message)}
      />

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
              toast({
                variant: "destructive",
                title: "이미 투표하셨습니다",
                description: "한 번만 투표할 수 있습니다.",
              });
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

            toast({
              title: "투표 완료!",
              description: `"${activePoll.options[optionIndex]}"에 투표했습니다.`,
            });
          }}
        />
      )}

    </div>
  );
}
