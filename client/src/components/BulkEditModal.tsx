import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { X, Plus, Save } from "lucide-react";

interface PersonFolder {
  id: number;
  personName: string;
  folderName?: string;
  contact?: {
    company?: string;
    jobTitle?: string;
    email?: string;
    phone?: string;
  } | null;
}

interface BulkEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedFolders: Set<number>;
  folders: PersonFolder[];
  onComplete: () => void;
}

interface BulkEditData {
  company?: string;
  jobTitle?: string;
  tags?: string[];
  notes?: string;
  category?: string;
}

export default function BulkEditModal({ 
  isOpen, 
  onClose, 
  selectedFolders, 
  folders,
  onComplete 
}: BulkEditModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [editData, setEditData] = useState<BulkEditData>({
    company: "",
    jobTitle: "",
    tags: [],
    notes: "",
    category: ""
  });
  
  const [newTag, setNewTag] = useState("");

  const selectedFolderData = folders.filter(folder => selectedFolders.has(folder.id));

  const bulkEditMutation = useMutation({
    mutationFn: async (data: BulkEditData) => {
      const folderIds = Array.from(selectedFolders);
      return apiRequest("/api/person-folders/bulk-edit", "POST", {
        folderIds,
        editData: data
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/person-folders"] });
      toast({
        title: "일괄 편집 완료",
        description: `${selectedFolders.size}개 폴더가 성공적으로 업데이트되었습니다.`,
      });
      onComplete();
      onClose();
    },
    onError: (error) => {
      toast({
        title: "일괄 편집 실패",
        description: error instanceof Error ? error.message : "일괄 편집 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  const handleAddTag = () => {
    if (newTag.trim() && !editData.tags?.includes(newTag.trim())) {
      setEditData(prev => ({
        ...prev,
        tags: [...(prev.tags || []), newTag.trim()]
      }));
      setNewTag("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setEditData(prev => ({
      ...prev,
      tags: prev.tags?.filter(tag => tag !== tagToRemove) || []
    }));
  };

  const handleSave = () => {
    // Filter out empty values
    const cleanedData = Object.fromEntries(
      Object.entries(editData).filter(([_, value]) => {
        if (Array.isArray(value)) return value.length > 0;
        return value && value.trim() !== "";
      })
    );

    if (Object.keys(cleanedData).length === 0) {
      toast({
        title: "변경사항 없음",
        description: "편집할 항목을 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    bulkEditMutation.mutate(cleanedData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Save className="w-5 h-5 mr-2 text-blue-600" />
            일괄 편집 ({selectedFolders.size}개 선택)
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Selected Folders Preview */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">선택된 폴더</h4>
            <div className="flex flex-wrap gap-2 max-h-20 overflow-y-auto">
              {selectedFolderData.map((folder) => (
                <Badge key={folder.id} variant="secondary" className="text-xs">
                  {folder.personName}
                </Badge>
              ))}
            </div>
          </div>

          {/* Edit Fields */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="company">회사명</Label>
                <Input
                  id="company"
                  value={editData.company || ""}
                  onChange={(e) => setEditData(prev => ({ ...prev, company: e.target.value }))}
                  placeholder="회사명을 입력하세요"
                />
              </div>
              <div>
                <Label htmlFor="jobTitle">직책</Label>
                <Input
                  id="jobTitle"
                  value={editData.jobTitle || ""}
                  onChange={(e) => setEditData(prev => ({ ...prev, jobTitle: e.target.value }))}
                  placeholder="직책을 입력하세요"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="category">카테고리</Label>
              <Select value={editData.category || ""} onValueChange={(value) => setEditData(prev => ({ ...prev, category: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="카테고리를 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="business">비즈니스</SelectItem>
                  <SelectItem value="networking">네트워킹</SelectItem>
                  <SelectItem value="client">클라이언트</SelectItem>
                  <SelectItem value="supplier">공급업체</SelectItem>
                  <SelectItem value="partner">파트너</SelectItem>
                  <SelectItem value="personal">개인</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="tags">태그</Label>
              <div className="flex gap-2 mb-2">
                <Input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  placeholder="태그를 입력하세요"
                  onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                />
                <Button type="button" onClick={handleAddTag} size="sm">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              {editData.tags && editData.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {editData.tags.map((tag, index) => (
                    <Badge key={index} variant="outline" className="cursor-pointer" onClick={() => handleRemoveTag(tag)}>
                      {tag}
                      <X className="w-3 h-3 ml-1" />
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div>
              <Label htmlFor="notes">메모</Label>
              <Textarea
                id="notes"
                value={editData.notes || ""}
                onChange={(e) => setEditData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="공통 메모를 입력하세요"
                rows={3}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3 pt-4">
            <Button 
              onClick={handleSave} 
              className="flex-1"
              disabled={bulkEditMutation.isPending}
            >
              {bulkEditMutation.isPending ? "저장 중..." : "변경사항 저장"}
            </Button>
            <Button variant="outline" onClick={onClose} className="flex-1">
              취소
            </Button>
          </div>

          <div className="text-xs text-gray-500 bg-yellow-50 p-3 rounded">
            <strong>참고:</strong> 입력한 정보는 선택된 모든 폴더에 추가되거나 업데이트됩니다. 
            빈 필드는 변경되지 않습니다.
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}