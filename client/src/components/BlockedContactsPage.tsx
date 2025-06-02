import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { OptimizedAvatar } from "@/components/OptimizedAvatar";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ArrowLeft, UserCheck, Trash2 } from "lucide-react";
import { cn, getInitials, getAvatarColor } from "@/lib/utils";

interface BlockedContactsPageProps {
  onBack: () => void;
}

export default function BlockedContactsPage({ onBack }: BlockedContactsPageProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showUnblockConfirm, setShowUnblockConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [contactToUnblock, setContactToUnblock] = useState<any>(null);
  const [contactToDelete, setContactToDelete] = useState<any>(null);

  // Fetch blocked contacts
  const { data: blockedContactsData, isLoading } = useQuery({
    queryKey: ["/api/contacts/blocked"],
    enabled: !!user,
    queryFn: async () => {
      const response = await fetch("/api/contacts/blocked", {
        headers: { "x-user-id": user!.id.toString() },
      });
      if (!response.ok) throw new Error("Failed to fetch blocked contacts");
      return response.json();
    },
  });

  // Unblock contact mutation
  const unblockContactMutation = useMutation({
    mutationFn: async (contactUserId: number) => {
      const response = await apiRequest(`/api/contacts/${contactUserId}/unblock`, "POST");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contacts/blocked"] });
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      toast({
        title: "차단 해제 완료",
        description: "연락처 차단이 해제되었습니다.",
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "차단 해제 실패",
        description: "차단 해제 중 오류가 발생했습니다.",
      });
    },
  });

  // Delete contact mutation
  const deleteContactMutation = useMutation({
    mutationFn: async (contactUserId: number) => {
      const response = await apiRequest(`/api/contacts/${contactUserId}`, "DELETE");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contacts/blocked"] });
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      toast({
        title: "연락처 삭제 완료",
        description: "연락처가 삭제되었습니다.",
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "삭제 실패",
        description: "연락처 삭제 중 오류가 발생했습니다.",
      });
    },
  });

  const blockedContacts = blockedContactsData?.contacts || [];

  const handleUnblockContact = (contact: any) => {
    setContactToUnblock(contact);
    setShowUnblockConfirm(true);
  };

  const handleDeleteContact = (contact: any) => {
    setContactToDelete(contact);
    setShowDeleteConfirm(true);
  };

  const confirmUnblockContact = () => {
    if (contactToUnblock) {
      unblockContactMutation.mutate(contactToUnblock.contactUserId);
      setShowUnblockConfirm(false);
      setContactToUnblock(null);
    }
  };

  const confirmDeleteContact = () => {
    if (contactToDelete) {
      deleteContactMutation.mutate(contactToDelete.contactUserId);
      setShowDeleteConfirm(false);
      setContactToDelete(null);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex items-center px-4 py-3 border-b border-gray-200 flex-shrink-0">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="mr-2 h-8 w-8 p-0"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-lg font-semibold text-gray-900">차단된 연락처</h1>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 120px)' }}>
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="text-gray-500">로딩 중...</div>
          </div>
        ) : blockedContacts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center px-4">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <UserCheck className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">차단된 연락처 없음</h3>
            <p className="text-gray-500 text-sm">
              현재 차단된 연락처가 없습니다.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {blockedContacts.map((contact: any) => {
              const displayName = contact.nickname || contact.contactUser.displayName;
              return (
                <div key={contact.id} className="px-4 py-3 hover:bg-gray-50">
                  <div className="flex items-center space-x-3">
                    <OptimizedAvatar 
                      src={contact.contactUser.profilePicture}
                      name={displayName}
                      className="w-10 h-10"
                      fallbackClassName="text-sm"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">
                        {displayName}
                      </p>
                      <p className="text-sm text-gray-500 truncate">
                        @{contact.contactUser.username}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleUnblockContact(contact)}
                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                      >
                        <UserCheck className="h-4 w-4 mr-1" />
                        차단 해제
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteContact(contact)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        삭제
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 차단 해제 확인 다이얼로그 */}
      <AlertDialog open={showUnblockConfirm} onOpenChange={setShowUnblockConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>차단 해제</AlertDialogTitle>
            <AlertDialogDescription>
              {contactToUnblock?.nickname || contactToUnblock?.contactUser?.displayName}님의 차단을 해제하시겠습니까?
              차단이 해제되면 다시 메시지를 주고받을 수 있습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmUnblockContact}
              className="bg-blue-600 hover:bg-blue-700"
            >
              차단 해제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 삭제 확인 다이얼로그 */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>연락처 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              {contactToDelete?.nickname || contactToDelete?.contactUser?.displayName}님을 연락처에서 삭제하시겠습니까?
              삭제된 연락처는 복구할 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteContact}
              className="bg-red-600 hover:bg-red-700"
            >
              삭제하기
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}