import { createContext, useContext, ReactNode } from 'react';
import { useWebSocket } from './useWebSocket';
import { useAuth } from './useAuth';

interface WebSocketContextType {
  sendMessage: (message: any) => void;
  subscribeToSignaling: (handler: (data: any) => void) => () => void;
  connectionState: {
    isConnected: boolean;
    isReconnecting: boolean;
    reconnectAttempts: number;
    lastReconnectTime: number;
  };
  pendingMessageCount: number;
}

const WebSocketContext = createContext<WebSocketContextType | null>(null);

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { sendMessage, subscribeToSignaling, connectionState, pendingMessageCount } = useWebSocket(user?.id);

  return (
    <WebSocketContext.Provider value={{ sendMessage, subscribeToSignaling, connectionState, pendingMessageCount }}>
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocketContext() {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocketContext must be used within WebSocketProvider');
  }
  return context;
}
