import { useState, useEffect } from "react";
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
        className="fixed z-50 bg-white/95 backdrop-blur-md border border-gray-200/60 rounded-xl shadow-xl py-2 min-w-[180px]
                   animate-in fade-in-0 zoom-in-95 duration-200"
        style={{ left: x, top: y }}
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