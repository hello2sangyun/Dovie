import React, { useState, useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
import { Mic, MicOff } from 'lucide-react';

interface SimpleVoiceRecorderProps {
  onRecordingComplete: (audioBlob: Blob, duration: number) => void;
  onComplete?: (audioBlob: Blob, duration: number) => void;
  onCancel?: () => void;
  disabled?: boolean;
  autoStart?: boolean;
  shouldStop?: boolean;
}

export interface SimpleVoiceRecorderRef {
  stopRecording: () => void;
}

const SimpleVoiceRecorder = forwardRef<SimpleVoiceRecorderRef, SimpleVoiceRecorderProps>((props, ref) => {
  const { 
    onRecordingComplete, 
    onComplete, 
    onCancel, 
    disabled, 
    autoStart = false,
    shouldStop = false
  } = props;
  const [isRecording, setIsRecording] = useState(false);
  const [isPreparing, setIsPreparing] = useState(false);
  const [duration, setDuration] = useState(0);
  const [microphoneAccess, setMicrophoneAccess] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number>(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Expose stopRecording method via ref
  useImperativeHandle(ref, () => ({
    stopRecording: () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        console.log('🔴 Stopping recording via ref');
        mediaRecorderRef.current.stop();
      }
    }
  }));

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, []);

  // Auto-start recording when component mounts
  useEffect(() => {
    if (autoStart && !isRecording && !isPreparing) {
      startRecording();
    }
  }, [autoStart]);

  // Handle external stop signal
  useEffect(() => {
    if (shouldStop && isRecording) {
      stopRecording();
    }
  }, [shouldStop, isRecording]);

  const cleanup = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (mediaRecorderRef.current) {
      // Clean up data request interval
      if ((mediaRecorderRef.current as any).dataInterval) {
        clearInterval((mediaRecorderRef.current as any).dataInterval);
      }
      mediaRecorderRef.current = null;
    }
    
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    setDuration(0);
    setIsRecording(false);
    setIsPreparing(false);
  };

  const startRecording = async () => {
    if (disabled) return;
    
    console.log('🎤 SimpleVoiceRecorder: Starting recording process...');
    console.log('🎤 Browser support check:', {
      mediaDevices: !!navigator.mediaDevices,
      getUserMedia: !!navigator.mediaDevices?.getUserMedia,
      MediaRecorder: !!window.MediaRecorder
    });
    
    // Test MIME type support
    const testTypes = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4'];
    testTypes.forEach(type => {
      console.log(`🎤 MIME type ${type}: ${MediaRecorder.isTypeSupported(type)}`);
    });
    
    setIsPreparing(true);
    
    try {
      // Check microphone permissions first
      try {
        const permissionStatus = await navigator.permissions.query({ name: 'microphone' as PermissionName });
        console.log('🎤 Microphone permission status:', permissionStatus.state);
        
        if (permissionStatus.state === 'denied') {
          throw new Error('마이크 권한이 거부되었습니다. 브라우저 설정에서 마이크 권한을 허용해주세요.');
        }
      } catch (permError) {
        console.log('🎤 Permission API not available, proceeding with getUserMedia');
      }
      
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100
        } 
      });
      
      // Verify audio track is working
      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length === 0 || audioTracks[0].readyState !== 'live') {
        throw new Error('마이크에서 오디오를 받을 수 없습니다.');
      }
      
      console.log('🎤 Audio track verified:', audioTracks[0].label, 'state:', audioTracks[0].readyState);
      
      console.log('SimpleVoiceRecorder: Microphone access granted');
      streamRef.current = stream;
      setMicrophoneAccess(true);
      
      // Find best supported MIME type
      const supportedTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/ogg;codecs=opus',
        'audio/mp4',
        'audio/wav'
      ];
      
      let selectedMimeType = 'audio/webm';
      for (const type of supportedTypes) {
        if (MediaRecorder.isTypeSupported(type)) {
          selectedMimeType = type;
          console.log('SimpleVoiceRecorder: Using MIME type:', selectedMimeType);
          break;
        }
      }
      
      // Create MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: selectedMimeType
      });
      
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      
      // Set up event handlers
      mediaRecorder.ondataavailable = (event) => {
        console.log('🎵 SimpleVoiceRecorder: Data chunk received, size:', event.data.size, 'type:', event.data.type);
        console.log('🎵 Total chunks so far:', chunksRef.current.length + 1);
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
          console.log('🎵 Chunk added to array. New total size:', chunksRef.current.reduce((sum, chunk) => sum + chunk.size, 0));
        } else {
          console.warn('⚠️ Empty chunk received');
        }
      };
      
      mediaRecorder.onstop = () => {
        console.log('🛑 SimpleVoiceRecorder: Recording stopped, processing audio...');
        console.log('🛑 Chunks collected:', chunksRef.current.length);
        console.log('🛑 Individual chunk sizes:', chunksRef.current.map(chunk => chunk.size));
        
        if (chunksRef.current.length === 0) {
          console.error('❌ SimpleVoiceRecorder: No audio data recorded');
          cleanup();
          return;
        }
        
        const audioBlob = new Blob(chunksRef.current, { type: selectedMimeType });
        const recordingDuration = Math.max(duration, 1);
        
        console.log('🎯 SimpleVoiceRecorder: Audio blob created');
        console.log('🎯 Blob size:', audioBlob.size, 'bytes');
        console.log('🎯 Blob type:', audioBlob.type);
        console.log('🎯 Recording duration:', recordingDuration, 'seconds');
        console.log('🎯 MIME type used:', selectedMimeType);
        
        if (audioBlob.size < 100) {
          console.error('❌ SimpleVoiceRecorder: Audio file too small:', audioBlob.size, 'bytes');
          console.error('❌ This usually indicates microphone access issues or short recording time');
          console.error('❌ Chunks collected:', chunksRef.current.length);
          console.error('❌ Recording duration was:', recordingDuration, 'seconds');
          cleanup();
          return;
        }
        
        console.log('✅ Calling onRecordingComplete with valid audio blob');
        onRecordingComplete(audioBlob, recordingDuration);
        
        // Also call onComplete if provided (for compatibility)
        if (onComplete) {
          onComplete(audioBlob, recordingDuration);
        }
        
        cleanup();
      };
      
      mediaRecorder.onerror = (event) => {
        console.error('SimpleVoiceRecorder: MediaRecorder error:', event);
        cleanup();
      };
      
      // Start recording with explicit timeslice for better data collection
      mediaRecorder.start(200); // Request data every 200ms
      startTimeRef.current = Date.now();
      setIsRecording(true);
      setIsPreparing(false);
      
      console.log('🎤 SimpleVoiceRecorder: Recording started');
      console.log('🎤 MediaRecorder state:', mediaRecorder.state);
      console.log('🎤 Stream active:', stream.active);
      console.log('🎤 Audio tracks:', stream.getAudioTracks().length);
      console.log('🎤 Audio track settings:', stream.getAudioTracks()[0]?.getSettings());
      
      // Force periodic data requests to ensure we get audio chunks
      const dataRequestInterval = setInterval(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          try {
            mediaRecorderRef.current.requestData();
            console.log('🔄 Requested data chunk at', Date.now() - startTimeRef.current, 'ms');
          } catch (e) {
            console.warn('Failed to request data:', e);
          }
        } else {
          clearInterval(dataRequestInterval);
        }
      }, 300);
      
      // Store interval reference for cleanup
      (mediaRecorder as any).dataInterval = dataRequestInterval;
      
      // Start timer
      timerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
        setDuration(elapsed);
      }, 100);
      
    } catch (error) {
      console.error('SimpleVoiceRecorder: Failed to start recording:', error);
      setMicrophoneAccess(false);
      setIsPreparing(false);
      cleanup();
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      const recordingTime = Date.now() - startTimeRef.current;
      console.log('🛑 SimpleVoiceRecorder: Stopping recording after', recordingTime, 'ms');
      console.log('🛑 MediaRecorder state before stop:', mediaRecorderRef.current.state);
      
      // Force data collection before stopping
      if (mediaRecorderRef.current.state === 'recording') {
        try {
          mediaRecorderRef.current.requestData();
          console.log('🛑 Requested final data chunk');
        } catch (e) {
          console.warn('🛑 Failed to request data:', e);
        }
      }
      
      // Ensure minimum recording time of 1 second for meaningful audio
      const minRecordingTime = 1000;
      if (recordingTime < minRecordingTime) {
        console.log('🛑 Recording too short, waiting for minimum duration...');
        setTimeout(() => {
          if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            try {
              // Request final data and stop
              mediaRecorderRef.current.requestData();
              setTimeout(() => {
                if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
                  mediaRecorderRef.current.stop();
                }
              }, 100);
            } catch (e) {
              console.error('🛑 Error stopping recorder:', e);
            }
          }
        }, minRecordingTime - recordingTime);
      } else {
        try {
          // Request final data before stopping
          mediaRecorderRef.current.requestData();
          setTimeout(() => {
            if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
              mediaRecorderRef.current.stop();
            }
          }, 100);
        } catch (e) {
          console.error('🛑 Error stopping recorder:', e);
        }
      }
      
      setIsRecording(false);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!isRecording && !isPreparing) {
      startRecording();
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isRecording) {
      stopRecording();
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    if (!isRecording && !isPreparing) {
      startRecording();
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    e.preventDefault();
    if (isRecording) {
      stopRecording();
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-4">
      <div
        className={`
          w-20 h-20 rounded-full flex items-center justify-center cursor-pointer
          transition-all duration-200 user-select-none
          ${isRecording 
            ? 'bg-red-500 scale-110 animate-pulse' 
            : isPreparing 
            ? 'bg-yellow-500' 
            : disabled
            ? 'bg-gray-400 cursor-not-allowed'
            : 'bg-blue-500 hover:bg-blue-600 active:scale-95'
          }
        `}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        style={{
          WebkitUserSelect: 'none',
          MozUserSelect: 'none',
          msUserSelect: 'none',
          userSelect: 'none',
          WebkitTouchCallout: 'none'
        }}
      >
        {isPreparing ? (
          <div className="animate-spin w-8 h-8 border-2 border-white border-t-transparent rounded-full" />
        ) : isRecording ? (
          <MicOff className="w-8 h-8 text-white" />
        ) : (
          <Mic className="w-8 h-8 text-white" />
        )}
      </div>
      
      {isRecording && (
        <div className="mt-2 text-sm text-gray-600">
          녹음 중... {duration}초
        </div>
      )}
      
      {isPreparing && (
        <div className="mt-2 text-sm text-gray-600">
          마이크 준비 중...
        </div>
      )}
    </div>
  );
});

SimpleVoiceRecorder.displayName = 'SimpleVoiceRecorder';

export default SimpleVoiceRecorder;