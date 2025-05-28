import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/hooks/useAuth";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Settings, Users, UserPlus, LogOut, AlertTriangle } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

interface ChatRoomSettingsModalProps {
  open: boolean;
  onClose: () => void;
  chatRoom: any;
  onLeaveRoom: () => void;
}

export default function ChatRoomSettingsModal({ open, onClose, chatRoom, onLeaveRoom }: ChatRoomSettingsModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newRoomName, setNewRoomName] = useState(chatRoom?.name || "");
  const [showParticipants, setShowParticipants] = useState(false);
  const [saveFiles, setSaveFiles] = useState(true);

  const getInitials = (name: string) => {
    return name.split(' ').map(word => word.charAt(0).toUpperCase()).join('').slice(0, 2);
  };

  // 채팅방 이름 변경
  const updateRoomNameMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest(`/api/chat-rooms/${chatRoom.id}`, "PATCH", {
        name: newRoomName.trim(),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat-rooms"] });
      toast({
        title: "채팅방 이름 변경 완료",
        description: `채팅방 이름이 "${newRoomName}"으로 변경되었습니다.`,
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "이름 변경 실패",
        description: "다시 시도해주세요.",
      });
    },
  });

  // 채팅방 나가기
  const leaveRoomMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest(`/api/chat-rooms/${chatRoom.id}/leave`, "POST", {
        saveFiles,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat-rooms"] });
      toast({
        title: "채팅방에서 나왔습니다",
        description: saveFiles ? "파일들이 저장소로 이동되었습니다." : "파일들이 삭제되었습니다.",
      });
      onLeaveRoom();
      onClose();
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "채팅방 나가기 실패",
        description: "다시 시도해주세요.",
      });
    },
  });

  const handleUpdateName = () => {
    if (newRoomName.trim() && newRoomName.trim() !== chatRoom.name) {
      updateRoomNameMutation.mutate();
    }
  };

  const handleLeaveRoom = () => {
    leaveRoomMutation.mutate();
  };

  if (!chatRoom) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-purple-600" />
            채팅방 설정
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* 채팅방 정보 */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">채팅방 정보</h4>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowParticipants(!showParticipants)}
                className="flex items-center gap-2"
              >
                <Users className="h-4 w-4" />
                참석자 ({chatRoom.participants?.length || 0})
              </Button>
            </div>

            {/* 그룹 채팅인 경우 이름 변경 가능 */}
            {chatRoom.isGroup && (
              <div className="space-y-2">
                <Label htmlFor="roomName">채팅방 이름</Label>
                <div className="flex gap-2">
                  <Input
                    id="roomName"
                    value={newRoomName}
                    onChange={(e) => setNewRoomName(e.target.value)}
                    placeholder="채팅방 이름을 입력하세요"
                  />
                  <Button
                    onClick={handleUpdateName}
                    disabled={!newRoomName.trim() || newRoomName.trim() === chatRoom.name}
                    size="sm"
                  >
                    변경
                  </Button>
                </div>
              </div>
            )}

            {/* 참석자 목록 */}
            {showParticipants && (
              <div className="space-y-2">
                <Label>참석자 목록</Label>
                <ScrollArea className="h-32 border rounded-md p-2">
                  <div className="space-y-2">
                    {chatRoom.participants?.map((participant: any) => (
                      <div
                        key={participant.id}
                        className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer"
                      >
                        <Avatar className="w-8 h-8">
                          <AvatarImage 
                            src={participant.profilePicture || undefined} 
                            alt={participant.displayName} 
                          />
                          <AvatarFallback className="purple-gradient text-white text-sm">
                            {getInitials(participant.displayName)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {participant.displayName}
                            {participant.id === user?.id && " (본인)"}
                          </p>
                          <p className="text-xs text-gray-500 truncate">
                            @{participant.username}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}
          </div>

          {/* 채팅방 나가기 */}
          <div className="space-y-4 pt-4 border-t">
            <h4 className="font-medium text-red-600">위험 구역</h4>
            
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="w-full">
                  <LogOut className="h-4 w-4 mr-2" />
                  채팅방 나가기
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                    채팅방에서 나가시겠습니까?
                  </AlertDialogTitle>
                  <AlertDialogDescription className="space-y-3">
                    <p>채팅방에서 나가면 다른 참석자들에게 알림이 표시됩니다.</p>
                    <div className="space-y-2">
                      <p className="font-medium">태그된 파일들을 어떻게 처리할까요?</p>
                      <div className="space-y-2">
                        <label className="flex items-center space-x-2">
                          <input
                            type="radio"
                            name="fileAction"
                            checked={saveFiles}
                            onChange={() => setSaveFiles(true)}
                            className="text-purple-600"
                          />
                          <span className="text-sm">저장소로 이동 (나중에 다시 볼 수 있음)</span>
                        </label>
                        <label className="flex items-center space-x-2">
                          <input
                            type="radio"
                            name="fileAction"
                            checked={!saveFiles}
                            onChange={() => setSaveFiles(false)}
                            className="text-purple-600"
                          />
                          <span className="text-sm">완전 삭제 (복구 불가능)</span>
                        </label>
                      </div>
                    </div>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>취소</AlertDialogCancel>
                  <AlertDialogAction onClick={handleLeaveRoom} className="bg-red-600 hover:bg-red-700">
                    나가기
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}