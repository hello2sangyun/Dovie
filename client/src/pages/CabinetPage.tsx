import { useState } from "react";
import PersonFoldersList from "@/components/PersonFoldersList";
import PersonFolderDetail from "@/components/PersonFolderDetail";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";

export default function CabinetPage() {
  const [selectedFolderId, setSelectedFolderId] = useState<number | null>(null);
  const [, setLocation] = useLocation();

  if (selectedFolderId) {
    return (
      <div className="h-screen flex flex-col bg-white">
        <div className="flex-shrink-0 p-4 border-b border-gray-200 bg-white">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedFolderId(null)}
            className="text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            캐비넷으로 돌아가기
          </Button>
        </div>
        <div className="flex-1 overflow-hidden">
          <PersonFolderDetail
            folderId={selectedFolderId}
            onBack={() => setSelectedFolderId(null)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-white">
      <div className="flex-shrink-0 p-4 border-b border-gray-200 bg-white">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setLocation("/")}
          className="text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          홈으로 돌아가기
        </Button>
      </div>
      <div className="flex-1 overflow-hidden">
        <PersonFoldersList 
          onSelectFolder={(folderId) => {
            setSelectedFolderId(folderId);
          }}
        />
      </div>
    </div>
  );
}