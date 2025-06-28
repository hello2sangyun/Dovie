import { useState, useEffect } from 'react';
import { PushNotifications } from '@capacitor/push-notifications';
import { Toast } from '@capacitor/toast';
import { Capacitor } from '@capacitor/core';

export const useCapacitorPushNotifications = () => {
  const [isRegistered, setIsRegistered] = useState(false);
  const [token, setToken] = useState<string>('');

  useEffect(() => {
    // iOS 네이티브 푸시 알림 초기화
    const initializePushNotifications = async () => {
      try {
        // 권한 요청
        const result = await PushNotifications.requestPermissions();
        
        if (result.receive === 'granted') {
          // 푸시 알림 등록
          await PushNotifications.register();
          console.log('📱 iOS 네이티브 푸시 알림 등록 성공');
          
          // 등록 성공 리스너
          PushNotifications.addListener('registration', (token) => {
            console.log('📱 iOS 푸시 토큰 획득:', token.value);
            setToken(token.value);
            setIsRegistered(true);
            
            // 서버에 토큰 전송
            sendTokenToServer(token.value);
          });

          // 등록 실패 리스너
          PushNotifications.addListener('registrationError', (error) => {
            console.error('❌ iOS 푸시 등록 실패:', error);
          });

          // 푸시 알림 수신 리스너 (앱이 포그라운드에 있을 때)
          PushNotifications.addListener('pushNotificationReceived', (notification) => {
            console.log('📱 푸시 알림 수신:', notification);
            
            // 네이티브 토스트로 알림 표시
            Toast.show({
              text: `${notification.title}: ${notification.body}`,
              duration: 'long'
            });
          });

          // 푸시 알림 클릭 리스너
          PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
            console.log('📱 푸시 알림 클릭:', notification);
            
            // 채팅방으로 이동하는 로직 구현
            const data = notification.notification.data;
            if (data && data.chatRoomId) {
              // 채팅방으로 네비게이션
              window.location.href = `#/chat/${data.chatRoomId}`;
            }
          });

        } else {
          console.log('❌ 푸시 알림 권한이 거부되었습니다');
        }
      } catch (error) {
        console.error('❌ 푸시 알림 초기화 실패:', error);
      }
    };

    // Capacitor 환경에서만 실행
    if (Capacitor.isNativePlatform()) {
      initializePushNotifications();
    }

    return () => {
      // 리스너 정리
      PushNotifications.removeAllListeners();
    };
  }, []);

  const sendTokenToServer = async (deviceToken: string) => {
    try {
      const response = await fetch('/api/push-subscription/ios', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          deviceToken,
          platform: 'ios'
        }),
      });

      if (response.ok) {
        console.log('✅ iOS 푸시 토큰이 서버에 저장되었습니다');
      } else {
        console.error('❌ iOS 푸시 토큰 저장 실패');
      }
    } catch (error) {
      console.error('❌ 서버 통신 오류:', error);
    }
  };

  const checkPermissions = async () => {
    const result = await PushNotifications.checkPermissions();
    return result.receive === 'granted';
  };

  const getBadgeCount = async () => {
    try {
      const result = await PushNotifications.getDeliveredNotifications();
      return result.notifications.length;
    } catch (error) {
      console.error('배지 카운트 조회 실패:', error);
      return 0;
    }
  };

  const clearBadge = async () => {
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