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
      <DialogContent className="sm:max-w-sm p-4">
        <DialogHeader className="pb-2">
          <DialogTitle className="flex items-center space-x-2 text-base">
            <Volume2 className="h-4 w-4 text-purple-600" />
            <span>음성 메시지 미리보기</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {/* Compact Audio Controls */}
          <div className="flex items-center justify-between p-2 bg-gray-50 rounded-md">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePlayPause}
              disabled={!audioElement || isProcessing}
              className="h-8 px-2"
            >
              {isPlaying ? (
                <Pause className="h-3 w-3" />
              ) : (
                <Play className="h-3 w-3" />
              )}
              <span className="ml-1 text-xs">{isPlaying ? "재생" : formatDuration(duration)}</span>
            </Button>

            {/* Compact Waveform */}
            <div className="flex items-center space-x-0.5">
              {Array.from({ length: 8 }, (_, i) => (
                <div
                  key={i}
                  className={cn(
                    "w-0.5 bg-gray-300 rounded-full transition-colors",
                    isPlaying ? "bg-purple-500" : "bg-gray-300"
                  )}
                  style={{
                    height: `${Math.random() * 8 + 3}px`
                  }}
                />
              ))}
            </div>
          </div>

          {/* Compact Text Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-gray-700">
                변환된 텍스트
              </label>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditing(!isEditing)}
                className="h-6 px-2 text-xs text-purple-600 hover:text-purple-700"
              >
                <Edit3 className="h-3 w-3 mr-1" />
                수정
              </Button>
            </div>

            {isProcessing ? (
              <div className="p-2 bg-gray-50 rounded-md">
                <div className="flex items-center space-x-2">
                  <div className="animate-spin h-3 w-3 border-2 border-purple-600 border-t-transparent rounded-full"></div>
                  <span className="text-xs text-gray-600">변환 중...</span>
                </div>
              </div>
            ) : isEditing ? (
              <Textarea
                value={editedText}
                onChange={(e) => setEditedText(e.target.value)}
                placeholder="텍스트를 수정하세요..."
                className="min-h-[60px] text-sm resize-none"
                autoFocus
              />
            ) : (
              <div className="p-2 bg-gray-50 rounded-md min-h-[60px] border border-gray-200">
                <p className="text-sm text-gray-900 whitespace-pre-wrap">
                  {editedText || "변환된 텍스트가 여기에 표시됩니다."}
                </p>
              </div>
            )}

            <div className="text-right">
              <span className="text-xs text-gray-500">
                {editedText.length} 글자
              </span>
            </div>
          </div>
        </div>

        <DialogFooter className="flex gap-2 pt-2">
          <Button variant="outline" onClick={handleCancel} className="flex-1 h-8 text-xs">
            <X className="h-3 w-3 mr-1" />
            취소
          </Button>
          <Button 
            onClick={handleSend} 
            disabled={!editedText.trim() || isProcessing}
            className="flex-1 h-8 text-xs bg-purple-600 hover:bg-purple-700"
          >
            <Send className="h-3 w-3 mr-1" />
            전송
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}