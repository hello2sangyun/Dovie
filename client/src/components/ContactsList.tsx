import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Star } from "lucide-react";
import { cn, getInitials, getAvatarColor } from "@/lib/utils";

interface ContactsListProps {
  onAddContact: () => void;
  onSelectContact: (contactId: number) => void;
}

export default function ContactsList({ onAddContact, onSelectContact }: ContactsListProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("nickname");

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

  const contacts = contactsData?.contacts || [];

  // 즐겨찾기 친구와 일반 친구 분리
  const favoriteContacts = contacts.filter((contact: any) => contact.isPinned);
  const regularContacts = contacts.filter((contact: any) => !contact.isPinned);

  const filteredAndSortedContacts = regularContacts
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
              const displayName = contact.nickname || contact.contactUser.displayName;
              return (
                <div
                  key={contact.id}
                  className="flex flex-col items-center space-y-1 cursor-pointer hover:opacity-75 transition-opacity flex-shrink-0"
                  onClick={() => onSelectContact(contact.contactUserId)}
                >
                  <div className="relative">
                    <div
                      className={`w-12 h-12 rounded-full bg-gradient-to-br ${getAvatarColor(displayName)} flex items-center justify-center text-white font-semibold text-sm border-2 border-white shadow-md`}
                    >
                      {contact.contactUser.profilePicture ? (
                        <img 
                          src={contact.contactUser.profilePicture} 
                          alt={displayName}
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        getInitials(displayName)
                      )}
                    </div>
                    {contact.contactUser.isOnline && (
                      <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                    )}
                  </div>
                  <span className="text-xs text-gray-700 text-center max-w-[60px] truncate">
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
          filteredAndSortedContacts.map((contact: any) => (
            <div
              key={contact.id}
              className="px-3 py-2 hover:bg-purple-50 border-b border-gray-100 transition-colors group"
            >
              <div className="flex items-center space-x-2">
                <div 
                  className="cursor-pointer flex-1 flex items-center space-x-2"
                  onClick={() => onSelectContact(contact.contactUserId)}
                >
                  <Avatar className="w-8 h-8">
                    <AvatarImage 
                      src={contact.contactUser.profilePicture || undefined} 
                      alt={contact.nickname || contact.contactUser.displayName} 
                    />
                    <AvatarFallback className={`bg-gradient-to-br ${getAvatarColor(contact.nickname || contact.contactUser.displayName)} text-white font-semibold text-xs`}>
                      {getInitials(contact.nickname || contact.contactUser.displayName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-gray-900 truncate text-sm">
                        {contact.nickname || contact.contactUser.displayName}
                      </p>
                      <div className={cn(
                        "w-2 h-2 rounded-full ml-2 flex-shrink-0",
                        contact.contactUser.isOnline ? "bg-green-500" : "bg-gray-300"
                      )} />
                    </div>
                    <p className="text-xs text-gray-500 truncate">@{contact.contactUser.username}</p>
                    <p className="text-xs text-gray-400 truncate">
                      {getOnlineStatus(contact.contactUser)}
                    </p>
                  </div>
                </div>
                
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
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
