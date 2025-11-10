import { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';

export type AppState = 'active' | 'background';

export const useAppState = () => {
  const [appState, setAppState] = useState<AppState>('active');
  const isNative = Capacitor.isNativePlatform();

  useEffect(() => {
    // Only initialize Capacitor App listener on native platforms
    // This prevents "Reporter disconnected" errors on web/LoginPage
    if (!isNative) {
      console.log('📱 Skipping Capacitor App listener on web platform');
      return;
    }

    let listener: any;

    const setupListener = async () => {
      // Dynamic import to avoid loading Capacitor App on web
      const { App } = await import('@capacitor/app');
      
      listener = await App.addListener('appStateChange', ({ isActive }) => {
        const newState = isActive ? 'active' : 'background';
        console.log(`📱 App state changed: ${newState}`);
        setAppState(newState);
      });
    };

    setupListener();

    return () => {
      if (listener) {
        listener.remove();
      }
    };
  }, [isNative]);

  return appState;
};
