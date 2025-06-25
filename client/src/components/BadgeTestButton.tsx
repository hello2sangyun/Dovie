import { Button } from "@/components/ui/button";

export function BadgeTestButton() {
  const testTelegramBadge = async () => {
    try {
      console.log('🧪 Telegram-style badge test');
      
      // Test different badge counts like Telegram
      const testCounts = [0, 1, 5, 12, 99, 999];
      
      for (const count of testCounts) {
        if ('setAppBadge' in navigator) {
          if (count > 0) {
            await navigator.setAppBadge(count);
            console.log(`✅ Badge set to ${count} (Telegram style)`);
          } else {
            await navigator.clearAppBadge();
            console.log('✅ Badge cleared (Telegram style)');
          }
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      // Finally set to 12 like your screenshot
      await navigator.setAppBadge(12);
      console.log('✅ Final badge set to 12');
    } catch (error) {
      console.error('❌ Telegram badge test failed:', error);
    }
  };

  return (
    <Button onClick={testTelegramBadge} variant="outline" size="sm">
      Test Telegram Badge (12)
    </Button>
  );
}