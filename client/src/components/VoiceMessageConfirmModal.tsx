import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Mic, Send, X, Sparkles, Music, Play, Pause, ChevronDown, ChevronUp } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

interface VoiceMessageConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  transcription: string;
  audioUrl: string;
  duration: number;
  chatRoomId: number;
  onSend: (editedText: string) => Promise<void>;
  onReRecord: () => void;
}

const BGM_OPTIONS = [
  { value: "none", label: "없음", file: null },
  { value: "comedy", label: "🤡 개그", file: "/bgm/comedy.mp3" },
  { value: "explosion", label: "💥 폭발", file: "/bgm/explosion.mp3" },
  { value: "epic", label: "🎻 웅장", file: "/bgm/epic.mp3" },
  { value: "lovely", label: "💕 사랑", file: "/bgm/lovely.mp3" },
  { value: "energetic", label: "🎉 신남", file: "/bgm/energetic.mp3" },
];

export default function VoiceMessageConfirmModal({
  isOpen,
  onClose,
  transcription,
  audioUrl,
  duration,
  chatRoomId,
  onSend,
  onReRecord,
}: VoiceMessageConfirmModalProps) {
  const [editedText, setEditedText] = useState(transcription);
  const [isSending, setIsSending] = useState(false);
  const [isCorrecting, setIsCorrecting] = useState(false);
  const [aiCorrectionApplied, setAiCorrectionApplied] = useState(false);
  
  // 오디오 재생 관련
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  
  // 배경음악 관련 state
  const [showBgmOptions, setShowBgmOptions] = useState(false);
  const [selectedBgm, setSelectedBgm] = useState("none");
  const [bgmVolume, setBgmVolume] = useState(0.3);
  const [mixedAudioUrl, setMixedAudioUrl] = useState<string | null>(null);
  const [isMixing, setIsMixing] = useState(false);
  
  const audioContextRef = useRef<AudioContext | null>(null);

  // AI Voice Enhancement
  useEffect(() => {
    if (isOpen && transcription && chatRoomId) {
      correctTranscription();
    } else {
      setEditedText(transcription);
      setAiCorrectionApplied(false);
    }
  }, [isOpen, transcription, chatRoomId]);

  const correctTranscription = async () => {
    setIsCorrecting(true);
    try {
      const response = await apiRequest(
        "/api/voice-messages/correct-transcription",
        "POST",
        { transcription, chatRoomId }
      );
      const result = await response.json();
      
      if (result.success && result.correctedText) {
        setEditedText(result.correctedText);
        setAiCorrectionApplied(true);
      } else {
        setEditedText(transcription);
      }
    } catch (error) {
      setEditedText(transcription);
    } finally {
      setIsCorrecting(false);
    }
  };

  const handleSend = async () => {
    setIsSending(true);
    try {
      if (mixedAudioUrl) {
        const response = await fetch(mixedAudioUrl);
        const blob = await response.blob();
        const formData = new FormData();
        formData.append("audio", blob, "mixed_voice.wav");
        
        const uploadResponse = await fetch("/api/upload-voice", {
          method: "POST",
          body: formData,
        });
        
        if (!uploadResponse.ok) throw new Error("Failed to upload mixed audio");
        
        const uploadData = await uploadResponse.json();
        const messageData: any = {
          content: editedText,
          messageType: "voice",
          fileUrl: uploadData.audioUrl,
          fileName: "mixed_voice.wav",
          fileSize: blob.size,
          voiceDuration: Math.round(duration),
          detectedLanguage: "korean",
          confidence: "0.9"
        };
        
        await apiRequest(`/api/chat-rooms/${chatRoomId}/messages`, "POST", messageData);
        onClose();
      } else {
        await onSend(editedText);
      }
    } catch (error) {
      console.error("Failed to send voice message:", error);
      throw error;
    } finally {
      setIsSending(false);
    }
  };

  const handleReRecord = () => {
    onClose();
    onReRecord();
  };

  // 오디오 재생/일시정지
  const togglePlayPause = async () => {
    if (!audioRef.current) return;
    
    try {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        await audioRef.current.play();
        setIsPlaying(true);
      }
    } catch (error) {
      console.error('Audio playback error:', error);
      setIsPlaying(false);
    }
  };

  // 오디오 이벤트 핸들러
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleEnded = () => setIsPlaying(false);
    const handlePause = () => setIsPlaying(false);
    
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('pause', handlePause);
    
    return () => {
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('pause', handlePause);
    };
  }, []);

  // 배경음악 믹싱 함수들 (기존 로직 유지)
  const mixAudioWithBgm = async (voiceUrl: string, bgmUrl: string, bgmGain: number): Promise<Blob> => {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    audioContextRef.current = audioContext;

    try {
      const [voiceResponse, bgmResponse] = await Promise.all([
        fetch(voiceUrl),
        fetch(bgmUrl)
      ]);
      const [voiceArrayBuffer, bgmArrayBuffer] = await Promise.all([
        voiceResponse.arrayBuffer(),
        bgmResponse.arrayBuffer()
      ]);
      const [voiceBuffer, bgmBuffer] = await Promise.all([
        audioContext.decodeAudioData(voiceArrayBuffer),
        audioContext.decodeAudioData(bgmArrayBuffer)
      ]);

      const outputLength = Math.max(voiceBuffer.length, bgmBuffer.length);
      const outputBuffer = audioContext.createBuffer(2, outputLength, audioContext.sampleRate);

      for (let channel = 0; channel < 2; channel++) {
        const outputData = outputBuffer.getChannelData(channel);
        const voiceData = voiceBuffer.getChannelData(Math.min(channel, voiceBuffer.numberOfChannels - 1));
        const bgmData = bgmBuffer.getChannelData(Math.min(channel, bgmBuffer.numberOfChannels - 1));

        for (let i = 0; i < outputLength; i++) {
          const voiceSample = i < voiceBuffer.length ? voiceData[i] : 0;
          const bgmSample = i < bgmBuffer.length ? bgmData[i] * bgmGain : 0;
          outputData[i] = voiceSample + bgmSample;
          if (outputData[i] > 1) outputData[i] = 1;
          if (outputData[i] < -1) outputData[i] = -1;
        }
      }

      const wavBlob = await audioBufferToWav(outputBuffer);
      return wavBlob;
    } finally {
      audioContext.close();
    }
  };

  const audioBufferToWav = (buffer: AudioBuffer): Promise<Blob> => {
    return new Promise((resolve) => {
      const numberOfChannels = buffer.numberOfChannels;
      const sampleRate = buffer.sampleRate;
      const format = 1;
      const bitDepth = 16;
      const bytesPerSample = bitDepth / 8;
      const blockAlign = numberOfChannels * bytesPerSample;

      const data = [];
      for (let i = 0; i < buffer.length; i++) {
        for (let channel = 0; channel < numberOfChannels; channel++) {
          const sample = buffer.getChannelData(channel)[i];
          const clampedSample = Math.max(-1, Math.min(1, sample));
          const intSample = clampedSample < 0 ? clampedSample * 0x8000 : clampedSample * 0x7FFF;
          data.push(intSample);
        }
      }

      const dataLength = data.length * bytesPerSample;
      const bufferLength = 44 + dataLength;
      const arrayBuffer = new ArrayBuffer(bufferLength);
      const view = new DataView(arrayBuffer);

      const writeString = (offset: number, string: string) => {
        for (let i = 0; i < string.length; i++) {
          view.setUint8(offset + i, string.charCodeAt(i));
        }
      };

      writeString(0, 'RIFF');
      view.setUint32(4, bufferLength - 8, true);
      writeString(8, 'WAVE');
      writeString(12, 'fmt ');
      view.setUint32(16, 16, true);
      view.setUint16(20, format, true);
      view.setUint16(22, numberOfChannels, true);
      view.setUint32(24, sampleRate, true);
      view.setUint32(28, sampleRate * blockAlign, true);
      view.setUint16(32, blockAlign, true);
      view.setUint16(34, bitDepth, true);
      writeString(36, 'data');
      view.setUint32(40, dataLength, true);

      let offset = 44;
      for (let i = 0; i < data.length; i++) {
        view.setInt16(offset, data[i], true);
        offset += 2;
      }

      resolve(new Blob([arrayBuffer], { type: 'audio/wav' }));
    });
  };

  useEffect(() => {
    if (selectedBgm !== "none" && audioUrl) {
      handleMixPreview();
    } else {
      if (mixedAudioUrl) {
        URL.revokeObjectURL(mixedAudioUrl);
      }
      setMixedAudioUrl(null);
    }
  }, [selectedBgm, bgmVolume]);

  useEffect(() => {
    return () => {
      if (mixedAudioUrl) {
        URL.revokeObjectURL(mixedAudioUrl);
      }
    };
  }, [mixedAudioUrl]);

  const handleMixPreview = async () => {
    const bgmOption = BGM_OPTIONS.find(opt => opt.value === selectedBgm);
    if (!bgmOption || !bgmOption.file) return;

    setIsMixing(true);
    try {
      const mixedBlob = await mixAudioWithBgm(audioUrl, bgmOption.file, bgmVolume);
      const url = URL.createObjectURL(mixedBlob);
      if (mixedAudioUrl) {
        URL.revokeObjectURL(mixedAudioUrl);
      }
      setMixedAudioUrl(url);
    } catch (error) {
      console.error("Failed to mix audio:", error);
    } finally {
      setIsMixing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ 
        animation: 'fadeIn 200ms ease-out',
        paddingBottom: 'env(safe-area-inset-bottom)'
      }}
    >
      {/* Dimmed Background - 녹음 모달과 동일한 은은한 딤 */}
      <div 
        className="absolute inset-0 bg-black/35 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Content Card - 텍스트에 집중 */}
      <div 
        className="relative z-10 w-full max-w-lg bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden"
        style={{ animation: 'scaleIn 200ms ease-out' }}
      >
        {/* 헤더 - 보라색 accent */}
        <div className="px-6 pt-6 pb-4 border-b-2 border-purple-500/20 dark:border-purple-400/20">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            음성 메시지 확인
          </h2>
        </div>

        <div className="px-6 py-6 space-y-5 max-h-[70vh] overflow-y-auto">
          {/* 오디오 플레이어 - 커스텀 웨이브폼 디자인 */}
          <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4">
            <div className="flex items-center gap-4">
              {/* 재생 버튼 */}
              <button
                onClick={togglePlayPause}
                className="flex-shrink-0 w-12 h-12 rounded-full bg-purple-600 hover:bg-purple-700 text-white flex items-center justify-center transition-colors shadow-md"
                data-testid="button-play-pause"
              >
                {isPlaying ? (
                  <Pause className="w-5 h-5" fill="currentColor" />
                ) : (
                  <Play className="w-5 h-5 ml-0.5" fill="currentColor" />
                )}
              </button>

              {/* 웨이브폼 비주얼 */}
              <div className="flex-1 flex items-center gap-1 h-12">
                {[...Array(40)].map((_, i) => {
                  const height = Math.sin(i * 0.5) * 30 + 50;
                  return (
                    <div
                      key={i}
                      className={cn(
                        "flex-1 rounded-full transition-all",
                        isPlaying 
                          ? "bg-purple-500 dark:bg-purple-400" 
                          : "bg-gray-300 dark:bg-gray-700"
                      )}
                      style={{
                        height: `${height}%`,
                        animation: isPlaying ? `wave 1.2s ease-in-out ${i * 0.05}s infinite` : 'none'
                      }}
                    />
                  );
                })}
              </div>

              {/* 시간 표시 */}
              <div className="flex-shrink-0 text-sm font-medium text-gray-600 dark:text-gray-400 min-w-[3rem] text-right">
                {duration?.toFixed(1)}초
              </div>
            </div>
          </div>

          {/* 텍스트 영역 - 메인 포커스, 강조된 디자인 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-base font-semibold text-gray-900 dark:text-gray-100">
                인식된 텍스트
              </label>
              {isCorrecting && (
                <span className="flex items-center text-sm text-purple-600 dark:text-purple-400 font-medium">
                  <Sparkles className="w-4 h-4 mr-1.5 animate-pulse" />
                  AI 보정 중
                </span>
              )}
              {aiCorrectionApplied && !isCorrecting && (
                <span className="flex items-center text-sm text-purple-600 dark:text-purple-400 font-medium">
                  <Sparkles className="w-4 h-4 mr-1.5" />
                  AI 보정 완료
                </span>
              )}
            </div>
            
            {/* 텍스트 입력 - 고대비 카드, 큰 폰트, 보라색 accent */}
            <div className="relative">
              <Textarea
                value={editedText}
                onChange={(e) => setEditedText(e.target.value)}
                placeholder="음성으로 인식된 텍스트를 확인하고 수정하세요..."
                className={cn(
                  "min-h-[200px] text-lg leading-relaxed",
                  "focus:ring-2 focus:ring-purple-500 focus:border-purple-500",
                  "border-2 border-gray-200 dark:border-gray-700",
                  "bg-gray-50 dark:bg-gray-800/50",
                  "rounded-xl p-4",
                  "resize-none",
                  "shadow-inner",
                  "transition-all duration-200",
                  isCorrecting && "opacity-50 cursor-not-allowed"
                )}
                style={{ lineHeight: "1.6" }}
                disabled={isCorrecting}
                data-testid="textarea-transcription"
              />
              {/* 보라색 accent 테두리 효과 */}
              <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-500 to-purple-600 opacity-20 dark:opacity-30 blur-sm -z-10 rounded-xl pointer-events-none" />
            </div>
            
            <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
              <span className="font-medium">{editedText.length}자</span>
              <span>텍스트를 확인하고 수정하세요</span>
            </div>
          </div>

          {/* 배경음악 - 펼치기/접기 */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <button
              onClick={() => setShowBgmOptions(!showBgmOptions)}
              className="flex items-center justify-between w-full text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100"
              data-testid="button-toggle-bgm"
            >
              <span className="flex items-center gap-2">
                <Music className="w-4 h-4" />
                배경음악 {selectedBgm !== "none" && `(${BGM_OPTIONS.find(o => o.value === selectedBgm)?.label})`}
              </span>
              {showBgmOptions ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showBgmOptions && (
              <div className="mt-3 space-y-3 pl-6">
                <Select value={selectedBgm} onValueChange={setSelectedBgm}>
                  <SelectTrigger className="h-9 text-sm" data-testid="select-bgm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BGM_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {selectedBgm !== "none" && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
                      <span>볼륨</span>
                      <span>{Math.round(bgmVolume * 100)}%</span>
                    </div>
                    <Slider
                      value={[bgmVolume]}
                      onValueChange={(values) => setBgmVolume(values[0])}
                      max={1}
                      step={0.1}
                      className="w-full"
                      disabled={isMixing}
                      data-testid="slider-bgm-volume"
                    />
                    {isMixing && (
                      <p className="text-xs text-purple-600 dark:text-purple-400 flex items-center gap-1">
                        <Sparkles className="w-3 h-3 animate-pulse" />
                        믹싱 중...
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 버튼들 - 심플하게 */}
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
              data-testid="button-cancel"
            >
              <X className="w-4 h-4 mr-2" />
              취소
            </Button>
            <Button
              variant="outline"
              onClick={handleReRecord}
              className="flex-1"
              data-testid="button-rerecord"
            >
              <Mic className="w-4 h-4 mr-2" />
              다시 녹음
            </Button>
            <Button
              onClick={handleSend}
              disabled={isSending}
              className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
              data-testid="button-send"
            >
              <Send className="w-4 h-4 mr-2" />
              {isSending ? "전송 중..." : "보내기"}
            </Button>
          </div>
        </div>

      </div>
      
      {/* 숨겨진 오디오 엘리먼트 */}
      <audio 
        ref={audioRef}
        src={mixedAudioUrl || audioUrl} 
        preload="auto"
      />

      {/* 애니메이션 CSS - 녹음 모달과 통일 */}
      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        
        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        
        @keyframes wave {
          0%, 100% {
            transform: scaleY(1);
          }
          50% {
            transform: scaleY(0.5);
          }
        }
      `}</style>
    </div>
  );
}
