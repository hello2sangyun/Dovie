import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { X, Mic, Send, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface AIChatAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  chatRoomId: number;
}

// Dovie Wings Icon Component with sparkle animation
const DovieWingsIcon = ({ className = "" }: { className?: string }) => {
  return (
    <div className="relative inline-block">
      <svg 
        width="32" 
        height="32" 
        viewBox="0 0 24 24" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        className={className}
      >
        {/* Left Wing */}
        <path 
          d="M8 12C8 12 6 10 4 10C2 10 1 11 1 12C1 13 2 14 4 14C6 14 8 12 8 12Z" 
          fill="currentColor"
          className="animate-pulse"
        />
        {/* Right Wing */}
        <path 
          d="M16 12C16 12 18 10 20 10C22 10 23 11 23 12C23 13 22 14 20 14C18 14 16 12 16 12Z" 
          fill="currentColor"
          className="animate-pulse"
        />
        {/* Body */}
        <circle 
          cx="12" 
          cy="12" 
          r="3" 
          fill="currentColor"
        />
      </svg>
      {/* Sparkle effect */}
      <div className="absolute -top-1 -right-1 text-yellow-400 animate-ping">
        <Sparkles className="h-3 w-3" />
      </div>
    </div>
  );
};

export const AIChatAssistantModal = ({ isOpen, onClose, chatRoomId }: AIChatAssistantModalProps) => {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();

  // Start voice recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: 'audio/webm' });
        await transcribeAudio(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
      setAudioChunks(chunks);
    } catch (error) {
      console.error('Error starting recording:', error);
      toast({
        variant: "destructive",
        title: "녹음 실패",
        description: "마이크 권한을 확인해주세요.",
      });
    }
  };

  // Stop voice recording
  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
    }
  };

  // Transcribe audio to text
  const transcribeAudio = async (audioBlob: Blob) => {
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');

      const response = await apiRequest('/api/transcribe', 'POST', formData, {
        headers: {
          // Don't set Content-Type, let browser set it with boundary
        }
      });

      if (!response.ok) {
        throw new Error('Transcription failed');
      }

      const data = await response.json();
      if (data.success && data.transcription) {
        setQuestion(data.transcription);
        textareaRef.current?.focus();
      } else {
        throw new Error('No transcription received');
      }
    } catch (error) {
      console.error('Transcription error:', error);
      toast({
        variant: "destructive",
        title: "음성 인식 실패",
        description: "음성을 인식하지 못했습니다. 다시 시도해주세요.",
      });
    }
  };

  // Submit question to AI
  const handleSubmit = async () => {
    if (!question.trim()) {
      toast({
        variant: "destructive",
        title: "질문을 입력하세요",
        description: "AI에게 물어볼 내용을 입력해주세요.",
      });
      return;
    }

    setIsLoading(true);
    setAnswer("");

    try {
      const response = await apiRequest(`/api/chat-rooms/${chatRoomId}/ai-assistant`, 'POST', {
        question: question.trim()
      });

      if (!response.ok) {
        throw new Error('AI request failed');
      }

      const data = await response.json();
      
      if (data.success && data.answer) {
        setAnswer(data.answer);
      } else {
        throw new Error('No answer received');
      }
    } catch (error) {
      console.error('AI Assistant error:', error);
      toast({
        variant: "destructive",
        title: "AI 응답 실패",
        description: "AI가 응답하지 못했습니다. 다시 시도해주세요.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Enter key to submit
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setQuestion("");
      setAnswer("");
      setIsLoading(false);
      if (isRecording) {
        stopRecording();
      }
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] p-0 gap-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="px-6 py-4 bg-gradient-to-r from-purple-500 to-indigo-600 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <DovieWingsIcon className="text-white" />
              <DialogTitle className="text-white text-lg font-semibold">
                Dovie AI 어시스턴트
              </DialogTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-white hover:bg-white/20 h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-sm text-white/90 mt-1">
            이 채팅방의 대화 내용을 학습한 AI에게 무엇이든 물어보세요
          </p>
        </DialogHeader>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Question Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">질문</label>
            <div className="relative">
              <Textarea
                ref={textareaRef}
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="예: 수진이 생일이 언제야? 내일 뭐한다고 했지?"
                className="min-h-[80px] pr-12 resize-none focus:ring-2 focus:ring-purple-500"
                disabled={isLoading || isRecording}
                data-testid="input-ai-question"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isLoading}
              className={`flex items-center gap-2 ${
                isRecording 
                  ? 'bg-red-500 text-white hover:bg-red-600 border-red-500' 
                  : 'border-purple-300 text-purple-600 hover:bg-purple-50'
              }`}
              data-testid="button-voice-record"
            >
              <Mic className={`h-4 w-4 ${isRecording ? 'animate-pulse' : ''}`} />
              {isRecording ? '녹음 중지' : '음성 입력'}
            </Button>

            <Button
              onClick={handleSubmit}
              disabled={!question.trim() || isLoading || isRecording}
              className="flex-1 purple-gradient hover:purple-gradient-hover text-white"
              data-testid="button-submit-question"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                  AI가 생각 중...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  질문하기
                </>
              )}
            </Button>
          </div>

          {/* Answer Display */}
          {answer && (
            <div className="space-y-2 pt-4 border-t border-gray-200">
              <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-purple-600" />
                AI 답변
              </label>
              <div 
                className="p-4 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-lg border border-purple-200"
                data-testid="text-ai-answer"
              >
                <p className="text-gray-800 whitespace-pre-wrap leading-relaxed">
                  {answer}
                </p>
              </div>
            </div>
          )}

          {/* Tips */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <div className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-blue-600 text-xs font-bold">💡</span>
              </div>
              <div className="text-xs text-blue-700">
                <p className="font-medium mb-1">AI가 도와드릴 수 있는 것들:</p>
                <ul className="space-y-0.5 list-disc list-inside">
                  <li>대화 내용에서 특정 정보 찾기</li>
                  <li>약속 날짜나 시간 확인</li>
                  <li>누가 무슨 말을 했는지 기억하기</li>
                  <li>대화 내용 요약하기</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
