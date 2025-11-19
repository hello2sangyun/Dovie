import { useState, useEffect } from 'react';
import { isNativePlatform, loadPushNotifications } from '@/lib/nativeBridge';
import { navigationService } from '@/lib/navigation';
import { getApiUrl } from '@/lib/api-config';

export const useCapacitorPushNotifications = () => {
  const [isRegistered, setIsRegistered] = useState(false);
  const [token, setToken] = useState<string>('');
  const [PushNotifications, setPushNotifications] = useState<any>(null);
  const [Toast, setToast] = useState<any>(null);

  useEffect(() => {
    if (!isNativePlatform()) return;

    // Load Capacitor plugins dynamically
    Promise.all([
      loadPushNotifications(),
      import('@capacitor/toast').then(m => m.Toast)
    ]).then(([pushNotifs, toast]) => {
      if (pushNotifs) {
        setPushNotifications(pushNotifs);
        setToast(toast);
      }
    });
  }, []);

  useEffect(() => {
    if (!PushNotifications || !Toast) return;

    // iOS 네이티브 푸시 알림 초기화
    const initializePushNotifications = async () => {
      try {
        // CRITICAL: 리스너를 register() 호출 전에 먼저 등록해야 함
        // Capacitor는 register() 호출 후 즉시 이벤트를 발생시키므로
        // 리스너가 준비되어 있지 않으면 토큰을 놓치게 됨
        
        // 등록 성공 리스너 (register() 전에 설정)
        PushNotifications.addListener('registration', (token: any) => {
          console.log('📱 iOS 푸시 토큰 획득:', token.value);
          setToken(token.value);
          setIsRegistered(true);
          
          // 서버에 토큰 전송
          sendTokenToServer(token.value);
        });

        // 등록 실패 리스너 (register() 전에 설정)
        PushNotifications.addListener('registrationError', (error: any) => {
          console.error('❌ iOS 푸시 등록 실패:', error);
        });

        // 푸시 알림 수신 리스너 (앱이 포그라운드에 있을 때)
        PushNotifications.addListener('pushNotificationReceived', (notification: any) => {
          console.log('📱 푸시 알림 수신:', notification);
          
          // 네이티브 토스트로 알림 표시
          Toast.show({
            text: `${notification.title}: ${notification.body}`,
            duration: 'long'
          });
        });

        // 푸시 알림 클릭 리스너
        PushNotifications.addListener('pushNotificationActionPerformed', (notification: any) => {
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
        const result = await PushNotifications.requestPermissions();
        
        if (result.receive === 'granted') {
          // 리스너 등록 후 푸시 알림 등록
          await PushNotifications.register();
          console.log('📱 iOS 네이티브 푸시 알림 등록 성공 (리스너 대기 중)');
        } else {
          console.log('❌ 푸시 알림 권한이 거부되었습니다');
        }
      } catch (error) {
        console.error('❌ 푸시 알림 초기화 실패:', error);
      }
    };

    initializePushNotifications();

    return () => {
      // 리스너 정리
      if (PushNotifications) {
        PushNotifications.removeAllListeners();
      }
    };
  }, [PushNotifications, Toast]);

  const sendTokenToServer = async (deviceToken: string) => {
    try {
      const userId = localStorage.getItem('userId');
      if (!userId) {
        console.log('❌ 사용자 인증 정보가 없습니다');
        return;
      }

      console.log(`📱 서버로 iOS 토큰 전송 시작: ${deviceToken.substring(0, 20)}...`);

      const response = await fetch(getApiUrl('/api/push-subscription/ios'), {
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
        console.log('✅ iOS 푸시 토큰이 서버에 저장되었습니다:', result);
      } else {
        console.error('❌ iOS 푸시 토큰 저장 실패:', response.status, result);
      }
    } catch (error) {
      console.error('❌ 서버 통신 오류:', error);
    }
  };

  const checkPermissions = async () => {
    if (!PushNotifications) return false;
    const result = await PushNotifications.checkPermissions();
    return result.receive === 'granted';
  };

  const getBadgeCount = async () => {
    if (!PushNotifications) return 0;
    try {
      const result = await PushNotifications.getDeliveredNotifications();
      return result.notifications.length;
    } catch (error) {
      console.error('배지 카운트 조회 실패:', error);
      return 0;
    }
  };

  const clearBadge = async () => {
    if (!PushNotifications) return;
    try {
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
