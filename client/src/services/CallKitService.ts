import { isNativePlatform } from '@/lib/nativeBridge';

type PluginListenerHandle = {
  remove: () => void;
};

export interface CallKitVoipPlugin {
  register(): Promise<{ success: boolean }>;
  
  reportIncomingCall(options: {
    callId: string;
    callerName: string;
    hasVideo?: boolean;
  }): Promise<{ success: boolean }>;
  
  startCall(options: {
    callId: string;
    handle: string;
  }): Promise<{ success: boolean }>;
  
  endCall(options: {
    callId: string;
  }): Promise<{ success: boolean }>;
  
  answerCall(options: {
    callId: string;
  }): Promise<{ success: boolean }>;
  
  addListener(
    eventName: 'voipToken',
    listenerFunc: (data: { token: string }) => void
  ): Promise<PluginListenerHandle>;
  
  addListener(
    eventName: 'incomingCall',
    listenerFunc: (data: {
      callId: string;
      callerName: string;
      callerId: number;
      chatRoomId: number;
    }) => void
  ): Promise<PluginListenerHandle>;
  
  addListener(
    eventName: 'callAnswered' | 'callEnded' | 'callStarted',
    listenerFunc: (data: { callId: string }) => void
  ): Promise<PluginListenerHandle>;
  
  addListener(
    eventName: 'callMuted',
    listenerFunc: (data: { callId: string; isMuted: boolean }) => void
  ): Promise<PluginListenerHandle>;
  
  addListener(
    eventName: 'audioSessionActivated' | 'audioSessionDeactivated' | 'providerReset' | 'voipTokenInvalidated',
    listenerFunc: () => void
  ): Promise<PluginListenerHandle>;
  
  removeAllListeners(): Promise<void>;
}

let CallKitVoip: CallKitVoipPlugin | null = null;

async function getCallKitPlugin(): Promise<CallKitVoipPlugin> {
  if (!isNativePlatform()) {
    return {
      register: async () => ({ success: false }),
      reportIncomingCall: async () => ({ success: false }),
      startCall: async () => ({ success: false }),
      endCall: async () => ({ success: false }),
      answerCall: async () => ({ success: false }),
      addListener: async () => ({ remove: () => {} }),
      removeAllListeners: async () => {}
    };
  }

  if (CallKitVoip) {
    return CallKitVoip;
  }

  const { registerPlugin } = await import('@capacitor/core');
  CallKitVoip = registerPlugin<CallKitVoipPlugin>('CallKitVoip');
  return CallKitVoip;
}

export interface CallKitHandlers {
  onIncomingCall?: (data: {
    callId: string;
    callerName: string;
    callerId: number;
    chatRoomId: number;
  }) => void;
  onCallAnswered?: (data: { callId: string }) => void;
  onCallEnded?: (data: { callId: string }) => void;
  onCallStarted?: (data: { callId: string }) => void;
}

export class CallKitService {
  private static instance: CallKitService;
  private voipToken: string | null = null;
  private userId: number | null = null;
  private userName: string | null = null;
  
  private nativeBridgeReady: boolean = false;
  private nativeBridgeInitializing: boolean = false;
  private nativeListenersCleared: boolean = false;
  
  private nativeBridgeHandles: PluginListenerHandle[] = [];
  
  private jsHandlers: CallKitHandlers = {};
  
  private constructor() {}
  
  static getInstance(): CallKitService {
    if (!CallKitService.instance) {
      CallKitService.instance = new CallKitService();
    }
    return CallKitService.instance;
  }
  
  private async ensureNativeBridge(): Promise<void> {
    if (!isNativePlatform()) {
      console.log('📞 [CallKitService] Skipping native bridge - not on native platform');
      return;
    }

    // Return immediately if already ready
    if (this.nativeBridgeReady) {
      return;
    }
    
    // Wait if initialization is in progress (prevents race condition)
    if (this.nativeBridgeInitializing) {
      console.log('📞 [CallKitService] Waiting for in-flight bridge initialization...');
      while (this.nativeBridgeInitializing && !this.nativeBridgeReady) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      // After waiting, check if initialization succeeded
      if (!this.nativeBridgeReady) {
        throw new Error('CallKit native bridge initialization failed in concurrent caller');
      }
      
      return;
    }
    
    // Set in-flight flag before starting
    this.nativeBridgeInitializing = true;
    
    try {
      console.log('📞 [CallKitService] Bootstrapping native bridge...');
      
      const plugin = await getCallKitPlugin();
      
      await plugin.register();
      
      const tokenListener = await plugin.addListener('voipToken', async (data) => {
        console.log('📞 [CallKitService] VoIP token received:', data.token.substring(0, 20) + '...');
        this.voipToken = data.token;
        
        if (this.userId) {
          await this.registerVoipToken();
        }
      });
      
      const incomingCallListener = await plugin.addListener('incomingCall', async (data) => {
        console.log('📞 [CallKitService] Native incoming call event:', data);
        if (this.jsHandlers.onIncomingCall) {
          this.jsHandlers.onIncomingCall(data);
        }
      });
      
      const answeredListener = await plugin.addListener('callAnswered', (data) => {
        console.log('📞 [CallKitService] Native call answered event:', data);
        if (this.jsHandlers.onCallAnswered) {
          this.jsHandlers.onCallAnswered(data);
        }
      });
      
      const endedListener = await plugin.addListener('callEnded', (data) => {
        console.log('📞 [CallKitService] Native call ended event:', data);
        if (this.jsHandlers.onCallEnded) {
          this.jsHandlers.onCallEnded(data);
        }
      });
      
      const startedListener = await plugin.addListener('callStarted', (data) => {
        console.log('📞 [CallKitService] Native call started event:', data);
        if (this.jsHandlers.onCallStarted) {
          this.jsHandlers.onCallStarted(data);
        }
      });
      
      // Populate handles array first, then mark ready (atomic operation)
      this.nativeBridgeHandles = [
        tokenListener,
        incomingCallListener,
        answeredListener,
        endedListener,
        startedListener
      ];
      
      this.nativeListenersCleared = false;
      
      // Mark ready AFTER handles are populated
      this.nativeBridgeReady = true;
      console.log('✅ [CallKitService] Native bridge ready');
    } catch (error) {
      console.error('❌ [CallKitService] Failed to bootstrap native bridge:', error);
      // Reset flags to allow retry
      this.nativeBridgeReady = false;
      this.nativeListenersCleared = false;
      throw error;
    } finally {
      // Always clear initializing flag
      this.nativeBridgeInitializing = false;
    }
  }
  
  async configureUser(userId: number, userName: string): Promise<void> {
    await this.ensureNativeBridge();
    
    const previousUserId = this.userId;
    const userChanged = previousUserId !== userId;
    
    this.userId = userId;
    this.userName = userName;
    
    console.log(`📞 [CallKitService] User configured: ${userId} (${userName}), userChanged: ${userChanged}`);
    
    // Register VoIP token when token is available
    if (this.voipToken) {
      await this.registerVoipToken();
    }
  }
  
  private async registerVoipToken(): Promise<void> {
    if (!this.voipToken || !this.userId) return;
    
    try {
      console.log('📞 [CallKitService] Registering VoIP token for user:', this.userId);
      const response = await fetch('/api/push/register-voip', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': this.userId.toString()
        },
        body: JSON.stringify({
          token: this.voipToken,
          userId: this.userId
        })
      });
      
      if (response.ok) {
        console.log('✅ [CallKitService] VoIP token registered successfully');
      } else {
        console.error('❌ [CallKitService] Failed to register VoIP token:', await response.text());
      }
    } catch (error) {
      console.error('❌ [CallKitService] Error registering VoIP token:', error);
    }
  }
  
  bindHandlers(handlers: CallKitHandlers): () => void {
    this.jsHandlers = { ...this.jsHandlers, ...handlers };
    
    console.log('📞 [CallKitService] JS handlers bound');
    
    return () => {
      Object.keys(handlers).forEach(key => {
        delete this.jsHandlers[key as keyof CallKitHandlers];
      });
      console.log('📞 [CallKitService] JS handlers unbound');
    };
  }
  
  resetHandlers(): void {
    this.jsHandlers = {};
    console.log('📞 [CallKitService] JS handlers reset');
  }
  
  clearUserContext(): void {
    this.userId = null;
    this.userName = null;
    // Keep voipToken for re-registration when user logs back in
    console.log('📞 [CallKitService] User context cleared (voipToken preserved)');
  }
  
  async teardown(options?: { hard?: boolean }): Promise<void> {
    this.resetHandlers();
    this.clearUserContext();
    
    if (options?.hard && !this.nativeListenersCleared && isNativePlatform()) {
      console.log('🧹 [CallKitService] Hard teardown: removing native listeners');
      this.nativeBridgeHandles.forEach(handle => handle.remove());
      this.nativeBridgeHandles = [];
      const plugin = await getCallKitPlugin();
      await plugin.removeAllListeners();
      this.nativeBridgeReady = false;
      this.nativeBridgeInitializing = false;
      this.nativeListenersCleared = true;
    }
    
    console.log('🧹 [CallKitService] Teardown complete');
  }
  
  async reportIncomingCall(callId: string, callerName: string): Promise<void> {
    if (!isNativePlatform()) return;
    
    try {
      const plugin = await getCallKitPlugin();
      await plugin.reportIncomingCall({
        callId,
        callerName,
        hasVideo: false
      });
      console.log('📞 [CallKitService] Reported incoming call to CallKit');
    } catch (error) {
      console.error('❌ [CallKitService] Failed to report incoming call:', error);
    }
  }
  
  async startCall(callId: string, handle: string): Promise<void> {
    if (!isNativePlatform()) return;
    
    try {
      const plugin = await getCallKitPlugin();
      await plugin.startCall({ callId, handle });
      console.log('📞 [CallKitService] Started outgoing call');
    } catch (error) {
      console.error('❌ [CallKitService] Failed to start call:', error);
    }
  }
  
  async endCall(callId: string): Promise<void> {
    if (!isNativePlatform()) return;
    
    try {
      const plugin = await getCallKitPlugin();
      await plugin.endCall({ callId });
      console.log('📞 [CallKitService] Ended call');
    } catch (error) {
      console.error('❌ [CallKitService] Failed to end call:', error);
    }
  }
  
  async answerCall(callId: string): Promise<void> {
    if (!isNativePlatform()) return;
    
    try {
      const plugin = await getCallKitPlugin();
      await plugin.answerCall({ callId });
      console.log('📞 [CallKitService] Answered call');
    } catch (error) {
      console.error('❌ [CallKitService] Failed to answer call:', error);
    }
  }
}

export default CallKitService.getInstance();
