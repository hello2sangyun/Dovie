import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
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
  const queryClient = useQueryClient();
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [hashtagInput, setHashtagInput] = useState("");

  // 해시태그 추가 함수
  const addHashtag = (tag: string) => {
    const cleanTag = tag.trim().replace(/^#/, '').toLowerCase();
    
    // 유효성 검사
    const validation = validateHashtag(cleanTag);
    if (!validation.isValid) {
      return;
    }
    
    // 중복 체크 및 추가
    if (cleanTag && !hashtags.includes(cleanTag)) {
      setHashtags([...hashtags, cleanTag]);
    }
  };

  // 해시태그 입력 처리
  const handleHashtagKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ' || e.key === ',') {
      e.preventDefault();
      if (hashtagInput.trim()) {
        addHashtag(hashtagInput);
        setHashtagInput('');
      }
    }
  };

  // 해시태그 제거 함수
  const removeHashtag = (tagToRemove: string) => {
    setHashtags(hashtags.filter(tag => tag !== tagToRemove));
  };

  const createCommandMutation = useMutation({
    mutationFn: async () => {
      if (!chatRoomId) throw new Error("Chat room ID required");
      if (hashtags.length === 0) throw new Error("최소 하나의 해시태그가 필요합니다");
      
      let finalFileData = fileData;

      // 메시지 데이터가 있는 경우 첫 번째 해시태그를 파일명으로 텍스트 파일 생성
      if (messageData) {
        const textFileResponse = await fetch("/api/create-text-file", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-user-id": (window as any).currentUserId?.toString() || "1",
          },
          body: JSON.stringify({
            content: messageData.content,
            fileName: hashtags[0]
          }),
        });

        if (!textFileResponse.ok) throw new Error("Failed to create text file");
        
        finalFileData = await textFileResponse.json();
      }

      // 각 해시태그별로 개별 명령어 생성
      const promises = hashtags.map(hashtag => {
        const commandData: any = {
          chatRoomId,
          commandName: hashtag,
        };

        if (finalFileData) {
          commandData.fileUrl = finalFileData.fileUrl;
          commandData.fileName = finalFileData.fileName;
          commandData.fileSize = finalFileData.fileSize;
        }

        if (messageData) {
          commandData.savedText = messageData.content;
          commandData.originalSenderId = messageData.senderId;
          commandData.originalTimestamp = new Date(messageData.timestamp);
        }

        return apiRequest("/api/commands", "POST", commandData).then(res => res.json());
      });

      return Promise.all(promises);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/commands"] });
      handleClose();
    },
    onError: (error: any) => {
    },
  });

  const handleClose = () => {
    setHashtags([]);
    setHashtagInput("");
    onClose();
  };

  // 해시태그 유효성 검사 함수
  const validateHashtag = (tag: string): { isValid: boolean; error?: string } => {
    if (!tag.trim()) {
      return { isValid: false, error: "해시태그를 입력해주세요." };
    }

    // 띄어쓰기 체크
    if (tag.includes(' ')) {
      return { isValid: false, error: "해시태그에는 띄어쓰기를 사용할 수 없습니다." };
    }

    // 허용된 문자만 사용하는지 체크 (한글, 영문, 숫자, _, .)
    const validPattern = /^[가-힣a-zA-Z0-9_.]+$/;
    if (!validPattern.test(tag)) {
      return { isValid: false, error: "한글, 영문, 숫자, 언더바(_), 점(.)만 사용 가능합니다." };
    }

    return { isValid: true };
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // 입력 중인 해시태그가 있으면 추가
    if (hashtagInput.trim()) {
      addHashtag(hashtagInput);
      setHashtagInput('');
    }
    
    if (hashtags.length === 0 && !hashtagInput.trim()) {
      return;
    }
    
    createCommandMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="w-full max-w-md">
        <DialogHeader>
          <DialogTitle>해시태그 저장</DialogTitle>
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
            <Label htmlFor="hashtags" className="text-sm font-medium text-gray-700">
              해시태그 입력
            </Label>
            
            {/* 해시태그 목록 표시 */}
            {hashtags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2 p-2 bg-gray-50 rounded-lg">
                {hashtags.map((tag, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800"
                  >
                    #{tag}
                    <button
                      type="button"
                      onClick={() => removeHashtag(tag)}
                      className="ml-1 text-purple-600 hover:text-purple-800"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
            
            <div className="relative mt-1">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-purple-600 font-medium">
                #
              </span>
              <Input
                id="hashtags"
                type="text"
                placeholder="여러 해시태그를 입력하세요 (엔터, 스페이스, 쉼표로 구분)"
                value={hashtagInput}
                onChange={(e) => setHashtagInput(e.target.value)}
                onKeyDown={handleHashtagKeyPress}
                className="pl-8"
                disabled={createCommandMutation.isPending}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              채팅에서 #해시태그로 {fileData ? "파일" : "메시지"}을 다시 불러올 수 있습니다
            </p>
            <p className="text-xs text-amber-600 mt-1">
              💡 엔터, 스페이스, 쉼표로 여러 해시태그를 추가할 수 있습니다. 한글, 영문, 숫자, 언더바(_), 점(.)만 사용 가능
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
