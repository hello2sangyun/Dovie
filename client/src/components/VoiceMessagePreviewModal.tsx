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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Volume2 className="h-5 w-5 text-purple-600" />
            <span>음성 메시지 미리보기</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Audio Playback Controls */}
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePlayPause}
                disabled={!audioElement || isProcessing}
                className="flex items-center space-x-2"
              >
                {isPlaying ? (
                  <Pause className="h-4 w-4" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
                <span>{isPlaying ? "일시정지" : "재생"}</span>
              </Button>
              
              <span className="text-sm text-gray-600">
                {formatDuration(duration)}
              </span>
            </div>

            {/* Audio Waveform Visual */}
            <div className="flex items-center space-x-0.5">
              {Array.from({ length: 12 }, (_, i) => (
                <div
                  key={i}
                  className={cn(
                    "w-1 bg-gray-300 rounded-full transition-colors",
                    isPlaying ? "bg-purple-500" : "bg-gray-300"
                  )}
                  style={{
                    height: `${Math.random() * 12 + 4}px`
                  }}
                />
              ))}
            </div>
          </div>

          {/* Transcribed Text */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">
                변환된 텍스트
              </label>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditing(!isEditing)}
                className="text-purple-600 hover:text-purple-700"
              >
                <Edit3 className="h-4 w-4 mr-1" />
                {isEditing ? "미리보기" : "수정"}
              </Button>
            </div>

            {isProcessing ? (
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-2">
                  <div className="animate-spin h-4 w-4 border-2 border-purple-600 border-t-transparent rounded-full"></div>
                  <span className="text-sm text-gray-600">음성을 텍스트로 변환 중...</span>
                </div>
              </div>
            ) : isEditing ? (
              <Textarea
                value={editedText}
                onChange={(e) => setEditedText(e.target.value)}
                placeholder="텍스트를 수정하세요..."
                className="min-h-[100px] resize-none"
                autoFocus
              />
            ) : (
              <div className="p-3 bg-gray-50 rounded-lg min-h-[100px] border border-gray-200">
                <p className="text-gray-900 whitespace-pre-wrap">
                  {editedText || "변환된 텍스트가 여기에 표시됩니다."}
                </p>
              </div>
            )}
          </div>

          {/* Character Count */}
          <div className="text-right">
            <span className="text-xs text-gray-500">
              {editedText.length} 글자
            </span>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={handleCancel} className="flex-1">
            <X className="h-4 w-4 mr-2" />
            취소
          </Button>
          <Button 
            onClick={handleSend} 
            disabled={!editedText.trim() || isProcessing}
            className="flex-1 bg-purple-600 hover:bg-purple-700"
          >
            <Send className="h-4 w-4 mr-2" />
            전송
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}