import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { UserPlus, Users, CheckSquare } from "lucide-react";
import { getInitials } from "@/lib/utils";

interface AddFriendConfirmModalProps {
  open: boolean;
  onClose: () => void;
  users: Array<{
    id: number;
    username: string;
    displayName: string;
    profilePicture?: string;
  }>;
}

export default function AddFriendConfirmModal({ open, onClose, users }: AddFriendConfirmModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const [selectAll, setSelectAll] = useState(false);

  // 전체 선택/해제 기능
  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedUsers([]);
      setSelectAll(false);
    } else {
      setSelectedUsers(users.map(user => user.id));
      setSelectAll(true);
    }
  };

  // 개별 사용자 선택/해제
  const handleUserSelect = (userId: number) => {
    setSelectedUsers(prev => {
      const newSelection = prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId];
      
      // 전체 선택 상태 업데이트
      setSelectAll(newSelection.length === users.length);
      return newSelection;
    });
  };

  // 선택된 사용자들을 친구로 추가
  const addContactsMutation = useMutation({
    mutationFn: async () => {
      const promises = selectedUsers.map(userId => {
        const user = users.find(u => u.id === userId);
        if (!user) return Promise.resolve();
        
        return apiRequest("POST", "/api/contacts", {
          contactUserId: userId,
          nickname: user.displayName,
        });
      });
      
      return Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      toast({
        title: "친구 추가 완료",
        description: `${selectedUsers.length}명이 친구 목록에 추가되었습니다.`,
      });
      onClose();
    },
    onError: (error: any) => {
      console.error("친구 추가 실패:", error);
      toast({
        variant: "destructive",
        title: "친구 추가 실패",
        description: "일부 사용자를 추가하는데 실패했습니다. 다시 시도해주세요.",
      });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5 text-purple-600" />
            <span>친구 추가</span>
          </DialogTitle>
          <DialogDescription>
            채팅방 참가자 중 친구로 추가할 사용자를 선택하세요.
          </DialogDescription>
        </DialogHeader>
        
        {/* 전체 선택 체크박스 */}
        <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg border">
          <Checkbox
            id="select-all"
            checked={selectAll}
            onCheckedChange={handleSelectAll}
          />
          <CheckSquare className="h-4 w-4 text-purple-600" />
          <label htmlFor="select-all" className="text-sm font-medium cursor-pointer">
            전체 선택 ({selectedUsers.length}/{users.length})
          </label>
        </div>

        {/* 사용자 목록 */}
        <ScrollArea className="max-h-80">
          <div className="space-y-2">
            {users.map((user) => (
              <div
                key={user.id}
                className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Checkbox
                  id={`user-${user.id}`}
                  checked={selectedUsers.includes(user.id)}
                  onCheckedChange={() => handleUserSelect(user.id)}
                />
                <Avatar className="w-10 h-10">
                  <AvatarImage src={user.profilePicture} alt={user.displayName} />
                  <AvatarFallback className="purple-gradient text-white font-semibold text-xs">
                    {getInitials(user.displayName)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{user.displayName}</p>
                  <p className="text-sm text-gray-500 truncate">@{user.username}</p>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        <div className="flex space-x-3 pt-4 border-t">
          <Button
            variant="outline"
            className="flex-1"
            onClick={onClose}
            disabled={addContactsMutation.isPending}
          >
            취소
          </Button>
          <Button
            className="flex-1 purple-gradient hover:purple-gradient-hover"
            onClick={() => addContactsMutation.mutate()}
            disabled={addContactsMutation.isPending || selectedUsers.length === 0}
          >
            {addContactsMutation.isPending 
              ? "추가 중..." 
              : `친구 추가 (${selectedUsers.length}명)`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}