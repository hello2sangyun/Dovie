import { useState, useRef, useEffect, useCallback } from "react";
import { Mic, X, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMicrophonePermission } from "../hooks/useMicrophonePermission";
import { useAppState } from "../hooks/useAppState";

interface VoiceRecordingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRecordingComplete: (audioBlob: Blob, duration: number) => void;
  targetName?: string;
}

export function VoiceRecordingModal({
  isOpen,
  onClose,
  onRecordingComplete,
  targetName
}: VoiceRecordingModalProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isPreparing, setIsPreparing] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingStartTimeRef = useRef<number>(0);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  
  const { hasPermission, requestPermission, getStream } = useMicrophonePermission();
  const appState = useAppState();

  // Auto-stop recording when app goes to background
  useEffect(() => {
    if (appState === 'background' && isRecording) {
      console.log('📱 App backgrounded - stopping voice recording to save battery');
      handleCancel();
    }
  }, [appState, isRecording]);

  // Start recording when modal opens
  useEffect(() => {
    if (isOpen && !isRecording && !isPreparing) {
      startRecording();
    }
    
    // Cleanup on unmount or close
    return () => {
      cleanup();
    };
  }, [isOpen]);

  const startRecording = async () => {
    setIsPreparing(true);
    
    try {
      // Check permission first, request if needed
      if (!hasPermission) {
        const granted = await requestPermission();
        if (!granted) {
          console.error('Microphone permission denied');
          onClose();
          return;
        }
      }

      // Get stream using global permission system
      const stream = await getStream();
      if (!stream) {
        console.error('Failed to get microphone stream');
        onClose();
        return;
      }
      
      // iPhone PWA optimized MediaRecorder settings
      const isIPhonePWA = (window.navigator as any).standalone === true || 
                         window.matchMedia('(display-mode: standalone)').matches;
      
      let mimeType;
      let options: MediaRecorderOptions = {};
      
      if (isIPhonePWA) {
        // iPhone PWA prefers mp4 format with specific settings
        mimeType = 'audio/mp4';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = 'audio/wav';
        }
        options = {
          mimeType: mimeType,
          audioBitsPerSecond: 16000 // Lower bitrate for iPhone PWA
        };
      } else {
        // Standard web browser settings
        mimeType = 'audio/webm;codecs=opus';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = 'audio/mp4';
          if (!MediaRecorder.isTypeSupported(mimeType)) {
            mimeType = 'audio/wav';
          }
        }
        options = { mimeType: mimeType };
      }
      
      console.log('🎤 Creating MediaRecorder with:', { mimeType, isIPhonePWA, options });
      const mediaRecorder = new MediaRecorder(stream, options);
      
      chunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        console.log('📊 Audio data chunk received:', event.data.size, 'bytes');
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(chunksRef.current, { type: mimeType });
        const duration = Math.floor((Date.now() - recordingStartTimeRef.current) / 1000);
        console.log('🎤 Recording stopped:', {
          audioBlobSize: audioBlob.size,
          duration,
          chunksCount: chunksRef.current.length,
          mimeType
        });
        
        // Only send if we have valid audio data
        if (audioBlob.size > 0) {
          onRecordingComplete(audioBlob, duration);
        }
        cleanup();
        onClose();
      };
      
      mediaRecorderRef.current = mediaRecorder;
      recordingStartTimeRef.current = Date.now();
      
      // Start recording with timeslice for better data collection
      mediaRecorder.start(100); // Collect data every 100ms
      setIsRecording(true);
      setIsPreparing(false);
      setRecordingDuration(0);
      
      console.log('🎤 Recording started with MediaRecorder state:', mediaRecorder.state);
      
      // Update recording time
      durationIntervalRef.current = setInterval(() => {
        setRecordingDuration(Date.now() - recordingStartTimeRef.current);
      }, 100);
      
    } catch (error) {
      console.error('Failed to start recording:', error);
      setIsPreparing(false);
      onClose();
    }
  };

  const handleSend = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleCancel = () => {
    cleanup();
    onClose();
  };

  const cleanup = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.stream) {
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
    
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
    
    setRecordingDuration(0);
    setIsRecording(false);
    setIsPreparing(false);
    chunksRef.current = [];
  };

  // Format duration as MM:SS
  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ 
        animation: 'fadeIn 200ms ease-out',
        paddingBottom: 'env(safe-area-inset-bottom)'
      }}
    >
      {/* Dimmed Background */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleCancel}
      />
      
      {/* Recording Content */}
      <div className="relative z-10 flex flex-col items-center space-y-8 p-8">
        {/* Target Name */}
        {targetName && (
          <div className="text-white text-lg font-medium">
            {targetName}
          </div>
        )}
        
        {/* Mic Icon with Pulse Animation */}
        <div className="relative">
          {/* Outer pulse rings */}
          <div className="absolute inset-0 -m-8">
            <div className="absolute inset-0 bg-red-500/30 rounded-full animate-ping" />
          </div>
          <div className="absolute inset-0 -m-4">
            <div className="absolute inset-0 bg-red-500/40 rounded-full animate-pulse" />
          </div>
          
          {/* Main mic icon */}
          <div className="relative bg-red-500 rounded-full p-8 shadow-2xl">
            <Mic className="h-16 w-16 text-white" strokeWidth={2} />
          </div>
        </div>
        
        {/* Recording Status */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center space-x-2">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
            <span className="text-white text-xl font-medium">
              {isPreparing ? "준비 중..." : "녹음 중..."}
            </span>
          </div>
          
          {/* Timer */}
          <div className="text-white text-3xl font-mono font-bold">
            {formatDuration(recordingDuration)}
          </div>
        </div>
        
        {/* Control Buttons */}
        <div className="flex items-center space-x-4">
          {/* Cancel Button */}
          <Button
            onClick={handleCancel}
            size="lg"
            variant="outline"
            className="bg-white/10 hover:bg-white/20 text-white border-white/30 backdrop-blur-sm h-14 px-8"
            data-testid="button-cancel-recording"
          >
            <X className="h-5 w-5 mr-2" />
            취소
          </Button>
          
          {/* Send Button */}
          <Button
            onClick={handleSend}
            size="lg"
            disabled={isPreparing || recordingDuration < 500}
            className="bg-purple-600 hover:bg-purple-700 text-white h-14 px-8"
            data-testid="button-send-recording"
          >
            <Send className="h-5 w-5 mr-2" />
            전송
          </Button>
        </div>
        
        {/* Helper Text */}
        <p className="text-white/70 text-sm text-center max-w-xs">
          음성 메시지를 녹음하고 있습니다. 완료되면 전송 버튼을 누르세요.
        </p>
      </div>
      
      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
