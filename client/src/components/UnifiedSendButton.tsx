import { useState, useCallback } from 'react';
import { Send, Mic } from 'lucide-react';
import { PulseNotification } from './MicroInteractions';
import { useLongPressTrigger } from '../hooks/useLongPressTrigger';
import { VoiceRecordingModal } from './VoiceRecordingModal';

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
  const [showVoiceModal, setShowVoiceModal] = useState(false);

  // Long press trigger for voice recording
  const { handlers } = useLongPressTrigger({
    onLongPress: () => {
      // Only trigger voice recording if there's no message
      if (!message.trim()) {
        setShowVoiceModal(true);
      }
    },
    onShortPress: () => {
      // Short press sends message if there's text
      if (message.trim()) {
        onSendMessage();
      }
    },
    onRelease: (wasLongPress) => {
      // When user releases after long press, close voice modal to auto-send
      if (wasLongPress && showVoiceModal) {
        console.log('🎤 손을 뗌 - 녹음 자동 전송');
        setShowVoiceModal(false);
      }
    },
    disabled
  });

  const handleVoiceRecordingComplete = useCallback((audioBlob: Blob, duration: number) => {
    onVoiceRecordingComplete(audioBlob, duration);
    setShowVoiceModal(false);
  }, [onVoiceRecordingComplete]);

  const handleCloseModal = useCallback(() => {
    setShowVoiceModal(false);
  }, []);

  // Button style and content
  const hasMessage = message.trim().length > 0;
  const showSendIcon = hasMessage;
  const showMicIcon = !hasMessage;

  return (
    <>
      <div className="flex items-center gap-2">
        {/* Unified send button */}
        <PulseNotification 
          active={hasMessage}
          accessibilityMode={accessibilitySettings.reducedMotion}
          intensity="moderate"
        >
          <div
            {...handlers}
            className={`h-12 w-12 p-3 rounded-full transition-all duration-200 select-none cursor-pointer flex items-center justify-center shadow-lg ${
              hasMessage 
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-purple-500 hover:bg-purple-600 text-white'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            aria-label={hasMessage ? '메시지 전송' : '길게 누르면 음성 녹음'}
          >
            {isPending ? (
              <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
            ) : showSendIcon ? (
              <Send className="h-4 w-4" />
            ) : (
              <Mic className="h-4 w-4" />
            )}
          </div>
        </PulseNotification>
      </div>

      {/* Voice Recording Modal */}
      <VoiceRecordingModal
        isOpen={showVoiceModal}
        onClose={handleCloseModal}
        onRecordingComplete={handleVoiceRecordingComplete}
      />
    </>
  );
}