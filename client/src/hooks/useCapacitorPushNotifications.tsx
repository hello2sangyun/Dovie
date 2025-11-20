import { useState, useEffect } from 'react';
import { isNativePlatform } from '@/lib/nativeBridge';
import { navigationService } from '@/lib/navigation';

export const useCapacitorPushNotifications = () => {
  const [isRegistered, setIsRegistered] = useState(false);
  const [token, setToken] = useState<string>('');
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    console.log('🔧 ========================================');
    console.log('🔧 useCapacitorPushNotifications 훅 시작');
    console.log('🔧 ========================================');
    
    const isPlatformNative = isNativePlatform();
    console.log('🔧 isNativePlatform() 체크:', isPlatformNative);
    
    if (!isPlatformNative) {
      console.log('⚠️ 네이티브 플랫폼이 아님 - Capacitor 푸시 훅 종료');
      return;
    }

    console.log('✅ 네이티브 플랫폼 확인됨 - 플러그인 초기화 시작');
    
    // 네이티브 환경에서만 실행되므로 Capacitor 플러그인이 window에 있을 것
    const capacitor = (window as any).Capacitor;
    
    if (!capacitor) {
      console.error('❌ window.Capacitor가 없습니다!');
      return;
    }
    
    console.log('✅ window.Capacitor 확인됨:', capacitor);
    console.log('✅ Capacitor.Plugins:', capacitor.Plugins);
    
    setIsInitialized(true);
  }, []);

  useEffect(() => {
    if (!isInitialized) {
      console.log('⚠️ 아직 초기화되지 않음 - 대기 중');
      return;
    }

    console.log('✅ 초기화 완료 - 푸시 알림 설정 시작');

    const initializePushNotifications = async () => {
      try {
        // Capacitor 플러그인을 window에서 직접 가져오기
        const { PushNotifications } = await import('@capacitor/push-notifications');
        const { Toast } = await import('@capacitor/toast');
        
        console.log('✅ 플러그인 import 성공:', {
          PushNotifications: !!PushNotifications,
          Toast: !!Toast
        });
        
        // 등록 성공 리스너 (register() 전에 설정)
        await PushNotifications.addListener('registration', (token: any) => {
          console.log('📱 ========================================');
          console.log('📱 iOS APNS 푸시 토큰 획득 성공!');
          console.log('📱 Token:', token.value);
          console.log('📱 Token Length:', token.value.length);
          console.log('📱 ========================================');
          setToken(token.value);
          setIsRegistered(true);
          
          // 서버에 토큰 전송
          sendTokenToServer(token.value);
        });

        // 등록 실패 리스너 (register() 전에 설정)
        await PushNotifications.addListener('registrationError', (error: any) => {
          console.error('❌ ========================================');
          console.error('❌ iOS 푸시 등록 실패!');
          console.error('❌ Error:', error);
          console.error('❌ ========================================');
        });

        // 푸시 알림 수신 리스너 (앱이 포그라운드에 있을 때)
        await PushNotifications.addListener('pushNotificationReceived', (notification: any) => {
          console.log('📱 푸시 알림 수신:', notification);
          
          // 네이티브 토스트로 알림 표시
          Toast.show({
            text: `${notification.title}: ${notification.body}`,
            duration: 'long'
          });
        });

        // 푸시 알림 클릭 리스너
        await PushNotifications.addListener('pushNotificationActionPerformed', (notification: any) => {
          console.log('📱 푸시 알림 클릭:', notification);
          
          // 채팅방으로 이동하는 로직 구현
          const data = notification.notification.data;
          if (data && data.chatRoomId) {
            const chatRoomId = data.chatRoomId;
            const targetPath = `/chat-rooms/${chatRoomId}`;
            
            // Check if navigation service is registered (app is running)
            if (navigationService.isRegistered()) {
              console.log('✅ App is running - navigating immediately to:', targetPath);
              navigationService.navigate(targetPath);
            } else {
              // Cold start - app is being opened from notification
              console.log('❄️ Cold start detected - saving pendingDeepLink to localStorage:', targetPath);
              localStorage.setItem('pendingDeepLink', targetPath);
            }
          }
        });

        // 권한 요청
        console.log('📱 iOS 푸시 알림 권한 요청 중...');
        const result = await PushNotifications.requestPermissions();
        console.log('📱 권한 요청 결과:', result);
        
        if (result.receive === 'granted') {
          // 리스너 등록 후 푸시 알림 등록
          console.log('✅ 권한 허용됨 - APNS 등록 시작');
          await PushNotifications.register();
          console.log('📱 iOS 네이티브 푸시 알림 등록 완료 (토큰 수신 대기 중)');
        } else {
          console.error('❌ 푸시 알림 권한이 거부되었습니다:', result);
        }
      } catch (error) {
        console.error('❌ 푸시 알림 초기화 실패:', error);
        console.error('❌ Error details:', {
          message: error instanceof Error ? error.message : 'Unknown',
          stack: error instanceof Error ? error.stack : undefined
        });
      }
    };

    initializePushNotifications();
  }, [isInitialized]);

  const sendTokenToServer = async (deviceToken: string) => {
    try {
      const userId = localStorage.getItem('userId');
      if (!userId) {
        console.error('❌ 사용자 인증 정보가 없습니다 - iOS 토큰을 서버에 저장할 수 없습니다');
        return;
      }

      console.log('📱 ========================================');
      console.log('📱 서버로 iOS APNS 토큰 전송 시작');
      console.log('📱 User ID:', userId);
      console.log('📱 Token Preview:', deviceToken.substring(0, 20) + '...');
      console.log('📱 Endpoint:', '/api/push-subscription/ios');
      console.log('📱 ========================================');

      const response = await fetch('/api/push-subscription/ios', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId,
        },
        body: JSON.stringify({
          deviceToken,
          platform: 'ios'
        }),
      });

      const result = await response.json();
      
      if (response.ok) {
        console.log('✅ ========================================');
        console.log('✅ iOS 푸시 토큰이 서버에 저장되었습니다!');
        console.log('✅ Response:', result);
        console.log('✅ ========================================');
      } else {
        console.error('❌ ========================================');
        console.error('❌ iOS 푸시 토큰 저장 실패!');
        console.error('❌ Status:', response.status);
        console.error('❌ Response:', result);
        console.error('❌ ========================================');
      }
    } catch (error) {
      console.error('❌ ========================================');
      console.error('❌ 서버 통신 오류!');
      console.error('❌ Error:', error);
      console.error('❌ ========================================');
    }
  };

  const checkPermissions = async () => {
    if (!isInitialized) return false;
    try {
      const { PushNotifications } = await import('@capacitor/push-notifications');
      const result = await PushNotifications.checkPermissions();
      return result.receive === 'granted';
    } catch {
      return false;
    }
  };

  const getBadgeCount = async () => {
    if (!isInitialized) return 0;
    try {
      const { PushNotifications } = await import('@capacitor/push-notifications');
      const result = await PushNotifications.getDeliveredNotifications();
      return result.notifications.length;
    } catch (error) {
      console.error('배지 카운트 조회 실패:', error);
      return 0;
    }
  };

  const clearBadge = async () => {
    if (!isInitialized) return;
    try {
      const { PushNotifications } = await import('@capacitor/push-notifications');
      await PushNotifications.removeAllDeliveredNotifications();
      console.log('✅ iOS 앱 배지 클리어 완료');
    } catch (error) {
      console.error('❌ 배지 클리어 실패:', error);
    }
  };

  return {
    isRegistered,
    token,
    checkPermissions,
    getBadgeCount,
    clearBadge
  };
};
