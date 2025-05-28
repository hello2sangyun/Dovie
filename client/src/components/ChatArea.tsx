import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Paperclip, Hash, Send, Video, Phone, Info, Download, Upload, Reply, X, Search, FileText, FileImage, FileSpreadsheet, File, Languages, Calculator } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { cn, getInitials, getAvatarColor } from "@/lib/utils";
import AddFriendConfirmModal from "./AddFriendConfirmModal";
import MessageContextMenu from "./MessageContextMenu";
import CommandModal from "./CommandModal";
import LanguageSelectionModal from "./LanguageSelectionModal";
import CalculatorPreviewModal from "./CalculatorPreviewModal";

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
  const [fileDataForCommand, setFileDataForCommand] = useState<any>(null);
  const [showAddFriendModal, setShowAddFriendModal] = useState(false);
  const [nonFriendUsers, setNonFriendUsers] = useState<any[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
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

  const currentChatRoom = chatRoomsData?.chatRooms?.find((room: any) => room.id === chatRoomId);

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
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "메시지 전송 실패",
        description: "다시 시도해주세요.",
      });
    },
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

  // 번역 처리 함수
  const handleTranslate = async (text: string, targetLanguage: string) => {
    try {
      const response = await apiRequest("/api/commands/process", "POST", { 
        commandText: `/translate ${text} to ${targetLanguage}` 
      });
      const result = await response.json();
      
      if (result.success) {
        // 번역 결과만 깔끔하게 표시 (번역 마크 추가)
        sendMessageMutation.mutate({
          content: result.content,
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
    sendMessageMutation.mutate({
      content: result,
      messageType: "text",
      isCalculated: true,
      replyToMessageId: replyToMessage?.id
    });
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

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      uploadFileMutation.mutate(file);
    }
  };

  const handleMessageChange = (value: string) => {
    setMessage(value);
    
    const lastWord = value.split(' ').pop();
    if (lastWord?.startsWith('#') && lastWord.length > 1) {
      setShowCommandSuggestions(true);
    } else {
      setShowCommandSuggestions(false);
    }
    
    // Show AI chat commands when user types "/"
    if (value.startsWith('/') && value.length > 0) {
      setShowChatCommands(true);
    } else {
      setShowChatCommands(false);
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

  return (
    <div 
      ref={chatAreaRef}
      data-chat-area="true"
      className={`h-full flex flex-col bg-gray-50 relative ${isDragOver ? 'bg-purple-50' : ''}`}
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

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0 overscroll-behavior-y-contain">
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
                  <Avatar className="w-8 h-8">
                    <AvatarImage 
                      src={isMe ? (user?.profilePicture || undefined) : (msg.sender.profilePicture || undefined)} 
                      alt={isMe ? (user?.displayName || "Me") : msg.sender.displayName} 
                    />
                    <AvatarFallback className={`bg-gradient-to-br ${getAvatarColor(isMe ? (user?.displayName || "Me") : msg.sender.displayName)} text-white text-sm font-semibold`}>
                      {getInitials(isMe ? (user?.displayName || "Me") : msg.sender.displayName)}
                    </AvatarFallback>
                  </Avatar>
                  
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
                      "rounded-lg p-3 shadow-sm",
                      msg.isCommandRecall && msg.isLocalOnly
                        ? isMe 
                          ? "bg-teal-500 text-white rounded-tr-none border border-teal-400" 
                          : "bg-teal-50 text-teal-900 rounded-tl-none border border-teal-200"
                        : isMe 
                          ? "chat-bubble-me rounded-tr-none" 
                          : "chat-bubble-other rounded-tl-none"
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
                      
                      {msg.messageType === "file" ? (
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
                      ) : (
                        <div className={cn(
                          "text-sm",
                          isMe ? "text-white" : "text-gray-900"
                        )}>
                          <div className="flex items-start space-x-1">
                            <div className="flex-1">
                              {renderMessageWithLinks(msg.content)}
                            </div>
                            {msg.isTranslated && (
                              <Languages className={cn(
                                "h-3 w-3 flex-shrink-0 mt-0.5",
                                isMe ? "text-white/70" : "text-gray-500"
                              )} />
                            )}
                            {msg.isCalculated && (
                              <Calculator className={cn(
                                "h-3 w-3 flex-shrink-0 mt-0.5",
                                isMe ? "text-white/70" : "text-gray-500"
                              )} />
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
              <Avatar className="w-8 h-8">
                <AvatarImage 
                  src={user?.profilePicture || undefined} 
                  alt={user?.displayName || "Me"} 
                />
                <AvatarFallback className="purple-gradient text-white text-sm font-semibold">
                  {getInitials(user?.displayName || "Me")}
                </AvatarFallback>
              </Avatar>
              
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
      <div className="bg-white border-t border-gray-200 flex-shrink-0 sticky bottom-0 z-10">
        {/* Reply Preview */}
        {replyToMessage && (
          <div className="p-3 border-b border-gray-200 bg-gray-50">
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
        
        <div className="p-3 chat-input-area">
          <div className="flex items-end space-x-2">
          <Button
            variant="ghost"
            size="sm"
            className="text-gray-400 hover:text-purple-600 p-2"
            onClick={handleFileUpload}
            disabled={uploadFileMutation.isPending}
          >
            <Paperclip className="h-5 w-5" />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            className="text-gray-400 hover:text-purple-600 p-2"
            onClick={insertHashtag}
          >
            <Hash className="h-5 w-5" />
          </Button>
          
          <div className="flex-1 relative mx-1">
            <Input
              type="text"
              placeholder="메시지를 입력하세요..."
              value={message}
              onChange={(e) => handleMessageChange(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              className="resize-none"
            />
            
            {/* Command suggestions dropdown */}
            {showCommandSuggestions && commands.length > 0 && (
              <div className="absolute bottom-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg mb-1 max-h-40 overflow-y-auto">
                <div className="p-2">
                  {commands
                    .filter((cmd: any) => 
                      message.slice(1).length === 0 || 
                      cmd.commandName.toLowerCase().includes(message.slice(1).toLowerCase())
                    )
                    .map((command: any) => (
                      <div
                        key={command.id}
                        className="p-2 hover:bg-purple-50 rounded cursor-pointer"
                        onClick={() => selectCommand(command.commandName)}
                      >
                        <div className="flex items-center space-x-2">
                          <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded text-xs font-medium">
                            #{command.commandName}
                          </span>
                          <span className="text-sm text-gray-600">
                            {command.fileName || command.savedText || "저장된 항목"}
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
            
            {/* AI Chat Commands dropdown */}
            {showChatCommands && (
              <div className="absolute bottom-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg mb-1 max-h-60 overflow-y-auto">
                <div className="p-2">
                  <div className="text-xs font-medium text-gray-500 mb-2 px-2">AI Commands</div>
                  {[
                    { cmd: '/translate', desc: 'Translate text with language selection', example: '/translate 안녕하세요' },
                    { cmd: '/calculate', desc: 'Perform mathematical calculations', example: '/calculate 15 * 8 + 42' },
                    { cmd: '/summarize', desc: 'Summarize long text', example: '/summarize [your text]' },
                    { cmd: '/vibe', desc: 'Analyze emotional tone', example: '/vibe I love this app!' },
                    { cmd: '/poll', desc: 'Create interactive polls', example: '/poll What should we eat? Pizza,Sushi,Tacos' }
                  ]
                    .filter(item => 
                      message.length <= 1 || 
                      item.cmd.toLowerCase().includes(message.toLowerCase())
                    )
                    .map((item) => (
                      <div
                        key={item.cmd}
                        className="p-2 hover:bg-blue-50 rounded cursor-pointer"
                        onClick={() => {
                          setMessage(item.cmd + ' ');
                          setShowChatCommands(false);
                        }}
                      >
                        <div className="flex items-start space-x-2">
                          <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-medium">
                            {item.cmd}
                          </span>
                          <div className="flex-1">
                            <div className="text-sm text-gray-700">{item.desc}</div>
                            <div className="text-xs text-gray-500 mt-1">{item.example}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
          
          <Button
            className="purple-gradient hover:purple-gradient-hover"
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
      />

      {/* Language Selection Modal */}
      <LanguageSelectionModal
        open={showLanguageModal}
        onClose={() => setShowLanguageModal(false)}
        originalText={textToTranslate}
        onTranslate={handleTranslate}
      />

      {/* Calculator Preview Modal */}
      <CalculatorPreviewModal
        open={showCalculatorModal}
        onClose={() => setShowCalculatorModal(false)}
        expression={calculatorData.expression}
        result={calculatorData.result}
        onSendToChat={handleSendCalculatorResult}
      />

    </div>
  );
}
