import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Save, Reply, Edit3, Globe, Copy, Share2, Trash2 } from "lucide-react";

interface MessageContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  onSaveMessage: () => void;
  onReplyMessage: () => void;
  onTranslateMessage: () => void;
  onEditMessage?: () => void;
  onCopyText?: () => void;
  onDeleteMessage?: () => void;
  onForwardMessage?: () => void;
  onReaction?: (emoji: string, emojiName: string) => void;
  canEdit?: boolean;
  canDelete?: boolean;
  visible: boolean;
}

export default function MessageContextMenu({ 
  x, 
  y, 
  onClose, 
  onSaveMessage,
  onReplyMessage,
  onTranslateMessage,
  onEditMessage,
  onCopyText,
  onDeleteMessage,
  onForwardMessage,
  onReaction,
  canEdit = false,
  canDelete = false,
  visible 
}: MessageContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuPosition, setMenuPosition] = useState({ x, y });

  // Smart position calculation to avoid screen edges
  useEffect(() => {
    if (visible && menuRef.current) {
      const menu = menuRef.current;
      const rect = menu.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      let adjustedX = x;
      let adjustedY = y;
      
      // Adjust horizontal position if menu goes off-screen
      if (x + rect.width > viewportWidth - 20) {
        adjustedX = viewportWidth - rect.width - 20;
      }
      if (adjustedX < 20) {
        adjustedX = 20;
      }
      
      // Adjust vertical position if menu goes off-screen
      if (y + rect.height > viewportHeight - 20) {
        adjustedY = y - rect.height - 10;
      }
      if (adjustedY < 20) {
        adjustedY = 20;
      }
      
      setMenuPosition({ x: adjustedX, y: adjustedY });
    }
  }, [visible, x, y]);

  useEffect(() => {
    if (visible) {
      let timeoutId: NodeJS.Timeout;
      
      const handleClickOutside = (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        
        // Don't close if clicking on scrollbars, input fields, or buttons
        if (target.tagName === 'INPUT' || 
            target.tagName === 'BUTTON' || 
            target.tagName === 'TEXTAREA' ||
            target.closest('.context-menu') ||
            target.closest('[role="dialog"]') ||
            target.closest('[role="menu"]')) {
          return;
        }
        
        // Small delay to prevent immediate closure from the same click that opened the menu
        timeoutId = setTimeout(() => onClose(), 10);
      };
      
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === "Escape") onClose();
      };

      const handleTouchStart = (e: TouchEvent) => {
        const target = e.target as HTMLElement;
        
        // Don't close if touching interactive elements
        if (target.tagName === 'INPUT' || 
            target.tagName === 'BUTTON' || 
            target.tagName === 'TEXTAREA' ||
            target.closest('.context-menu') ||
            target.closest('[role="dialog"]') ||
            target.closest('[role="menu"]')) {
          return;
        }
        
        // For mobile devices - handle touch outside menu
        timeoutId = setTimeout(() => onClose(), 10);
      };

      // Add listeners with a small delay to prevent immediate triggering
      setTimeout(() => {
        document.addEventListener("mousedown", handleClickOutside);
        document.addEventListener("touchstart", handleTouchStart);
        document.addEventListener("keydown", handleEscape);
      }, 50);
      
      return () => {
        clearTimeout(timeoutId);
        document.removeEventListener("mousedown", handleClickOutside);
        document.removeEventListener("touchstart", handleTouchStart);
        document.removeEventListener("keydown", handleEscape);
      };
    }
  }, [visible, onClose]);

  if (!visible) return null;

  const handleSaveClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSaveMessage();
    onClose();
  };

  const handleReplyClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onReplyMessage();
    onClose();
  };

  const handleTranslateClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onTranslateMessage();
    onClose();
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEditMessage?.();
    onClose();
  };

  const handleCopyClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onCopyText?.();
    onClose();
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDeleteMessage?.();
    onClose();
  };

  const handleForwardClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onForwardMessage?.();
    onClose();
  };

  const handleReactionClick = (emoji: string, emojiName: string) => (e: React.MouseEvent) => {
    e.stopPropagation();
    onReaction?.(emoji, emojiName);
    onClose();
  };

  const reactions = [
    { emoji: "❤️", name: "heart" },
    { emoji: "👍", name: "thumbs_up" },
    { emoji: "😂", name: "laugh" },
    { emoji: "😮", name: "surprised" },
    { emoji: "😢", name: "sad" },
    { emoji: "🎉", name: "party" },
  ];

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-40"
        onClick={onClose}
      />
      
      {/* Context Menu - Modern Clean Design */}
      <div
        ref={menuRef}
        className="context-menu fixed z-50 bg-white dark:bg-gray-900 backdrop-blur-xl border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl overflow-hidden min-w-[220px]"
        style={{ left: menuPosition.x, top: menuPosition.y }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 이모지 반응 섹션 - 상단 */}
        {onReaction && (
          <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 px-3 py-2.5 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-around gap-1">
              {reactions.map((reaction) => (
                <button
                  key={reaction.name}
                  onClick={handleReactionClick(reaction.emoji, reaction.name)}
                  className="group relative flex items-center justify-center w-9 h-9 rounded-full hover:bg-white/80 dark:hover:bg-gray-800/80 transition-all duration-200 hover:scale-125 active:scale-95"
                  title={reaction.name}
                >
                  <span className="text-xl">{reaction.emoji}</span>
                </button>
              ))}
            </div>
          </div>
        )}
        
        {/* 메인 액션 섹션 */}
        <div className="py-1.5">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start px-4 py-2.5 h-auto text-sm font-medium hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors rounded-none"
            onClick={handleReplyClick}
          >
            <Reply className="w-4 h-4 mr-3 text-blue-600 dark:text-blue-400" />
            <span>답장</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start px-4 py-2.5 h-auto text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors rounded-none"
            onClick={handleCopyClick}
          >
            <Copy className="w-4 h-4 mr-3 text-gray-600 dark:text-gray-400" />
            <span>복사</span>
          </Button>
          
          {canEdit && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start px-4 py-2.5 h-auto text-sm font-medium hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors rounded-none"
              onClick={handleEditClick}
            >
              <Edit3 className="w-4 h-4 mr-3 text-orange-600 dark:text-orange-400" />
              <span>수정</span>
            </Button>
          )}
        </div>

        {/* 추가 기능 섹션 */}
        <div className="border-t border-gray-100 dark:border-gray-800 py-1.5">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start px-4 py-2.5 h-auto text-sm font-medium hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors rounded-none"
            onClick={handleSaveClick}
            data-testid="button-save-message"
          >
            <Save className="w-4 h-4 mr-3 text-green-600 dark:text-green-400" />
            <span>북마크</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start px-4 py-2.5 h-auto text-sm font-medium hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors rounded-none"
            onClick={handleForwardClick}
            data-testid="button-forward-message"
          >
            <Share2 className="w-4 h-4 mr-3 text-indigo-600 dark:text-indigo-400" />
            <span>전달하기</span>
          </Button>
        </div>

        {/* 번역 & 삭제 섹션 */}
        <div className="border-t border-gray-100 dark:border-gray-800 py-1.5">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start px-4 py-2.5 h-auto text-sm font-medium hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors rounded-none"
            onClick={handleTranslateClick}
          >
            <Globe className="w-4 h-4 mr-3 text-purple-600 dark:text-purple-400" />
            <span>번역</span>
          </Button>

          {canDelete && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start px-4 py-2.5 h-auto text-sm font-medium hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors rounded-none"
              onClick={handleDeleteClick}
              data-testid="button-delete-message"
            >
              <Trash2 className="w-4 h-4 mr-3 text-red-600 dark:text-red-400" />
              <span>삭제</span>
            </Button>
          )}
        </div>
      </div>
    </>
  );
}