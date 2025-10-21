import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Mic, Send, X } from "lucide-react";

interface VoiceMessageConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  transcription: string;
  audioUrl: string;
  duration: number;
  onSend: (editedText: string) => Promise<void>;
  onReRecord: () => void;
}

export default function VoiceMessageConfirmModal({
  isOpen,
  onClose,
  transcription,
  audioUrl,
  duration,
  onSend,
  onReRecord,
}: VoiceMessageConfirmModalProps) {
  const [editedText, setEditedText] = useState(transcription);
  const [isSending, setIsSending] = useState(false);

  const handleSend = async () => {
    setIsSending(true);
    try {
      await onSend(editedText);
      // onClose는 caller가 제어 (성공했을 때만 닫힘)
    } catch (error) {
      console.error("Failed to send voice message:", error);
      // 에러 발생 시 모달 유지 (사용자가 재시도할 수 있도록)
    } finally {
      setIsSending(false);
    }
  };

  const handleReRecord = () => {
    onClose();
    onReRecord();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>음성 메시지 확인</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* 음성 재생기 */}
          <div className="flex items-center gap-2 p-3 bg-purple-50 dark:bg-purple-950/20 rounded-lg">
            <audio 
              src={audioUrl} 
              controls 
              className="w-full"
              style={{ height: '40px' }}
            />
          </div>

          {/* Transcription 편집 */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              인식된 텍스트 (수정 가능)
            </label>
            <Textarea
              value={editedText}
              onChange={(e) => setEditedText(e.target.value)}
              placeholder="음성으로 인식된 텍스트를 수정할 수 있습니다..."
              className="min-h-[100px] resize-none"
              data-testid="textarea-transcription"
            />
            <p className="text-xs text-gray-500">
              {duration?.toFixed(1)}초 · {editedText.length}자
            </p>
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
