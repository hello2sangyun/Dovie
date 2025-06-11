import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { OptimizedAvatar } from "@/components/OptimizedAvatar";
import PrismAvatar from "@/components/PrismAvatar";
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

  // Toggle favorite mutation
  const toggleFavoriteMutation = useMutation({
    mutationFn: async ({ contactId, isPinned }: { contactId: number; isPinned: boolean }) => {
      const response = await apiRequest(`/api/contacts/${contactId}`, "PATCH", { isPinned });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      toast({
        title: "즐겨찾기 설정 완료",
        description: "연락처 즐겨찾기가 업데이트되었습니다.",
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "즐겨찾기 설정 실패",
        description: "즐겨찾기 설정 중 오류가 발생했습니다.",
      });
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
      toast({
        title: "연락처 차단 완료",
        description: "연락처가 차단되었습니다.",
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "차단 실패",
        description: "연락처 차단 중 오류가 발생했습니다.",
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

  const { data: contactsData, isLoading } = useQuery({
    queryKey: ["/api/contacts"],
    enabled: !!user,
    queryFn: async () => {
      const response = await fetch("/api/contacts", {
        headers: { "x-user-id": user!.id.toString() },
      });
      if (!response.ok) throw new Error("Failed to fetch contacts");
      return response.json();
    },
  });

  // 최근 포스팅한 친구들 데이터 가져오기
  const { data: recentPostsData } = useQuery({
    queryKey: ["/api/contacts/recent-posts"],
    enabled: !!user,
    queryFn: async () => {
      const response = await fetch("/api/contacts/recent-posts", {
        headers: { "x-user-id": user!.id.toString() },
      });
      if (!response.ok) throw new Error("Failed to fetch recent posts");
      return response.json();
    },
    refetchInterval: 30000, // 30초마다 새로고침
  });

  const contacts = contactsData?.contacts || [];
  const recentPosts = recentPostsData || [];

  // 특정 사용자가 최근에 포스팅했는지 확인하는 함수
  const hasRecentPost = (userId: number) => {
    return recentPosts.some((post: any) => post.userId === userId);
  };

  const handleBlockContact = (contact: any) => {
    setContactToBlock(contact);
    setShowBlockConfirm(true);
  };

  const handleDeleteContact = (contact: any) => {
    setContactToDelete(contact);
    setShowDeleteConfirm(true);
  };

  const confirmBlockContact = () => {
    if (contactToBlock) {
      // 외부 연락처는 차단할 수 없음 (등록된 사용자만 차단 가능)
      if (contactToBlock.contactUserId) {
        blockContactMutation.mutate(contactToBlock.contactUserId);
      }
      setShowBlockConfirm(false);
      setContactToBlock(null);
    }
  };

  const confirmDeleteContact = () => {
    if (contactToDelete) {
      // 외부 연락처는 contact ID로, 등록된 사용자는 contactUserId로 삭제
      deleteContactMutation.mutate(contactToDelete.contactUserId || contactToDelete.id);
      setShowDeleteConfirm(false);
      setContactToDelete(null);
    }
  };

  // 즐겨찾기 친구와 일반 친구 분리
  const favoriteContacts = contacts.filter((contact: any) => contact.isPinned);
  const regularContacts = contacts.filter((contact: any) => !contact.isPinned);

  const filteredAndSortedContacts = regularContacts
    .filter((contact: any) => {
      // 본인 계정 제외 (등록된 사용자의 경우만)
      if (contact.contactUser && contact.contactUser.id === user?.id) {
        return false;
      }
      
      const searchLower = searchTerm.toLowerCase();
      // 외부 연락처와 등록된 사용자 모두 처리
      const nickname = contact.nickname || contact.name || (contact.contactUser ? contact.contactUser.displayName : '');
      const username = contact.contactUser ? contact.contactUser.username : '';
      const email = contact.email || '';
      const company = contact.company || '';
      
      return nickname.toLowerCase().includes(searchLower) ||
             username.toLowerCase().includes(searchLower) ||
             email.toLowerCase().includes(searchLower) ||
             company.toLowerCase().includes(searchLower);
    })
    .sort((a: any, b: any) => {
      const aName = a.nickname || a.name || (a.contactUser ? a.contactUser.displayName : '');
      const bName = b.nickname || b.name || (b.contactUser ? b.contactUser.displayName : '');
      
      switch (sortBy) {
        case "nickname":
          return aName.localeCompare(bName);
        case "username":
          if (a.contactUser && b.contactUser) {
            return a.contactUser.username.localeCompare(b.contactUser.username);
          }
          // 외부 연락처는 이름으로 정렬
          return aName.localeCompare(bName);
        case "lastSeen":
          // 외부 연락처는 생성일자로, 등록된 사용자는 마지막 접속일로 정렬
          if (a.contactUser && b.contactUser) {
            return new Date(b.contactUser.lastSeen || 0).getTime() - new Date(a.contactUser.lastSeen || 0).getTime();
          }
          return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
        default:
          return 0;
      }
    });

  const getInitials = (name: string) => {
    return name.charAt(0).toUpperCase();
  };

  const getOnlineStatus = (user: any) => {
    if (user.isOnline) return "온라인";
    if (!user.lastSeen) return "오프라인";
    
    const lastSeen = new Date(user.lastSeen);
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - lastSeen.getTime()) / (1000 * 60));
    
    if (diffMinutes < 60) return `${diffMinutes}분 전 접속`;
    if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)}시간 전 접속`;
    return `${Math.floor(diffMinutes / 1440)}일 전 접속`;
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-gray-500">연락처를 불러오는 중...</div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-3 border-b border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-gray-900 text-sm">연락처</h3>
          <Button
            variant="ghost"
            size="sm"
            className="text-purple-600 hover:text-purple-700 h-7 w-7 p-0"
            onClick={onAddContact}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="relative mb-2">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 h-3 w-3" />
          <Input
            type="text"
            placeholder="검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-7 h-7 text-xs"
          />
        </div>
        
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="h-7 text-xs">
            <SelectValue placeholder="정렬" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="nickname">닉네임순</SelectItem>
            <SelectItem value="username">이름순</SelectItem>
            <SelectItem value="lastSeen">접속순</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* 즐겨찾기 친구 버블 */}
      {favoriteContacts.length > 0 && (
        <div className="px-3 py-2 border-b border-gray-100">
          <div className="flex items-center space-x-2 mb-2">
            <h4 className="text-xs font-medium text-gray-600">즐겨찾기</h4>
          </div>
          <div className="flex space-x-3 overflow-x-auto scrollbar-none pb-1">
            {favoriteContacts.map((contact: any) => {
              const isExternalContact = !contact.contactUserId;
              const displayName = contact.nickname || contact.name || (contact.contactUser ? contact.contactUser.displayName : '');
              return (
                <div key={contact.id} className="flex flex-col items-center space-y-1 flex-shrink-0">
                  <div 
                    className="relative cursor-pointer hover:opacity-75 transition-opacity"
                    onClick={() => {
                      if (!isExternalContact) {
                        setLocation(`/friend/${contact.contactUserId}`);
                      }
                    }}
                  >
                    <PrismAvatar
                      src={isExternalContact ? null : contact.contactUser?.profilePicture}
                      fallback={getInitials(displayName)}
                      hasNewPost={isExternalContact ? false : hasRecentPost(contact.contactUserId)}
                      size="md"
                      className="shadow-md"
                    />
                    {!isExternalContact && contact.contactUser?.isOnline && (
                      <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white rounded-full z-20"></div>
                    )}
                  </div>
                  <span 
                    className="text-xs text-gray-700 text-center max-w-[60px] truncate cursor-pointer hover:text-blue-600"
                    onClick={() => {
                      if (isExternalContact) {
                        console.log('External contact clicked:', contact);
                      } else {
                        onSelectContact(contact.contactUserId);
                      }
                    }}
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
            // 외부 연락처인지 등록된 사용자인지 확인
            const isExternalContact = !contact.contactUserId;
            const displayName = contact.nickname || contact.name || (contact.contactUser ? contact.contactUser.displayName : '');
            
            return (
            <div
              key={contact.id}
              className="px-3 py-2 hover:bg-purple-50 border-b border-gray-100 transition-colors group"
            >
              <div className="flex items-center space-x-2">
                <div 
                  className="cursor-pointer flex-1 flex items-center space-x-2"
                  onClick={() => {
                    if (isExternalContact) {
                      // 외부 연락처는 연락처 상세 보기로
                      console.log('External contact clicked:', contact);
                    } else {
                      onSelectContact(contact.contactUserId);
                    }
                  }}
                >
                  <div
                    className="cursor-pointer"
                    onClick={(e?: React.MouseEvent) => {
                      e?.stopPropagation();
                      if (!isExternalContact) {
                        setLocation(`/friend/${contact.contactUserId}`);
                      }
                    }}
                  >
                    <PrismAvatar
                      src={isExternalContact ? null : contact.contactUser?.profilePicture}
                      fallback={getInitials(displayName)}
                      hasNewPost={isExternalContact ? false : hasRecentPost(contact.contactUserId)}
                      size="sm"
                      className="hover:ring-2 hover:ring-blue-300 transition-all"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-gray-900 truncate text-sm">
                        {displayName}
                      </p>
                      {!isExternalContact && (
                        <div className={cn(
                          "w-2 h-2 rounded-full ml-2 flex-shrink-0",
                          contact.contactUser?.isOnline ? "bg-green-500" : "bg-gray-300"
                        )} />
                      )}
                      {isExternalContact && (
                        <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
                          명함
                        </span>
                      )}
                    </div>
                    {isExternalContact ? (
                      <>
                        {contact.company && (
                          <p className="text-xs text-gray-500 truncate">{contact.company}</p>
                        )}
                        {contact.jobTitle && (
                          <p className="text-xs text-gray-400 truncate">{contact.jobTitle}</p>
                        )}
                        {contact.email && (
                          <p className="text-xs text-gray-400 truncate">{contact.email}</p>
                        )}
                      </>
                    ) : (
                      <>
                        <p className="text-xs text-gray-500 truncate">@{contact.contactUser?.username}</p>
                        <p className="text-xs text-gray-400 truncate">
                          {getOnlineStatus(contact.contactUser)}
                        </p>
                      </>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center space-x-1">
                  {/* 즐겨찾기 버튼 */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity",
                      contact.isPinned && "opacity-100"
                    )}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavoriteMutation.mutate({
                        contactId: contact.id,
                        isPinned: !contact.isPinned
                      });
                    }}
                  >
                    <Star 
                      className={cn(
                        "h-4 w-4",
                        contact.isPinned 
                          ? "fill-yellow-400 text-yellow-400" 
                          : "text-gray-400 hover:text-yellow-400"
                      )} 
                    />
                  </Button>

                  {/* 옵션 메뉴 */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreVertical className="h-4 w-4 text-gray-400" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          handleBlockContact(contact);
                        }}
                        className="text-orange-600"
                      >
                        <Shield className="h-4 w-4 mr-2" />
                        차단하기
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
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
