import { useState, useEffect, useCallback } from 'react';

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

  // Check initial permission status
  useEffect(() => {
    const checkPermission = async () => {
      try {
        // Check if permission was previously granted
        const stored = localStorage.getItem('microphonePermissionGranted');
        if (stored === 'true') {
          // Try to get stream without explicit permission request
          try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
              audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true,
                sampleRate: 44100
              } 
            });
            setState(prev => ({ ...prev, hasPermission: true, stream }));
            console.log('✅ Microphone permission already granted, stream ready');
            return;
          } catch (error) {
            console.log('⚠️ Stored permission but failed to get stream:', error);
            localStorage.removeItem('microphonePermissionGranted');
          }
        }

        // Check permission state via Permissions API (if available)
        if ('permissions' in navigator) {
          const result = await navigator.permissions.query({ name: 'microphone' as PermissionName });
          if (result.state === 'granted') {
            const stream = await navigator.mediaDevices.getUserMedia({ 
              audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true,
                sampleRate: 44100
              } 
            });
            setState(prev => ({ ...prev, hasPermission: true, stream }));
            localStorage.setItem('microphonePermissionGranted', 'true');
            console.log('✅ Microphone permission detected via Permissions API');
          }
        }
      } catch (error) {
        console.log('Permission check failed:', error);
      }
    };

    checkPermission();
  }, []);

  // Request microphone permission
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (state.hasPermission && state.stream?.active) {
      console.log('🎤 Permission already granted with active stream');
      return true;
    }

    setState(prev => ({ ...prev, isRequesting: true }));

    try {
      console.log('🎤 Requesting microphone permission...');
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100,
          channelCount: 1
        } 
      });

      console.log('✅ Microphone stream obtained:', {
        active: stream.active,
        tracks: stream.getAudioTracks().length,
        trackState: stream.getAudioTracks()[0]?.readyState
      });

      setState(prev => ({ 
        ...prev, 
        hasPermission: true, 
        isRequesting: false,
        stream 
      }));
      
      localStorage.setItem('microphonePermissionGranted', 'true');
      return true;
    } catch (error) {
      console.error('❌ Microphone permission denied:', error);
      setState(prev => ({ ...prev, isRequesting: false }));
      localStorage.removeItem('microphonePermissionGranted');
      return false;
    }
  }, [state.hasPermission, state.stream]);

  // Get fresh stream for recording - iPhone PWA optimized
  const getStream = useCallback(async (): Promise<MediaStream | null> => {
    console.log('🎤 Getting microphone stream...');
    
    // Always create fresh stream for iPhone PWA to avoid permission issues
    const isIPhonePWA = (window.navigator as any).standalone === true || 
                       window.matchMedia('(display-mode: standalone)').matches;
    
    if (!isIPhonePWA && state.stream && state.stream.active) {
      console.log('🎤 Using existing active stream');
      return state.stream;
    }

    // Create new stream with iPhone PWA compatible settings
    try {
      console.log('🎤 Creating fresh microphone stream...');
      const audioConstraints = {
        echoCancellation: false, // Disable for iPhone PWA compatibility
        noiseSuppression: false, // Disable for iPhone PWA compatibility
        autoGainControl: false,  // Disable for iPhone PWA compatibility
        channelCount: 1,         // Mono for better iPhone PWA support
        sampleRate: 16000        // Lower sample rate for iPhone PWA
      };

      console.log('🎤 Creating new stream with iPhone PWA settings:', audioConstraints);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints });
      
      setState(prev => ({ ...prev, stream, hasPermission: true }));
      localStorage.setItem('microphonePermissionGranted', 'true');
      
      console.log('✅ Fresh stream created successfully for iPhone PWA');
      return stream;
    } catch (error) {
      console.error('❌ Failed to get fresh stream:', error);
      setState(prev => ({ ...prev, hasPermission: false, stream: null }));
      localStorage.removeItem('microphonePermissionGranted');
      return null;
    }
  }, [state.hasPermission, state.stream]);

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