import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Languages, Loader2 } from "lucide-react";

interface TranslateModalProps {
  open: boolean;
  onClose: () => void;
  originalText: string;
  onTranslate: (targetLanguage: string) => void;
  isTranslating: boolean;
}

const languages = [
  { code: "ko", name: "한국어", flag: "🇰🇷" },
  { code: "en", name: "English", flag: "🇺🇸" },
  { code: "hu", name: "Magyar nyelv", flag: "🇭🇺" },
  { code: "de", name: "Deutsch", flag: "🇩🇪" }
];

export default function TranslateModal({ 
  open, 
  onClose, 
  originalText,
  onTranslate,
  isTranslating
}: TranslateModalProps) {
  const handleLanguageSelect = (languageCode: string) => {
    onTranslate(languageCode);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Languages className="w-5 h-5" />
            번역할 언어를 선택하세요
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-3">
          <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">원본 메시지:</p>
            <p className="text-sm">{originalText}</p>
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            {languages.map((language) => (
              <Button
                key={language.code}
                variant="outline"
                className="h-auto p-3 flex flex-col items-center gap-2"
                onClick={() => handleLanguageSelect(language.code)}
                disabled={isTranslating}
              >
                {isTranslating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <span className="text-2xl">{language.flag}</span>
                    <span className="text-sm font-medium">{language.name}</span>
                  </>
                )}
              </Button>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}