import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Plus, Search, Star, MoreVertical, UserX, Trash2, Shield, Mic } from "lucide-react";
import SimpleVoiceRecorder from "./SimpleVoiceRecorder";
import { useQuickVoiceHandler } from "./QuickVoiceHandler";
import { cn, getInitials, getAvatarColor } from "@/lib/utils";

interface ContactsListProps {
  onAddContact: () => void;
  onSelectContact: (contactId: number) => void;
}

export default function ContactsList({ onAddContact, onSelectContact }: ContactsListProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const { handleQuickVoiceComplete } = useQuickVoiceHandler();
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("nickname");
  const [showBlockConfirm, setShowBlockConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedContact, setSelectedContact] = useState<any>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingContact, setRecordingContact] = useState<any>(null);

  const { data: contactsData, isLoading: contactsLoading } = useQuery({
    queryKey: ["/api/contacts"],
  });

  const contacts = contactsData?.contacts || [];

  // 즐겨찾기 토글
  const toggleFavoriteMutation = useMutation({
    mutationFn: async ({ contactId, isPinned }: { contactId: number; isPinned: boolean }) => {
      const response = await apiRequest(`/api/contacts/${contactId}`, "PATCH", { isPinned });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
    },
  });

  // 연락처 차단
  const blockContactMutation = useMutation({
    mutationFn: async (contactUserId: number) => {
      const response = await apiRequest(`/api/contacts/${contactUserId}/block`, "POST");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
    },
  });

  // 연락처 삭제
  const deleteContactMutation = useMutation({
    mutationFn: async (contactUserId: number) => {
      const response = await apiRequest(`/api/contacts/${contactUserId}`, "DELETE");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
    },
  });

  // 간편음성메세지 완료 처리
  const handleQuickVoiceCompleteLocal = async (audioBlob: Blob, duration: number) => {
    const success = await handleQuickVoiceComplete(audioBlob, duration, recordingContact);
    setIsRecording(false);
    setRecordingContact(null);
  };

  // 연락처 길게 누르기 (간편음성메세지)
  const handleContactLongPress = (contact: any) => {
    setRecordingContact(contact);
    setIsRecording(true);
  };

  // 연락처 클릭 (채팅방 이동)
  const handleContactClick = (contact: any) => {
    if (!isRecording) {
      onSelectContact(contact.contactUserId);
    }
  };

  // 검색 필터링
  const filteredContacts = contacts.filter((contact: any) => {
    const searchLower = searchTerm.toLowerCase();
    const displayName = contact.contactUser?.displayName || contact.contactUser?.username || "";
    const nickname = contact.nickname || "";
    return displayName.toLowerCase().includes(searchLower) || nickname.toLowerCase().includes(searchLower);
  });

  // 정렬
  const sortedContacts = [...filteredContacts].sort((a: any, b: any) => {
    if (sortBy === "nickname") {
      const aName = a.nickname || a.contactUser?.displayName || a.contactUser?.username || "";
      const bName = b.nickname || b.contactUser?.displayName || b.contactUser?.username || "";
      return aName.localeCompare(bName);
    }
    return 0;
  });

  // 즐겨찾기와 일반 연락처 분리
  const pinnedContacts = sortedContacts.filter((contact: any) => contact.isPinned);
  const regularContacts = sortedContacts.filter((contact: any) => !contact.isPinned);

  if (contactsLoading) {
    return <div className="p-4">연락처를 불러오는 중...</div>;
  }

  return (
    <div className="flex flex-col h-full">
      {/* 헤더 */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">연락처</h2>
          <button
            onClick={onAddContact}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>

        {/* 검색 */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="연락처 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* 연락처 목록 */}
      <div className="flex-1 overflow-y-auto">
        {/* 즐겨찾기 연락처 */}
        {pinnedContacts.length > 0 && (
          <div className="p-4">
            <h3 className="text-sm font-medium text-gray-500 mb-3 flex items-center">
              <Star className="h-4 w-4 mr-1" />
              즐겨찾기
            </h3>
            <div className="space-y-2">
              {pinnedContacts.map((contact: any) => (
                <ContactItem
                  key={contact.id}
                  contact={contact}
                  onContactClick={handleContactClick}
                  onContactLongPress={handleContactLongPress}
                  onToggleFavorite={(contactId, isPinned) => toggleFavoriteMutation.mutate({ contactId, isPinned })}
                  onBlockContact={(contactUserId) => {
                    setSelectedContact(contact);
                    setShowBlockConfirm(true);
                  }}
                  onDeleteContact={(contactUserId) => {
                    setSelectedContact(contact);
                    setShowDeleteConfirm(true);
                  }}
                  isRecording={isRecording && recordingContact?.id === contact.id}
                />
              ))}
            </div>
          </div>
        )}

        {/* 일반 연락처 */}
        {regularContacts.length > 0 && (
          <div className="p-4">
            {pinnedContacts.length > 0 && <h3 className="text-sm font-medium text-gray-500 mb-3">모든 연락처</h3>}
            <div className="space-y-2">
              {regularContacts.map((contact: any) => (
                <ContactItem
                  key={contact.id}
                  contact={contact}
                  onContactClick={handleContactClick}
                  onContactLongPress={handleContactLongPress}
                  onToggleFavorite={(contactId, isPinned) => toggleFavoriteMutation.mutate({ contactId, isPinned })}
                  onBlockContact={(contactUserId) => {
                    setSelectedContact(contact);
                    setShowBlockConfirm(true);
                  }}
                  onDeleteContact={(contactUserId) => {
                    setSelectedContact(contact);
                    setShowDeleteConfirm(true);
                  }}
                  isRecording={isRecording && recordingContact?.id === contact.id}
                />
              ))}
            </div>
          </div>
        )}

        {filteredContacts.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            {searchTerm ? "검색 결과가 없습니다." : "연락처가 없습니다."}
          </div>
        )}
      </div>

      {/* 간편음성메세지 녹음 오버레이 */}
      {isRecording && recordingContact && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
            <div className="text-center">
              <div className="mb-4">
                <div className="w-16 h-16 rounded-full mx-auto mb-3 flex items-center justify-center"
                     style={{ backgroundColor: getAvatarColor(recordingContact.contactUserId) }}>
                  {recordingContact.contactUser?.profilePicture ? (
                    <img
                      src={recordingContact.contactUser.profilePicture}
                      alt=""
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <span className="text-white font-medium text-lg">
                      {getInitials(recordingContact.contactUser?.displayName || recordingContact.contactUser?.username || "")}
                    </span>
                  )}
                </div>
                <h3 className="font-medium">
                  {recordingContact.nickname || recordingContact.contactUser?.displayName || recordingContact.contactUser?.username}
                </h3>
                <p className="text-sm text-gray-500">간편음성메세지</p>
              </div>

              <SimpleVoiceRecorder
                onRecordingComplete={handleQuickVoiceCompleteLocal}
                onCancel={() => {
                  setIsRecording(false);
                  setRecordingContact(null);
                }}
                autoStart={true}
              />
            </div>
          </div>
        </div>
      )}

      {/* 차단 확인 다이얼로그 */}
      <AlertDialog open={showBlockConfirm} onOpenChange={setShowBlockConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>연락처 차단</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedContact?.contactUser?.displayName || selectedContact?.contactUser?.username}님을 차단하시겠습니까?
              차단된 연락처는 메시지를 보낼 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (selectedContact) {
                  blockContactMutation.mutate(selectedContact.contactUserId);
                }
                setShowBlockConfirm(false);
                setSelectedContact(null);
              }}
            >
              차단
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
              {selectedContact?.contactUser?.displayName || selectedContact?.contactUser?.username}님을 연락처에서 삭제하시겠습니까?
              삭제된 연락처는 복구할 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (selectedContact) {
                  deleteContactMutation.mutate(selectedContact.contactUserId);
                }
                setShowDeleteConfirm(false);
                setSelectedContact(null);
              }}
            >
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// 개별 연락처 아이템 컴포넌트
function ContactItem({
  contact,
  onContactClick,
  onContactLongPress,
  onToggleFavorite,
  onBlockContact,
  onDeleteContact,
  isRecording
}: {
  contact: any;
  onContactClick: (contact: any) => void;
  onContactLongPress: (contact: any) => void;
  onToggleFavorite: (contactId: number, isPinned: boolean) => void;
  onBlockContact: (contactUserId: number) => void;
  onDeleteContact: (contactUserId: number) => void;
  isRecording: boolean;
}) {
  const displayName = contact.nickname || contact.contactUser?.displayName || contact.contactUser?.username || "Unknown";

  return (
    <div
      className={cn(
        "flex items-center p-3 rounded-lg cursor-pointer transition-colors",
        isRecording ? "bg-blue-50 border-2 border-blue-300" : "hover:bg-gray-50"
      )}
      onClick={() => onContactClick(contact)}
      onMouseDown={(e) => {
        const timer = setTimeout(() => {
          onContactLongPress(contact);
        }, 500);
        
        const cleanup = () => {
          clearTimeout(timer);
          document.removeEventListener('mouseup', cleanup);
          document.removeEventListener('mouseleave', cleanup);
        };
        
        document.addEventListener('mouseup', cleanup);
        document.addEventListener('mouseleave', cleanup);
      }}
    >
      {/* 프로필 이미지 */}
      <div className="relative">
        <div className="w-12 h-12 rounded-full flex items-center justify-center mr-3"
             style={{ backgroundColor: getAvatarColor(contact.contactUserId) }}>
          {contact.contactUser?.profilePicture ? (
            <img
              src={contact.contactUser.profilePicture}
              alt=""
              className="w-full h-full rounded-full object-cover"
            />
          ) : (
            <span className="text-white font-medium">
              {getInitials(displayName)}
            </span>
          )}
        </div>
        
        {isRecording && (
          <div className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center animate-pulse">
            <Mic className="h-3 w-3 text-white" />
          </div>
        )}
      </div>

      {/* 연락처 정보 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center">
          <p className="font-medium truncate">{displayName}</p>
          {contact.isPinned && <Star className="h-4 w-4 text-yellow-500 ml-1 flex-shrink-0" />}
        </div>
        {contact.nickname && contact.contactUser?.displayName && (
          <p className="text-sm text-gray-500 truncate">{contact.contactUser.displayName}</p>
        )}
      </div>

      {/* 더보기 메뉴 */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="p-1 rounded hover:bg-gray-200 transition-colors" onClick={(e) => e.stopPropagation()}>
            <MoreVertical className="h-4 w-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(contact.id, !contact.isPinned);
          }}>
            <Star className="h-4 w-4 mr-2" />
            {contact.isPinned ? "즐겨찾기 해제" : "즐겨찾기 추가"}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={(e) => {
            e.stopPropagation();
            onBlockContact(contact.contactUserId);
          }}>
            <Shield className="h-4 w-4 mr-2" />
            차단
          </DropdownMenuItem>
          <DropdownMenuItem onClick={(e) => {
            e.stopPropagation();
            onDeleteContact(contact.contactUserId);
          }}>
            <Trash2 className="h-4 w-4 mr-2" />
            삭제
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}