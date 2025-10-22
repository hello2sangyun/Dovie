import { useState, useEffect, useRef } from "react";
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
  const [currentTime, setCurrentTime] = useState(0);
  const animationFrameRef = useRef<number>();

  useEffect(() => {
    setEditedText(transcribedText);
    setIsEditing(false);
  }, [transcribedText]);

  useEffect(() => {
    if (audioBlob) {
      const audio = new Audio(URL.createObjectURL(audioBlob));
      audio.onended = () => {
        setIsPlaying(false);
        setCurrentTime(0);
      };
      audio.ontimeupdate = () => {
        setCurrentTime(audio.currentTime);
      };
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
      audioElement.currentTime = 0;
      setIsPlaying(false);
      setCurrentTime(0);
    }
    onClose();
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return mins > 0 ? `${mins}:${secs.toString().padStart(2, '0')}` : `${secs}초`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleCancel()}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden" data-testid="modal-voice-preview">
        <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-6">
          <DialogHeader className="pb-4">
            <DialogTitle className="flex items-center space-x-2 text-lg">
              <Volume2 className="h-5 w-5 text-purple-600" />
              <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent font-semibold">
                음성 메시지 미리보기
              </span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Audio Waveform Visualization */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-purple-100">
              <div className="flex items-center justify-center space-x-1 h-24 mb-4">
                {Array.from({ length: 40 }, (_, i) => {
                  const baseHeight = Math.sin(i * 0.5) * 30 + 40;
                  const variance = Math.random() * 20;
                  const height = baseHeight + variance;
                  const progress = duration > 0 ? currentTime / duration : 0;
                  const isActive = i / 40 <= progress;
                  
                  return (
                    <div
                      key={i}
                      className={cn(
                        "w-1 rounded-full transition-all duration-150",
                        isPlaying && isActive 
                          ? "bg-gradient-to-t from-purple-500 to-pink-500 shadow-sm" 
                          : "bg-gray-200"
                      )}
                      style={{
                        height: `${height}px`,
                        transform: isPlaying && isActive ? 'scaleY(1.1)' : 'scaleY(1)',
                      }}
                    />
                  );
                })}
              </div>

              <div className="flex items-center justify-between">
                <Button
                  variant="ghost"
                  size="lg"
                  onClick={handlePlayPause}
                  disabled={!audioElement || isProcessing}
                  className="h-12 w-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-lg hover:shadow-xl transition-all"
                  data-testid="button-play-pause"
                >
                  {isPlaying ? (
                    <Pause className="h-5 w-5" />
                  ) : (
                    <Play className="h-5 w-5 ml-0.5" />
                  )}
                </Button>

                <div className="text-sm font-medium text-gray-600">
                  {formatDuration(currentTime)} / {formatDuration(duration)}
                </div>
              </div>
            </div>

            {/* Text Section */}
            <div className="bg-white rounded-xl p-4 shadow-sm border border-purple-100">
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-semibold text-gray-700">
                  변환된 텍스트
                </label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditing(!isEditing)}
                  className="h-7 px-3 text-xs text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                  data-testid="button-edit-text"
                >
                  <Edit3 className="h-3 w-3 mr-1" />
                  {isEditing ? "완료" : "수정"}
                </Button>
              </div>

              {isProcessing ? (
                <div className="p-4 bg-purple-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="animate-spin h-4 w-4 border-2 border-purple-600 border-t-transparent rounded-full"></div>
                    <span className="text-sm text-purple-700 font-medium">음성을 텍스트로 변환하는 중...</span>
                  </div>
                </div>
              ) : isEditing ? (
                <Textarea
                  value={editedText}
                  onChange={(e) => setEditedText(e.target.value)}
                  placeholder="텍스트를 수정하세요..."
                  className="min-h-[80px] text-sm resize-none border-purple-200 focus:border-purple-400 focus:ring-purple-400"
                  autoFocus
                  data-testid="textarea-edit-text"
                />
              ) : (
                <div className="p-3 bg-gray-50 rounded-lg min-h-[80px] border border-gray-200">
                  <p className="text-sm text-gray-900 whitespace-pre-wrap leading-relaxed">
                    {editedText || "변환된 텍스트가 여기에 표시됩니다."}
                  </p>
                </div>
              )}

              <div className="text-right mt-2">
                <span className="text-xs text-gray-500">
                  {editedText.length} 글자
                </span>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex gap-3 p-4 bg-gray-50">
          <Button 
            variant="outline" 
            onClick={handleCancel} 
            className="flex-1 h-10 text-sm border-gray-300 hover:bg-gray-100"
            data-testid="button-cancel"
          >
            <X className="h-4 w-4 mr-2" />
            취소
          </Button>
          <Button 
            onClick={handleSend} 
            disabled={!editedText.trim() || isProcessing}
            className="flex-1 h-10 text-sm bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-md hover:shadow-lg transition-all"
            data-testid="button-send"
          >
            <Send className="h-4 w-4 mr-2" />
            전송
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
