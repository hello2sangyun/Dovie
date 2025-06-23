import { useState, useEffect } from 'react';

interface AppPermissionState {
  microphone: string | null;
  notifications: string | null;
}

export function usePermissions() {
  const [permissions, setPermissions] = useState<AppPermissionState>({
    microphone: null,
    notifications: null
  });

  const requestMicrophonePermission = async (): Promise<boolean> => {
    try {
      console.log('🎤 마이크 권한 요청 시작');
      
      // Check if already granted
      const existingPermission = await navigator.permissions.query({ name: 'microphone' as PermissionName });
      if (existingPermission.state === 'granted') {
        console.log('🎤 마이크 권한 이미 허용됨');
        setPermissions(prev => ({ ...prev, microphone: 'granted' }));
        return true;
      }

      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      
      // Stop the stream immediately after getting permission
      stream.getTracks().forEach(track => track.stop());
      
      console.log('🎤 마이크 권한 허용됨');
      setPermissions(prev => ({ ...prev, microphone: 'granted' }));
      
      // Store permission status in localStorage
      localStorage.setItem('microphonePermissionGranted', 'true');
      
      return true;
    } catch (error) {
      console.error('🎤 마이크 권한 거부됨:', error);
      setPermissions(prev => ({ ...prev, microphone: 'denied' }));
      localStorage.setItem('microphonePermissionGranted', 'false');
      return false;
    }
  };

  const requestNotificationPermission = async (): Promise<boolean> => {
    try {
      console.log('🔔 알림 권한 요청 시작');
      
      if (!('Notification' in window)) {
        console.log('🔔 알림이 지원되지 않는 브라우저');
        return false;
      }

      if (Notification.permission === 'granted') {
        console.log('🔔 알림 권한 이미 허용됨');
        setPermissions(prev => ({ ...prev, notifications: 'granted' }));
        return true;
      }

      const permission = await Notification.requestPermission();
      
      if (permission === 'granted') {
        console.log('🔔 알림 권한 허용됨');
        setPermissions(prev => ({ ...prev, notifications: 'granted' }));
        localStorage.setItem('notificationPermissionGranted', 'true');
        return true;
      } else {
        console.log('🔔 알림 권한 거부됨');
        setPermissions(prev => ({ ...prev, notifications: 'denied' }));
        localStorage.setItem('notificationPermissionGranted', 'false');
        return false;
      }
    } catch (error) {
      console.error('🔔 알림 권한 요청 실패:', error);
      setPermissions(prev => ({ ...prev, notifications: 'denied' }));
      return false;
    }
  };

  const requestAllPermissions = async (): Promise<{ microphone: boolean; notifications: boolean }> => {
    console.log('📱 모든 권한 요청 시작');
    
    const results = await Promise.allSettled([
      requestMicrophonePermission(),
      requestNotificationPermission()
    ]);

    const microphoneResult = results[0].status === 'fulfilled' ? results[0].value : false;
    const notificationResult = results[1].status === 'fulfilled' ? results[1].value : false;

    console.log('📱 권한 요청 완료:', { 
      microphone: microphoneResult, 
      notifications: notificationResult 
    });

    return {
      microphone: microphoneResult,
      notifications: notificationResult
    };
  };

  const checkPermissionStatus = async () => {
    try {
      // Check microphone permission
      if ('permissions' in navigator) {
        const micPermission = await navigator.permissions.query({ name: 'microphone' as PermissionName });
        setPermissions(prev => ({ ...prev, microphone: micPermission.state }));
      }

      // Check notification permission
      if ('Notification' in window) {
        setPermissions(prev => ({ ...prev, notifications: Notification.permission }));
      }
    } catch (error) {
      console.error('권한 상태 확인 실패:', error);
    }
  };

  const hasStoredMicrophonePermission = (): boolean => {
    return localStorage.getItem('microphonePermissionGranted') === 'true';
  };

  const hasStoredNotificationPermission = (): boolean => {
    return localStorage.getItem('notificationPermissionGranted') === 'true';
  };

  useEffect(() => {
    checkPermissionStatus();
  }, []);

  return {
    permissions,
    requestMicrophonePermission,
    requestNotificationPermission,
    requestAllPermissions,
    checkPermissionStatus,
    hasStoredMicrophonePermission,
    hasStoredNotificationPermission
  };
}