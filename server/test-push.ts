// PWA 푸시 알림 테스트 스크립트
import { sendPushNotification } from './push-notifications.js';

// 테스트 사용자 ID (실제 등록된 사용자 ID로 변경)
const TEST_USER_ID = 91; // strong 사용자

async function testPushNotification() {
  console.log('🧪 PWA 푸시 알림 테스트 시작...');
  
  try {
    await sendPushNotification(TEST_USER_ID, {
      title: 'Dovie Messenger 테스트',
      body: '푸시 알림 시스템이 정상 작동하고 있습니다!',
      badgeCount: 0, // Test notification doesn't affect badge count
      data: {
        type: 'test',
        timestamp: Date.now(),
        url: '/'
      }
    });
    
    console.log('✅ 테스트 푸시 알림 발송 완료');
  } catch (error) {
    console.error('❌ 테스트 푸시 알림 발송 실패:', error);
  }
}

// 주기적 테스트 (개발용)
if (process.env.NODE_ENV === 'development') {
  setTimeout(testPushNotification, 5000); // 5초 후 테스트
}

export { testPushNotification };