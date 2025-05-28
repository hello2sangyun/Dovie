import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

interface LanguageSelectionModalProps {
  open: boolean;
  onClose: () => void;
  originalText: string;
  onTranslate: (text: string, targetLanguage: string) => void;
}

export default function LanguageSelectionModal({ 
  open, 
  onClose, 
  originalText, 
  onTranslate 
}: LanguageSelectionModalProps) {
  const [selectedLanguage, setSelectedLanguage] = useState<string>("");

  const languages = [
    { code: "Korean", name: "한국어", flag: "🇰🇷" },
    { code: "English", name: "English", flag: "🇺🇸" },
    { code: "Hungarian", name: "Magyar", flag: "🇭🇺" },
    { code: "Japanese", name: "日本語", flag: "🇯🇵" },
    { code: "Chinese", name: "中文", flag: "🇨🇳" },
    { code: "Spanish", name: "Español", flag: "🇪🇸" },
    { code: "French", name: "Français", flag: "🇫🇷" },
    { code: "German", name: "Deutsch", flag: "🇩🇪" }
  ];

  const handleTranslate = () => {
    if (selectedLanguage && originalText) {
      onTranslate(originalText, selectedLanguage);
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>번역할 언어를 선택하세요</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600 mb-1">번역할 텍스트:</p>
            <p className="font-medium">{originalText}</p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {languages.map((language) => (
              <Button
                key={language.code}
                variant={selectedLanguage === language.code ? "default" : "outline"}
                className={`h-auto p-3 flex flex-col items-center space-y-1 ${
                  selectedLanguage === language.code 
                    ? "bg-purple-600 hover:bg-purple-700" 
                    : "hover:bg-purple-50"
                }`}
                onClick={() => setSelectedLanguage(language.code)}
              >
                <span className="text-lg">{language.flag}</span>
                <span className="text-sm font-medium">{language.name}</span>
              </Button>
            ))}
          </div>

          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={onClose}>
              취소
            </Button>
            <Button 
              onClick={handleTranslate}
              disabled={!selectedLanguage}
              className="purple-gradient hover:purple-gradient-hover"
            >
              번역하기
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}