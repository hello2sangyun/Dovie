import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Save } from "lucide-react";

interface MessageContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  onSaveMessage: () => void;
  visible: boolean;
}

export default function MessageContextMenu({ 
  x, 
  y, 
  onClose, 
  onSaveMessage, 
  visible 
}: MessageContextMenuProps) {
  useEffect(() => {
    if (visible) {
      const handleClickOutside = () => onClose();
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === "Escape") onClose();
      };

      document.addEventListener("click", handleClickOutside);
      document.addEventListener("keydown", handleEscape);
      
      return () => {
        document.removeEventListener("click", handleClickOutside);
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

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm animate-in fade-in-0 duration-200"
        onClick={onClose}
      />
      
      {/* Context Menu - Always centered */}
      <div
        className="fixed z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl py-2 min-w-[150px]
                   left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2
                   animate-in fade-in-0 zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start px-3 py-2 h-auto text-left"
          onClick={handleSaveClick}
        >
          <Save className="w-4 h-4 mr-2" />
          메시지 저장
        </Button>
      </div>
    </>
  );
}