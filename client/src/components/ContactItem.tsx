import { memo } from "react";
import { OptimizedAvatar } from "@/components/OptimizedAvatar";
import PrismAvatar from "@/components/PrismAvatar";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator 
} from "@/components/ui/dropdown-menu";
import { Star, MoreVertical, UserX, Trash2, Shield } from "lucide-react";
import { cn, getInitials, getAvatarColor } from "@/lib/utils";

interface ContactItemProps {
  contact: any;
  onSelectContact: (contactId: number) => void;
  onToggleFavorite: (contactId: number, isPinned: boolean) => void;
  onBlockContact: (contact: any) => void;
  onDeleteContact: (contact: any) => void;
  onViewProfile: (contactUserId: number) => void;
}

// Memoized contact item component for better performance
const ContactItem = memo(function ContactItem({
  contact,
  onSelectContact,
  onToggleFavorite,
  onBlockContact,
  onDeleteContact,
  onViewProfile
}: ContactItemProps) {
  const displayName = contact.nickname || contact.contactUser.displayName;
  
  // Calculate online status efficiently
  const isOnline = contact.contactUser.isOnline;
  const getLastSeenText = (lastSeen: string | null) => {
    if (!lastSeen) return "오프라인";
    
    const lastSeenDate = new Date(lastSeen);
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - lastSeenDate.getTime()) / (1000 * 60));
    
    if (diffMinutes < 1) return "방금 전 접속";
    if (diffMinutes < 60) return `${diffMinutes}분 전 접속`;
    if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)}시간 전 접속`;
    return `${Math.floor(diffMinutes / 1440)}일 전 접속`;
  };

  return (
    <div className="px-3 py-2 hover:bg-purple-50 border-b border-gray-100 transition-colors group">
      <div className="flex items-center space-x-2">
        <div 
          className="cursor-pointer flex-1 flex items-center space-x-2"
          onClick={() => onSelectContact(contact.contactUserId)}
        >
          <div className="cursor-pointer" onClick={(e) => {
            e?.stopPropagation();
            onViewProfile(contact.contactUserId);
          }}>
            {contact.contactUser.profilePicture ? (
              <OptimizedAvatar 
                src={contact.contactUser.profilePicture}
                name={displayName}
                className="w-8 h-8"
              />
            ) : (
              <PrismAvatar 
                src={contact.contactUser.profilePicture}
                fallback={getInitials(displayName)}
                size="sm"
                className="w-8 h-8"
              />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-1">
              <span className="font-medium text-gray-900 text-sm truncate">
                {displayName}
              </span>
              {contact.isPinned && (
                <Star className="h-3 w-3 text-yellow-500 fill-current flex-shrink-0" />
              )}
              {contact.contactUser.userRole === 'business' && (
                <Shield className="h-3 w-3 text-blue-500 flex-shrink-0" />
              )}
            </div>
            <div className="flex items-center space-x-1">
              <div className={cn(
                "w-2 h-2 rounded-full flex-shrink-0",
                isOnline ? "bg-green-500" : "bg-gray-400"
              )} />
              <span className="text-xs text-gray-500 truncate">
                {isOnline ? "온라인" : getLastSeenText(contact.contactUser.lastSeen)}
              </span>
            </div>
          </div>
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-200 rounded">
              <MoreVertical className="h-4 w-4 text-gray-500" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem
              onClick={() => onToggleFavorite(contact.contactUserId, !contact.isPinned)}
              className="cursor-pointer"
            >
              <Star className="mr-2 h-4 w-4" />
              {contact.isPinned ? "즐겨찾기 해제" : "즐겨찾기 추가"}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onViewProfile(contact.contactUserId)}
              className="cursor-pointer"
            >
              <Shield className="mr-2 h-4 w-4" />
              프로필 보기
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onBlockContact(contact)}
              className="cursor-pointer text-orange-600 focus:text-orange-600"
            >
              <UserX className="mr-2 h-4 w-4" />
              차단하기
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onDeleteContact(contact)}
              className="cursor-pointer text-red-600 focus:text-red-600"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              삭제하기
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
});

export default ContactItem;