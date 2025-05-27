import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface ContactsListProps {
  onAddContact: () => void;
  onSelectContact: (contactId: number) => void;
}

export default function ContactsList({ onAddContact, onSelectContact }: ContactsListProps) {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("nickname");

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

  const filteredAndSortedContacts = contacts
    .filter((contact: any) => {
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
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-900">연락처</h3>
          <Button
            variant="ghost"
            size="sm"
            className="text-purple-600 hover:text-purple-700"
            onClick={onAddContact}
          >
            <Plus className="h-5 w-5" />
          </Button>
        </div>
        
        <div className="relative mb-2">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            type="text"
            placeholder="연락처 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger>
            <SelectValue placeholder="정렬 방식" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="nickname">닉네임 순 정렬</SelectItem>
            <SelectItem value="username">이름 순 정렬</SelectItem>
            <SelectItem value="lastSeen">마지막 접속순 정렬</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex-1 overflow-y-auto">
        {filteredAndSortedContacts.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            {searchTerm ? "검색 결과가 없습니다" : "연락처가 없습니다"}
          </div>
        ) : (
          filteredAndSortedContacts.map((contact: any) => (
            <div
              key={contact.id}
              className="p-4 hover:bg-purple-50 cursor-pointer border-b border-gray-100 transition-colors"
              onClick={() => onSelectContact(contact.contactUserId)}
            >
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 purple-gradient rounded-full flex items-center justify-center text-white font-semibold">
                  {getInitials(contact.nickname || contact.contactUser.displayName)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">
                    {contact.nickname || contact.contactUser.displayName}
                  </p>
                  <p className="text-sm text-gray-500 truncate">@{contact.contactUser.username}</p>
                  <p className={cn(
                    "text-xs",
                    contact.contactUser.isOnline ? "text-green-500" : "text-gray-400"
                  )}>
                    {getOnlineStatus(contact.contactUser)}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
