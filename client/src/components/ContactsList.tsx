import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Search, CreditCard, X } from "lucide-react";
import { cn, getInitials, getAvatarColor } from "@/lib/utils";

interface ContactsListProps {
  onAddContact: () => void;
  onSelectContact: (contactId: number) => void;
}

export default function ContactsList({ onAddContact, onSelectContact }: ContactsListProps) {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("nickname");
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [showBusinessCardDialog, setShowBusinessCardDialog] = useState(false);
  const [selectedContact, setSelectedContact] = useState<any>(null);

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

  // Business card data query
  const { data: businessCardData } = useQuery({
    queryKey: ["/api/business-cards", selectedContact?.contactUser?.id],
    enabled: !!selectedContact?.contactUser?.id && showBusinessCardDialog,
    queryFn: async () => {
      const response = await fetch(`/api/business-cards/${selectedContact.contactUser.id}`, {
        headers: { "x-user-id": user!.id.toString() },
      });
      if (!response.ok) throw new Error("Failed to fetch business card");
      return response.json();
    },
  });

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
            <SelectValue placeholder="정렬" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="nickname">닉네임순</SelectItem>
            <SelectItem value="username">이름순</SelectItem>
            <SelectItem value="lastSeen">접속순</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex-1 overflow-y-auto max-h-[calc(100vh-240px)] scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
        {filteredAndSortedContacts.length === 0 ? (
          <div className="p-3 text-center text-gray-500 text-sm">
            {searchTerm ? "검색 결과가 없습니다" : "연락처가 없습니다"}
          </div>
        ) : (
          filteredAndSortedContacts.map((contact: any) => (
            <div
              key={contact.id}
              className="px-3 py-2 hover:bg-purple-50 border-b border-gray-100 transition-colors"
            >
              <div className="flex items-center space-x-2">
                <Avatar 
                  className="w-8 h-8 cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedContact(contact);
                    setShowProfileDialog(true);
                  }}
                >
                  <AvatarImage 
                    src={contact.contactUser.profilePicture || undefined} 
                    alt={contact.nickname || contact.contactUser.displayName} 
                  />
                  <AvatarFallback className={`bg-gradient-to-br ${getAvatarColor(contact.nickname || contact.contactUser.displayName)} text-white font-semibold text-xs`}>
                    {getInitials(contact.nickname || contact.contactUser.displayName)}
                  </AvatarFallback>
                </Avatar>
                <div 
                  className="flex-1 min-w-0 cursor-pointer"
                  onClick={() => onSelectContact(contact.contactUserId)}
                >
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-gray-900 truncate text-sm">
                      {contact.nickname || contact.contactUser.displayName}
                    </p>
                    <div className="flex items-center space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-gray-400 hover:text-purple-600"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedContact(contact);
                          setShowBusinessCardDialog(true);
                        }}
                      >
                        <CreditCard className="h-3 w-3" />
                      </Button>
                      <div className={cn(
                        "w-2 h-2 rounded-full flex-shrink-0",
                        contact.contactUser.isOnline ? "bg-green-500" : "bg-gray-300"
                      )} />
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 truncate">@{contact.contactUser.username}</p>
                  <p className="text-xs text-gray-400 truncate">
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
