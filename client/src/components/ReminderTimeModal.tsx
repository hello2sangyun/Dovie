import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Clock, Calendar, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ReminderTimeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSetReminder: (reminderTime: Date, reminderText: string) => void;
  reminderText: string;
}

export default function ReminderTimeModal({
  isOpen,
  onClose,
  onSetReminder,
  reminderText
}: ReminderTimeModalProps) {
  const [selectedTimeOption, setSelectedTimeOption] = useState<string>('');
  const [customTime, setCustomTime] = useState('');
  const [customDate, setCustomDate] = useState('');

  const timeOptions = [
    { value: '5min', label: '5분 후', minutes: 5 },
    { value: '30min', label: '30분 후', minutes: 30 },
    { value: '1hour', label: '1시간 후', minutes: 60 },
    { value: 'tomorrow', label: '내일', minutes: 24 * 60 },
    { value: 'custom', label: '직접 설정', minutes: 0 }
  ];

  const calculateReminderTime = (option: string): Date => {
    const now = new Date();
    
    switch (option) {
      case '5min':
        return new Date(now.getTime() + 5 * 60 * 1000);
      case '30min':
        return new Date(now.getTime() + 30 * 60 * 1000);
      case '1hour':
        return new Date(now.getTime() + 60 * 60 * 1000);
      case 'tomorrow':
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(9, 0, 0, 0); // 내일 오전 9시
        return tomorrow;
      case 'custom':
        if (customDate && customTime) {
          const [year, month, day] = customDate.split('-').map(Number);
          const [hours, minutes] = customTime.split(':').map(Number);
          return new Date(year, month - 1, day, hours, minutes);
        }
        return new Date(now.getTime() + 60 * 60 * 1000); // 기본값: 1시간 후
      default:
        return new Date(now.getTime() + 60 * 60 * 1000);
    }
  };

  const handleSetReminder = () => {
    if (!selectedTimeOption) {
      return;
    }

    const reminderTime = calculateReminderTime(selectedTimeOption);
    onSetReminder(reminderTime, reminderText);
    onClose();
    
    // 상태 초기화
    setSelectedTimeOption('');
    setCustomTime('');
    setCustomDate('');
  };

  const formatDateTime = (date: Date): string => {
    return date.toLocaleString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      weekday: 'short'
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-purple-600" />
            나중에 알림 설정
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* 리마인더 내용 미리보기 */}
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600 mb-1">알림 내용:</p>
            <p className="text-sm font-medium text-gray-800 line-clamp-3">
              {reminderText}
            </p>
          </div>

          {/* 시간 옵션 선택 */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700">알림 시간을 선택하세요:</p>
            <div className="grid grid-cols-2 gap-2">
              {timeOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setSelectedTimeOption(option.value)}
                  className={cn(
                    "p-3 rounded-lg border text-sm font-medium transition-all",
                    selectedTimeOption === option.value
                      ? "border-purple-500 bg-purple-50 text-purple-700"
                      : "border-gray-200 bg-white text-gray-700 hover:border-purple-300 hover:bg-purple-25"
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* 직접 설정 옵션 */}
          {selectedTimeOption === 'custom' && (
            <div className="space-y-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm font-medium text-blue-800 flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                직접 시간 설정
              </p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-blue-600 block mb-1">날짜</label>
                  <Input
                    type="date"
                    value={customDate}
                    onChange={(e) => setCustomDate(e.target.value)}
                    className="text-sm"
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
                <div>
                  <label className="text-xs text-blue-600 block mb-1">시간</label>
                  <Input
                    type="time"
                    value={customTime}
                    onChange={(e) => setCustomTime(e.target.value)}
                    className="text-sm"
                  />
                </div>
              </div>
            </div>
          )}

          {/* 선택된 시간 미리보기 */}
          {selectedTimeOption && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-600 mb-1">알림 예정 시간:</p>
              <p className="text-sm font-semibold text-green-800">
                {formatDateTime(calculateReminderTime(selectedTimeOption))}
              </p>
            </div>
          )}

          {/* 버튼 */}
          <div className="flex space-x-3 pt-2">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              취소
            </Button>
            <Button
              onClick={handleSetReminder}
              disabled={!selectedTimeOption || (selectedTimeOption === 'custom' && (!customDate || !customTime))}
              className="flex-1 bg-purple-600 hover:bg-purple-700"
            >
              알림 설정
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}