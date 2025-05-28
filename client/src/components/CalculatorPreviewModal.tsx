import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calculator, Copy } from "lucide-react";

interface CalculatorPreviewModalProps {
  open: boolean;
  onClose: () => void;
  expression: string;
  result: string;
  onSendToChat: (result: string) => void;
}

export default function CalculatorPreviewModal({ 
  open, 
  onClose, 
  expression,
  result,
  onSendToChat 
}: CalculatorPreviewModalProps) {
  const [isSending, setIsSending] = useState(false);

  const handleSendToChat = async () => {
    setIsSending(true);
    try {
      // 결과값을 간단한 형태로 정리
      const cleanResult = result.split('\n')[0]; // 첫 번째 줄만 (숫자 결과)
      const chatMessage = `${expression}=${cleanResult}`;
      await onSendToChat(chatMessage);
      onClose();
    } catch (error) {
      console.error('Failed to send to chat:', error);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Calculator className="h-5 w-5 text-blue-600" />
            <span>계산 결과</span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="space-y-2">
              <div>
                <p className="text-sm text-gray-600 mb-1">계산식:</p>
                <p className="font-mono text-lg font-semibold text-gray-900">{expression}</p>
              </div>
              
              <div className="border-t pt-2">
                <p className="text-sm text-gray-600 mb-1">결과:</p>
                <div className="bg-white p-3 rounded border">
                  <p className="font-mono text-xl font-bold text-blue-600">
                    {result.split('\n')[0]}
                  </p>
                  {result.includes('\n') && (
                    <p className="text-sm text-gray-600 mt-2">
                      {result.split('\n').slice(1).join('\n')}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-between space-x-2">
            <Button variant="outline" onClick={onClose}>
              닫기
            </Button>
            
            <Button 
              onClick={handleSendToChat}
              disabled={isSending}
              className="purple-gradient hover:purple-gradient-hover"
            >
              {isSending ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>전송 중...</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <Copy className="h-4 w-4" />
                  <span>채팅방에 복사</span>
                </div>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}