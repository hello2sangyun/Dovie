import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useMobileNotification } from "./useMobileNotification";
import { useAuth } from "./useAuth";

interface PendingMessage {
  id: string;
  message: any;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
}

interface ConnectionState {
  isConnected: boolean;
  isReconnecting: boolean;
  reconnectAttempts: number;
  lastReconnectTime: number;
}

export function useWebSocket(userId?: number) {
  const wsRef = useRef<WebSocket | null>(null);
  const queryClient = useQueryClient();
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const retryTimeoutRef = useRef<NodeJS.Timeout>();
  const pendingMessages = useRef<Map<string, PendingMessage>>(new Map());
  const { showNotification } = useMobileNotification();
  const { user } = useAuth();
  
  const [connectionState, setConnectionState] = useState<ConnectionState>({
    isConnected: false,
    isReconnecting: false,
    reconnectAttempts: 0,
    lastReconnectTime: 0
  });

  // Adaptive backoff calculation
  const getReconnectDelay = (attempts: number): number => {
    const baseDelay = 1000; // 1 second
    const maxDelay = 60000; // 1 minute
    const exponentialDelay = Math.min(baseDelay * Math.pow(2, attempts), maxDelay);
    // Add jitter to prevent thundering herd
    const jitter = Math.random() * 0.3 * exponentialDelay;
    return Math.floor(exponentialDelay + jitter);
  };

  // Message retry with exponential backoff
  const retryMessage = (messageId: string) => {
    const pendingMsg = pendingMessages.current.get(messageId);
    if (!pendingMsg) return;

    if (pendingMsg.retryCount >= pendingMsg.maxRetries) {
      console.warn(`Message ${messageId} exceeded max retries, giving up`);
      pendingMessages.current.delete(messageId);
      showNotification({
        title: "메시지 전송 실패",
        description: "네트워크 문제로 메시지를 전송할 수 없습니다.",
        variant: "destructive",
        duration: 5000
      });
      return;
    }

    const retryDelay = getReconnectDelay(pendingMsg.retryCount);
    pendingMsg.retryCount++;
    
    console.log(`Retrying message ${messageId} (attempt ${pendingMsg.retryCount}/${pendingMsg.maxRetries}) in ${retryDelay}ms`);
    
    setTimeout(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        try {
          wsRef.current.send(JSON.stringify(pendingMsg.message));
          console.log(`Message ${messageId} retried successfully`);
          pendingMessages.current.delete(messageId);
        } catch (error) {
          console.error(`Failed to retry message ${messageId}:`, error);
          retryMessage(messageId); // Retry again
        }
      } else {
        // WebSocket not ready, keep message pending
        console.log(`WebSocket not ready for retry of message ${messageId}`);
      }
    }, retryDelay);
  };

  // Process all pending messages when connection is restored
  const processPendingMessages = () => {
    if (wsRef.current?.readyState !== WebSocket.OPEN) return;
    
    const messages = Array.from(pendingMessages.current.entries());
    console.log(`Processing ${messages.length} pending messages`);
    
    for (const [messageId, pendingMsg] of messages) {
      try {
        wsRef.current.send(JSON.stringify(pendingMsg.message));
        pendingMessages.current.delete(messageId);
        console.log(`Pending message ${messageId} sent successfully`);
      } catch (error) {
        console.error(`Failed to send pending message ${messageId}:`, error);
        retryMessage(messageId);
      }
    }
  };

  useEffect(() => {
    if (!userId) return;

    const connect = () => {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      
      setConnectionState(prev => ({
        ...prev,
        isReconnecting: true
      }));
      
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("WebSocket connected successfully");
        
        setConnectionState({
          isConnected: true,
          isReconnecting: false,
          reconnectAttempts: 0,
          lastReconnectTime: Date.now()
        });
        
        // Authenticate with the server
        ws.send(JSON.stringify({
          type: "auth",
          userId: userId,
        }));
        
        // Show connection restored notification if this was a reconnection
        if (connectionState.reconnectAttempts > 0) {
          showNotification({
            title: "연결 복구",
            description: "채팅 서버에 다시 연결되었습니다.",
            variant: "default",
            duration: 3000
          });
        }
        
        // Process any pending messages
        setTimeout(() => {
          processPendingMessages();
        }, 100);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log("WebSocket message received:", data);
          
          switch (data.type) {
            case "auth_success":
              console.log("WebSocket authentication successful for user:", data.userId);
              break;
            
            case "auth_error":
              console.error("WebSocket authentication failed:", data.error);
              break;
            
            case "new_message":
              // Invalidate messages query to fetch new message
              if (data.message?.chatRoomId) {
                queryClient.invalidateQueries({ 
                  queryKey: ["/api/chat-rooms", data.message.chatRoomId, "messages"] 
                });
                queryClient.invalidateQueries({ 
                  queryKey: ["/api/chat-rooms"] 
                });
                
                // Show notification if message is not from current user and notifications are enabled
                if (data.message.senderId !== userId && user?.notificationsEnabled !== false) {
                  const senderName = data.message.sender?.displayName || data.message.sender?.username || "알 수 없는 사용자";
                  const messagePreview = data.message.content?.length > 50 
                    ? data.message.content.substring(0, 50) + "..." 
                    : data.message.content || "새 메시지";
                  
                  showNotification({
                    title: senderName,
                    description: messagePreview,
                    variant: "default",
                    duration: 4000
                  });
                }
              }
              break;
            
            case "user_online":
              // Invalidate contacts to update online status
              queryClient.invalidateQueries({ 
                queryKey: ["/api/contacts"] 
              });
              break;
            
            case "user_offline":
              // Invalidate contacts to update online status
              queryClient.invalidateQueries({ 
                queryKey: ["/api/contacts"] 
              });
              break;
            
            case "reminder_notification":
              // Handle reminder notifications
              showNotification({
                title: data.title || "⏰ 리마인더 알림",
                description: data.message || "설정한 리마인더 시간입니다.",
                variant: "default",
                duration: 6000
              });
              
              // Invalidate chat rooms to refresh if needed
              queryClient.invalidateQueries({ 
                queryKey: ["/api/chat-rooms"] 
              });
              
              // Navigate to chat room if chatRoomId is provided
              if (data.chatRoomId) {
                queryClient.invalidateQueries({ 
                  queryKey: ["/api/chat-rooms", data.chatRoomId, "messages"] 
                });
              }
              break;
            
            case "error":
              console.error("WebSocket server error:", data.message);
              break;
            
            default:
              console.log("Unknown WebSocket message type:", data.type);
          }
        } catch (error) {
          console.error("Error parsing WebSocket message:", error);
        }
      };

      ws.onclose = (event) => {
        console.log("WebSocket disconnected:", event.code, event.reason);
        wsRef.current = null;
        
        setConnectionState(prev => ({
          ...prev,
          isConnected: false,
          isReconnecting: false
        }));
        
        // Attempt to reconnect after a delay if the connection wasn't closed intentionally
        if (event.code !== 1000 && userId) {
          const currentAttempts = connectionState.reconnectAttempts + 1;
          const reconnectDelay = getReconnectDelay(currentAttempts);
          
          setConnectionState(prev => ({
            ...prev,
            reconnectAttempts: currentAttempts,
            isReconnecting: true
          }));
          
          console.log(`WebSocket disconnected. Reconnecting in ${reconnectDelay}ms (attempt ${currentAttempts})`);
          
          // Show connection lost notification for first disconnect
          if (currentAttempts === 1) {
            showNotification({
              title: "연결 끊김",
              description: "채팅 서버와의 연결이 끊어졌습니다. 재연결 중...",
              variant: "destructive",
              duration: 4000
            });
          }
          
          reconnectTimeoutRef.current = setTimeout(() => {
            if (userId) {
              console.log(`Attempting to reconnect WebSocket (attempt ${currentAttempts})...`);
              connect();
            }
          }, reconnectDelay);
        }
      };

      ws.onerror = (error) => {
        console.error("WebSocket error:", error);
        
        setConnectionState(prev => ({
          ...prev,
          isConnected: false
        }));
        
        // Log error details for debugging
        if (error instanceof Event) {
          console.error("WebSocket error event:", {
            type: error.type,
            target: error.target,
            timeStamp: error.timeStamp
          });
        }
      };
    };

    connect();

    // Cleanup function
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.close(1000, "Component unmounting");
      }
    };
  }, [userId, queryClient]);

  // Smart message sending with retry mechanism
  const sendMessage = (message: any, options: { maxRetries?: number, priority?: 'high' | 'normal' | 'low' } = {}) => {
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const maxRetries = options.maxRetries || 3;
    
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(JSON.stringify(message));
        console.log(`Message ${messageId} sent immediately`);
        return { success: true, messageId };
      } catch (error) {
        console.error(`Failed to send message ${messageId} immediately:`, error);
        // Fall through to queue the message
      }
    }
    
    // Queue message for retry if WebSocket is not ready
    const pendingMessage: PendingMessage = {
      id: messageId,
      message,
      timestamp: Date.now(),
      retryCount: 0,
      maxRetries
    };
    
    pendingMessages.current.set(messageId, pendingMessage);
    console.log(`Message ${messageId} queued for retry (WebSocket state: ${wsRef.current?.readyState})`);
    
    // Show user feedback for queued message
    if (!connectionState.isConnected) {
      showNotification({
        title: "메시지 대기 중",
        description: "연결이 복구되면 메시지가 전송됩니다.",
        variant: "default",
        duration: 3000
      });
    }
    
    // Try to send immediately if connection becomes available
    if (connectionState.isReconnecting) {
      const checkConnection = () => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          processPendingMessages();
        } else if (wsRef.current?.readyState === WebSocket.CONNECTING) {
          setTimeout(checkConnection, 500);
        }
      };
      setTimeout(checkConnection, 100);
    } else {
      // Start retry process
      retryMessage(messageId);
    }
    
    return { success: false, messageId, queued: true };
  };

  // Clean up expired pending messages
  const cleanupExpiredMessages = () => {
    const now = Date.now();
    const expiredThreshold = 5 * 60 * 1000; // 5 minutes
    
    const messagesToDelete: string[] = [];
    const entries = Array.from(pendingMessages.current.entries());
    
    for (const [messageId, pendingMsg] of entries) {
      if (now - pendingMsg.timestamp > expiredThreshold) {
        messagesToDelete.push(messageId);
      }
    }
    
    messagesToDelete.forEach(messageId => {
      console.log(`Removing expired message ${messageId}`);
      pendingMessages.current.delete(messageId);
    });
  };

  // Clean up expired messages periodically
  useEffect(() => {
    const cleanup = setInterval(cleanupExpiredMessages, 60000); // Every minute
    return () => clearInterval(cleanup);
  }, []);

  return { 
    sendMessage, 
    connectionState,
    pendingMessageCount: pendingMessages.current.size
  };
}
