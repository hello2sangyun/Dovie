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
import { Plus, Search, Star, MoreVertical, UserX, Trash2, Shield, Users, User } from "lucide-react";
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
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Modern Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="p-6 pb-4">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">연락처</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {contacts.length}명의 친구
              </p>
            </div>
            <Button
              onClick={onAddContact}
              className="bg-purple-600 hover:bg-purple-700 text-white shadow-lg rounded-full h-12 w-12 p-0 hover:scale-105 transition-all duration-200"
            >
              <Plus className="h-5 w-5" />
            </Button>
          </div>

          {/* Modern Search Bar */}
          <div className="relative mb-4">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <Input
              placeholder="친구 이름 또는 이메일 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-12 h-12 bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
            />
          </div>

          {/* Filter Tabs */}
          <div className="flex space-x-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            <button
              onClick={() => setSortBy("nickname")}
              className={cn(
                "flex-1 py-2.5 px-4 rounded-md text-sm font-medium transition-all duration-200",
                sortBy === "nickname" 
                  ? "bg-white dark:bg-gray-600 text-purple-600 dark:text-purple-400 shadow-sm" 
                  : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-600"
              )}
            >
              이름순
            </button>
            <button
              onClick={() => setSortBy("recent")}
              className={cn(
                "flex-1 py-2.5 px-4 rounded-md text-sm font-medium transition-all duration-200",
                sortBy === "recent" 
                  ? "bg-white dark:bg-gray-600 text-purple-600 dark:text-purple-400 shadow-sm" 
                  : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-600"
              )}
            >
              최근 대화
            </button>
            <button
              onClick={() => setSortBy("favorite")}
              className={cn(
                "flex-1 py-2.5 px-4 rounded-md text-sm font-medium transition-all duration-200",
                sortBy === "favorite" 
                  ? "bg-white dark:bg-gray-600 text-purple-600 dark:text-purple-400 shadow-sm" 
                  : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-600"
              )}
            >
              즐겨찾기
            </button>
          </div>
        </div>
      </div>

      {/* Favorite contacts horizontal scroll */}
      {favoriteContacts.length > 0 && (
        <div className="bg-white dark:bg-gray-800 px-6 py-5 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">즐겨찾기</h3>
            <span className="text-sm text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full">
              {favoriteContacts.length}명
            </span>
          </div>
          <div className="flex space-x-5 overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 pb-2">
            {favoriteContacts.map((contact: any) => {
              const displayName = contact.nickname || contact.contactUser.displayName || contact.contactUser.username;
              return (
                <div key={contact.id} className="flex flex-col items-center space-y-3 flex-shrink-0 group">
                  <div 
                    className="relative cursor-pointer transform hover:scale-105 transition-all duration-200"
                    onClick={() => onSelectContact(contact.contactUserId)}
                  >
                    <div className="relative">
                      <ZeroDelayAvatar
                        src={contact.contactUser.profilePicture}
                        fallbackText={displayName}
                        size="lg"
                        showOnlineStatus={false}
                        className="shadow-lg border-2 border-yellow-400"
                      />
                      {contact.contactUser.isOnline && (
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full z-20"></div>
                      )}
                      <div className="absolute -top-1 -right-1 bg-yellow-400 rounded-full p-1.5 shadow-sm">
                        <Star className="h-2.5 w-2.5 text-white fill-current" />
                      </div>
                    </div>
                  </div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300 text-center max-w-[70px] truncate">
                    {displayName}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {filteredAndSortedContacts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
              <Users className="h-8 w-8 text-gray-400 dark:text-gray-500" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">
              {searchTerm ? "검색 결과가 없습니다" : "연락처가 없습니다"}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              {searchTerm ? "다른 검색어를 사용해보세요" : "새로운 친구를 추가해보세요"}
            </p>
            {!searchTerm && (
              <Button
                onClick={onAddContact}
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                친구 추가
              </Button>
            )}
          </div>
        ) : (
          filteredAndSortedContacts.map((contact: any) => {
            const displayName = contact.nickname || contact.contactUser.displayName || contact.contactUser.username;
            return (
            <div
              key={contact.id}
              className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm hover:shadow-md border border-gray-100 dark:border-gray-700 transition-all duration-200 group hover:scale-[1.02]"
            >
              <div className="flex items-center space-x-4">
                <div 
                  className="cursor-pointer"
                  onClick={(e?: React.MouseEvent) => {
                    e?.stopPropagation();
                    setLocation(`/friend/${contact.contactUserId}`);
                  }}
                >
                  <ZeroDelayAvatar
                    src={contact.contactUser.profilePicture}
                    fallbackText={displayName}
                    size="md"
                    showOnlineStatus={true}
                    className="shadow-md hover:shadow-lg transition-shadow duration-200"
                  />
                </div>
                
                <div 
                  className="flex-1 min-w-0 cursor-pointer"
                  onClick={() => onSelectContact(contact.contactUserId)}
                >
                  <div className="flex items-center space-x-2 mb-1">
                    <h3 className="font-semibold text-gray-900 dark:text-white truncate text-lg">
                      {displayName}
                    </h3>
                    {contact.isPinned && (
                      <div className="bg-yellow-100 dark:bg-yellow-900 p-1 rounded-full">
                        <Star className="h-3 w-3 text-yellow-500 fill-current" />
                      </div>
                    )}
                  </div>
                  
                  <p className="text-sm text-gray-600 dark:text-gray-300 truncate mb-1">
                    {contact.contactUser.email || `@${contact.contactUser.username}`}
                  </p>
                  
                  {contact.lastMessageTime && (
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      마지막 대화: {new Date(contact.lastMessageTime).toLocaleDateString('ko-KR')}
                    </p>
                  )}
                </div>

                {/* Modern Contact Actions */}
                <div className="opacity-0 group-hover:opacity-100 transition-all duration-200">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-10 w-10 p-0 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200"
                      >
                        <MoreVertical className="h-5 w-5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48 shadow-lg border-gray-200 dark:border-gray-700">
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavoriteMutation.mutate({
                            contactId: contact.id,
                            isPinned: !contact.isPinned
                          });
                        }}
                        className="hover:bg-yellow-50 dark:hover:bg-yellow-900/20 transition-colors"
                      >
                        <Star className={cn("h-4 w-4 mr-3", contact.isPinned ? "fill-yellow-400 text-yellow-400" : "text-gray-400")} />
                        <span className="font-medium">
                          {contact.isPinned ? "즐겨찾기 해제" : "즐겨찾기 추가"}
                        </span>
                      </DropdownMenuItem>
                      
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          setLocation(`/friend/${contact.contactUserId}`);
                        }}
                        className="hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                      >
                        <User className="h-4 w-4 mr-3 text-blue-500" />
                        <span className="font-medium">프로필 보기</span>
                      </DropdownMenuItem>
                      
                      <DropdownMenuSeparator className="my-1" />
                      
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          setContactToBlock(contact);
                          setShowBlockConfirm(true);
                        }}
                        className="text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors"
                      >
                        <Shield className="h-4 w-4 mr-3" />
                        <span className="font-medium">차단하기</span>
                      </DropdownMenuItem>
                      
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteContact(contact);
                        }}
                        className="text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      >
                        <Trash2 className="h-4 w-4 mr-3" />
                        <span className="font-medium">삭제하기</span>
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