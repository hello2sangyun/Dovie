import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Save, Reply, Languages, Edit3, Globe, FileText, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface MessageContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  onSaveMessage: () => void;
  onReplyMessage: () => void;
  onTranslateMessage: () => void;
  onSummarizeMessage?: () => void;
  onEditMessage?: () => void;
  onCopyText?: () => void;
  canEdit?: boolean;
  canSummarize?: boolean;
  visible: boolean;
}

export default function MessageContextMenu({ 
  x, 
  y, 
  onClose, 
  onSaveMessage,
  onReplyMessage,
  onTranslateMessage,
  onSummarizeMessage,
  onEditMessage,
  onCopyText,
  canEdit = false,
  canSummarize = false,
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

  const handleSummarizeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSummarizeMessage?.();
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
        className="context-menu fixed z-50 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg py-1 min-w-[120px]"
        style={{ left: menuPosition.x, top: menuPosition.y }}
        onClick={(e) => e.stopPropagation()}
      >
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start px-3 py-2 h-8 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          onClick={handleReplyClick}
        >
          <Reply className="w-3 h-3 mr-2 text-gray-600 dark:text-gray-300" />
          <span className="text-gray-700 dark:text-gray-200">답장</span>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start px-3 py-2 h-8 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          onClick={handleCopyClick}
        >
          <Copy className="w-3 h-3 mr-2 text-gray-600 dark:text-gray-300" />
          <span className="text-gray-700 dark:text-gray-200">텍스트 복사</span>
        </Button>
        
        {canEdit && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start px-3 py-2 h-8 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            onClick={handleEditClick}
          >
            <Edit3 className="w-3 h-3 mr-2 text-gray-600 dark:text-gray-300" />
            <span className="text-gray-700 dark:text-gray-200">수정</span>
          </Button>
        )}
        
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start px-3 py-2 h-8 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          onClick={handleSaveClick}
        >
          <Save className="w-3 h-3 mr-2 text-gray-600 dark:text-gray-300" />
          <span className="text-gray-700 dark:text-gray-200">저장</span>
        </Button>
        
        <div className="border-t border-gray-200 dark:border-gray-600 my-1" />
        
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start px-3 py-2 h-8 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          onClick={handleTranslateClick}
        >
          <Globe className="w-3 h-3 mr-2 text-gray-600 dark:text-gray-300" />
          <span className="text-gray-700 dark:text-gray-200">번역</span>
        </Button>
        
        {canSummarize && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start px-3 py-2 h-8 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            onClick={handleSummarizeClick}
          >
            <FileText className="w-3 h-3 mr-2 text-gray-600 dark:text-gray-300" />
            <span className="text-gray-700 dark:text-gray-200">요약</span>
          </Button>
        )}
      </div>
    </>
  );
}