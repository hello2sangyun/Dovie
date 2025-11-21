import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAppState } from '@/hooks/useAppState';

interface ChatPresenceContextType {
  currentChatRoomId: number | null;
  setCurrentChatRoomId: (chatRoomId: number | null) => void;
  appState: 'active' | 'background';
  isInChatRoom: (chatRoomId: number) => boolean;
}

const ChatPresenceContext = createContext<ChatPresenceContextType | undefined>(undefined);

export function ChatPresenceProvider({ children }: { children: ReactNode }) {
  const [currentChatRoomId, setCurrentChatRoomId] = useState<number | null>(null);
  const appState = useAppState();

  // Helper function to check if user is actively viewing a specific chat room
  const isInChatRoom = (chatRoomId: number): boolean => {
    return appState === 'active' && currentChatRoomId === chatRoomId;
  };

  // Debug logging
  useEffect(() => {
    console.log(`📍 Chat Presence: currentRoom=${currentChatRoomId}, appState=${appState}`);
  }, [currentChatRoomId, appState]);

  return (
    <ChatPresenceContext.Provider 
      value={{ 
        currentChatRoomId, 
        setCurrentChatRoomId,
        appState,
        isInChatRoom
      }}
    >
      {children}
    </ChatPresenceContext.Provider>
  );
}

export function useChatPresence() {
  const context = useContext(ChatPresenceContext);
  
  // Graceful fallback if provider is not available (e.g., in WebSocket context)
  if (context === undefined) {
    console.warn('[ChatPresence] Context not available - using default values');
    return {
      currentChatRoomId: null,
      setCurrentChatRoomId: () => {},
      appState: 'active' as const,
      isInChatRoom: () => false
    };
  }
  
  return context;
}
