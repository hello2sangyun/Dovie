import { createContext, useContext, useReducer, useEffect, useRef, ReactNode, useCallback } from 'react';
import { 
  CallSession, 
  CallSessionState, 
  CallSessionEvent, 
  CallSessionMessage 
} from '@shared/schema';

// ===================================
// CallSessionStore State & Actions
// ===================================

interface CallSessionStoreState {
  // Map of callSessionId to CallSession
  sessions: Map<string, CallSession>;
  // Currently active session (displayed in modal)
  activeSessionId: string | null;
  // Session claim lock (prevents duplicate modals)
  claimedSessionId: string | null;
  // Queued incoming sessions
  queuedSessions: string[];
}

type CallSessionAction =
  | { type: 'SESSION_CREATED'; session: CallSession }
  | { type: 'SESSION_UPDATED'; callSessionId: string; updates: Partial<CallSession> }
  | { type: 'SESSION_STATE_CHANGED'; callSessionId: string; newState: CallSessionState }
  | { type: 'SESSION_CLAIMED'; callSessionId: string }
  | { type: 'SESSION_RELEASED'; callSessionId: string }
  | { type: 'SESSION_REMOVED'; callSessionId: string }
  | { type: 'QUEUE_SESSION'; callSessionId: string }
  | { type: 'DEQUEUE_SESSION'; callSessionId: string };

// ===================================
// State Machine: Session Reducer
// ===================================

function sessionReducer(
  state: CallSessionStoreState,
  action: CallSessionAction
): CallSessionStoreState {
  const newState = { ...state, sessions: new Map(state.sessions) };

  switch (action.type) {
    case 'SESSION_CREATED': {
      const { session } = action;
      newState.sessions.set(session.callSessionId, session);
      console.log(`[CallSessionStore] Session created: ${session.callSessionId}, state: ${session.state}`);
      return newState;
    }

    case 'SESSION_UPDATED': {
      const { callSessionId, updates } = action;
      const existingSession = newState.sessions.get(callSessionId);
      if (existingSession) {
        newState.sessions.set(callSessionId, {
          ...existingSession,
          ...updates,
          lastEventAt: Date.now()
        });
        console.log(`[CallSessionStore] Session updated: ${callSessionId}`);
      }
      return newState;
    }

    case 'SESSION_STATE_CHANGED': {
      const { callSessionId, newState: sessionState } = action;
      const existingSession = newState.sessions.get(callSessionId);
      if (existingSession) {
        newState.sessions.set(callSessionId, {
          ...existingSession,
          state: sessionState,
          lastEventAt: Date.now()
        });
        console.log(`[CallSessionStore] Session state changed: ${callSessionId} → ${sessionState}`);
        
        // Terminal states: remove from queue and schedule cleanup
        if (
          sessionState === CallSessionState.ENDED ||
          sessionState === CallSessionState.REJECTED ||
          sessionState === CallSessionState.CANCELED ||
          sessionState === CallSessionState.EXPIRED ||
          sessionState === CallSessionState.FAILED
        ) {
          console.log(`[CallSessionStore] Session ${callSessionId} reached terminal state, cleaning up`);
          
          // Remove from queue immediately
          newState.queuedSessions = newState.queuedSessions.filter(id => id !== callSessionId);
          
          // Schedule removal after 5 seconds (allow UI to show end state)
          setTimeout(() => {
            console.log(`[CallSessionStore] Removing terminal session: ${callSessionId}`);
            // Use a fresh dispatch to avoid closure issues
            window.dispatchEvent(new CustomEvent('call-session-cleanup', {
              detail: { callSessionId }
            }));
          }, 5000);
        }
      }
      return newState;
    }

    case 'SESSION_CLAIMED': {
      const { callSessionId } = action;
      
      // Safety check: don't overwrite an active session
      if (newState.claimedSessionId && newState.claimedSessionId !== callSessionId) {
        console.warn(`[CallSessionStore] Cannot claim ${callSessionId}: ${newState.claimedSessionId} is already active`);
        // Queue it instead
        if (!newState.queuedSessions.includes(callSessionId)) {
          newState.queuedSessions = [...newState.queuedSessions, callSessionId];
        }
        return newState;
      }
      
      console.log(`[CallSessionStore] Session claimed: ${callSessionId}`);
      return {
        ...newState,
        activeSessionId: callSessionId,
        claimedSessionId: callSessionId
      };
    }

    case 'SESSION_RELEASED': {
      const { callSessionId } = action;
      console.log(`[CallSessionStore] Session released: ${callSessionId}`);
      
      // If releasing the active session, dequeue next one
      if (newState.activeSessionId === callSessionId) {
        const nextSessionId = newState.queuedSessions[0];
        return {
          ...newState,
          activeSessionId: nextSessionId || null,
          claimedSessionId: nextSessionId || null,
          queuedSessions: nextSessionId 
            ? newState.queuedSessions.slice(1) 
            : newState.queuedSessions
        };
      }
      return newState;
    }

    case 'SESSION_REMOVED': {
      const { callSessionId } = action;
      newState.sessions.delete(callSessionId);
      console.log(`[CallSessionStore] Session removed: ${callSessionId}`);
      
      // Remove from queue regardless
      newState.queuedSessions = newState.queuedSessions.filter(id => id !== callSessionId);
      
      // Clean up active/claimed if this was the current session
      if (newState.activeSessionId === callSessionId) {
        const nextSessionId = newState.queuedSessions[0];
        return {
          ...newState,
          activeSessionId: nextSessionId || null,
          claimedSessionId: nextSessionId || null,
          queuedSessions: nextSessionId 
            ? newState.queuedSessions.slice(1) 
            : newState.queuedSessions
        };
      }
      return newState;
    }

    case 'QUEUE_SESSION': {
      const { callSessionId } = action;
      if (!newState.queuedSessions.includes(callSessionId)) {
        console.log(`[CallSessionStore] Session queued: ${callSessionId}`);
        return {
          ...newState,
          queuedSessions: [...newState.queuedSessions, callSessionId]
        };
      }
      return newState;
    }

    case 'DEQUEUE_SESSION': {
      const { callSessionId } = action;
      console.log(`[CallSessionStore] Session dequeued: ${callSessionId}`);
      return {
        ...newState,
        queuedSessions: newState.queuedSessions.filter(id => id !== callSessionId)
      };
    }

    default:
      return state;
  }
}

// ===================================
// CallSessionStore Context
// ===================================

interface CallSessionStoreContext {
  // Low-level primitives
  state: CallSessionStoreState;
  createSession: (session: CallSession) => void;
  updateSession: (callSessionId: string, updates: Partial<CallSession>) => void;
  changeSessionState: (callSessionId: string, newState: CallSessionState) => void;
  claimSession: (callSessionId: string) => boolean;
  releaseSession: (callSessionId: string) => void;
  removeSession: (callSessionId: string) => void;
  getSession: (callSessionId: string) => CallSession | undefined;
  getActiveSession: () => CallSession | undefined;
  isSessionClaimed: (callSessionId: string) => boolean;
  
  // High-level façade for MainApp/UI
  activeSession: CallSession | undefined;
  claimedSessionId: string | null;
  releaseActiveSession: () => void;
  handleIncomingOffer: (
    callSessionId: string,
    fromUserId: number,
    chatRoomId: number,
    offer: RTCSessionDescriptionInit,
    metadata?: {
      receiverId?: number;
      receiverName?: string;
      receiverProfilePicture?: string;
      callerName?: string;
      callerProfilePicture?: string;
      callType?: 'voice' | 'video';
    }
  ) => void;
  handleAnswer: (answer: RTCSessionDescriptionInit) => void;
  handleReject: () => void;
  handleEnd: () => void;
  handleIceCandidate: (candidate: RTCIceCandidateInit) => void;
}

const CallSessionContext = createContext<CallSessionStoreContext | null>(null);

// BroadcastChannel for Service Worker ↔ MainApp communication
const CALL_CHANNEL_NAME = 'dovie-call-sessions';

export function CallSessionStoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(sessionReducer, {
    sessions: new Map(),
    activeSessionId: null,
    claimedSessionId: null,
    queuedSessions: []
  });

  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);
  const stateRef = useRef(state);

  // Keep state ref updated
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // Helper: check if state is terminal
  const isTerminalState = (state?: CallSessionState) =>
    state === CallSessionState.ENDED ||
    state === CallSessionState.REJECTED ||
    state === CallSessionState.CANCELED ||
    state === CallSessionState.EXPIRED ||
    state === CallSessionState.FAILED;

  // Initialize BroadcastChannel
  useEffect(() => {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      const channel = new BroadcastChannel(CALL_CHANNEL_NAME);
      broadcastChannelRef.current = channel;

      // Listen for messages from Service Worker - use ref to avoid stale closure
      channel.onmessage = (event: MessageEvent<CallSessionMessage>) => {
        const { type, session, callSessionId, source } = event.data;
        console.log(`[CallSessionStore] BroadcastChannel message: ${type} from ${source}`);

        // Always use current state from ref
        const currentState = stateRef.current;

        switch (type) {
          case 'call-session-update': {
            if (!session) break;

            const existing = currentState.sessions.get(session.callSessionId);
            const prevState = existing?.state;
            const nextState = session.state;
            const hasStateChange = Boolean(prevState && nextState && prevState !== nextState);

            if (!existing) {
              dispatch({ type: 'SESSION_CREATED', session });
            } else {
              dispatch({
                type: 'SESSION_UPDATED',
                callSessionId: session.callSessionId,
                updates: session
              });
            }

            if (hasStateChange) {
              dispatch({
                type: 'SESSION_STATE_CHANGED',
                callSessionId: session.callSessionId,
                newState: nextState!
              });

              if (isTerminalState(nextState)) {
                setTimeout(() => {
                  dispatch({ type: 'SESSION_REMOVED', callSessionId: session.callSessionId });
                  broadcastChannelRef.current?.postMessage({
                    type: 'call-session-cleanup',
                    callSessionId: session.callSessionId,
                    source: 'cleanup-timer'
                  } as CallSessionMessage);
                }, 5000);
              }
            }
            break;
          }

          case 'call-session-cleanup': {
            const targetId = callSessionId ?? session?.callSessionId;
            if (targetId) {
              dispatch({ type: 'SESSION_REMOVED', callSessionId: targetId });
            }
            break;
          }

          case 'call-session-claim': {
            if (!session) break;
            // Service Worker requesting to claim session (from push notification)
            // Only dispatch if not already claimed by another session
            if (!currentState.claimedSessionId || currentState.claimedSessionId === session.callSessionId) {
              dispatch({ type: 'SESSION_CLAIMED', callSessionId: session.callSessionId });
            } else {
              console.log(`[CallSessionStore] Ignoring claim from ${source}: ${currentState.claimedSessionId} is already claimed`);
              // Queue the session instead
              dispatch({ type: 'QUEUE_SESSION', callSessionId: session.callSessionId });
            }
            break;
          }

          case 'call-session-release': {
            if (!session) break;
            // Release session
            dispatch({ type: 'SESSION_RELEASED', callSessionId: session.callSessionId });
            break;
          }
        }
      };

      console.log('[CallSessionStore] BroadcastChannel initialized');

      return () => {
        channel.close();
        console.log('[CallSessionStore] BroadcastChannel closed');
      };
    } else {
      console.warn('[CallSessionStore] BroadcastChannel not supported');
    }
  }, []); // Empty deps - handler uses ref

  // Listen for terminal session cleanup events
  useEffect(() => {
    const handleCleanup = (event: Event) => {
      const customEvent = event as CustomEvent<{ callSessionId: string }>;
      const { callSessionId } = customEvent.detail;
      dispatch({ type: 'SESSION_REMOVED', callSessionId });
    };

    window.addEventListener('call-session-cleanup', handleCleanup);

    return () => {
      window.removeEventListener('call-session-cleanup', handleCleanup);
    };
  }, []);

  // Actions
  const createSession = useCallback((session: CallSession) => {
    dispatch({ type: 'SESSION_CREATED', session });
    
    // Broadcast to other tabs/Service Worker
    if (broadcastChannelRef.current) {
      broadcastChannelRef.current.postMessage({
        type: 'call-session-update',
        session,
        source: 'websocket'
      } as CallSessionMessage);
    }
  }, []);

  const updateSession = useCallback((callSessionId: string, updates: Partial<CallSession>) => {
    dispatch({ type: 'SESSION_UPDATED', callSessionId, updates });
  }, []);

  const changeSessionState = useCallback((callSessionId: string, newState: CallSessionState) => {
    dispatch({ type: 'SESSION_STATE_CHANGED', callSessionId, newState });
  }, []);

  const claimSession = useCallback((callSessionId: string): boolean => {
    // Check if another session is already claimed
    if (state.claimedSessionId && state.claimedSessionId !== callSessionId) {
      console.log(`[CallSessionStore] Cannot claim ${callSessionId}: ${state.claimedSessionId} is already claimed`);
      // Queue this session
      dispatch({ type: 'QUEUE_SESSION', callSessionId });
      return false;
    }

    dispatch({ type: 'SESSION_CLAIMED', callSessionId });
    
    // Broadcast claim to other tabs
    if (broadcastChannelRef.current) {
      const session = state.sessions.get(callSessionId);
      if (session) {
        broadcastChannelRef.current.postMessage({
          type: 'call-session-claim',
          session,
          source: 'websocket'
        } as CallSessionMessage);
      }
    }
    
    return true;
  }, [state.claimedSessionId, state.sessions]);

  const releaseSession = useCallback((callSessionId: string) => {
    dispatch({ type: 'SESSION_RELEASED', callSessionId });
    
    // Broadcast release to other tabs
    if (broadcastChannelRef.current) {
      const session = state.sessions.get(callSessionId);
      if (session) {
        broadcastChannelRef.current.postMessage({
          type: 'call-session-release',
          session,
          source: 'websocket'
        } as CallSessionMessage);
      }
    }
  }, [state.sessions]);

  const removeSession = useCallback((callSessionId: string) => {
    dispatch({ type: 'SESSION_REMOVED', callSessionId });
  }, []);

  const getSession = useCallback((callSessionId: string): CallSession | undefined => {
    return state.sessions.get(callSessionId);
  }, [state.sessions]);

  const getActiveSession = useCallback((): CallSession | undefined => {
    if (!state.activeSessionId) return undefined;
    return state.sessions.get(state.activeSessionId);
  }, [state.activeSessionId, state.sessions]);

  const isSessionClaimed = useCallback((callSessionId: string): boolean => {
    return state.claimedSessionId === callSessionId;
  }, [state.claimedSessionId]);

  // High-level façade methods
  const releaseActiveSession = useCallback(() => {
    if (state.activeSessionId) {
      releaseSession(state.activeSessionId);
    }
  }, [state.activeSessionId, releaseSession]);

  const handleIncomingOffer = useCallback((
    callSessionId: string,
    fromUserId: number,
    chatRoomId: number,
    offer: RTCSessionDescriptionInit,
    metadata?: {
      receiverId?: number;
      receiverName?: string;
      receiverProfilePicture?: string;
      callerName?: string;
      callerProfilePicture?: string;
      callType?: 'voice' | 'video';
    }
  ) => {
    // Create CallSession with server-hydrated metadata
    const session: CallSession = {
      callSessionId,
      chatRoomId,
      callerId: fromUserId,
      receiverId: metadata?.receiverId || 0,
      callerName: metadata?.callerName || 'Unknown Caller',
      callerProfilePicture: metadata?.callerProfilePicture,
      receiverName: metadata?.receiverName || null,
      receiverProfilePicture: metadata?.receiverProfilePicture || null,
      callType: metadata?.callType || 'voice',
      state: CallSessionState.PENDING,
      offer,
      answer: null,
      iceCandidates: [],
      startedAt: null,
      endedAt: null,
      lastEventAt: Date.now()
    };

    createSession(session);
    claimSession(callSessionId);
  }, [createSession, claimSession]);

  const handleAnswer = useCallback((answer: RTCSessionDescriptionInit) => {
    if (!state.activeSessionId) {
      console.warn('[CallSessionStore] handleAnswer: No active session');
      return;
    }
    updateSession(state.activeSessionId, { answer });
    changeSessionState(state.activeSessionId, CallSessionState.CONNECTED);
  }, [state.activeSessionId, updateSession, changeSessionState]);

  const handleReject = useCallback(() => {
    if (!state.activeSessionId) {
      console.warn('[CallSessionStore] handleReject: No active session');
      return;
    }
    changeSessionState(state.activeSessionId, CallSessionState.REJECTED);
  }, [state.activeSessionId, changeSessionState]);

  const handleEnd = useCallback(() => {
    if (!state.activeSessionId) {
      console.warn('[CallSessionStore] handleEnd: No active session');
      return;
    }
    changeSessionState(state.activeSessionId, CallSessionState.ENDED);
  }, [state.activeSessionId, changeSessionState]);

  const handleIceCandidate = useCallback((candidate: RTCIceCandidateInit) => {
    if (!state.activeSessionId) {
      console.warn('[CallSessionStore] handleIceCandidate: No active session');
      return;
    }
    const session = state.sessions.get(state.activeSessionId);
    if (session) {
      const updatedCandidates = [...(session.iceCandidates || []), candidate];
      updateSession(state.activeSessionId, { iceCandidates: updatedCandidates });
    }
  }, [state.activeSessionId, state.sessions, updateSession]);

  // Service Worker call sync for cold-start pending sessions
  useServiceWorkerCallSync(createSession, claimSession);

  const contextValue: CallSessionStoreContext = {
    // Low-level primitives
    state,
    createSession,
    updateSession,
    changeSessionState,
    claimSession,
    releaseSession,
    removeSession,
    getSession,
    getActiveSession,
    isSessionClaimed,
    
    // High-level façade
    activeSession: state.activeSessionId ? state.sessions.get(state.activeSessionId) : undefined,
    claimedSessionId: state.claimedSessionId,
    releaseActiveSession,
    handleIncomingOffer,
    handleAnswer,
    handleReject,
    handleEnd,
    handleIceCandidate
  };

  return (
    <CallSessionContext.Provider value={contextValue}>
      {children}
    </CallSessionContext.Provider>
  );
}

export function useCallSessionStore() {
  const context = useContext(CallSessionContext);
  if (!context) {
    throw new Error('useCallSessionStore must be used within CallSessionStoreProvider');
  }
  return context;
}

// ===================================
// Service Worker Call Sync Hook
// ===================================

function useServiceWorkerCallSync(
  createSession: (session: CallSession) => void,
  claimSession: (callSessionId: string) => boolean
) {
  const lastCallReadyRef = useRef<number>(0);
  const CALL_READY_THROTTLE = 2000; // 2s throttle

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    const sendCallReady = () => {
      const now = Date.now();
      if (now - lastCallReadyRef.current < CALL_READY_THROTTLE) {
        console.log('[CallSessionStore] CALL_READY throttled');
        return;
      }
      
      lastCallReadyRef.current = now;
      
      navigator.serviceWorker.ready.then((registration) => {
        if (registration.active) {
          // Get or create client ID
          let clientId = sessionStorage.getItem('sw-call-client-id');
          if (!clientId) {
            clientId = `client_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
            sessionStorage.setItem('sw-call-client-id', clientId);
          }
          
          // Use controller if available (existing clients), else use registration.active (new clients)
          const target = navigator.serviceWorker.controller || registration.active;
          target.postMessage({
            type: 'CALL_READY',
            clientId
          });
          
          const via = navigator.serviceWorker.controller ? 'controller' : 'registration.active';
          console.log(`[CallSessionStore] CALL_READY sent to SW via ${via}`);
        } else {
          console.warn('[CallSessionStore] No active service worker found');
        }
      }).catch((error) => {
        console.error('[CallSessionStore] Failed to send CALL_READY:', error);
      });
    };

    const handleSWMessage = (event: MessageEvent) => {
      const { type, sessions } = event.data;
      
      if (type === 'PENDING_CALL_SESSIONS' && Array.isArray(sessions)) {
        console.log('[CallSessionStore] Received pending call sessions from SW:', sessions.length);
        
        const claimedSessionIds: string[] = [];
        
        sessions.forEach((session: CallSession) => {
          // Hydrate store
          createSession(session);
          
          // Try to claim (may fail if already claimed)
          const claimed = claimSession(session.callSessionId);
          if (claimed) {
            claimedSessionIds.push(session.callSessionId);
          }
        });
        
        // Send claimed confirmation to SW
        if (claimedSessionIds.length > 0) {
          navigator.serviceWorker.ready.then((registration) => {
            const target = navigator.serviceWorker.controller || registration.active;
            if (target) {
              target.postMessage({
                type: 'CALL_SESSION_CLAIMED',
                callSessionIds: claimedSessionIds
              });
              
              console.log('[CallSessionStore] Claimed sessions sent to SW:', claimedSessionIds);
            }
          }).catch((error) => {
            console.error('[CallSessionStore] Failed to send CALL_SESSION_CLAIMED:', error);
          });
        }
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('[CallSessionStore] App became visible, sending CALL_READY');
        sendCallReady();
      }
    };

    // Initial CALL_READY
    sendCallReady();

    // Listen for SW messages
    navigator.serviceWorker.addEventListener('message', handleSWMessage);

    // Listen for visibility changes
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      navigator.serviceWorker.removeEventListener('message', handleSWMessage);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [createSession, claimSession]);
}
