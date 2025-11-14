import { registerPlugin } from '@capacitor/core';
import type { PluginListenerHandle } from '@capacitor/core';

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

const CallKitVoip = registerPlugin<CallKitVoipPlugin>('CallKitVoip', {
  web: () => {
    // Web implementation (no-op for PWA)
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
});

export class CallKitService {
  private static instance: CallKitService;
  private voipToken: string | null = null;
  private listeners: PluginListenerHandle[] = [];
  private userId: number | null = null;
  private userName: string | null = null;
  
  private constructor() {}
  
  static getInstance(): CallKitService {
    if (!CallKitService.instance) {
      CallKitService.instance = new CallKitService();
    }
    return CallKitService.instance;
  }
  
  static async initialize(userId: number, userName: string): Promise<void> {
    const instance = CallKitService.getInstance();
    instance.userId = userId;
    instance.userName = userName;
    await instance.initialize();
  }
  
  async initialize(): Promise<void> {
    try {
      console.log('📞 [CallKitService] Initializing...');
      
      // Register for VoIP notifications
      await CallKitVoip.register();
      
      // Listen for VoIP token
      const tokenListener = await CallKitVoip.addListener('voipToken', async (data) => {
        console.log('📞 [CallKitService] VoIP token received:', data.token.substring(0, 20) + '...');
        this.voipToken = data.token;
        
        // Send token to server
        await this.registerVoipToken(data.token);
      });
      
      this.listeners.push(tokenListener);
      
      console.log('✅ [CallKitService] Initialized');
    } catch (error) {
      console.error('❌ [CallKitService] Initialization failed:', error);
    }
  }
  
  private async registerVoipToken(token: string): Promise<void> {
    try {
      const response = await fetch('/api/voip-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': localStorage.getItem('userId') || ''
        },
        body: JSON.stringify({ 
          voipToken: token,
          platform: 'ios'  // Always 'ios' for CallKit VoIP
        })
      });
      
      if (response.ok) {
        console.log('✅ [CallKitService] VoIP token registered on server (platform: ios)');
      } else {
        console.error('❌ [CallKitService] Failed to register VoIP token:', await response.text());
      }
    } catch (error) {
      console.error('❌ [CallKitService] Error registering VoIP token:', error);
    }
  }
  
  async reportIncomingCall(callId: string, callerName: string): Promise<void> {
    try {
      await CallKitVoip.reportIncomingCall({
        callId,
        callerName,
        hasVideo: false
      });
      console.log('✅ [CallKitService] Incoming call reported to CallKit');
    } catch (error) {
      console.error('❌ [CallKitService] Failed to report incoming call:', error);
    }
  }
  
  async startCall(callId: string, handle: string): Promise<void> {
    try {
      await CallKitVoip.startCall({ callId, handle });
      console.log('✅ [CallKitService] Call started via CallKit');
    } catch (error) {
      console.error('❌ [CallKitService] Failed to start call:', error);
    }
  }
  
  async endCall(callId: string): Promise<void> {
    try {
      await CallKitVoip.endCall({ callId });
      console.log('✅ [CallKitService] Call ended via CallKit');
    } catch (error) {
      console.error('❌ [CallKitService] Failed to end call:', error);
    }
  }
  
  async answerCall(callId: string): Promise<void> {
    try {
      await CallKitVoip.answerCall({ callId });
      console.log('✅ [CallKitService] Call answered via CallKit');
    } catch (error) {
      console.error('❌ [CallKitService] Failed to answer call:', error);
    }
  }
  
  onIncomingCall(callback: (data: {
    callId: string;
    callerName: string;
    callerId: number;
    chatRoomId: number;
  }) => void): void {
    CallKitVoip.addListener('incomingCall', callback).then(listener => {
      this.listeners.push(listener);
    });
  }
  
  onCallAnswered(callback: (data: { callId: string }) => void): void {
    CallKitVoip.addListener('callAnswered', callback).then(listener => {
      this.listeners.push(listener);
    });
  }
  
  onCallEnded(callback: (data: { callId: string }) => void): void {
    CallKitVoip.addListener('callEnded', callback).then(listener => {
      this.listeners.push(listener);
    });
  }
  
  cleanup(): void {
    this.listeners.forEach(listener => listener.remove());
    this.listeners = [];
    console.log('🧹 [CallKitService] Cleaned up listeners');
  }
}

export default CallKitService.getInstance();
