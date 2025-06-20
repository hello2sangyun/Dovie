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
  const [slideOffset, setSlideOffset] = useState(0);
  const [isCancelZone, setIsCancelZone] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingStartTimeRef = useRef<number>(0);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const longPressTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressRef = useRef(false);
  const startTouchXRef = useRef<number>(0);
  const currentTouchXRef = useRef<number>(0);

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
      setSlideOffset(0);
      setIsCancelZone(false);
      
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }
    }
  }, [isRecording]);

  // 녹음 취소
  const cancelRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setRecordingDuration(0);
      setSlideOffset(0);
      setIsCancelZone(false);
      
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }
      
      // 스트림 정리 (녹음은 저장하지 않음)
      if (mediaRecorderRef.current.stream) {
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
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
    const touch = e.touches[0];
    startTouchXRef.current = touch.clientX;
    currentTouchXRef.current = touch.clientX;
    handleMouseDown();
  }, [handleMouseDown]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isRecording) return;
    
    e.preventDefault();
    const touch = e.touches[0];
    currentTouchXRef.current = touch.clientX;
    
    const deltaX = startTouchXRef.current - touch.clientX;
    const maxSlide = 150; // 최대 슬라이드 거리
    const normalizedOffset = Math.max(0, Math.min(deltaX, maxSlide));
    
    setSlideOffset(normalizedOffset);
    setIsCancelZone(normalizedOffset > 100); // 100px 이상 슬라이드하면 취소 영역
  }, [isRecording]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    
    if (isRecording && isCancelZone) {
      // 취소 영역에서 손을 뗐으면 녹음 취소
      cancelRecording();
    } else {
      // 일반적인 녹음 완료
      handleMouseUp();
    }
  }, [isRecording, isCancelZone, cancelRecording, handleMouseUp]);

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
    <div className="relative flex items-center gap-2">
      {/* 녹음 중일 때 슬라이드 취소 인터페이스 */}
      {isRecording && (
        <div className="absolute inset-0 flex items-center justify-between w-full pointer-events-none z-10">
          {/* 왼쪽 취소 영역 */}
          <div 
            className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-200 ${
              isCancelZone ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500'
            }`}
            style={{ 
              transform: `translateX(-${Math.min(slideOffset, 120)}px)`,
              opacity: slideOffset > 20 ? 1 : 0 
            }}
          >
            <span className="text-sm font-medium">← 밀어서 취소</span>
          </div>
          
          {/* 녹음 시간 및 상태 */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 px-3 py-1 bg-red-100 text-red-600 rounded-full text-sm font-medium">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              {formatDuration(recordingDuration)}
            </div>
          </div>
        </div>
      )}
      
      {/* 일반 상태 - 녹음 시간 표시 */}
      {isRecording && slideOffset < 20 && (
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
          className={`h-12 w-12 p-3 rounded-full transition-all duration-200 select-none cursor-pointer flex items-center justify-center shadow-lg ${
            isRecording 
              ? isCancelZone
                ? 'bg-red-600 text-white scale-110'
                : 'bg-red-500 hover:bg-red-600 text-white animate-pulse'
              : hasMessage 
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-purple-500 hover:bg-purple-600 text-white'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          style={{
            transform: isRecording ? `translateX(-${Math.min(slideOffset * 0.3, 40)}px)` : 'translateX(0)'
          }}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          aria-label={
            isRecording 
              ? isCancelZone ? '녹음 취소' : '녹음 중지' 
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