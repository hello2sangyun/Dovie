import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Reply, Copy, Edit3 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface MessageContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  onReplyMessage: () => void;
  onEditMessage?: () => void;
  onCopyText?: () => void;
  canEdit?: boolean;
  visible: boolean;
}

export default function MessageContextMenu({ 
  x, 
  y, 
  onClose, 
  onReplyMessage,
  onEditMessage,
  onCopyText,
  canEdit = false,
  visible 
}: MessageContextMenuProps) {
  const { toast } = useToast();
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

  const handleReplyClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onReplyMessage();
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
      
      {/* Context Menu */}
      <div
        ref={menuRef}
        className="context-menu fixed z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl py-2 min-w-[140px] backdrop-blur-sm"
        style={{ left: menuPosition.x, top: menuPosition.y }}
        onClick={(e) => e.stopPropagation()}
      >
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start px-4 py-3 h-auto text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all duration-200 rounded-none border-0"
          onClick={handleReplyClick}
        >
          <Reply className="w-4 h-4 mr-3 text-blue-600 dark:text-blue-400" />
          <span className="text-gray-800 dark:text-gray-200 font-medium">답장</span>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start px-4 py-3 h-auto text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all duration-200 rounded-none border-0"
          onClick={handleCopyClick}
        >
          <Copy className="w-4 h-4 mr-3 text-green-600 dark:text-green-400" />
          <span className="text-gray-800 dark:text-gray-200 font-medium">복사</span>
        </Button>
        
        {canEdit && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start px-4 py-3 h-auto text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all duration-200 rounded-none border-0"
            onClick={handleEditClick}
          >
            <Edit3 className="w-4 h-4 mr-3 text-purple-600 dark:text-purple-400" />
            <span className="text-gray-800 dark:text-gray-200 font-medium">수정</span>
          </Button>
        )}
      </div>
    </>
  );
}