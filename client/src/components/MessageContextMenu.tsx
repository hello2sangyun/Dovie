import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Save, Reply, Edit3, Globe, Copy } from "lucide-react";

interface MessageContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  onSaveMessage: () => void;
  onReplyMessage: () => void;
  onTranslateMessage: () => void;
  onEditMessage?: () => void;
  onCopyText?: () => void;
  canEdit?: boolean;
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
  canEdit = false,
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

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-40"
        onClick={onClose}
      />
      
      {/* Context Menu - Compact and Clean Design */}
      <div
        ref={menuRef}
        className="context-menu fixed z-50 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border border-gray-200/50 dark:border-gray-700/50 rounded-xl shadow-xl shadow-black/10 py-1 min-w-[90px] max-w-[120px]"
        style={{ left: menuPosition.x, top: menuPosition.y }}
        onClick={(e) => e.stopPropagation()}
      >
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-center px-2 py-1.5 h-7 text-xs hover:bg-gray-100/80 dark:hover:bg-gray-800/80 transition-all duration-200 rounded-lg mx-1"
          onClick={handleReplyClick}
        >
          <Reply className="w-3 h-3 mr-1 text-blue-600 dark:text-blue-400" />
          답장
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-center px-2 py-1.5 h-7 text-xs hover:bg-gray-100/80 dark:hover:bg-gray-800/80 transition-all duration-200 rounded-lg mx-1"
          onClick={handleCopyClick}
        >
          <Copy className="w-3 h-3 mr-1 text-gray-600 dark:text-gray-400" />
          복사
        </Button>
        
        {canEdit && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-center px-2 py-1.5 h-7 text-xs hover:bg-gray-100/80 dark:hover:bg-gray-800/80 transition-all duration-200 rounded-lg mx-1"
            onClick={handleEditClick}
          >
            <Edit3 className="w-3 h-3 mr-1 text-orange-600 dark:text-orange-400" />
            수정
          </Button>
        )}
        
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-center px-2 py-1.5 h-7 text-xs hover:bg-gray-100/80 dark:hover:bg-gray-800/80 transition-all duration-200 rounded-lg mx-1"
          onClick={handleSaveClick}
          data-testid="button-save-message"
        >
          <Save className="w-3 h-3 mr-1 text-green-600 dark:text-green-400" />
          북마크
        </Button>
        
        <div className="border-t border-gray-200/70 dark:border-gray-600/70 my-1 mx-2" />
        
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-center px-2 py-1.5 h-7 text-xs hover:bg-gray-100/80 dark:hover:bg-gray-800/80 transition-all duration-200 rounded-lg mx-1"
          onClick={handleTranslateClick}
        >
          <Globe className="w-3 h-3 mr-1 text-purple-600 dark:text-purple-400" />
          번역
        </Button>
      </div>
    </>
  );
}