import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { Button } from "@/components/ui/button";

export function BadgeDebugPanel() {
  const { user } = useAuth();
  const [debugInfo, setDebugInfo] = useState<string[]>([]);

  // Get unread counts for debugging
  const { data: unreadData, isSuccess } = useQuery({
    queryKey: ['/api/unread-counts'],
    enabled: !!user,
    refetchInterval: 2000,
  });

  const addDebugLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setDebugInfo(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 10)]);
  };

  useEffect(() => {
    if (isSuccess && unreadData) {
      const response = unreadData as { unreadCounts?: Array<{ chatRoomId: number; unreadCount: number }> };
      const counts = response?.unreadCounts || [];
      const total = counts.reduce((sum, room) => sum + room.unreadCount, 0);
      
      addDebugLog(`Database shows ${total} unread messages from ${counts.length} rooms`);
      
      // Check badge API support
      if ('setAppBadge' in navigator) {
        addDebugLog('PWA Badge API is supported');
      } else {
        addDebugLog('PWA Badge API NOT supported');
      }
    }
  }, [unreadData, isSuccess]);

  const testBadgeAPI = async () => {
    try {
      if ('setAppBadge' in navigator) {
        await navigator.setAppBadge(12);
        addDebugLog('✅ Successfully set badge to 12');
      } else {
        addDebugLog('❌ Badge API not available');
      }
    } catch (error) {
      addDebugLog(`❌ Badge API error: ${error}`);
    }
  };

  const clearBadge = async () => {
    try {
      if ('setAppBadge' in navigator) {
        await navigator.clearAppBadge();
        addDebugLog('✅ Badge cleared');
      }
    } catch (error) {
      addDebugLog(`❌ Clear badge error: ${error}`);
    }
  };

  if (!user) return null;

  return (
    <div className="p-4 bg-gray-50 border rounded-lg">
      <h3 className="font-semibold mb-3">Badge Debug Panel</h3>
      
      <div className="flex gap-2 mb-3">
        <Button onClick={testBadgeAPI} size="sm">Set Badge (12)</Button>
        <Button onClick={clearBadge} size="sm" variant="outline">Clear Badge</Button>
      </div>

      <div className="bg-white p-3 rounded border text-xs font-mono max-h-40 overflow-y-auto">
        {debugInfo.length === 0 ? (
          <div className="text-gray-500">No debug logs yet...</div>
        ) : (
          debugInfo.map((log, index) => (
            <div key={index} className="mb-1">{log}</div>
          ))
        )}
      </div>
    </div>
  );
}