import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { 
  ArrowLeft, 
  Send, 
  Heart,
  Check,
  CheckCheck,
  Clock,
  Phone,
  Video,
  MoreVertical,
  Play,
  ChevronDown,
  Upload
} from 'lucide-react';

import { InstantAvatar } from "./InstantAvatar";

interface ChatAreaProps {
  chatRoomId: number;
  onCreateCommand: (fileData?: any, messageData?: any) => void;
  showMobileHeader?: boolean;
  onBackClick?: () => void;
  isLocationChat?: boolean;
}

export default function ChatArea({ 
  chatRoomId, 
  onCreateCommand, 
  showMobileHeader, 
  onBackClick, 
  isLocationChat 
}: ChatAreaProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Refs
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // State
  const [message, setMessage] = useState('');
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [isAtBottom, setIsAtBottom] = useState(true);

  // Queries
  const { data: messagesData, isLoading } = useQuery({
    queryKey: ['/api/chat-rooms', chatRoomId, 'messages'],
    enabled: !!chatRoomId,
    staleTime: 5 * 60 * 1000,
    refetchInterval: 30000,
  });

  const { data: chatRoomData } = useQuery({
    queryKey: ['/api/chat-rooms', chatRoomId],
    enabled: !!chatRoomId,
  });

  const messages = messagesData?.messages || [];
  const participants = messagesData?.participants || [];

  // Auto-scroll functionality
  const scrollToBottom = useCallback((force = false) => {
    if (force || isAtBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [isAtBottom]);

  const handleScroll = useCallback(() => {
    if (!chatScrollRef.current) return;
    
    const { scrollTop, scrollHeight, clientHeight } = chatScrollRef.current;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    const threshold = 100;
    
    const newIsAtBottom = distanceFromBottom <= threshold;
    setIsAtBottom(newIsAtBottom);
    setShowScrollToBottom(!newIsAtBottom && messages.length > 0);
  }, [messages.length]);

  // Effects
  useEffect(() => {
    scrollToBottom(true);
  }, [scrollToBottom, chatRoomId]);

  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages.length, scrollToBottom]);

  // Message sending
  const sendMessageMutation = useMutation({
    mutationFn: async (messageData: any) => {
      return apiRequest(`/api/chat-rooms/${chatRoomId}/messages`, 'POST', messageData);
    },
    onSuccess: () => {
      setMessage('');
      queryClient.invalidateQueries({ queryKey: ['/api/chat-rooms', chatRoomId, 'messages'] });
      scrollToBottom(true);
    },
    onError: (error) => {
      console.error('Failed to send message:', error);
      toast({
        title: "메시지 전송 실패",
        description: "메시지를 다시 보내주세요.",
        variant: "destructive",
      });
    },
  });

  const handleSendMessage = () => {
    if (!message.trim()) return;
    
    sendMessageMutation.mutate({
      content: message.trim(),
      messageType: 'text'
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Message actions
  const handleLikeMessage = async (messageId: number) => {
    try {
      await apiRequest(`/api/messages/${messageId}/like`, 'POST');
      queryClient.invalidateQueries({ queryKey: ['/api/chat-rooms', chatRoomId, 'messages'] });
    } catch (error) {
      console.error('Failed to like message:', error);
    }
  };

  const formatTime = (date: string | Date) => {
    return new Date(date).toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const renderMessage = (msg: any, index: number) => {
    const isMe = msg.senderId === user?.id;
    const showDate = index === 0 || 
      new Date(messages[index - 1].createdAt).toDateString() !== new Date(msg.createdAt).toDateString();

    return (
      <div key={msg.id} className="space-y-1">
        {/* Date separator */}
        {showDate && (
          <div className="flex justify-center my-4">
            <div className="bg-gray-100 text-gray-600 text-xs px-3 py-1 rounded-full">
              {formatDate(msg.createdAt)}
            </div>
          </div>
        )}

        {/* Message bubble */}
        <div className={cn(
          "flex items-start space-x-3 mb-1 group",
          isMe ? "flex-row-reverse space-x-reverse" : ""
        )}>
          {/* Avatar */}
          {!isMe && (
            <InstantAvatar 
              src={participants.find((p: any) => p.userId === msg.senderId)?.profilePicture}
              alt={participants.find((p: any) => p.userId === msg.senderId)?.displayName || 'User'}
              className="w-8 h-8 ring-2 ring-white shadow-md"
            />
          )}
          
          {/* Message content */}
          <div className={cn(
            "flex flex-col max-w-[280px] md:max-w-[400px]",
            isMe ? "items-end" : "items-start"
          )}>
            {/* Sender name for group chats */}
            {!isMe && participants.length > 2 && (
              <span className="text-xs text-gray-500 mb-1 px-1">
                {participants.find((p: any) => p.userId === msg.senderId)?.displayName || 'Unknown'}
              </span>
            )}
            
            {/* Message bubble */}
            <div className={cn(
              "relative px-3 py-2 rounded-2xl shadow-sm backdrop-blur-sm transition-all duration-200 hover:shadow-md",
              isMe 
                ? "bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-br-sm"
                : "bg-gradient-to-br from-gray-50 to-white border border-gray-200 text-gray-900 rounded-bl-sm"
            )}>
              {/* Message content based on type */}
              {msg.messageType === 'text' && (
                <div className="break-words whitespace-pre-wrap">
                  {msg.content}
                </div>
              )}
              
              {msg.messageType === 'voice' && (
                <div className="flex items-center space-x-2 min-w-[120px]">
                  <Button
                    size="sm"
                    variant="ghost"
                    className={cn(
                      "w-8 h-8 rounded-full",
                      isMe ? "text-white hover:bg-white/20" : "text-gray-600 hover:bg-gray-100"
                    )}
                  >
                    <Play className="w-4 h-4" />
                  </Button>
                  
                  {/* Voice waveform visualization */}
                  <div className="flex items-center space-x-0.5 flex-1">
                    {Array.from({ length: 15 }, (_, i) => (
                      <div
                        key={i}
                        className={cn(
                          "w-0.5 rounded-full transition-all duration-200",
                          isMe ? "bg-white/70" : "bg-gray-400/70"
                        )}
                        style={{
                          height: `${Math.random() * 12 + 4}px`
                        }}
                      />
                    ))}
                  </div>
                  
                  <span className={cn(
                    "text-xs opacity-70",
                    isMe ? "text-white" : "text-gray-600"
                  )}>
                    음성
                  </span>
                </div>
              )}

              {/* File messages */}
              {msg.messageType === 'file' && msg.fileUrl && (
                <div className="flex items-center space-x-2">
                  <div className="text-sm">📁 {msg.fileName || 'File'}</div>
                </div>
              )}

              {/* System messages */}
              {msg.messageType === 'system' && (
                <div className="flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-purple-500" />
                  <div>
                    <div className="font-medium text-purple-700">⏰ 리마인더</div>
                    <div className="text-sm text-gray-600">{msg.content}</div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Message metadata */}
            <div className={cn(
              "flex items-center space-x-1 mt-1 px-1",
              isMe ? "flex-row-reverse space-x-reverse" : ""
            )}>
              <span className="text-xs text-gray-500">
                {formatTime(msg.createdAt)}
              </span>
              
              {isMe && (
                <div className="flex items-center space-x-1">
                  {msg.isRead ? (
                    <CheckCheck className="w-3 h-3 text-blue-500" />
                  ) : (
                    <Check className="w-3 h-3 text-gray-400" />
                  )}
                </div>
              )}
            </div>
          </div>
          
          {/* Like button - positioned outside bubble */}
          <button
            onClick={() => handleLikeMessage(msg.id)}
            className={cn(
              "opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-1 rounded-full hover:bg-gray-100",
              msg.likes?.length > 0 && "opacity-100"
            )}
          >
            <Heart 
              className={cn(
                "w-4 h-4",
                msg.likes?.some((like: any) => like.userId === user?.id)
                  ? "text-red-500 fill-red-500"
                  : "text-gray-400"
              )} 
            />
            {msg.likes?.length > 0 && (
              <span className="text-xs text-gray-500 ml-1">
                {msg.likes.length}
              </span>
            )}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col relative mb-0 pb-0">
      {/* Mobile Header */}
      {showMobileHeader && (
        <div className="flex items-center justify-between p-4 border-b bg-white">
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={onBackClick}
              className="p-2"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            
            <div className="flex items-center space-x-3">
              <InstantAvatar 
                src={chatRoomData?.profilePicture || participants[0]?.profilePicture}
                alt={chatRoomData?.name || participants[0]?.displayName || 'Chat'}
                className="w-8 h-8"
              />
              <div>
                <h3 className="font-medium text-sm">
                  {chatRoomData?.name || participants.find((p: any) => p.userId !== user?.id)?.displayName || '채팅방'}
                </h3>
                <p className="text-xs text-gray-500">
                  {participants.length}명 참여
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="sm" className="p-2">
              <Phone className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="sm" className="p-2">
              <Video className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="sm" className="p-2">
              <MoreVertical className="w-5 h-5" />
            </Button>
          </div>
        </div>
      )}

      {/* Chat Messages */}
      <div 
        ref={chatScrollRef}
        className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-2 space-y-0.5 min-h-0 overscroll-behavior-y-contain overscroll-behavior-x-none pb-16 scrollbar-thin scrollbar-thumb-purple-300 scrollbar-track-gray-100 relative w-full"
        style={{ wordBreak: 'break-word' }}
        onScroll={handleScroll}
      >
        {/* Security Notice */}
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
            {messages.map((msg: any, index: number) => renderMessage(msg, index))}
          </>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Scroll to bottom button */}
      {showScrollToBottom && (
        <button
          onClick={() => scrollToBottom(true)}
          className="absolute bottom-20 right-4 bg-purple-500 text-white p-2 rounded-full shadow-lg hover:bg-purple-600 transition-colors z-10"
        >
          <ChevronDown className="w-5 h-5" />
        </button>
      )}

      {/* Simple Footer with message input */}
      <div className="border-t bg-white p-4">
        <div className="flex items-end space-x-3">
          <div className="flex-1">
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="메시지를 입력하세요..."
              className="min-h-[44px] max-h-32 resize-none rounded-2xl border-gray-300 focus:border-purple-500 focus:ring-purple-500"
              rows={1}
            />
          </div>
          <Button
            onClick={handleSendMessage}
            disabled={!message.trim()}
            className="bg-purple-500 hover:bg-purple-600 text-white rounded-full p-3 h-12 w-12"
          >
            <Send className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}