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
  
  // Sample messages for demonstration
  const sampleMessages = [
    {
      id: 1,
      senderId: 1,
      content: "안녕하세요! 오늘 날씨가 정말 좋네요.",
      createdAt: new Date().toISOString(),
      isMe: false,
      senderName: "김철수",
      likes: 2,
      isLiked: false
    },
    {
      id: 2,
      senderId: user?.id || 2,
      content: "네, 맞아요! 산책하기 좋은 날씨인 것 같아요.",
      createdAt: new Date().toISOString(),
      isMe: true,
      senderName: user?.displayName || "나",
      likes: 1,
      isLiked: true
    }
  ];

  const handleLikeMessage = (messageId: number) => {
    toast({
      title: "좋아요!",
      description: "메시지에 좋아요를 표시했습니다."
    });
  };
  
  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-purple-50 to-white">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {/* Back button for mobile navigation */}
          {showMobileHeader && onBackClick && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onBackClick}
              className="p-2 h-8 w-8 hover:bg-gray-100 rounded-full"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          
          <div className="flex items-center space-x-3">
            <InstantAvatar
              src="/api/placeholder-avatar"
              alt="Chat Room"
              fallbackText="CR"
              size="sm"
            />
            <div>
              <h2 className="font-semibold text-gray-900">채팅방</h2>
              <p className="text-xs text-gray-500">활성 상태</p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
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
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-3">
        {sampleMessages.map((msg) => (
          <div key={msg.id} className="flex flex-col">
            {/* Message bubble */}
            <div className={`flex items-start space-x-3 ${msg.isMe ? 'flex-row-reverse space-x-reverse' : ''}`}>
              {!msg.isMe && (
                <InstantAvatar
                  src="/api/placeholder-avatar"
                  alt={msg.senderName}
                  fallbackText={msg.senderName.substring(0, 1)}
                  size="sm"
                />
              )}
              
              <div className={`flex flex-col ${msg.isMe ? 'items-end' : 'items-start'} max-w-[280px] md:max-w-[400px]`}>
                <div
                  className={`px-4 py-2 rounded-2xl shadow-sm backdrop-blur-sm ${
                    msg.isMe
                      ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-br-md'
                      : 'bg-white border border-gray-200 text-gray-900 rounded-bl-md'
                  }`}
                >
                  <p className="text-sm leading-relaxed">{msg.content}</p>
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
            <div className={`flex items-center mt-1 ${msg.isMe ? 'justify-end pr-2' : 'justify-start pl-12'}`}>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleLikeMessage(msg.id)}
                className={`h-8 px-2 rounded-full transition-all duration-200 ${
                  msg.isLiked 
                    ? 'text-red-500 bg-red-50 hover:bg-red-100' 
                    : 'text-gray-400 hover:text-red-500 hover:bg-red-50'
                }`}
              >
                <Heart className={`h-4 w-4 ${msg.isLiked ? 'fill-current' : ''}`} />
                {msg.likes > 0 && (
                  <span className="ml-1 text-xs font-medium">{msg.likes}</span>
                )}
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="bg-white border-t border-gray-200 px-4 py-3">
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="sm">
            <Paperclip className="h-4 w-4" />
          </Button>
          <Input
            type="text"
            placeholder="메시지를 입력하세요..."
            className="flex-1"
          />
          <Button size="sm" className="bg-purple-600 hover:bg-purple-700">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}