import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Square, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface VoiceRecorderProps {
  onRecordingComplete: (audioBlob: Blob, duration: number) => void;
  disabled?: boolean;
}

export default function VoiceRecorder({ onRecordingComplete, disabled }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPreparing, setIsPreparing] = useState(false);
  const [duration, setDuration] = useState(0);
  const [microphoneAccess, setMicrophoneAccess] = useState<boolean | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  // 마이크 권한 확인 - 기본적으로 활성화
  useEffect(() => {
    const checkMicrophonePermission = async () => {
      try {
        // 브라우저가 권한 API를 지원하는지 확인
        if ('permissions' in navigator) {
          const permission = await navigator.permissions.query({ name: 'microphone' as PermissionName });
          setMicrophoneAccess(permission.state === 'granted');
        } else {
          // 권한 API를 지원하지 않는 경우, 일단 true로 설정하고 실제 녹음 시도 시 확인
          setMicrophoneAccess(true);
        }
      } catch (error) {
        console.warn('Microphone permission check failed:', error);
        // 권한 확인 실패 시에도 일단 허용으로 설정하고 실제 시도 시 확인
        setMicrophoneAccess(true);
      }
    };

    // 기본적으로 마이크 접근을 허용으로 설정
    setMicrophoneAccess(true);
    checkMicrophonePermission();
  }, []);

  const startRecording = async () => {
    if (disabled) return;
    
    setIsPreparing(true);
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        } 
      });
      
      streamRef.current = stream;
      setMicrophoneAccess(true);
      
      // Check supported MIME types
      const supportedTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4',
        'audio/wav'
      ];
      
      let mimeType = 'audio/webm';
      for (const type of supportedTypes) {
        if (MediaRecorder.isTypeSupported(type)) {
          mimeType = type;
          break;
        }
      }
      
      console.log('VoiceRecorder: Using MIME type:', mimeType);
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: mimeType
      });
      
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        console.log('VoiceRecorder: Data available event, size:', event.data.size);
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
          console.log('VoiceRecorder: Added chunk, total chunks:', chunksRef.current.length);
        }
      };
      
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(chunksRef.current, { type: mimeType });
        const recordingDuration = duration;
        console.log('VoiceRecorder: Recording stopped, blob size:', audioBlob.size, 'duration:', recordingDuration, 'chunks:', chunksRef.current.length, 'mimeType:', mimeType);
        
        if (audioBlob.size === 0) {
          console.error('VoiceRecorder: Empty audio blob created - no audio data captured');
          // Try to provide meaningful feedback
          onRecordingComplete(new Blob(['dummy'], { type: 'text/plain' }), 0);
          cleanup();
          return;
        }
        
        onRecordingComplete(audioBlob, recordingDuration);
        cleanup();
      };
      
      // Add error handler
      mediaRecorder.onerror = (event) => {
        console.error('VoiceRecorder: MediaRecorder error:', event);
        cleanup();
      };

      // Start recording without timeslice to ensure data collection
      mediaRecorder.start();
      startTimeRef.current = Date.now();
      setIsRecording(true);
      setIsPreparing(false);
      
      console.log('VoiceRecorder: Started recording, state:', mediaRecorder.state);
      
      // 타이머 시작
      timerRef.current = setInterval(() => {
        setDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 1000);
      
    } catch (error) {
      console.error('Failed to start recording:', error);
      setMicrophoneAccess(false);
      setIsPreparing(false);
      cleanup();
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      const recordingTime = Date.now() - startTimeRef.current;
      console.log('VoiceRecorder: Stopping recording after', recordingTime, 'ms');
      
      // Ensure minimum recording duration to capture audio chunks
      if (recordingTime < 500) {
        console.log('VoiceRecorder: Recording too short, waiting for minimum duration...');
        setTimeout(() => {
          if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
          }
        }, 500 - recordingTime);
      } else {
        mediaRecorderRef.current.stop();
        setIsRecording(false);
      }
    }
  };

  const cleanup = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    setDuration(0);
    mediaRecorderRef.current = null;
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

  // 마이크 권한이 없는 경우에도 클릭할 수 있도록 수정
  const handlePermissionRequest = async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      setMicrophoneAccess(true);
    } catch (error) {
      console.error('Microphone permission denied:', error);
    }
  };

  if (microphoneAccess === false) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={handlePermissionRequest}
        className="text-gray-400 hover:text-purple-600 h-7 w-7 p-1"
        title="마이크 권한을 요청하려면 클릭하세요"
      >
        <MicOff className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <div className="flex items-center space-x-2">
      {/* 녹음 시간 표시 */}
      {isRecording && (
        <div className="text-xs font-mono text-red-600 bg-red-50 px-2 py-1 rounded-md">
          {Math.floor(duration / 60)}:{(duration % 60).toString().padStart(2, '0')}
        </div>
      )}
      
      {/* 녹음 버튼 */}
      <Button
        variant={isRecording ? "destructive" : "outline"}
        size="sm"
        disabled={disabled || isPreparing}
        className={cn(
          "relative transition-all duration-200 h-7 w-7 p-1 cursor-pointer select-none touch-manipulation",
          isRecording && "animate-pulse scale-110 shadow-lg cursor-grabbing",
          isPreparing && "opacity-50 cursor-wait"
        )}
        style={{ 
          userSelect: 'none',
          WebkitUserSelect: 'none',
          MozUserSelect: 'none',
          msUserSelect: 'none',
          WebkitTouchCallout: 'none',
          WebkitTapHighlightColor: 'transparent'
        }}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp} // 마우스가 버튼을 벗어나면 녹음 중지
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        title={isRecording ? "버튼에서 손을 떼면 녹음이 중지됩니다" : "버튼을 누르고 있는 동안 녹음됩니다"}
      >
        {isPreparing ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : isRecording ? (
          <Square className="h-4 w-4" />
        ) : (
          <Mic className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
}