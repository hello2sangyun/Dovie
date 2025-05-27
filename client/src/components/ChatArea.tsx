import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Paperclip, Hash, Send, Video, Phone, Info, Download } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface ChatAreaProps {
  chatRoomId: number;
  onCreateCommand: (fileData?: any) => void;
  showMobileHeader?: boolean;
  onBackClick?: () => void;
}

export default function ChatArea({ chatRoomId, onCreateCommand, showMobileHeader, onBackClick }: ChatAreaProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("");
  const [showCommandSuggestions, setShowCommandSuggestions] = useState(false);
  const [fileDataForCommand, setFileDataForCommand] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get chat room details
  const { data: chatRoomsData } = useQuery({
    queryKey: ["/api/chat-rooms"],
    enabled: !!user,
  });

  const currentChatRoom = chatRoomsData?.chatRooms?.find((room: any) => room.id === chatRoomId);

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
      const response = await apiRequest("POST", `/api/chat-rooms/${chatRoomId}/messages`, messageData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat-rooms", chatRoomId, "messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/chat-rooms"] });
      setMessage("");
      setShowCommandSuggestions(false);
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "메시지 전송 실패",
        description: "다시 시도해주세요.",
      });
    },
  });

  // File upload mutation
  const uploadFileMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      
      if (!response.ok) throw new Error("Upload failed");
      return response.json();
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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = () => {
    if (!message.trim()) return;

    // Check if it's a command recall
    if (message.startsWith('#')) {
      const commandName = message.slice(1);
      const command = commands.find((cmd: any) => cmd.commandName === commandName);
      
      if (command) {
        sendMessageMutation.mutate({
          content: message,
          messageType: command.fileUrl ? "file" : "text",
          fileUrl: command.fileUrl,
          fileName: command.fileName,
          isCommandRecall: true,
          originalMessageId: command.messageId,
        });
        return;
      }
    }

    sendMessageMutation.mutate({
      content: message,
      messageType: "text",
    });
  };

  const handleFileUpload = () => {
    fileInputRef.current?.click();
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
  };

  const insertHashtag = () => {
    setMessage(prev => prev + '#');
    setShowCommandSuggestions(true);
  };

  const selectCommand = (commandName: string) => {
    setMessage(`#${commandName}`);
    setShowCommandSuggestions(false);
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(word => word.charAt(0).toUpperCase()).join('').slice(0, 2);
  };

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
    <div className="h-full flex flex-col bg-gray-50">
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
            <div className="w-10 h-10 purple-gradient rounded-full flex items-center justify-center text-white font-semibold">
              {getInitials(currentChatRoom.name)}
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{currentChatRoom.name}</h3>
              <p className="text-sm text-gray-500">
                {currentChatRoom.participants?.length}명 참여
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
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
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0 overscroll-behavior-y-contain">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 mt-8">
            대화를 시작해보세요!
          </div>
        ) : (
          messages.map((msg: any, index: number) => {
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
                
                <div className={cn(
                  "flex items-start space-x-3",
                  isMe ? "flex-row-reverse space-x-reverse" : ""
                )}>
                  <Avatar className="w-8 h-8">
                    <AvatarImage 
                      src={isMe ? (user?.profilePicture || undefined) : (msg.sender.profilePicture || undefined)} 
                      alt={isMe ? (user?.displayName || "Me") : msg.sender.displayName} 
                    />
                    <AvatarFallback className="purple-gradient text-white text-sm font-semibold">
                      {getInitials(isMe ? (user?.displayName || "Me") : msg.sender.displayName)}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className={cn(
                    "max-w-xs lg:max-w-md flex flex-col",
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
                      isMe 
                        ? "chat-bubble-me rounded-tr-none" 
                        : "chat-bubble-other rounded-tl-none"
                    )}>
                      {msg.messageType === "file" ? (
                        <div>
                          <div className="flex items-center space-x-3">
                            <div className={cn(
                              "w-10 h-10 rounded-lg flex items-center justify-center",
                              isMe ? "bg-white/20" : "bg-blue-100"
                            )}>
                              <Paperclip className={cn(
                                "h-5 w-5",
                                isMe ? "text-white" : "text-blue-600"
                              )} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={cn(
                                "text-sm font-medium truncate",
                                isMe ? "text-white" : "text-gray-900"
                              )}>
                                {msg.fileName}
                              </p>
                              <p className={cn(
                                "text-xs",
                                isMe ? "text-white/70" : "text-gray-500"
                              )}>
                                {msg.fileSize ? `${(msg.fileSize / 1024).toFixed(1)} KB` : ""}
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className={isMe ? "text-white hover:bg-white/10" : "text-purple-600 hover:text-purple-700"}
                              onClick={() => window.open(msg.fileUrl, '_blank')}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          </div>
                          
                          {msg.isCommandRecall && (
                            <div className={cn(
                              "mt-2 pt-2 border-t",
                              isMe ? "border-white/20" : "border-gray-100"
                            )}>
                              <span className={cn(
                                "px-2 py-1 rounded text-xs font-medium",
                                isMe 
                                  ? "bg-white/20 text-white" 
                                  : "bg-purple-100 text-purple-700"
                              )}>
                                {msg.content}
                              </span>
                              <p className={cn(
                                "text-xs mt-1",
                                isMe ? "text-white/70" : "text-gray-500"
                              )}>
                                명령어로 불러옴
                              </p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className={cn(
                          "text-sm",
                          isMe ? "text-white" : "text-gray-900"
                        )}>
                          {msg.content}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Chat Input - Fixed position */}
      <div className="bg-white border-t border-gray-200 p-3 flex-shrink-0 sticky bottom-0 z-10">
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

      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        className="hidden"
        multiple={false}
      />
    </div>
  );
}
