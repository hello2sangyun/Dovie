import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { OptimizedAvatar } from "@/components/OptimizedAvatar";
import PrismAvatar from "@/components/PrismAvatar";
import { 
  FolderOpen, 
  Search, 
  Plus, 
  FileText, 
  Image, 
  Mic,
  MoreVertical,
  Clock,
  ChevronRight,
  Trash2,
  Download,
  X,
  CheckSquare,
  Square
} from "lucide-react";
import { cn, getInitials, getAvatarColor } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import BulkEditModal from "@/components/BulkEditModal";

interface PersonFolder {
  id: number;
  userId: number;
  contactId?: number | null;
  personName: string;
  folderName?: string;
  avatarUrl?: string;
  lastActivity: string;
  itemCount: number;
  businessCardImage?: string;
  contact?: {
    id: number;
    name?: string;
    nickname?: string;
    email?: string;
    phone?: string;
    company?: string;
    jobTitle?: string;
  } | null;
}

interface PersonFoldersListProps {
  onSelectFolder: (folderId: number) => void;
  onScanCard?: () => void;
}

export default function PersonFoldersList({ onSelectFolder }: PersonFoldersListProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBusinessCard, setSelectedBusinessCard] = useState<{
    imageUrl: string;
    personName: string;
  } | null>(null);
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedFolders, setSelectedFolders] = useState<Set<number>>(new Set());
  const [showBulkEdit, setShowBulkEdit] = useState(false);

  const { data: folders = [], isLoading } = useQuery<PersonFolder[]>({
    queryKey: ["/api/person-folders"],
    enabled: !!user,
    staleTime: 30000, // Keep data fresh for 30s
    refetchInterval: false, // Disable automatic refetching
  });

  const deleteMultipleFoldersMutation = useMutation({
    mutationFn: async (folderIds: number[]) => {
      return apiRequest("/api/person-folders/bulk", "DELETE", { folderIds });
    },
    onSuccess: (_, folderIds) => {
      queryClient.invalidateQueries({ queryKey: ["/api/person-folders"] });
      setSelectedFolders(new Set());
      setIsSelectMode(false);
      toast({
        title: "폴더 삭제 완료",
        description: `${folderIds.length}개 폴더가 성공적으로 삭제되었습니다.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "삭제 실패",
        description: error?.message || "일부 폴더 삭제에 실패했습니다.",
        variant: "destructive",
      });
    },
  });

  const handleSelectFolder = (folderId: number) => {
    const newSelected = new Set(selectedFolders);
    if (newSelected.has(folderId)) {
      newSelected.delete(folderId);
    } else {
      newSelected.add(folderId);
    }
    setSelectedFolders(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedFolders.size === filteredFolders.length) {
      setSelectedFolders(new Set());
    } else {
      setSelectedFolders(new Set(filteredFolders.map(f => f.id)));
    }
  };

  const handleDeleteSelected = () => {
    if (selectedFolders.size === 0) return;
    
    const folderNames = filteredFolders
      .filter(f => selectedFolders.has(f.id))
      .map(f => f.personName || f.folderName || "이름 없음")
      .join(", ");
    
    if (confirm(`선택한 ${selectedFolders.size}개 폴더를 삭제하시겠습니까?\n\n폴더: ${folderNames}\n\n이 작업은 되돌릴 수 없습니다.`)) {
      const folderIdsArray = Array.from(selectedFolders);
      console.log('Deleting folder IDs:', folderIdsArray);
      console.log('Folder IDs types:', folderIdsArray.map(id => ({ id, type: typeof id, isValid: Number.isInteger(id) && id > 0 })));
      
      // Validate all IDs before sending
      const validIds = folderIdsArray.filter(id => Number.isInteger(id) && id > 0);
      if (validIds.length !== folderIdsArray.length) {
        console.error('Some folder IDs are invalid:', folderIdsArray);
        toast({
          title: "삭제 실패",
          description: "잘못된 폴더 ID가 감지되었습니다.",
          variant: "destructive",
        });
        return;
      }
      
      deleteMultipleFoldersMutation.mutate(validIds);
    }
  };

  const toggleSelectMode = () => {
    setIsSelectMode(!isSelectMode);
    if (isSelectMode) {
      setSelectedFolders(new Set());
    }
  };

  const filteredFolders = folders.filter((folder: PersonFolder) =>
    (folder.folderName || folder.personName).toLowerCase().includes(searchTerm.toLowerCase()) ||
    folder.personName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    folder.contact?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    folder.contact?.company?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getItemTypeIcon = (itemCount: number) => {
    if (itemCount === 0) return <FolderOpen className="w-5 h-5 text-gray-400" />;
    return <FolderOpen className="w-5 h-5 text-blue-500" />;
  };

  const getContactDisplayName = (folder: PersonFolder) => {
    if (folder.contact) {
      return folder.contact.nickname || folder.contact.name || folder.contact.email || folder.personName;
    }
    return folder.personName || "이름 없음";
  };

  const getContactSubtitle = (folder: PersonFolder) => {
    if (folder.contact) {
      const parts = [];
      if (folder.contact.jobTitle) parts.push(folder.contact.jobTitle);
      if (folder.contact.company) parts.push(folder.contact.company);
      return parts.join(" • ") || folder.contact.phone || folder.contact.email || "";
    }
    return folder.folderName || "";
  };

  const handleDownloadBusinessCard = (imageUrl: string, personName: string) => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `${personName}_명함.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-500">폴더 목록을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-white sticky top-0 z-10">
        <div className="flex flex-col gap-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold text-gray-900">Cabinet</h1>
            {!isSelectMode && (
              <Button
                onClick={() => setLocation("/scan")}
                size="sm"
                className="bg-blue-500 hover:bg-blue-600 h-10 px-4"
              >
                <Plus className="w-4 h-4 mr-2" />
                명함 스캔
              </Button>
            )}
          </div>
          
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              type="text"
              placeholder="사람 이름, 회사명으로 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-gray-50 border-gray-200 h-12 text-base"
            />
          </div>
          
          {/* Mobile-optimized Actions */}
          {!isSelectMode ? (
            <div className="flex justify-center">
              <Button
                onClick={toggleSelectMode}
                variant="outline"
                className="border-gray-300 text-gray-700 hover:bg-gray-50 h-10 px-6"
              >
                <CheckSquare className="w-4 h-4 mr-2" />
                선택하기
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Selection Controls */}
              <div className="flex items-center justify-between">
                <Button
                  onClick={handleSelectAll}
                  variant="outline"
                  className="border-gray-300 text-gray-700 hover:bg-gray-50 h-10 px-4"
                >
                  {selectedFolders.size === filteredFolders.length ? (
                    <>
                      <CheckSquare className="w-4 h-4 mr-2" />
                      전체 해제
                    </>
                  ) : (
                    <>
                      <Square className="w-4 h-4 mr-2" />
                      전체 선택
                    </>
                  )}
                </Button>
                <Button
                  onClick={toggleSelectMode}
                  variant="outline"
                  className="border-gray-300 text-gray-700 hover:bg-gray-50 h-10 px-4"
                >
                  <X className="w-4 h-4 mr-2" />
                  취소
                </Button>
              </div>
              
              {/* Action Buttons - Full Width for Mobile */}
              {selectedFolders.size > 0 && (
                <div className="flex gap-2">
                  <Button
                    onClick={() => setShowBulkEdit(true)}
                    variant="outline"
                    className="flex-1 border-blue-300 text-blue-700 hover:bg-blue-50 h-12"
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    {`${selectedFolders.size}개 편집`}
                  </Button>
                  <Button
                    onClick={handleDeleteSelected}
                    variant="destructive"
                    disabled={deleteMultipleFoldersMutation.isPending}
                    className="flex-1 h-12"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    {deleteMultipleFoldersMutation.isPending ? "삭제 중..." : `${selectedFolders.size}개 삭제`}
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {filteredFolders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center px-4">
            <FolderOpen className="w-16 h-16 text-gray-300 mb-4" />
            {folders.length === 0 ? (
              <>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  아직 폴더가 없습니다
                </h3>
                <p className="text-gray-500 mb-6 max-w-sm">
                  명함을 스캔하면 자동으로 사람별 폴더가 생성됩니다. 
                  폴더에는 명함, One Pager, 채팅 파일이 정리됩니다.
                </p>
                <Button
                  onClick={() => setLocation("/scan")}
                  className="bg-blue-500 hover:bg-blue-600"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  첫 명함 스캔하기
                </Button>
              </>
            ) : (
              <>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  검색 결과가 없습니다
                </h3>
                <p className="text-gray-500">
                  다른 검색어를 시도해보세요.
                </p>
              </>
            )}
          </div>
        ) : (
          <div className="p-3 space-y-1">
            {filteredFolders.map((folder: PersonFolder) => (
              <div
                key={folder.id}
                onClick={(e) => {
                  if (isSelectMode) {
                    e.preventDefault();
                    e.stopPropagation();
                    handleSelectFolder(folder.id);
                  } else {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('Folder clicked:', folder.id, folder.personName);
                    onSelectFolder(folder.id);
                  }
                }}
                className={cn(
                  "bg-white border rounded-lg p-4 transition-colors cursor-pointer touch-manipulation select-none min-h-[76px]",
                  isSelectMode && selectedFolders.has(folder.id)
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-100 hover:bg-gray-50 active:bg-gray-100"
                )}
                role="button"
                tabIndex={0}
              >
                <div className="flex items-center space-x-4">
                  {/* Selection Checkbox (only in select mode) */}
                  {isSelectMode && (
                    <div className="flex-shrink-0">
                      {selectedFolders.has(folder.id) ? (
                        <CheckSquare className="w-6 h-6 text-blue-500" />
                      ) : (
                        <Square className="w-6 h-6 text-gray-400" />
                      )}
                    </div>
                  )}

                  {/* Avatar */}
                  <div className="relative flex-shrink-0">
                    {getContactDisplayName(folder) ? (
                      <PrismAvatar
                        fallback={getInitials(getContactDisplayName(folder))}
                        size="md"
                        className="w-12 h-12"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                        <FolderOpen className="w-5 h-5 text-gray-400" />
                      </div>
                    )}
                    {folder.itemCount > 0 && (
                      <div className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium">
                        {folder.itemCount > 99 ? '99+' : folder.itemCount}
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center justify-between w-full">
                        <h3 className="font-medium text-gray-900 truncate text-sm">
                          {getContactDisplayName(folder)}
                        </h3>
                        {!isSelectMode && (
                          <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        )}
                      </div>
                      {!isSelectMode && (
                        <div className="flex items-center text-xs text-gray-400 flex-shrink-0">
                          <span>
                            {folder.itemCount > 0 
                              ? `${folder.itemCount}개` 
                              : "빈 폴더"
                            }
                          </span>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between mt-0.5">
                      <p className="text-xs text-gray-500 truncate">
                        {getContactSubtitle(folder) || "연락처 정보 없음"}
                      </p>
                      <div className="flex items-center text-xs text-gray-400 ml-2 flex-shrink-0">
                        <Clock className="w-3 h-3 mr-1" />
                        <span>
                          {formatDistanceToNow(new Date(folder.lastActivity), {
                            addSuffix: true,
                            locale: ko
                          })}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Arrow indicator */}
                  <div className="flex-shrink-0">
                    <ChevronRight className="w-4 h-4 text-gray-300" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Business Card Modal */}
      <Dialog open={!!selectedBusinessCard} onOpenChange={() => setSelectedBusinessCard(null)}>
        <DialogContent className="max-w-2xl p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>{selectedBusinessCard?.personName}님의 명함</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (selectedBusinessCard) {
                    handleDownloadBusinessCard(selectedBusinessCard.imageUrl, selectedBusinessCard.personName);
                  }
                }}
                className="flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                다운로드
              </Button>
            </DialogTitle>
          </DialogHeader>
          
          {selectedBusinessCard && (
            <div className="relative">
              <img
                src={selectedBusinessCard.imageUrl}
                alt={`${selectedBusinessCard.personName}님의 명함`}
                className="w-full h-auto rounded-lg border border-gray-200 shadow-lg"
                onError={(e) => {
                  e.currentTarget.src = '/api/placeholder/400/250';
                }}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Bulk Edit Modal */}
      <BulkEditModal
        isOpen={showBulkEdit}
        onClose={() => setShowBulkEdit(false)}
        selectedFolders={selectedFolders}
        folders={filteredFolders}
        onComplete={() => {
          setSelectedFolders(new Set());
          setIsSelectMode(false);
        }}
      />
    </div>
  );
}