import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileText } from "lucide-react";

interface CommandModalProps {
  open: boolean;
  onClose: () => void;
  fileData?: {
    fileUrl: string;
    fileName: string;
    fileSize: number;
  };
  messageData?: {
    content: string;
    senderId: number;
    timestamp: string;
  };
  chatRoomId?: number;
}

export default function CommandModal({ 
  open, 
  onClose, 
  fileData, 
  messageData, 
  chatRoomId 
}: CommandModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [commandName, setCommandName] = useState("");

  const createCommandMutation = useMutation({
    mutationFn: async () => {
      if (!chatRoomId) throw new Error("Chat room ID required");
      
      const commandData: any = {
        chatRoomId,
        commandName,
      };

      if (fileData) {
        commandData.fileUrl = fileData.fileUrl;
        commandData.fileName = fileData.fileName;
        commandData.fileSize = fileData.fileSize;
      }

      if (messageData) {
        commandData.savedText = messageData.content;
        commandData.originalSenderId = messageData.senderId;
        commandData.originalTimestamp = messageData.timestamp;
      }

      const response = await apiRequest("POST", "/api/commands", commandData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/commands"] });
      toast({
        title: "명령어 등록 완료",
        description: `#${commandName} 명령어가 등록되었습니다.`,
      });
      handleClose();
    },
    onError: (error: any) => {
      if (error.message.includes("already exists")) {
        toast({
          variant: "destructive",
          title: "중복된 명령어",
          description: "이미 존재하는 명령어입니다. 다른 이름을 사용해주세요.",
        });
      } else {
        toast({
          variant: "destructive",
          title: "명령어 등록 실패",
          description: "다시 시도해주세요.",
        });
      }
    },
  });

  const handleClose = () => {
    setCommandName("");
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commandName.trim()) {
      toast({
        variant: "destructive",
        title: "입력 오류",
        description: "명령어를 입력해주세요.",
      });
      return;
    }
    createCommandMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="w-full max-w-md">
        <DialogHeader>
          <DialogTitle>명령어 등록</DialogTitle>
        </DialogHeader>
        
        {(fileData || messageData) && (
          <div className="mb-4">
            <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <FileText className="text-blue-600 h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate">
                  {fileData?.fileName || "저장된 메시지"}
                </p>
                <p className="text-sm text-gray-500">
                  {fileData 
                    ? `${(fileData.fileSize / 1024).toFixed(1)} KB`
                    : messageData?.content?.slice(0, 50) + "..."
                  }
                </p>
              </div>
            </div>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="commandName" className="text-sm font-medium text-gray-700">
              명령어 입력
            </Label>
            <div className="relative mt-1">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-purple-600 font-medium">
                #
              </span>
              <Input
                id="commandName"
                type="text"
                placeholder="runpython"
                value={commandName}
                onChange={(e) => setCommandName(e.target.value)}
                className="pl-8"
                disabled={createCommandMutation.isPending}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              채팅에서 #명령어로 {fileData ? "파일" : "메시지"}을 다시 불러올 수 있습니다
            </p>
          </div>
          
          <div className="flex space-x-3">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={handleClose}
              disabled={createCommandMutation.isPending}
            >
              취소
            </Button>
            <Button
              type="submit"
              className="flex-1 purple-gradient hover:purple-gradient-hover"
              disabled={createCommandMutation.isPending}
            >
              {createCommandMutation.isPending ? "저장 중..." : "저장"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
