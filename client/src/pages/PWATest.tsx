import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { usePWABadge } from "@/hooks/usePWABadge";

export default function PWATest() {
  const [user] = useState({ id: 115, displayName: "딸기" });
  const { updateBadge } = usePWABadge();
  const [badgeCount, setBadgeCount] = useState(11);

  useEffect(() => {
    // Set initial badge
    updateBadge(badgeCount);
  }, [updateBadge, badgeCount]);

  const handleBadgeTest = () => {
    const newCount = badgeCount + 1;
    setBadgeCount(newCount);
    updateBadge(newCount);
  };

  const handleClearBadge = () => {
    setBadgeCount(0);
    updateBadge(0);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 to-indigo-700 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
        <div className="text-center space-y-6">
          <h1 className="text-3xl font-bold text-gray-900">
            Dovie PWA 테스트
          </h1>
          
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-lg font-medium">현재 배지 카운트</p>
              <p className="text-3xl font-bold text-purple-600">{badgeCount}</p>
            </div>
            
            <div className="space-y-3">
              <Button 
                onClick={handleBadgeTest}
                className="w-full bg-purple-600 hover:bg-purple-700"
              >
                배지 카운트 증가
              </Button>
              
              <Button 
                onClick={handleClearBadge}
                variant="outline"
                className="w-full"
              >
                배지 초기화
              </Button>
            </div>
          </div>

          <div className="text-sm text-gray-600 space-y-2">
            <p>PWA 배지 시스템 테스트</p>
            <p>iOS 16+ Safari에서 홈 화면에 추가 후 테스트</p>
          </div>
        </div>
      </div>
    </div>
  );
}