import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Users } from "lucide-react";

interface CreateGroupChatModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (chatRoomId: number) => void;
}

export default function CreateGroupChatModal({ open, onClose, onSuccess }: CreateGroupChatModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [groupName, setGroupName] = useState("");
  const [selectedContacts, setSelectedContacts] = useState<number[]>([]);

  // 연락처 목록 가져오기
  const { data: contactsData } = useQuery({
    queryKey: ["/api/contacts"],
    enabled: !!user && open,
    queryFn: async () => {
      const response = await fetch("/api/contacts", {
        headers: { "x-user-id": user!.id.toString() },
      });
      if (!response.ok) throw new Error("Failed to fetch contacts");
      return response.json();
    },
  });

  // 그룹 채팅방 생성
  const createGroupChatMutation = useMutation({
    mutationFn: async () => {
      if (selectedContacts.length < 2) {
        throw new Error("그룹 채팅은 최소 2명 이상의 친구가 필요합니다.");
      }
      if (!groupName.trim()) {
        throw new Error("그룹 이름을 입력해주세요.");
      }

      const response = await apiRequest("/api/chat-rooms", "POST", {
        name: groupName.trim(),
        participantIds: selectedContacts,
        isGroup: true,
      });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat-rooms"] });
      toast({
        title: "그룹 채팅 생성 완료",
        description: `${groupName} 그룹이 생성되었습니다.`,
      });
      onSuccess(data.chatRoom.id);
      handleClose();
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "그룹 채팅 생성 실패",
        description: error.message || "다시 시도해주세요.",
      });
    },
  });

  const contacts = contactsData?.contacts || [];

  const getInitials = (name: string) => {
    return name.split(' ').map(word => word.charAt(0).toUpperCase()).join('').slice(0, 2);
  };

  const handleContactToggle = (contactUserId: number) => {
    setSelectedContacts(prev => 
      prev.includes(contactUserId)
        ? prev.filter(id => id !== contactUserId)
        : [...prev, contactUserId]
    );
  };

  const handleClose = () => {
    setGroupName("");
    setSelectedContacts([]);
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createGroupChatMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-purple-600" />
            그룹 채팅 만들기
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="groupName">그룹 이름</Label>
            <Input
              id="groupName"
              type="text"
              placeholder="그룹 이름을 입력하세요"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>친구 선택 ({selectedContacts.length}명 선택됨)</Label>
            <ScrollArea className="h-64 border rounded-md p-2">
              {contacts.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  등록된 친구가 없습니다
                </div>
              ) : (
                <div className="space-y-2">
                  {contacts.map((contact: any) => (
                    <div
                      key={contact.id}
                      className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer"
                      onClick={() => handleContactToggle(contact.contactUserId)}
                    >
                      <Checkbox
                        checked={selectedContacts.includes(contact.contactUserId)}
                        onCheckedChange={() => handleContactToggle(contact.contactUserId)}
                      />
                      <Avatar className="w-10 h-10">
                        <AvatarImage 
                          src={contact.contactUser.profilePicture || undefined} 
                          alt={contact.nickname || contact.contactUser.displayName} 
                        />
                        <AvatarFallback className="purple-gradient text-white font-semibold">
                          {getInitials(contact.nickname || contact.contactUser.displayName)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">
                          {contact.nickname || contact.contactUser.displayName}
                        </p>
                        <p className="text-sm text-gray-500 truncate">
                          @{contact.contactUser.username}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              취소
            </Button>
            <Button 
              type="submit" 
              disabled={createGroupChatMutation.isPending || selectedContacts.length < 2 || !groupName.trim()}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {createGroupChatMutation.isPending ? "생성 중..." : "그룹 생성"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}