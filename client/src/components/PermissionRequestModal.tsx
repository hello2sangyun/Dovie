import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Mic, Bell, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface PermissionRequestModalProps {
  isOpen: boolean;
  onComplete: () => void;
}

export function PermissionRequestModal({ isOpen, onComplete }: PermissionRequestModalProps) {
  const [microphoneGranted, setMicrophoneGranted] = useState<boolean | null>(null);
  const [notificationGranted, setNotificationGranted] = useState<boolean | null>(null);
  const [isRequesting, setIsRequesting] = useState(false);

  const requestMicrophonePermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      stream.getTracks().forEach(track => track.stop());
      setMicrophoneGranted(true);
      localStorage.setItem('microphonePermissionGranted', 'true');
      return true;
    } catch (error) {
      setMicrophoneGranted(false);
      localStorage.setItem('microphonePermissionGranted', 'false');
      return false;
    }
  };

  const requestNotificationPermission = async () => {
    try {
      if (!('Notification' in window)) {
        setNotificationGranted(false);
        return false;
      }

      const permission = await Notification.requestPermission();
      const granted = permission === 'granted';
      setNotificationGranted(granted);
      localStorage.setItem('notificationPermissionGranted', granted.toString());
      
      if (granted && 'serviceWorker' in navigator) {
        try {
          const registration = await navigator.serviceWorker.ready;
          if (registration.pushManager) {
            // Convert VAPID key from base64 to Uint8Array
            const urlBase64ToUint8Array = (base64String: string) => {
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

            const arrayBufferToBase64 = (buffer: ArrayBuffer | null) => {
              if (!buffer) return '';
              const bytes = new Uint8Array(buffer);
              let binary = '';
              for (let i = 0; i < bytes.byteLength; i++) {
                binary += String.fromCharCode(bytes[i]);
              }
              return window.btoa(binary);
            };

            // Get VAPID public key from server
            const vapidResponse = await fetch('/api/vapid-public-key');
            if (!vapidResponse.ok) {
              throw new Error('Failed to get VAPID public key');
            }
            const { publicKey: vapidPublicKey } = await vapidResponse.json();
            
            const subscription = await registration.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
            });

            // Send subscription to server with proper format
            const response = await fetch('/api/push-subscription', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-User-ID': localStorage.getItem('userId') || ''
              },
              body: JSON.stringify({
                endpoint: subscription.endpoint,
                p256dh: arrayBufferToBase64(subscription.getKey('p256dh')),
                auth: arrayBufferToBase64(subscription.getKey('auth')),
                userAgent: navigator.userAgent
              })
            });

            if (response.ok) {
              console.log('Push subscription registered successfully');
            } else {
              console.error('Failed to register push subscription');
            }
          }
        } catch (error) {
          console.error('Push subscription failed:', error);
        }
      }
      
      return granted;
    } catch (error) {
      setNotificationGranted(false);
      localStorage.setItem('notificationPermissionGranted', 'false');
      return false;
    }
  };

  const handleRequestPermissions = async () => {
    setIsRequesting(true);
    
    const [micResult, notificationResult] = await Promise.all([
      requestMicrophonePermission(),
      requestNotificationPermission()
    ]);
    
    // If notifications were granted, register push subscription
    if (notificationResult && 'serviceWorker' in navigator && 'PushManager' in window) {
      try {
        await registerPushSubscription();
      } catch (error) {
        console.error('Failed to register push subscription:', error);
      }
    }
    
    setIsRequesting(false);
    
    // Auto-close after 1.5 seconds
    setTimeout(() => {
      onComplete();
    }, 1500);
  };

  // Function to register push subscription after permission grant
  const registerPushSubscription = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      if (!registration.pushManager) return;

      // Check if already subscribed
      const existingSubscription = await registration.pushManager.getSubscription();
      if (existingSubscription) {
        console.log('Push subscription already exists');
        return;
      }

      // VAPID key conversion helper
      const urlBase64ToUint8Array = (base64String: string) => {
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

      const arrayBufferToBase64 = (buffer: ArrayBuffer | null) => {
        if (!buffer) return '';
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        return window.btoa(binary);
      };

      // Get VAPID public key from server
      const vapidResponse = await fetch('/api/vapid-public-key');
      if (!vapidResponse.ok) {
        throw new Error('Failed to get VAPID public key');
      }
      const { publicKey: vapidPublicKey } = await vapidResponse.json();
      
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
      });

      // Send subscription to server
      const userId = localStorage.getItem('userId');
      const response = await fetch('/api/push-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': userId || ''
        },
        body: JSON.stringify({
          endpoint: subscription.endpoint,
          p256dh: arrayBufferToBase64(subscription.getKey('p256dh')),
          auth: arrayBufferToBase64(subscription.getKey('auth')),
          userAgent: navigator.userAgent
        })
      });

      if (response.ok) {
        console.log('✅ Push subscription registered in PermissionRequestModal');
      } else {
        console.error('❌ Failed to register push subscription in PermissionRequestModal');
      }
    } catch (error) {
      console.error('Push notification registration failed in PermissionRequestModal:', error);
    }
  };

  const getPermissionIcon = (granted: boolean | null) => {
    if (granted === null) return null;
    return granted ? (
      <Check className="h-4 w-4 text-green-500" />
    ) : (
      <X className="h-4 w-4 text-red-500" />
    );
  };

  const allPermissionsHandled = microphoneGranted !== null && notificationGranted !== null;

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">앱 권한 설정</DialogTitle>
          <DialogDescription className="text-center">
            최적의 앱 사용을 위해 권한을 설정해주세요
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="flex items-center space-x-3 p-3 rounded-lg border">
            <div className="flex-shrink-0">
              <Mic className="h-6 w-6 text-purple-600" />
            </div>
            <div className="flex-1">
              <h4 className="font-medium">마이크 권한</h4>
              <p className="text-sm text-gray-500">음성 메시지 녹음을 위해 필요합니다</p>
            </div>
            <div className="flex-shrink-0">
              {getPermissionIcon(microphoneGranted)}
            </div>
          </div>

          <div className="flex items-center space-x-3 p-3 rounded-lg border">
            <div className="flex-shrink-0">
              <Bell className="h-6 w-6 text-purple-600" />
            </div>
            <div className="flex-1">
              <h4 className="font-medium">알림 권한</h4>
              <p className="text-sm text-gray-500">새 메시지 알림을 받기 위해 필요합니다</p>
            </div>
            <div className="flex-shrink-0">
              {getPermissionIcon(notificationGranted)}
            </div>
          </div>
        </div>

        <div className="flex space-x-3">
          {!allPermissionsHandled ? (
            <>
              <Button
                variant="outline"
                className="flex-1"
                onClick={onComplete}
                disabled={isRequesting}
              >
                나중에
              </Button>
              <Button
                className="flex-1 bg-purple-600 hover:bg-purple-700"
                onClick={handleRequestPermissions}
                disabled={isRequesting}
              >
                {isRequesting ? "권한 요청 중..." : "권한 허용"}
              </Button>
            </>
          ) : (
            <Button
              className="flex-1 bg-purple-600 hover:bg-purple-700"
              onClick={onComplete}
            >
              완료
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}