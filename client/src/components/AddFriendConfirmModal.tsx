import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserPlus } from "lucide-react";
import { getInitials } from "@/lib/utils";

interface AddFriendConfirmModalProps {
  open: boolean;
  onClose: () => void;
  user: {
    id: number;
    username: string;
    displayName: string;
    profilePicture?: string;
  };
}

export default function AddFriendConfirmModal({ open, onClose, user }: AddFriendConfirmModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const addContactMutation = useMutation({
    mutationFn: async () => {
      console.log("Adding contact with data:", { contactUserId: user.id, nickname: user.displayName });
      const response = await apiRequest("POST", "/api/contacts", {
        contactUserId: user.id,
        nickname: user.displayName,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      toast({
        title: "친구 추가 완료",
        description: `${user.displayName}님이 친구 목록에 추가되었습니다.`,
      });
      onClose();
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "친구 추가 실패",
        description: "다시 시도해주세요.",
      });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <UserPlus className="h-5 w-5 text-purple-600" />
            <span>친구 추가</span>
          </DialogTitle>
          <DialogDescription>
            이 사용자를 친구 목록에 추가하시겠습니까?
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
          <Avatar className="w-12 h-12">
            <AvatarImage src={user.profilePicture} alt={user.displayName} />
            <AvatarFallback className="purple-gradient text-white font-semibold">
              {getInitials(user.displayName)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-gray-900">{user.displayName}</p>
            <p className="text-sm text-gray-500">@{user.username}</p>
          </div>
        </div>

        <div className="flex space-x-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={onClose}
            disabled={addContactMutation.isPending}
          >
            취소
          </Button>
          <Button
            className="flex-1 purple-gradient hover:purple-gradient-hover"
            onClick={() => addContactMutation.mutate()}
            disabled={addContactMutation.isPending}
          >
            {addContactMutation.isPending ? "추가 중..." : "친구 추가"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}