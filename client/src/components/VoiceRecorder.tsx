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

  // 마이크 권한 확인
  useEffect(() => {
    const checkMicrophonePermission = async () => {
      try {
        const permission = await navigator.permissions.query({ name: 'microphone' as PermissionName });
        setMicrophoneAccess(permission.state === 'granted');
      } catch (error) {
        console.warn('Microphone permission check failed:', error);
      }
    };

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
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm;codecs=opus' });
        const recordingDuration = duration;
        onRecordingComplete(audioBlob, recordingDuration);
        cleanup();
      };
      
      mediaRecorder.start();
      startTimeRef.current = Date.now();
      setIsRecording(true);
      setIsPreparing(false);
      
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
      mediaRecorderRef.current.stop();
      setIsRecording(false);
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

  // 마이크 권한이 없는 경우
  if (microphoneAccess === false) {
    return (
      <Button
        variant="outline"
        size="sm"
        disabled
        className="text-gray-400"
        title="마이크 권한이 필요합니다"
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
          "relative transition-all duration-200",
          isRecording && "animate-pulse scale-110 shadow-lg",
          isPreparing && "opacity-50"
        )}
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