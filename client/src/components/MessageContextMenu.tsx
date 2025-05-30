import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Save, Reply, Languages, Edit3, Globe } from "lucide-react";

interface MessageContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  onSaveMessage: () => void;
  onReplyMessage: () => void;
  onTranslateMessage: () => void;
  onEditMessage?: () => void;
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
        className="context-menu fixed z-50 bg-white/95 backdrop-blur-md border border-gray-200/60 rounded-xl shadow-xl py-2 min-w-[180px]
                   animate-in fade-in-0 zoom-in-95 duration-200"
        style={{ left: menuPosition.x, top: menuPosition.y }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-1">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start px-3 py-3 h-auto text-left rounded-lg hover:bg-blue-50/80 transition-all group"
            onClick={handleReplyClick}
          >
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center mr-3 group-hover:bg-blue-200 transition-colors">
              <Reply className="w-4 h-4 text-blue-600" />
            </div>
            <span className="font-medium text-gray-700">답장</span>
          </Button>
          
          {canEdit && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start px-3 py-3 h-auto text-left rounded-lg hover:bg-green-50/80 transition-all group"
              onClick={handleEditClick}
            >
              <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center mr-3 group-hover:bg-green-200 transition-colors">
                <Edit3 className="w-4 h-4 text-green-600" />
              </div>
              <span className="font-medium text-gray-700">수정</span>
            </Button>
          )}
          
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start px-3 py-3 h-auto text-left rounded-lg hover:bg-purple-50/80 transition-all group"
            onClick={handleSaveClick}
          >
            <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center mr-3 group-hover:bg-purple-200 transition-colors">
              <Save className="w-4 h-4 text-purple-600" />
            </div>
            <span className="font-medium text-gray-700">저장</span>
          </Button>
          
          <div className="border-t border-gray-200/50 my-1" />
          
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start px-3 py-3 h-auto text-left rounded-lg hover:bg-orange-50/80 transition-all group"
            onClick={handleTranslateClick}
          >
            <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center mr-3 group-hover:bg-orange-200 transition-colors">
              <Globe className="w-4 h-4 text-orange-600" />
            </div>
            <span className="font-medium text-gray-700">번역</span>
          </Button>
        </div>
      </div>
    </>
  );
}