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
    if (state.hasPermission && state.stream) {
      return true;
    }

    setState(prev => ({ ...prev, isRequesting: true }));

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100
        } 
      });

      setState(prev => ({ 
        ...prev, 
        hasPermission: true, 
        isRequesting: false,
        stream 
      }));
      
      localStorage.setItem('microphonePermissionGranted', 'true');
      console.log('✅ Microphone permission granted and stream ready');
      return true;
    } catch (error) {
      console.error('❌ Microphone permission denied:', error);
      setState(prev => ({ ...prev, isRequesting: false }));
      localStorage.removeItem('microphonePermissionGranted');
      return false;
    }
  }, [state.hasPermission, state.stream]);

  // Get fresh stream for recording
  const getStream = useCallback(async (): Promise<MediaStream | null> => {
    if (state.stream && state.stream.active) {
      return state.stream;
    }

    // If we have permission but no active stream, create new one
    if (state.hasPermission || localStorage.getItem('microphonePermissionGranted') === 'true') {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            sampleRate: 44100
          } 
        });
        setState(prev => ({ ...prev, stream }));
        return stream;
      } catch (error) {
        console.error('Failed to get fresh stream:', error);
        setState(prev => ({ ...prev, hasPermission: false, stream: null }));
        localStorage.removeItem('microphonePermissionGranted');
        return null;
      }
    }

    return null;
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