import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { UserAvatar } from "@/components/UserAvatar";
import InstantAvatar from "@/components/InstantAvatar";
import MediaPreview from "@/components/MediaPreview";
import { Paperclip, Hash, Send, Video, Phone, Info, Download, Upload, Reply, X, Search, FileText, FileImage, FileSpreadsheet, File, Languages, Calculator, Play, Pause, MoreVertical, LogOut, Settings, MapPin, ArrowLeft, Heart } from "lucide-react";
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
import { UnifiedSendButton } from "./UnifiedSendButton";
import { FileUploadModal } from "./FileUploadModal";
import { LinkPreview } from "./LinkPreview";
import { MessageReactionButton } from "./MessageReactionButton";
import { LocationShareModal } from "./LocationShareModal";
import ReminderTimeModal from "./ReminderTimeModal";
import YoutubeSelectionModal from "./YoutubeSelectionModal";
import { ConnectionStatusIndicator } from "./ConnectionStatusIndicator";
import { VoiceMessagePreviewModal } from "./VoiceMessagePreviewModal";
import GestureQuickReply from "./GestureQuickReply";

interface SmartSuggestion {
  type: string;
  text: string;
  result?: string;
  icon: string;
  category: string;
  keyword?: string;
  confidence?: number;
  action?: () => void;
}

interface ChatAreaProps {
  chatRoomId: number;
  onCreateCommand: (fileData?: any, messageData?: any) => void;
  showMobileHeader?: boolean;
  onBackClick?: () => void;
  isLocationChat?: boolean;
}

export default function ChatArea({ chatRoomId, onCreateCommand, showMobileHeader, onBackClick, isLocationChat }: ChatAreaProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch chat room data
  const { data: chatRoomData } = useQuery({
    queryKey: [`/api/chat-rooms/${chatRoomId}`],
    queryFn: async () => {
      const response = await apiRequest(`/api/chat-rooms/${chatRoomId}`);
      return response.json();
    },
    enabled: !!chatRoomId
  });

  // Fetch messages
  const { data: messagesData, isLoading } = useQuery({
    queryKey: [`/api/chat-rooms/${chatRoomId}/messages`],
    queryFn: async () => {
      const response = await apiRequest(`/api/chat-rooms/${chatRoomId}/messages`);
      return response.json();
    },
    enabled: !!chatRoomId,
    refetchInterval: 3000
  });

  const messages = messagesData?.messages || [];
  const currentChatRoom = chatRoomData?.chatRoom || {};

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (messageContent: string) => {
      const response = await apiRequest(`/api/chat-rooms/${chatRoomId}/messages`, {
        method: 'POST',
        body: JSON.stringify({
          content: messageContent,
          messageType: 'text'
        })
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/chat-rooms/${chatRoomId}/messages`] });
      setMessage("");
      scrollToBottom();
    }
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = () => {
    if (message.trim()) {
      sendMessageMutation.mutate(message.trim());
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleLikeMessage = (messageId: number) => {
    toast({
      title: "좋아요!",
      description: "메시지에 좋아요를 표시했습니다."
    });
  };

  const chatRoomDisplayName = currentChatRoom.name || `채팅방 ${chatRoomId}`;

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-purple-50 to-white">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {/* Back button - always visible for navigation */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onBackClick}
            className="p-2 h-8 w-8 hover:bg-gray-100 rounded-full"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-semibold">
              {getInitials(chatRoomDisplayName)}
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">{chatRoomDisplayName}</h2>
              <p className="text-xs text-gray-500">활성 상태</p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="sm">
            <Search className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm">
            <Phone className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm">
            <Video className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm">
            <Info className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
        {isLoading ? (
          <div className="text-center text-gray-500 mt-8">
            메시지를 불러오는 중...
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center text-gray-500 mt-8">
            대화를 시작해보세요!
          </div>
        ) : (
          <>
            {messages.map((msg: any) => {
              const isMe = msg.senderId === user?.id;
              
              return (
                <div key={msg.id} className="flex flex-col">
                  {/* Message bubble */}
                  <div className={`flex items-start space-x-3 ${isMe ? 'flex-row-reverse space-x-reverse' : ''}`}>
                    {!isMe && (
                      <InstantAvatar
                        src={msg.senderProfilePicture}
                        alt={msg.senderDisplayName}
                        fallbackText={msg.senderDisplayName?.substring(0, 1) || "U"}
                        size="sm"
                      />
                    )}
                    
                    <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[280px] md:max-w-[400px]`}>
                      <div
                        className={`px-4 py-2 rounded-2xl shadow-sm backdrop-blur-sm ${
                          isMe
                            ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-br-md'
                            : 'bg-white border border-gray-200 text-gray-900 rounded-bl-md'
                        }`}
                      >
                        {msg.fileUrl ? (
                          <MediaPreview 
                            fileUrl={msg.fileUrl}
                            fileName={msg.fileName}
                            fileSize={msg.fileSize}
                            messageContent={msg.content}
                            isCompact={true}
                          />
                        ) : (
                          <p className="text-sm leading-relaxed">{msg.content}</p>
                        )}
                      </div>
                      
                      <span className="text-xs text-gray-500 mt-1 px-1">
                        {new Date(msg.createdAt).toLocaleTimeString('ko-KR', {
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: false
                        })}
                      </span>
                    </div>
                  </div>
                  
                  {/* Like button positioned outside and below message bubble */}
                  <div className={`flex items-center mt-1 ${isMe ? 'justify-end pr-2' : 'justify-start pl-12'}`}>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleLikeMessage(msg.id)}
                      className="h-8 px-2 rounded-full transition-all duration-200 text-gray-400 hover:text-red-500 hover:bg-red-50"
                    >
                      <Heart className="h-4 w-4" />
                      {msg.likes && msg.likes > 0 && (
                        <span className="ml-1 text-xs font-medium">{msg.likes}</span>
                      )}
                    </Button>
                  </div>
                </div>
              );
            })}
          </>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Footer */}
      <div className="bg-white border-t border-gray-200 px-4 py-3">
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="sm">
            <Paperclip className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm">
            <Hash className="h-4 w-4" />
          </Button>
          <Input
            type="text"
            placeholder="메시지를 입력하세요..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            className="flex-1"
          />
          <Button 
            size="sm" 
            className="bg-purple-600 hover:bg-purple-700"
            onClick={handleSendMessage}
            disabled={!message.trim() || sendMessageMutation.isPending}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}