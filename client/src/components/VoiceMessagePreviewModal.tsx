import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Play, Pause, Send, X, Edit3, Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface VoiceMessagePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSend: (editedText: string) => void;
  audioBlob: Blob | null;
  transcribedText: string;
  duration: number;
  isProcessing?: boolean;
}

export function VoiceMessagePreviewModal({
  isOpen,
  onClose,
  onSend,
  audioBlob,
  transcribedText,
  duration,
  isProcessing = false
}: VoiceMessagePreviewModalProps) {
  const [editedText, setEditedText] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    setEditedText(transcribedText);
    setIsEditing(false);
  }, [transcribedText]);

  useEffect(() => {
    if (audioBlob) {
      const audio = new Audio(URL.createObjectURL(audioBlob));
      audio.onended = () => setIsPlaying(false);
      setAudioElement(audio);
      
      return () => {
        audio.pause();
        URL.revokeObjectURL(audio.src);
      };
    }
  }, [audioBlob]);

  const handlePlayPause = () => {
    if (!audioElement) return;
    
    if (isPlaying) {
      audioElement.pause();
      setIsPlaying(false);
    } else {
      audioElement.play();
      setIsPlaying(true);
    }
  };

  const handleSend = () => {
    onSend(editedText.trim());
  };

  const handleCancel = () => {
    if (audioElement) {
      audioElement.pause();
      setIsPlaying(false);
    }
    onClose();
  };

  const formatDuration = (seconds: number): string => {
    return `${seconds.toFixed(1)}초`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleCancel}>
      <DialogContent className="max-w-md p-6">
        <DialogHeader className="pb-4">
          <DialogTitle className="flex items-center space-x-2 text-lg">
            <Volume2 className="h-5 w-5 text-purple-600" />
            <span>음성 메시지 미리보기</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Audio Controls with Waveform */}
          <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl p-6 space-y-4">
            {/* Waveform Visualization */}
            <div className="flex items-center justify-center gap-1 h-24">
              {Array.from({ length: 25 }, (_, i) => {
                const randomHeight = Math.random() * 60 + 20;
                const delay = i * 0.05;
                return (
                  <div
                    key={i}
                    className={cn(
                      "w-1 rounded-full transition-all duration-300",
                      isPlaying 
                        ? "bg-gradient-to-t from-purple-500 via-purple-400 to-purple-300 animate-pulse" 
                        : "bg-gray-300"
                    )}
                    style={{
                      height: `${randomHeight}%`,
                      animationDelay: isPlaying ? `${delay}s` : '0s'
                    }}
                  />
                );
              })}
            </div>

            {/* Play Button and Duration */}
            <div className="flex items-center justify-center space-x-3">
              <Button
                variant="default"
                size="lg"
                onClick={handlePlayPause}
                disabled={!audioElement || isProcessing}
                className="h-12 w-12 rounded-full bg-purple-600 hover:bg-purple-700 shadow-lg hover:shadow-xl transition-all"
              >
                {isPlaying ? (
                  <Pause className="h-5 w-5 text-white" />
                ) : (
                  <Play className="h-5 w-5 text-white ml-0.5" />
                )}
              </Button>
              <span className="text-sm font-medium text-gray-700">
                {formatDuration(duration)}
              </span>
            </div>
          </div>

          {/* Text Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-gray-700">
                변환된 텍스트
              </label>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditing(!isEditing)}
                className="h-8 px-3 text-sm text-purple-600 hover:text-purple-700 hover:bg-purple-50"
              >
                <Edit3 className="h-4 w-4 mr-1.5" />
                수정
              </Button>
            </div>

            {isProcessing ? (
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="animate-spin h-4 w-4 border-2 border-purple-600 border-t-transparent rounded-full"></div>
                  <span className="text-sm text-gray-600">변환 중...</span>
                </div>
              </div>
            ) : isEditing ? (
              <Textarea
                value={editedText}
                onChange={(e) => setEditedText(e.target.value)}
                placeholder="텍스트를 수정하세요..."
                className="min-h-[80px] text-sm resize-none focus:ring-2 focus:ring-purple-500"
                autoFocus
              />
            ) : (
              <div className="p-4 bg-white rounded-lg min-h-[80px] border-2 border-gray-100 hover:border-gray-200 transition-colors">
                <p className="text-sm text-gray-900 whitespace-pre-wrap leading-relaxed">
                  {editedText || "변환된 텍스트가 여기에 표시됩니다."}
                </p>
              </div>
            )}

            <div className="text-right">
              <span className="text-sm text-gray-500">
                {editedText.length} 글자
              </span>
            </div>
          </div>
        </div>

        <DialogFooter className="flex gap-3 pt-4">
          <Button 
            variant="outline" 
            onClick={handleCancel} 
            className="flex-1 h-11 text-sm hover:bg-gray-50"
          >
            <X className="h-4 w-4 mr-2" />
            취소
          </Button>
          <Button 
            onClick={handleSend} 
            disabled={!editedText.trim() || isProcessing}
            className="flex-1 h-11 text-sm bg-purple-600 hover:bg-purple-700 shadow-md hover:shadow-lg transition-all"
          >
            <Send className="h-4 w-4 mr-2" />
            전송
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}