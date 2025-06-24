import { useEffect, useState } from 'react';
import { useAuth } from './useAuth';

interface PushNotificationState {
  isSupported: boolean;
  permission: NotificationPermission;
  isSubscribed: boolean;
  subscription: PushSubscription | null;
  isLoading: boolean;
}

export function usePWAPushNotifications() {
  const { user } = useAuth();
  const [state, setState] = useState<PushNotificationState>({
    isSupported: false,
    permission: 'default',
    isSubscribed: false,
    subscription: null,
    isLoading: false
  });

  // 즉시 PWA 푸시 알림 시스템 초기화
  useEffect(() => {
    if (typeof window !== 'undefined' && user) {
      initializePWAPushSystem();
    }
  }, [user]);

  const initializePWAPushSystem = async () => {
    console.log('🚀 Chrome PWA 푸시 알림 시스템 초기화 시작');
    
    try {
      // 1. Chrome PWA 지원 확인
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        console.log('❌ Chrome PWA 푸시 알림 미지원 브라우저');
        setState(prev => ({ ...prev, isSupported: false }));
        return;
      }

      setState(prev => ({ ...prev, isSupported: true, isLoading: true }));

      // 2. Chrome PWA Service Worker 등록
      const registration = await registerServiceWorker();
      if (!registration) {
        throw new Error('Chrome PWA Service Worker 등록 실패');
      }

      // 3. Chrome 알림 권한 요청
      const permission = await requestNotificationPermission();
      setState(prev => ({ ...prev, permission }));

      if (permission !== 'granted') {
        console.log('❌ Chrome 알림 권한 거부됨:', permission);
        setState(prev => ({ ...prev, isLoading: false }));
        return;
      }

      // 4. Chrome PWA 푸시 구독 생성
      const subscription = await createPushSubscription(registration);
      if (!subscription) {
        throw new Error('Chrome PWA 푸시 구독 생성 실패');
      }

      // 5. 서버에 Chrome PWA 구독 정보 전송
      await sendSubscriptionToServer(subscription);

      setState(prev => ({ 
        ...prev, 
        isSubscribed: true, 
        subscription,
        isLoading: false 
      }));

      console.log('✅ Chrome PWA 푸시 알림 시스템 활성화 완료');

    } catch (error) {
      console.error('❌ Chrome PWA 푸시 알림 초기화 실패:', error);
      setState(prev => ({ ...prev, isLoading: false }));
    }
  };

  const registerServiceWorker = async (): Promise<ServiceWorkerRegistration | null> => {
    try {
      console.log('📋 Chrome PWA Service Worker 등록 중...');
      
      // 기존 등록 해제
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        await registration.unregister();
      }

      // Chrome PWA 최적화된 Service Worker 등록
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
        updateViaCache: 'none'
      });

      await navigator.serviceWorker.ready;
      console.log('✅ Chrome PWA Service Worker 등록 완료');
      return registration;
    } catch (error) {
      console.error('❌ Chrome PWA Service Worker 등록 실패:', error);
      return null;
    }
  };

  const requestNotificationPermission = async (): Promise<NotificationPermission> => {
    console.log('🔔 Chrome PWA 알림 권한 요청 중...');
    
    return new Promise((resolve) => {
      if (Notification.permission === 'granted') {
        console.log('✅ Chrome PWA 알림 권한 이미 허용됨');
        resolve('granted');
        return;
      }

      // Chrome PWA 알림 권한 요청
      Notification.requestPermission().then((permission) => {
        console.log('📋 Chrome PWA 알림 권한 결과:', permission);
        resolve(permission);
      });
    });
  };

  const createPushSubscription = async (registration: ServiceWorkerRegistration): Promise<PushSubscription | null> => {
    try {
      console.log('📱 Chrome PWA 푸시 구독 생성 중...');

      // 기존 구독 해제
      const existingSubscription = await registration.pushManager.getSubscription();
      if (existingSubscription) {
        await existingSubscription.unsubscribe();
        console.log('🔄 Chrome PWA 기존 구독 해제됨');
      }

      // VAPID 공개키 가져오기
      const vapidResponse = await fetch('/api/push-vapid-key');
      const { publicKey } = await vapidResponse.json();

      // Chrome PWA 새 구독 생성
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey)
      });

      console.log('✅ Chrome PWA 푸시 구독 생성 완료:', subscription.endpoint);
      return subscription;
    } catch (error) {
      console.error('❌ Chrome PWA 푸시 구독 생성 실패:', error);
      return null;
    }
  };

  const sendSubscriptionToServer = async (subscription: PushSubscription) => {
    try {
      console.log('📤 서버에 구독 정보 전송 중...');

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
        throw new Error(`서버 응답 오류: ${response.status}`);
      }

      console.log('✅ 서버 구독 정보 전송 완료');
    } catch (error) {
      console.error('❌ 서버 구독 정보 전송 실패:', error);
      throw error;
    }
  };

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

  return {
    ...state,
    reinitialize: initializePWAPushSystem
  };
}