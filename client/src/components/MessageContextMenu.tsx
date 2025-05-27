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

  // 화면 경계 내에서 위치 조정
  const adjustPosition = () => {
    const menuWidth = 150;
    const menuHeight = 50;
    const margin = 10;
    
    let adjustedX = x;
    let adjustedY = y;
    
    // 오른쪽 경계 체크
    if (x + menuWidth > window.innerWidth) {
      adjustedX = window.innerWidth - menuWidth - margin;
    }
    
    // 왼쪽 경계 체크
    if (adjustedX < margin) {
      adjustedX = margin;
    }
    
    // 아래쪽 경계 체크
    if (y + menuHeight > window.innerHeight) {
      adjustedY = y - menuHeight - margin;
    }
    
    // 위쪽 경계 체크
    if (adjustedY < margin) {
      adjustedY = margin;
    }
    
    return { x: adjustedX, y: adjustedY };
  };

  const position = adjustPosition();

  return (
    <div
      className="fixed z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-2 min-w-[150px]"
      style={{
        left: position.x,
        top: position.y,
      }}
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
  );
}