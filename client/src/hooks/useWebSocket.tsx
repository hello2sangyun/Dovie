import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useMobileNotification } from "./useMobileNotification";
import { useAuth } from "./useAuth";

export function useWebSocket(userId?: number) {
  const wsRef = useRef<WebSocket | null>(null);
  const queryClient = useQueryClient();
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const { showNotification } = useMobileNotification();
  const { user } = useAuth();

  useEffect(() => {
    if (!userId) return;

    const connect = () => {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("WebSocket connected");
        // Authenticate with the server
        ws.send(JSON.stringify({
          type: "auth",
          userId: userId,
        }));
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
        
        // Attempt to reconnect after a delay if the connection wasn't closed intentionally
        if (event.code !== 1000) {
          reconnectTimeoutRef.current = setTimeout(() => {
            if (userId) {
              console.log("Attempting to reconnect WebSocket...");
              connect();
            }
          }, 3000);
        }
      };

      ws.onerror = (error) => {
        console.error("WebSocket error:", error);
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

  // Return a function to send messages if needed
  const sendMessage = (message: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.warn("WebSocket not connected, cannot send message");
    }
  };

  return { sendMessage };
}
