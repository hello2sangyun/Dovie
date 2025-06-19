import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { Plus, Search, Star, MoreVertical, Users } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { InstantAvatar } from "@/components/InstantAvatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

interface ContactsListProps {
  onAddContact: () => void;
  onSelectContact: (contactId: number) => void;
}

export default function ContactsList({ onAddContact, onSelectContact }: ContactsListProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("nickname");
  const [showBlockConfirm, setShowBlockConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [contactToBlock, setContactToBlock] = useState<any>(null);
  const [contactToDelete, setContactToDelete] = useState<any>(null);

  // Toggle favorite mutation
  const toggleFavoriteMutation = useMutation({
    mutationFn: async ({ contactId, isPinned }: { contactId: number; isPinned: boolean }) => {
      const response = await apiRequest(`/api/contacts/${contactId}/pin`, "POST", { isPinned });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
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
  });

  // Delete contact mutation
  const deleteContactMutation = useMutation({
    mutationFn: async (contactUserId: number) => {
      const response = await apiRequest(`/api/contacts/${contactUserId}`, "DELETE");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
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
      blockContactMutation.mutate(contactToBlock.contactUserId);
      setShowBlockConfirm(false);
      setContactToBlock(null);
    }
  };

  const confirmDeleteContact = () => {
    if (contactToDelete) {
      deleteContactMutation.mutate(contactToDelete.contactUserId);
      setShowDeleteConfirm(false);
      setContactToDelete(null);
    }
  };

  const handleToggleFavorite = (contact: any) => {
    toggleFavoriteMutation.mutate({
      contactId: contact.id,
      isPinned: !contact.isPinned
    });
  };

  // 즐겨찾기 친구와 모든 친구 분리
  const favoriteContacts = contacts.filter((contact: any) => contact.isPinned);

  const filteredAndSortedContacts = contacts
    .filter((contact: any) => {
      // 본인 계정 제외
      if (contact.contactUser.id === user?.id) {
        return false;
      }
      
      const searchLower = searchTerm.toLowerCase();
      const nickname = contact.nickname || contact.contactUser.displayName;
      return nickname.toLowerCase().includes(searchLower) ||
             contact.contactUser.username.toLowerCase().includes(searchLower);
    })
    .sort((a: any, b: any) => {
      const aName = a.nickname || a.contactUser.displayName;
      const bName = b.nickname || b.contactUser.displayName;
      
      switch (sortBy) {
        case "nickname":
          return aName.localeCompare(bName);
        case "username":
          return a.contactUser.username.localeCompare(b.contactUser.username);
        case "lastSeen":
          return new Date(b.contactUser.lastSeen || 0).getTime() - new Date(a.contactUser.lastSeen || 0).getTime();
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
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="nickname">닉네임순</SelectItem>
            <SelectItem value="username">아이디순</SelectItem>
            <SelectItem value="lastSeen">최근접속순</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* 즐겨찾기 섹션 */}
      {favoriteContacts.length > 0 && (
        <div className="border-b border-gray-200">
          <div className="px-3 py-2 bg-gray-50">
            <div className="flex items-center space-x-1">
              <Star className="h-3 w-3 text-yellow-500 fill-current" />
              <span className="text-xs font-medium text-gray-700">즐겨찾기</span>
            </div>
          </div>
          <div className="flex overflow-x-auto px-2 py-2 space-x-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
            {favoriteContacts.map((contact: any) => {
              const displayName = contact.nickname || contact.contactUser.displayName;
              
              return (
                <div key={contact.id} className="flex flex-col items-center space-y-1 min-w-[60px] group">
                  <div className="relative">
                    <InstantAvatar
                      src={contact.contactUser.profilePicture}
                      fallbackText={displayName}
                      size="md"
                      className="cursor-pointer group-hover:ring-2 group-hover:ring-blue-300 transition-all"
                      onClick={() => onSelectContact(contact.contactUserId)}
                    />
                    {hasRecentPost(contact.contactUserId) && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 border-2 border-white rounded-full flex items-center justify-center z-20">
                        <Users className="h-2 w-2 text-white" />
                      </div>
                    )}
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
            return (
            <div
              key={contact.id}
              className="px-3 py-2 hover:bg-purple-50 border-b border-gray-100 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div 
                  className="cursor-pointer flex-1 flex items-center space-x-2"
                  onClick={() => onSelectContact(contact.contactUserId)}
                >
                  <div className="relative">
                    <InstantAvatar
                      src={contact.contactUser.profilePicture}
                      fallbackText={contact.nickname || contact.contactUser.displayName}
                      size="sm"
                      className="hover:ring-2 hover:ring-blue-300 transition-all"
                    />
                    {hasRecentPost(contact.contactUserId) && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 border-2 border-white rounded-full flex items-center justify-center z-20">
                        <Users className="h-2 w-2 text-white" />
                      </div>
                    )}
                    {contact.contactUser.isOnline && (
                      <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white rounded-full z-20"></div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-gray-900 truncate text-sm">
                        {contact.nickname || contact.contactUser.displayName}
                      </p>
                    </div>
                    <p className="text-xs text-gray-500 truncate">@{contact.contactUser.username}</p>
                    <p className="text-xs text-gray-400 truncate">
                      {getOnlineStatus(contact.contactUser)}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-1">
                  {/* 즐겨찾기 버튼 */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "h-8 w-8 p-0 hover:bg-gray-100",
                      contact.isPinned ? "text-yellow-500" : "text-gray-400"
                    )}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleFavorite(contact);
                    }}
                  >
                    <Star className={cn("h-4 w-4", contact.isPinned && "fill-current")} />
                  </Button>
                  
                  {/* 메뉴 버튼 */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleFavorite(contact);
                        }}
                      >
                        {contact.isPinned ? "즐겨찾기 해제" : "즐겨찾기 추가"}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          handleBlockContact(contact);
                        }}
                        className="text-orange-600"
                      >
                        차단하기
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteContact(contact);
                        }}
                        className="text-red-600"
                      >
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
              {contactToBlock && `${contactToBlock.nickname || contactToBlock.contactUser.displayName}님을 차단하시겠습니까?`}
              <br />차단된 사용자는 설정에서 확인할 수 있습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={confirmBlockContact} className="bg-orange-500 hover:bg-orange-600">
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
              {contactToDelete && `${contactToDelete.nickname || contactToDelete.contactUser.displayName}님을 연락처에서 삭제하시겠습니까?`}
              <br />삭제된 연락처는 복구할 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteContact} className="bg-red-500 hover:bg-red-600">
              삭제하기
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}