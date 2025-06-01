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

  const { data: contactsData, isLoading, error } = useQuery({
    queryKey: ["/api/contacts"],
    enabled: !!user,
    queryFn: async () => {
      console.log("Fetching contacts for user:", user?.id);
      const response = await fetch("/api/contacts", {
        headers: { "x-user-id": user!.id.toString() },
      });
      if (!response.ok) throw new Error("Failed to fetch contacts");
      const data = await response.json();
      console.log("Contacts data received:", data);
      return data;
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

  console.log("ContactsList render state:", { isLoading, error, contactsData, contacts: contacts.length });

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-gray-500">연락처를 불러오는 중...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-red-500">연락처를 불러오는데 실패했습니다.</div>
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

      {/* 프로필사진 팝업 다이얼로그 */}
      <Dialog open={showProfileDialog} onOpenChange={setShowProfileDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              {selectedContact?.nickname || selectedContact?.contactUser?.displayName}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowProfileDialog(false)}
                className="h-6 w-6 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center space-y-4">
            <Avatar className="w-32 h-32">
              <AvatarImage 
                src={selectedContact?.contactUser?.profilePicture || undefined} 
                alt={selectedContact?.nickname || selectedContact?.contactUser?.displayName} 
              />
              <AvatarFallback className={`bg-gradient-to-br ${getAvatarColor(selectedContact?.nickname || selectedContact?.contactUser?.displayName || '')} text-white font-semibold text-2xl`}>
                {getInitials(selectedContact?.nickname || selectedContact?.contactUser?.displayName || '')}
              </AvatarFallback>
            </Avatar>
            <div className="text-center">
              <h3 className="text-lg font-semibold">
                {selectedContact?.nickname || selectedContact?.contactUser?.displayName}
              </h3>
              <p className="text-gray-500">@{selectedContact?.contactUser?.username}</p>
              <div className="flex items-center justify-center space-x-2 mt-2">
                <div className={cn(
                  "w-2 h-2 rounded-full",
                  selectedContact?.contactUser?.isOnline ? "bg-green-500" : "bg-gray-300"
                )} />
                <span className="text-sm text-gray-500">
                  {getOnlineStatus(selectedContact?.contactUser)}
                </span>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 명함보기 다이얼로그 */}
      <Dialog open={showBusinessCardDialog} onOpenChange={setShowBusinessCardDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              {selectedContact?.nickname || selectedContact?.contactUser?.displayName}의 명함
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowBusinessCardDialog(false)}
                className="h-6 w-6 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {businessCardData?.businessCard ? (
              <div className="bg-gradient-to-br from-purple-600 to-blue-600 text-white p-6 rounded-lg shadow-lg">
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <Avatar className="w-12 h-12">
                      <AvatarImage 
                        src={selectedContact?.contactUser?.profilePicture || undefined} 
                        alt={selectedContact?.nickname || selectedContact?.contactUser?.displayName} 
                      />
                      <AvatarFallback className="bg-white/20 text-white font-semibold">
                        {getInitials(selectedContact?.nickname || selectedContact?.contactUser?.displayName || '')}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="text-lg font-bold">{businessCardData.businessCard.name}</h3>
                      <p className="text-purple-100">{businessCardData.businessCard.position}</p>
                    </div>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div>
                      <p className="font-semibold">{businessCardData.businessCard.company}</p>
                    </div>
                    
                    {businessCardData.businessCard.phone && (
                      <div>
                        <p className="text-purple-100">전화: {businessCardData.businessCard.phone}</p>
                      </div>
                    )}
                    
                    {businessCardData.businessCard.email && (
                      <div>
                        <p className="text-purple-100">이메일: {businessCardData.businessCard.email}</p>
                      </div>
                    )}
                    
                    {businessCardData.businessCard.address && (
                      <div>
                        <p className="text-purple-100">주소: {businessCardData.businessCard.address}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">등록된 명함이 없습니다</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
