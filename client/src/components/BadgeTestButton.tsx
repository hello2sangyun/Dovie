import { Button } from "@/components/ui/button";

export function BadgeTestButton() {
  const testTelegramBadge = async () => {
    try {
      console.log('🧪 Testing Telegram-style badge sequence');
      
      // Test exact count from user's screenshot: 12 (10+1+1)
      const targetCount = 12;
      
      if ('setAppBadge' in navigator) {
        // Clear first
        await navigator.clearAppBadge();
        console.log('✅ Badge cleared');
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Set to target count
        await navigator.setAppBadge(targetCount);
        console.log(`✅ Badge set to ${targetCount} (matching your unread messages)`);
        
        // Test Service Worker method too
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage({
            type: 'TELEGRAM_BADGE_UPDATE',
            count: targetCount,
            timestamp: Date.now(),
            source: 'test_button'
          });
        }
      } else {
        console.error('❌ setAppBadge API not supported');
        alert('PWA Badge API not supported on this device/browser');
      }
    } catch (error) {
      console.error('❌ Badge test failed:', error);
      alert('Badge test failed: ' + String(error));
    }
  };

  return (
    <Button onClick={testTelegramBadge} variant="outline" size="sm">
      Test Badge (12)
    </Button>
  );
}