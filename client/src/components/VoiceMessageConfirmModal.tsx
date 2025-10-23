import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Mic, Send, X, Sparkles, Music, Volume2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";

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
  { value: "none", label: "배경음악 없음", file: null },
  { value: "comedy", label: "🤡 개그적인 음악", file: "/bgm/comedy.mp3" },
  { value: "explosion", label: "💥 폭발하는 음악", file: "/bgm/explosion.mp3" },
  { value: "epic", label: "🎻 웅장한 음악", file: "/bgm/epic.mp3" },
  { value: "lovely", label: "💕 사랑스러운 음악", file: "/bgm/lovely.mp3" },
  { value: "energetic", label: "🎉 신나는 음악", file: "/bgm/energetic.mp3" },
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
  
  // 배경음악 관련 state
  const [selectedBgm, setSelectedBgm] = useState("none");
  const [bgmVolume, setBgmVolume] = useState(0.3); // 30% 볼륨
  const [mixedAudioUrl, setMixedAudioUrl] = useState<string | null>(null);
  const [isMixing, setIsMixing] = useState(false);
  
  const audioContextRef = useRef<AudioContext | null>(null);

  // AI Voice Enhancement: Auto-correct transcription when modal opens
  useEffect(() => {
    if (isOpen && transcription && chatRoomId) {
      correctTranscription();
    } else {
      // Reset state when modal closes
      setEditedText(transcription);
      setAiCorrectionApplied(false);
    }
  }, [isOpen, transcription, chatRoomId]);

  const correctTranscription = async () => {
    setIsCorrecting(true);
    try {
      console.log("AI Voice Enhancement: Correcting transcription...");
      const response = await apiRequest(
        "/api/voice-messages/correct-transcription",
        "POST",
        {
          transcription,
          chatRoomId,
        }
      );

      const result = await response.json();
      
      if (result.success && result.correctedText) {
        console.log("AI Voice Enhancement: Transcription corrected", {
          original: transcription,
          corrected: result.correctedText
        });
        setEditedText(result.correctedText);
        setAiCorrectionApplied(true);
      } else {
        console.warn("AI Voice Enhancement: Correction failed, using original", result.error);
        setEditedText(transcription);
      }
    } catch (error) {
      console.error("AI Voice Enhancement: Error correcting transcription", error);
      setEditedText(transcription);
    } finally {
      setIsCorrecting(false);
    }
  };

  const handleSend = async () => {
    setIsSending(true);
    try {
      // 배경음악이 믹싱된 경우 새로 업로드
      if (mixedAudioUrl) {
        // Blob URL을 Blob으로 변환
        const response = await fetch(mixedAudioUrl);
        const blob = await response.blob();
        
        // FormData로 업로드
        const formData = new FormData();
        formData.append("audio", blob, "mixed_voice.wav");
        
        const uploadResponse = await fetch("/api/upload-voice", {
          method: "POST",
          body: formData,
        });
        
        if (!uploadResponse.ok) {
          throw new Error("Failed to upload mixed audio");
        }
        
        const uploadData = await uploadResponse.json();
        
        // 업로드된 URL로 메시지 전송
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
        // 배경음악 없으면 기존 방식대로
        await onSend(editedText);
      }
    } catch (error) {
      console.error("Failed to send voice message:", error);
      // 에러 발생 시 모달 유지 (사용자가 재시도할 수 있도록)
      throw error;
    } finally {
      setIsSending(false);
    }
  };

  const handleReRecord = () => {
    onClose();
    onReRecord();
  };

  // 음성과 배경음악 믹싱
  const mixAudioWithBgm = async (voiceUrl: string, bgmUrl: string, bgmGain: number): Promise<Blob> => {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    audioContextRef.current = audioContext;

    try {
      // 음성과 배경음악 로드
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

      // 더 긴 오디오 길이에 맞춰서 출력 버퍼 생성
      const outputLength = Math.max(voiceBuffer.length, bgmBuffer.length);
      const outputBuffer = audioContext.createBuffer(
        2, // 스테레오
        outputLength,
        audioContext.sampleRate
      );

      // 각 채널 믹싱
      for (let channel = 0; channel < 2; channel++) {
        const outputData = outputBuffer.getChannelData(channel);
        const voiceData = voiceBuffer.getChannelData(Math.min(channel, voiceBuffer.numberOfChannels - 1));
        const bgmData = bgmBuffer.getChannelData(Math.min(channel, bgmBuffer.numberOfChannels - 1));

        for (let i = 0; i < outputLength; i++) {
          const voiceSample = i < voiceBuffer.length ? voiceData[i] : 0;
          const bgmSample = i < bgmBuffer.length ? bgmData[i] * bgmGain : 0;
          
          // 믹싱 (음성은 100%, 배경음악은 bgmGain%)
          outputData[i] = voiceSample + bgmSample;
          
          // 클리핑 방지 (최대값 제한)
          if (outputData[i] > 1) outputData[i] = 1;
          if (outputData[i] < -1) outputData[i] = -1;
        }
      }

      // WAV 형식으로 변환
      const wavBlob = await audioBufferToWav(outputBuffer);
      return wavBlob;

    } finally {
      audioContext.close();
    }
  };

  // AudioBuffer를 WAV Blob으로 변환
  const audioBufferToWav = (buffer: AudioBuffer): Promise<Blob> => {
    return new Promise((resolve) => {
      const numberOfChannels = buffer.numberOfChannels;
      const sampleRate = buffer.sampleRate;
      const format = 1; // PCM
      const bitDepth = 16;

      const bytesPerSample = bitDepth / 8;
      const blockAlign = numberOfChannels * bytesPerSample;

      const data = [];
      for (let i = 0; i < buffer.length; i++) {
        for (let channel = 0; channel < numberOfChannels; channel++) {
          const sample = buffer.getChannelData(channel)[i];
          const clampedSample = Math.max(-1, Math.min(1, sample));
          const intSample = clampedSample < 0 
            ? clampedSample * 0x8000 
            : clampedSample * 0x7FFF;
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

      // WAV 헤더
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

      // 오디오 데이터
      let offset = 44;
      for (let i = 0; i < data.length; i++) {
        view.setInt16(offset, data[i], true);
        offset += 2;
      }

      resolve(new Blob([arrayBuffer], { type: 'audio/wav' }));
    });
  };

  // 배경음악 변경 시 자동 믹싱
  useEffect(() => {
    if (selectedBgm !== "none" && audioUrl) {
      handleMixPreview();
    } else {
      // 배경음악 없으면 원본 사용
      if (mixedAudioUrl) {
        URL.revokeObjectURL(mixedAudioUrl);
      }
      setMixedAudioUrl(null);
    }
  }, [selectedBgm, bgmVolume]);

  // Cleanup: 모달 닫힐 때 URL 정리
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
      
      // 이전 URL 정리
      if (mixedAudioUrl) {
        URL.revokeObjectURL(mixedAudioUrl);
      }
      
      setMixedAudioUrl(url);
    } catch (error) {
      console.error("Failed to mix audio:", error);
      alert("배경음악 믹싱에 실패했습니다. 배경음악 파일을 확인해주세요.");
    } finally {
      setIsMixing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="text-xl">음성 메시지 확인</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* 컴팩트한 컨트롤 상단 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* 음성 재생기 */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400">음성 재생</label>
              <audio 
                src={mixedAudioUrl || audioUrl} 
                controls 
                className="w-full h-10"
                key={mixedAudioUrl || audioUrl}
              />
            </div>

            {/* 배경음악 선택 */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400 flex items-center gap-1">
                <Music className="w-3 h-3" />
                배경음악
              </label>
              <Select value={selectedBgm} onValueChange={setSelectedBgm}>
                <SelectTrigger className="w-full h-10 text-sm" data-testid="select-bgm">
                  <SelectValue placeholder="배경음악 선택" />
                </SelectTrigger>
                <SelectContent>
                  {BGM_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* 배경음악 볼륨 조절 */}
          {selectedBgm !== "none" && (
            <div className="space-y-2 px-1">
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400 flex items-center gap-1">
                <Volume2 className="w-3 h-3" />
                볼륨: {Math.round(bgmVolume * 100)}%
              </label>
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

          {/* 메인: Transcribed Text 카드 - 시각적 집중 */}
          <div className="relative">
            <div className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-950/30 dark:to-blue-950/30 rounded-xl p-6 shadow-lg border-2 border-purple-200 dark:border-purple-800">
              {/* AI 보정 상태 배지 */}
              <div className="absolute -top-3 left-4 bg-white dark:bg-gray-800 px-3 py-1 rounded-full shadow-md border border-purple-200 dark:border-purple-700">
                {isCorrecting ? (
                  <div className="flex items-center text-xs text-purple-600 dark:text-purple-400 font-medium">
                    <Sparkles className="w-3 h-3 mr-1 animate-pulse" />
                    AI 보정 중...
                  </div>
                ) : aiCorrectionApplied ? (
                  <div className="flex items-center text-xs text-purple-600 dark:text-purple-400 font-medium">
                    <Sparkles className="w-3 h-3 mr-1" />
                    AI 보정 완료
                  </div>
                ) : (
                  <div className="flex items-center text-xs text-gray-600 dark:text-gray-400 font-medium">
                    인식된 텍스트
                  </div>
                )}
              </div>

              {/* 텍스트 입력 영역 - 큰 사이즈, 집중 */}
              <Textarea
                value={editedText}
                onChange={(e) => setEditedText(e.target.value)}
                placeholder="음성으로 인식된 텍스트를 확인하고 수정하세요..."
                className="min-h-[160px] resize-none text-lg leading-relaxed border-0 bg-transparent focus:ring-2 focus:ring-purple-400 dark:focus:ring-purple-600 rounded-lg p-4 shadow-inner"
                disabled={isCorrecting}
                data-testid="textarea-transcription"
                style={{ fontSize: '18px', lineHeight: '1.7' }}
              />
              
              {/* 메타 정보 */}
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-purple-200 dark:border-purple-800">
                <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
                  <span className="font-semibold text-purple-600 dark:text-purple-400">{duration?.toFixed(1)}초</span>
                  <span className="text-gray-400">·</span>
                  <span className="font-semibold text-purple-600 dark:text-purple-400">{editedText.length}자</span>
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500">
                  클릭하여 수정 가능
                </p>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            className="w-full sm:w-auto"
            data-testid="button-cancel"
          >
            <X className="w-4 h-4 mr-2" />
            취소
          </Button>
          <Button
            variant="outline"
            onClick={handleReRecord}
            className="w-full sm:w-auto"
            data-testid="button-rerecord"
          >
            <Mic className="w-4 h-4 mr-2" />
            다시 녹음
          </Button>
          <Button
            onClick={handleSend}
            disabled={isSending}
            className="w-full sm:w-auto bg-purple-600 hover:bg-purple-700 text-white"
            data-testid="button-send"
          >
            <Send className="w-4 h-4 mr-2" />
            {isSending ? "전송 중..." : "보내기"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
