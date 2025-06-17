import React, { useState, useRef, useCallback } from 'react';
import { Send, Mic, Square } from 'lucide-react';
import { InteractiveButton, PulseNotification, AccessibleSpinner } from './MicroInteractions';

interface UnifiedSendButtonProps {
  onSendMessage: () => void;
  onVoiceRecordingComplete: (audioBlob: Blob, duration: number) => void;
  message: string;
  disabled: boolean;
  isPending: boolean;
  accessibilitySettings: {
    reducedMotion: boolean;
    hapticEnabled: boolean;
  };
}

export function UnifiedSendButton({
  onSendMessage,
  onVoiceRecordingComplete,
  message,
  disabled,
  isPending,
  accessibilitySettings
}: UnifiedSendButtonProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingStartTimeRef = useRef<number>(0);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const longPressTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressRef = useRef(false);

  // 녹음 시작
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100
        } 
      });
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      const audioChunks: Blob[] = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.push(event.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        const duration = Date.now() - recordingStartTimeRef.current;
        onVoiceRecordingComplete(audioBlob, Math.floor(duration / 1000));
        
        // 스트림 정리
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorderRef.current = mediaRecorder;
      recordingStartTimeRef.current = Date.now();
      
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingDuration(0);
      
      // 녹음 시간 업데이트
      durationIntervalRef.current = setInterval(() => {
        setRecordingDuration(Date.now() - recordingStartTimeRef.current);
      }, 100);
      
    } catch (error) {
      console.error('Failed to start recording:', error);
    }
  }, [onVoiceRecordingComplete]);

  // 녹음 중지
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setRecordingDuration(0);
      
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }
    }
  }, [isRecording]);

  // 마우스/터치 이벤트 핸들러
  const handleMouseDown = useCallback(() => {
    if (disabled) return;
    
    isLongPressRef.current = false;
    
    // 텍스트가 있으면 바로 전송, 없으면 장기 누르기 감지 시작
    if (message.trim()) {
      onSendMessage();
      return;
    }
    
    // 장기 누르기 감지 (500ms)
    longPressTimeoutRef.current = setTimeout(() => {
      isLongPressRef.current = true;
      startRecording();
    }, 500);
  }, [disabled, message, onSendMessage, startRecording]);

  const handleMouseUp = useCallback(() => {
    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current);
      longPressTimeoutRef.current = null;
    }
    
    // 녹음 중이면 중지
    if (isRecording) {
      stopRecording();
    }
  }, [isRecording, stopRecording]);

  const handleMouseLeave = useCallback(() => {
    // 마우스가 버튼을 벗어나면 녹음 중지
    handleMouseUp();
  }, [handleMouseUp]);

  // 터치 이벤트 (모바일용)
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    handleMouseDown();
  }, [handleMouseDown]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    handleMouseUp();
  }, [handleMouseUp]);

  // 녹음 시간 포맷팅
  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // 버튼 스타일과 내용 결정
  const hasMessage = message.trim().length > 0;
  const showSendIcon = hasMessage && !isRecording;
  const showMicIcon = !hasMessage && !isRecording;
  const showStopIcon = isRecording;

  return (
    <div className="flex items-center gap-2">
      {/* 녹음 시간 표시 */}
      {isRecording && (
        <div className="flex items-center gap-1 px-2 py-1 bg-red-100 text-red-600 rounded-full text-xs font-medium">
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          {formatDuration(recordingDuration)}
        </div>
      )}
      
      {/* 통합 전송 버튼 */}
      <PulseNotification 
        active={hasMessage && !isRecording}
        accessibilityMode={accessibilitySettings.reducedMotion}
        intensity="moderate"
      >
        <div
          className={`h-10 w-10 p-2 rounded-full transition-all duration-200 select-none cursor-pointer flex items-center justify-center ${
            isRecording 
              ? 'bg-red-500 hover:bg-red-600 text-white shadow-lg'
              : hasMessage 
                ? 'purple-gradient hover:purple-gradient-hover text-white shadow-md'
                : 'bg-gray-200 hover:bg-gray-300 text-gray-600'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          aria-label={
            isRecording 
              ? '녹음 중지' 
              : hasMessage 
                ? '메시지 전송' 
                : '길게 누르면 음성 녹음'
          }
        >
          {isPending ? (
            <AccessibleSpinner size="sm" accessibilityMode={accessibilitySettings.reducedMotion} />
          ) : showSendIcon ? (
            <Send className="h-4 w-4" />
          ) : showStopIcon ? (
            <Square className="h-4 w-4" />
          ) : (
            <Mic className="h-4 w-4" />
          )}
        </div>
      </PulseNotification>
    </div>
  );
}