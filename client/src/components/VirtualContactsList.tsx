import { useMemo, useCallback, useState } from "react";
import { FixedSizeList as List } from "react-window";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ContactItem from "@/components/ContactItem";
import { Plus, Search } from "lucide-react";

interface VirtualContactsListProps {
  onAddContact: () => void;
  onSelectContact: (contactId: number) => void;
}

interface ContactRowProps {
  index: number;
  style: React.CSSProperties;
  data: {
    contacts: any[];
    onSelectContact: (contactId: number) => void;
    onToggleFavorite: (contactId: number, isPinned: boolean) => void;
    onBlockContact: (contact: any) => void;
    onDeleteContact: (contact: any) => void;
    onViewProfile: (contactUserId: number) => void;
  };
}

const ContactRow = ({ index, style, data }: ContactRowProps) => {
  const contact = data.contacts[index];
  
  return (
    <div style={style}>
      <ContactItem
        contact={contact}
        onSelectContact={data.onSelectContact}
        onToggleFavorite={data.onToggleFavorite}
        onBlockContact={data.onBlockContact}
        onDeleteContact={data.onDeleteContact}
        onViewProfile={data.onViewProfile}
      />
    </div>
  );
};

export default function VirtualContactsList({ onAddContact, onSelectContact }: VirtualContactsListProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("nickname");

  // Toggle favorite mutation
  const toggleFavoriteMutation = useMutation({
    mutationFn: async ({ contactId, isPinned }: { contactId: number; isPinned: boolean }) => {
      return apiRequest(`/api/contacts/${contactId}/favorite`, {
        method: "PATCH",
        body: { isPinned },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      toast({
        title: "즐겨찾기 변경",
        description: "즐겨찾기가 변경되었습니다.",
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "변경 실패",
        description: "즐겨찾기 변경 중 오류가 발생했습니다.",
      });
    },
  });

  const { data: contactsData, isLoading } = useQuery({
    queryKey: ["/api/contacts"],
    enabled: !!user,
    staleTime: 30000, // 30초 동안 캐시 유지
  });

  const contacts = contactsData?.contacts || [];

  // Memoized contact processing for performance
  const { favoriteContacts, filteredAndSortedContacts } = useMemo(() => {
    if (!contacts) return { favoriteContacts: [], filteredAndSortedContacts: [] };
    
    const favorites = contacts.filter((contact: any) => contact.isPinned);
    const regular = contacts
      .filter((contact: any) => {
        if (contact.contactUser.id === user?.id || contact.isPinned) {
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
      
    return { favoriteContacts: favorites, filteredAndSortedContacts: regular };
  }, [contacts, searchTerm, sortBy, user?.id]);

  // Optimized callback functions
  const handleToggleFavorite = useCallback((contactId: number, isPinned: boolean) => {
    toggleFavoriteMutation.mutate({ contactId, isPinned });
  }, [toggleFavoriteMutation]);

  const handleBlockContact = useCallback((contact: any) => {
    // Handle block contact logic
  }, []);

  const handleDeleteContact = useCallback((contact: any) => {
    // Handle delete contact logic
  }, []);

  const handleViewProfile = useCallback((contactUserId: number) => {
    setLocation(`/friend/${contactUserId}`);
  }, [setLocation]);

  const virtualListData = useMemo(() => ({
    contacts: filteredAndSortedContacts,
    onSelectContact,
    onToggleFavorite: handleToggleFavorite,
    onBlockContact: handleBlockContact,
    onDeleteContact: handleDeleteContact,
    onViewProfile: handleViewProfile,
  }), [filteredAndSortedContacts, onSelectContact, handleToggleFavorite, handleBlockContact, handleDeleteContact, handleViewProfile]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-40">
        <div className="text-sm text-gray-500">연락처를 불러오는 중...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-3 border-b border-gray-100 space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 text-sm">연락처</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={onAddContact}
            className="h-7 w-7 p-0"
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

      {/* Favorites Section */}
      {favoriteContacts.length > 0 && (
        <div className="px-3 py-2 border-b border-gray-100">
          <h4 className="text-xs font-medium text-gray-600 mb-2">즐겨찾기</h4>
          <div className="space-y-1">
            {favoriteContacts.map((contact: any) => (
              <ContactItem
                key={contact.id}
                contact={contact}
                onSelectContact={onSelectContact}
                onToggleFavorite={handleToggleFavorite}
                onBlockContact={handleBlockContact}
                onDeleteContact={handleDeleteContact}
                onViewProfile={handleViewProfile}
              />
            ))}
          </div>
        </div>
      )}

      {/* Virtual Scrolled Contact List */}
      <div className="flex-1 min-h-0">
        {filteredAndSortedContacts.length === 0 ? (
          <div className="p-3 text-center text-gray-500 text-sm">
            {searchTerm ? "검색 결과가 없습니다" : "연락처가 없습니다"}
          </div>
        ) : (
          <List
            height={400} // Adjust based on container
            itemCount={filteredAndSortedContacts.length}
            itemSize={60} // Height of each contact item
            itemData={virtualListData}
            width="100%"
          >
            {ContactRow}
          </List>
        )}
      </div>
    </div>
  );
}