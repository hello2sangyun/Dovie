import { useState, useEffect } from 'react';

export function useMicrophonePermission() {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [hasRequestedPermission, setHasRequestedPermission] = useState(false);
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);

  useEffect(() => {
    // 이미 권한을 요청한 적이 있는지 확인
    const hasRequested = localStorage.getItem('microphonePermissionRequested');
    if (hasRequested === 'true') {
      setHasRequestedPermission(true);
    }

    // 현재 권한 상태 확인
    checkPermissionStatus();
  }, []);

  const checkPermissionStatus = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.log('미디어 API를 지원하지 않는 브라우저입니다.');
        setHasPermission(false);
        return;
      }

      // 권한 상태 확인 (Chrome/Edge용)
      if ('permissions' in navigator) {
        const permission = await navigator.permissions.query({ name: 'microphone' as PermissionName });
        if (permission.state === 'granted') {
          setHasPermission(true);
        } else if (permission.state === 'denied') {
          setHasPermission(false);
        } else {
          setHasPermission(null);
        }
        return;
      }

      // 다른 브라우저의 경우 실제 스트림 요청으로 확인
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          audio: true,
          video: false 
        });
        stream.getTracks().forEach(track => track.stop());
        setHasPermission(true);
      } catch (error) {
        setHasPermission(false);
      }
    } catch (error) {
      console.log('권한 상태 확인 중 오류:', error);
      setHasPermission(null);
    }
  };

  const requestPermission = async (): Promise<boolean> => {
    if (hasRequestedPermission) {
      console.log('이미 마이크 권한을 요청한 적이 있습니다.');
      return hasPermission || false;
    }

    setIsRequestingPermission(true);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: true,
        video: false 
      });
      
      // 스트림을 즉시 중지
      stream.getTracks().forEach(track => track.stop());
      
      setHasPermission(true);
      setHasRequestedPermission(true);
      localStorage.setItem('microphonePermissionRequested', 'true');
      
      console.log('마이크 권한이 허용되었습니다.');
      return true;
    } catch (error) {
      console.log('마이크 권한이 거부되었습니다:', error);
      setHasPermission(false);
      setHasRequestedPermission(true);
      localStorage.setItem('microphonePermissionRequested', 'true');
      return false;
    } finally {
      setIsRequestingPermission(false);
    }
  };

  const shouldRequestPermission = () => {
    return !hasRequestedPermission && hasPermission === null;
  };

  return {
    hasPermission,
    hasRequestedPermission,
    isRequestingPermission,
    requestPermission,
    shouldRequestPermission,
    checkPermissionStatus
  };
}