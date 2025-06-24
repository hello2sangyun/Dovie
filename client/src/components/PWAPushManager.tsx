import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';

interface PWAPushManagerProps {
  onNotificationEnabled?: () => void;
}

export function PWAPushManager({ onNotificationEnabled }: PWAPushManagerProps) {
  const { user } = useAuth();
  const [isInitializing, setIsInitializing] = useState(false);

  useEffect(() => {
    if (user && !isInitializing) {
      initializePWAPushSystem();
    }
  }, [user, isInitializing]);

  const initializePWAPushSystem = async () => {
    setIsInitializing(true);
    console.log('🚀 iOS 16 호환 PWA 푸시 시스템 초기화');

    try {
      // 1. 기본 지원 확인
      if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
        console.log('❌ PWA 푸시 알림 미지원');
        return;
      }

      // 2. iOS 16 호환 Service Worker 등록
      const registration = await registerServiceWorkerForIOS();
      if (!registration) {
        throw new Error('Service Worker 등록 실패');
      }

      // 3. 권한 요청 (iOS 16 호환)
      const permission = await requestNotificationPermissionForIOS();
      if (permission !== 'granted') {
        console.log('❌ 알림 권한 거부됨');
        return;
      }

      // 4. 푸시 구독 생성
      const subscription = await createPushSubscriptionForIOS(registration);
      if (!subscription) {
        throw new Error('푸시 구독 생성 실패');
      }

      // 5. 서버에 구독 정보 전송
      await sendSubscriptionToServer(subscription);

      // 테스트 푸시 발송 제거 - 실제 메시지만 알림으로 받도록 변경
      console.log('✅ PWA 푸시 시스템 활성화 완료 (테스트 알림 없이)');
      onNotificationEnabled?.();

    } catch (error) {
      console.error('❌ PWA 푸시 시스템 초기화 실패:', error);
    } finally {
      setIsInitializing(false);
    }
  };

  const registerServiceWorkerForIOS = async (): Promise<ServiceWorkerRegistration | null> => {
    try {
      console.log('📋 iOS 16+ PWA Service Worker 등록');

      // iOS 16+ 감지
      const isIOSDevice = /iPhone|iPad|iPod/.test(navigator.userAgent);
      const isIOS16Plus = isIOSDevice && (
        /OS 1[6-9]/.test(navigator.userAgent) || 
        /OS [2-9][0-9]/.test(navigator.userAgent) ||
        /Version\/1[6-9]/.test(navigator.userAgent) ||
        /Version\/[2-9][0-9]/.test(navigator.userAgent)
      );
      const isPWAMode = (window.navigator as any).standalone === true || 
                      window.matchMedia('(display-mode: standalone)').matches;

      // 기존 등록 해제
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const reg of registrations) {
        await reg.unregister();
      }

      // 통합된 SW 파일 사용 (단순화)
      const swFile = '/sw.js';
      console.log('🎯 통합 Service Worker 사용:', swFile);

      // Service Worker 등록
      const registration = await navigator.serviceWorker.register(swFile, {
        scope: '/',
        updateViaCache: 'none',
        type: 'classic'
      });

      // iOS 16에서 중요한 ready 대기
      await navigator.serviceWorker.ready;
      console.log('✅ iOS 16+ Service Worker 등록 완료:', swFile);
      
      return registration;
    } catch (error) {
      console.error('❌ Service Worker 등록 실패:', error);
      return null;
    }
  };

  const requestNotificationPermissionForIOS = async (): Promise<NotificationPermission> => {
    console.log('🔔 iOS 16 알림 권한 요청');

    // iOS에서는 사용자 제스처가 필요하므로 즉시 요청
    return new Promise((resolve) => {
      if (Notification.permission === 'granted') {
        resolve('granted');
        return;
      }

      // iOS Safari PWA에서 즉시 권한 요청
      Notification.requestPermission().then(resolve);
    });
  };

  const createPushSubscriptionForIOS = async (registration: ServiceWorkerRegistration): Promise<PushSubscription | null> => {
    try {
      console.log('📱 iOS 16 푸시 구독 생성');

      // 기존 구독 해제
      const existingSubscription = await registration.pushManager.getSubscription();
      if (existingSubscription) {
        await existingSubscription.unsubscribe();
      }

      // VAPID 키 가져오기
      const vapidResponse = await fetch('/api/push-vapid-key');
      if (!vapidResponse.ok) {
        throw new Error('VAPID 키 가져오기 실패');
      }
      const { publicKey } = await vapidResponse.json();

      // iOS 16 호환 구독 생성
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey)
      });

      console.log('✅ iOS 16 푸시 구독 생성 완료');
      return subscription;
    } catch (error) {
      console.error('❌ 푸시 구독 생성 실패:', error);
      return null;
    }
  };

  const sendSubscriptionToServer = async (subscription: PushSubscription) => {
    try {
      console.log('📤 서버에 구독 정보 전송');

      const response = await fetch('/api/push-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': user?.id.toString() || ''
        },
        body: JSON.stringify({
          endpoint: subscription.endpoint,
          p256dh: arrayBufferToBase64(subscription.getKey('p256dh')),
          auth: arrayBufferToBase64(subscription.getKey('auth')),
          userAgent: navigator.userAgent
        })
      });

      if (!response.ok) {
        throw new Error('서버 구독 저장 실패');
      }

      console.log('✅ 서버 구독 정보 저장 완료');
      
      // iOS 16+ PWA 배지 초기화
      if ('setAppBadge' in navigator) {
        try {
          await navigator.clearAppBadge();
          console.log('✅ iOS 16+ 배지 초기화 완료');
        } catch (error) {
          console.log('⚠️ 배지 초기화 실패:', error);
        }
      }
    } catch (error) {
      console.error('❌ 서버 구독 정보 전송 실패:', error);
      throw error;
    }
  };

  // 테스트 푸시 알림 기능 제거 - 반복 알림 방지

  // 유틸리티 함수들
  const urlBase64ToUint8Array = (base64String: string): Uint8Array => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  const arrayBufferToBase64 = (buffer: ArrayBuffer | null): string => {
    if (!buffer) return '';
    const bytes = new Uint8Array(buffer);
    const binaryString = Array.from(bytes, byte => String.fromCharCode(byte)).join('');
    return btoa(binaryString);
  };

  // 컴포넌트는 렌더링하지 않음 (백그라운드 서비스)
  return null;
}