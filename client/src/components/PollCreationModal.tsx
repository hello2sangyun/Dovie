import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface PollCreationModalProps {
  open: boolean;
  onClose: () => void;
  question: string;
  onCreatePoll: (question: string, options: string[]) => void;
}

export default function PollCreationModal({ 
  open, 
  onClose, 
  question, 
  onCreatePoll 
}: PollCreationModalProps) {
  const [pollQuestion, setPollQuestion] = useState(question);
  const [options, setOptions] = useState<string[]>(["", ""]);

  const handleAddOption = () => {
    if (options.length < 5) {
      setOptions([...options, ""]);
    }
  };

  const handleRemoveOption = (index: number) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
    }
  };

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const handleCreatePoll = () => {
    const validOptions = options.filter(option => option.trim() !== "");
    if (pollQuestion.trim() && validOptions.length >= 2) {
      onCreatePoll(pollQuestion.trim(), validOptions);
      onClose();
      // 초기화
      setPollQuestion("");
      setOptions(["", ""]);
    }
  };

  const canCreatePoll = pollQuestion.trim() && options.filter(option => option.trim() !== "").length >= 2;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>투표 만들기</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="poll-question">질문</Label>
            <Input
              id="poll-question"
              value={pollQuestion}
              onChange={(e) => setPollQuestion(e.target.value)}
              placeholder="투표 질문을 입력하세요"
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            <Label>선택지 (최소 2개, 최대 5개)</Label>
            <div className="space-y-2">
              {options.map((option, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <Input
                    value={option}
                    onChange={(e) => handleOptionChange(index, e.target.value)}
                    placeholder={`선택지 ${index + 1}`}
                    className="flex-1"
                  />
                  {options.length > 2 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveOption(index)}
                      className="p-1 h-8 w-8"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
            
            {options.length < 5 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleAddOption}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                선택지 추가
              </Button>
            )}
          </div>
        </div>

        <div className="flex justify-end space-x-2 pt-4">
          <Button variant="outline" onClick={onClose}>
            취소
          </Button>
          <Button 
            onClick={handleCreatePoll}
            disabled={!canCreatePoll}
            className={cn(
              "bg-purple-600 hover:bg-purple-700 text-white",
              !canCreatePoll && "opacity-50 cursor-not-allowed"
            )}
          >
            투표 만들기
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}