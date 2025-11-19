import { useState, useEffect, useCallback } from 'react';
import { isNativePlatform, loadApp } from '@/lib/nativeBridge';

interface MicrophonePermissionState {
  hasPermission: boolean;
  isRequesting: boolean;
  stream: MediaStream | null;
}

export function useMicrophonePermission() {
  const [state, setState] = useState<MicrophonePermissionState>({
    hasPermission: false,
    isRequesting: false,
    stream: null
  });

  // Check initial permission status (without activating microphone)
  useEffect(() => {
    const checkPermission = async () => {
      try {
        // Check if permission was previously granted (stored in localStorage)
        const stored = localStorage.getItem('microphonePermissionGranted');
        if (stored === 'true') {
          // Only update permission flag, don't activate microphone
          setState(prev => ({ ...prev, hasPermission: true }));
          console.log('✅ Microphone permission previously granted (no stream created)');
          return;
        }

        // Check permission state via Permissions API (if available)
        if ('permissions' in navigator) {
          const result = await navigator.permissions.query({ name: 'microphone' as PermissionName });
          if (result.state === 'granted') {
            // Permission granted, but don't create stream yet
            setState(prev => ({ ...prev, hasPermission: true }));
            localStorage.setItem('microphonePermissionGranted', 'true');
            console.log('✅ Microphone permission detected (no stream created to avoid iOS chime)');
          }
        }
      } catch (error) {
        console.log('Permission check failed:', error);
      }
    };

    checkPermission();
  }, []);

  // Release microphone stream when app goes to background
  useEffect(() => {
    if (!isNativePlatform()) return;

    let listener: any;

    const setupBackgroundListener = async () => {
      try {
        const App = await loadApp();
        if (!App) return;

        listener = await App.addListener('appStateChange', ({ isActive }: any) => {
          if (!isActive && state.stream) {
            console.log('📱 App backgrounded - releasing microphone stream to avoid iOS chime on resume');
            state.stream.getTracks().forEach(track => track.stop());
            setState(prev => ({ ...prev, stream: null }));
          }
        });
      } catch (error) {
        console.log('Could not setup background listener (web mode):', error);
      }
    };

    setupBackgroundListener();

    return () => {
      if (listener) {
        listener.remove();
      }
    };
  }, [state.stream]);

  // Request microphone permission (only for permission request, not stream creation)
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (state.hasPermission) {
      console.log('🎤 Permission already granted');
      return true;
    }

    setState(prev => ({ ...prev, isRequesting: true }));

    try {
      console.log('🎤 Requesting microphone permission (will create temporary stream)...');
      // Create temporary stream to request permission, then immediately release it
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100,
          channelCount: 1
        } 
      });

      console.log('✅ Microphone permission granted');

      // Immediately stop the stream - we only needed it for permission
      stream.getTracks().forEach(track => track.stop());

      setState(prev => ({ 
        ...prev, 
        hasPermission: true, 
        isRequesting: false
      }));
      
      localStorage.setItem('microphonePermissionGranted', 'true');
      return true;
    } catch (error) {
      console.error('❌ Microphone permission denied:', error);
      setState(prev => ({ ...prev, isRequesting: false }));
      localStorage.removeItem('microphonePermissionGranted');
      return false;
    }
  }, [state.hasPermission]);

  // Get fresh stream for recording - iPhone PWA optimized
  // This function is called when user actually starts recording (not on app init)
  const getStream = useCallback(async (): Promise<MediaStream | null> => {
    console.log('🎤 Getting microphone stream for recording...');
    
    // Check if we have an active stream we can reuse
    if (state.stream && state.stream.active) {
      console.log('🎤 Reusing existing active stream');
      return state.stream;
    }

    // Create new stream - this will trigger iOS "chime" but only when user starts recording
    try {
      console.log('🎤 Creating fresh microphone stream (iOS chime expected - user initiated)...');
      
      // iPhone PWA compatible settings
      const isIPhonePWA = (window.navigator as any).standalone === true || 
                         window.matchMedia('(display-mode: standalone)').matches;
      
      const audioConstraints = isIPhonePWA ? {
        echoCancellation: false, // Disable for iPhone PWA compatibility
        noiseSuppression: false, // Disable for iPhone PWA compatibility
        autoGainControl: false,  // Disable for iPhone PWA compatibility
        channelCount: 1,         // Mono for better iPhone PWA support
        sampleRate: 16000        // Lower sample rate for iPhone PWA
      } : {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        sampleRate: 44100,
        channelCount: 1
      };

      const stream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints });
      
      setState(prev => ({ ...prev, stream, hasPermission: true }));
      localStorage.setItem('microphonePermissionGranted', 'true');
      
      console.log('✅ Microphone stream created successfully (user is recording)');
      return stream;
    } catch (error) {
      console.error('❌ Failed to get microphone stream:', error);
      setState(prev => ({ ...prev, hasPermission: false, stream: null }));
      localStorage.removeItem('microphonePermissionGranted');
      return null;
    }
  }, [state.stream]);

  // Clean up stream
  const releaseStream = useCallback(() => {
    if (state.stream) {
      state.stream.getTracks().forEach(track => track.stop());
      setState(prev => ({ ...prev, stream: null }));
    }
  }, [state.stream]);

  return {
    hasPermission: state.hasPermission,
    isRequesting: state.isRequesting,
    requestPermission,
    getStream,
    releaseStream
  };
}