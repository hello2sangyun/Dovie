import { Button } from "@/components/ui/button";

export function BadgeTestButton() {
  const testBadge = async () => {
    try {
      console.log('🧪 배지 테스트 시작');
      
      if ('setAppBadge' in navigator) {
        await navigator.clearAppBadge();
        await navigator.setAppBadge(12);
        console.log('✅ 테스트 배지 12 설정 완료');
      } else {
        console.error('❌ setAppBadge API 지원하지 않음');
      }
    } catch (error) {
      console.error('❌ 배지 테스트 실패:', error);
    }
  };

  return (
    <Button onClick={testBadge} variant="outline" size="sm">
      배지 테스트 (12)
    </Button>
  );
}