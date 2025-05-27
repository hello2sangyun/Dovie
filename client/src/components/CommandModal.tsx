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

// 파일명을 적절한 길이로 단축하는 함수
function truncateFileName(fileName: string, maxLength: number): string {
  if (fileName.length <= maxLength) return fileName;
  
  const extension = fileName.split('.').pop() || '';
  const nameWithoutExt = fileName.substring(0, fileName.lastIndexOf('.')) || fileName;
  
  if (extension) {
    const maxNameLength = maxLength - extension.length - 4; // "..." + "." 를 위한 여유공간
    if (maxNameLength > 0) {
      return `${nameWithoutExt.substring(0, maxNameLength)}...${extension}`;
    }
  }
  
  return `${fileName.substring(0, maxLength - 3)}...`;
}

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
      
      // 영문자를 소문자로 변환
      const processedCommandName = commandName.toLowerCase();
      
      let finalFileData = fileData;

      // 메시지 데이터가 있는 경우 사용자가 입력한 태그명으로 텍스트 파일 생성
      if (messageData) {
        const textFileResponse = await fetch("/api/create-text-file", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-user-id": (window as any).currentUserId?.toString() || "1",
          },
          body: JSON.stringify({
            content: messageData.content,
            fileName: processedCommandName
          }),
        });

        if (!textFileResponse.ok) throw new Error("Failed to create text file");
        
        finalFileData = await textFileResponse.json();
      }

      const commandData: any = {
        chatRoomId,
        commandName: processedCommandName,
      };

      if (finalFileData) {
        commandData.fileUrl = finalFileData.fileUrl;
        commandData.fileName = finalFileData.fileName;
        commandData.fileSize = finalFileData.fileSize;
      }

      if (messageData) {
        commandData.savedText = messageData.content;
        commandData.originalSenderId = messageData.senderId;
        commandData.originalTimestamp = messageData.timestamp;
      }

      const response = await apiRequest("POST", "/api/commands", commandData);
      return { ...response.json(), processedCommandName };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/commands"] });
      toast({
        title: "명령어 등록 완료",
        description: `#${commandName.toLowerCase()} 명령어가 등록되었습니다.`,
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

  // 태그 유효성 검사 함수
  const validateTagName = (tagName: string): { isValid: boolean; error?: string } => {
    if (!tagName.trim()) {
      return { isValid: false, error: "명령어를 입력해주세요." };
    }

    // 띄어쓰기 체크
    if (tagName.includes(' ')) {
      return { isValid: false, error: "태그에는 띄어쓰기를 사용할 수 없습니다." };
    }

    // 허용된 문자만 사용하는지 체크 (한글, 영문, 숫자, _, .)
    const validPattern = /^[가-힣a-zA-Z0-9_.]+$/;
    if (!validPattern.test(tagName)) {
      return { isValid: false, error: "한글, 영문, 숫자, 언더바(_), 점(.)만 사용 가능합니다." };
    }

    return { isValid: true };
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const validation = validateTagName(commandName);
    if (!validation.isValid) {
      toast({
        variant: "destructive",
        title: "입력 오류",
        description: validation.error,
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
                <p className="font-medium text-gray-900">
                  {fileData?.fileName 
                    ? truncateFileName(fileData.fileName, 25)
                    : "저장된 메시지"
                  }
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
            <p className="text-xs text-amber-600 mt-1">
              💡 한글, 영문, 숫자, 언더바(_), 점(.)만 사용 가능 (띄어쓰기 X, 영문은 자동으로 소문자 변환)
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
