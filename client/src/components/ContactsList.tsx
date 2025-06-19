import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ZeroDelayAvatar from "@/components/ZeroDelayAvatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator 
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
import { Plus, Search, Star, MoreVertical, UserX, Trash2, Shield } from "lucide-react";
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
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("nickname");
  const [showBlockConfirm, setShowBlockConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [contactToBlock, setContactToBlock] = useState<any>(null);
  const [contactToDelete, setContactToDelete] = useState<any>(null);
  const [selectedContact, setSelectedContact] = useState<any>(null);
  const [showContactMenu, setShowContactMenu] = useState(false);

  // 연락처 메뉴 핸들러
  const handleContactClick = (contact: any) => {
    setSelectedContact(contact);
    setShowContactMenu(true);
  };

  // 즐겨찾기 토글 핸들러
  const handleToggleFavorite = (contact: any) => {
    toggleFavoriteMutation.mutate({
      contactId: contact.id,
      isPinned: !contact.isPinned
    });
    setShowContactMenu(false);
    toast({
      title: contact.isPinned ? "즐겨찾기 해제" : "즐겨찾기 추가",
      description: `${contact.contactUser.displayName || contact.contactUser.username}님을 ${contact.isPinned ? '즐겨찾기에서 제거했습니다' : '즐겨찾기에 추가했습니다'}`,
    });
  };

  // 차단 핸들러
  const handleBlock = (contact: any) => {
    setContactToBlock(contact);
    setShowContactMenu(false);
    setShowBlockConfirm(true);
  };

  // 삭제 핸들러
  const handleDelete = (contact: any) => {
    setContactToDelete(contact);
    setShowContactMenu(false);
    setShowDeleteConfirm(true);
  };

  // 프로필 보기 핸들러
  const handleViewProfile = (contact: any) => {
    setShowContactMenu(false);
    onSelectContact(contact.contactUserId);
  };

  // Toggle favorite mutation
  const toggleFavoriteMutation = useMutation({
    mutationFn: async ({ contactId, isPinned }: { contactId: number; isPinned: boolean }) => {
      const response = await apiRequest(`/api/contacts/${contactId}`, "PATCH", { isPinned });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
    },
    onError: () => {
      // 즐겨찾기 설정 실패 - 알림 제거
    },
  });

  // Block contact mutation
  const blockContactMutation = useMutation({
    mutationFn: async (contactUserId: number) => {
      const response = await apiRequest(`/api/contacts/${contactUserId}/block`, "POST");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
    },
    onError: () => {
      toast({
        title: "차단 실패",
        description: "연락처 차단에 실패했습니다. 다시 시도해주세요.",
        variant: "destructive",
      });
    },
  });

  // Delete contact mutation
  const deleteContactMutation = useMutation({
    mutationFn: async (contactId: number) => {
      const response = await apiRequest(`/api/contacts/${contactId}`, "DELETE");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
    },
    onError: () => {
      toast({
        title: "삭제 실패",
        description: "연락처 삭제에 실패했습니다. 다시 시도해주세요.",
        variant: "destructive",
      });
    },
  });

  // Delete contact handler
  const handleDeleteContact = (contact: any) => {
    setContactToDelete(contact);
    setShowDeleteConfirm(true);
  };

  // Confirm block contact
  const confirmBlockContact = () => {
    if (contactToBlock) {
      blockContactMutation.mutate(contactToBlock.contactUserId);
      setShowBlockConfirm(false);
      setContactToBlock(null);
    }
  };

  // Confirm delete contact
  const confirmDeleteContact = () => {
    if (contactToDelete) {
      deleteContactMutation.mutate(contactToDelete.id);
      setShowDeleteConfirm(false);
      setContactToDelete(null);
    }
  };

  // Fetch contacts
  const { data: contactsData, isLoading } = useQuery({
    queryKey: ["/api/contacts"],
    queryFn: async () => {
      const res = await apiRequest("/api/contacts");
      const data = await res.json();
      console.log('연락처 API 응답:', data);
      return data;
    },
  });

  const contacts = contactsData?.contacts || [];

  console.log('연락처 데이터:', contacts.length, '개');

  // Filter and sort contacts - with safety checks
  const filteredAndSortedContacts = contacts
    .filter((contact: any) => {
      // Safety check for contact structure
      if (!contact || !contact.contactUser) {
        console.warn('연락처 데이터 구조 문제:', contact);
        return false;
      }
      const displayName = contact.nickname || contact.contactUser.displayName || contact.contactUser.username || '';
      return displayName.toLowerCase().includes(searchTerm.toLowerCase());
    })
    .sort((a: any, b: any) => {
      const getDisplayName = (contact: any) => {
        if (!contact || !contact.contactUser) return '';
        return contact.nickname || contact.contactUser.displayName || contact.contactUser.username || '';
      };
      
      if (sortBy === "nickname") {
        return getDisplayName(a).localeCompare(getDisplayName(b));
      } else if (sortBy === "recent") {
        return new Date(b.lastMessageTime || 0).getTime() - new Date(a.lastMessageTime || 0).getTime();
      } else if (sortBy === "favorite") {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return getDisplayName(a).localeCompare(getDisplayName(b));
      }
      return 0;
    });

  // Get favorite contacts
  const favoriteContacts = filteredAndSortedContacts.filter((contact: any) => contact.isPinned);

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-gray-500">연락처를 불러오는 중...</div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Debug Info */}
      {process.env.NODE_ENV === 'development' && (
        <div className="p-2 bg-yellow-50 border-b text-xs">
          <div>연락처 데이터: {contacts.length}개</div>
          <div>필터링된 연락처: {filteredAndSortedContacts.length}개</div>
          <div>검색어: "{searchTerm}"</div>
          <div>정렬: {sortBy}</div>
        </div>
      )}
      
      {/* Header */}
      <div className="p-3 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-800">연락처</h2>
          <Button
            onClick={onAddContact}
            size="sm"
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            <Plus className="h-4 w-4 mr-1" />
            친구 추가
          </Button>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="연락처 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Sort */}
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="nickname">이름순</SelectItem>
            <SelectItem value="recent">최근 대화순</SelectItem>
            <SelectItem value="favorite">즐겨찾기</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Favorite contacts horizontal scroll */}
      {favoriteContacts.length > 0 && (
        <div className="px-3 py-2 border-b border-gray-100">
          <h3 className="text-sm font-medium text-gray-600 mb-2">즐겨찾기</h3>
          <div className="flex space-x-3 overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 pb-2">
            {favoriteContacts.map((contact: any) => {
              const displayName = contact.nickname || contact.contactUser.displayName;
              return (
                <div key={contact.id} className="flex flex-col items-center space-y-1 flex-shrink-0">
                  <div 
                    className="relative cursor-pointer hover:opacity-75 transition-opacity"
                    onClick={() => handleContactClick(contact)}
                  >
                    <ZeroDelayAvatar
                      src={contact.contactUser.profilePicture}
                      fallbackText={displayName}
                      size="md"
                      showOnlineStatus={false}
                      className="shadow-md"
                    />
                    {contact.contactUser.isOnline && (
                      <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white rounded-full z-20"></div>
                    )}
                  </div>
                  <span 
                    className="text-xs text-gray-700 text-center max-w-[60px] truncate cursor-pointer hover:text-blue-600"
                    onClick={() => onSelectContact(contact.contactUserId)}
                  >
                    {displayName}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto max-h-[calc(100vh-240px)] scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
        {filteredAndSortedContacts.length === 0 ? (
          <div className="p-3 text-center text-gray-500 text-sm">
            {searchTerm ? "검색 결과가 없습니다" : "연락처가 없습니다"}
          </div>
        ) : (
          filteredAndSortedContacts.map((contact: any) => {
            console.log('🔍 연락처 렌더링:', contact.contactUser?.displayName || contact.contactUser?.username);
            return (
            <div
              key={contact.id}
              className="px-3 py-2 hover:bg-purple-50 border-b border-gray-100 transition-colors group"
            >
              <div className="flex items-center space-x-2">
                <div 
                  className="cursor-pointer flex-1 flex items-center space-x-2"
                  onClick={() => onSelectContact(contact.contactUserId)}
                >
                  <div
                    className="cursor-pointer"
                    onClick={(e?: React.MouseEvent) => {
                      e?.stopPropagation();
                      setLocation(`/friend/${contact.contactUserId}`);
                    }}
                  >
                    <ZeroDelayAvatar
                      src={contact.contactUser.profilePicture}
                      fallbackText={contact.nickname || contact.contactUser.displayName || contact.contactUser.username}
                      size="sm"
                      showOnlineStatus={true}
                      className="flex-shrink-0"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <h3 className="font-medium text-gray-900 truncate">
                        {contact.nickname || contact.contactUser.displayName || contact.contactUser.username}
                      </h3>
                      {contact.isPinned && (
                        <Star className="h-3 w-3 text-yellow-400 fill-current flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-sm text-gray-500 truncate">
                      {contact.contactUser.email || `@${contact.contactUser.username}`}
                    </p>
                    {contact.lastMessageTime && (
                      <p className="text-xs text-gray-400">
                        마지막 대화: {new Date(contact.lastMessageTime).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>

                {/* Contact menu dropdown */}
                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavoriteMutation.mutate({
                            contactId: contact.id,
                            isPinned: !contact.isPinned
                          });
                        }}
                      >
                        <Star className={cn("h-4 w-4 mr-2", contact.isPinned ? "fill-yellow-400 text-yellow-400" : "")} />
                        {contact.isPinned ? "즐겨찾기 해제" : "즐겨찾기 추가"}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          setLocation(`/friend/${contact.contactUserId}`);
                        }}
                      >
                        <MoreVertical className="h-4 w-4 mr-2" />
                        프로필 보기
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          setContactToBlock(contact);
                          setShowBlockConfirm(true);
                        }}
                        className="text-orange-600"
                      >
                        <Shield className="h-4 w-4 mr-2" />
                        차단하기
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteContact(contact);
                        }}
                        className="text-red-600"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        삭제하기
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>
            );
          })
        )}
      </div>

      {/* 연락처 메뉴 다이얼로그 */}
      <AlertDialog open={showContactMenu} onOpenChange={setShowContactMenu}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {selectedContact?.contactUser?.displayName || selectedContact?.contactUser?.username}
            </AlertDialogTitle>
            <AlertDialogDescription>
              연락처 옵션을 선택하세요
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex flex-col space-y-2 py-4">
            <Button
              variant="outline"
              className="justify-start"
              onClick={() => selectedContact && handleToggleFavorite(selectedContact)}
            >
              <Star className={cn("h-4 w-4 mr-2", selectedContact?.isPinned ? "fill-yellow-400 text-yellow-400" : "")} />
              {selectedContact?.isPinned ? "즐겨찾기 해제" : "즐겨찾기 추가"}
            </Button>
            <Button
              variant="outline"
              className="justify-start"
              onClick={() => selectedContact && handleViewProfile(selectedContact)}
            >
              <MoreVertical className="h-4 w-4 mr-2" />
              프로필 보기
            </Button>
            <Button
              variant="outline"
              className="justify-start text-orange-600 hover:text-orange-700"
              onClick={() => selectedContact && handleBlock(selectedContact)}
            >
              <Shield className="h-4 w-4 mr-2" />
              차단
            </Button>
            <Button
              variant="outline"
              className="justify-start text-red-600 hover:text-red-700"
              onClick={() => selectedContact && handleDelete(selectedContact)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              삭제
            </Button>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 차단 확인 다이얼로그 */}
      <AlertDialog open={showBlockConfirm} onOpenChange={setShowBlockConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>연락처 차단</AlertDialogTitle>
            <AlertDialogDescription>
              {contactToBlock?.nickname || contactToBlock?.contactUser?.displayName}님을 차단하시겠습니까?
              차단된 연락처는 메시지를 보낼 수 없으며, 연락처 목록에서 숨겨집니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmBlockContact}
              className="bg-orange-600 hover:bg-orange-700"
            >
              차단하기
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