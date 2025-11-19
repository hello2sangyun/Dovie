import { useState, useEffect } from 'react';
import { isNativePlatform, loadApp } from '@/lib/nativeBridge';

export type AppState = 'active' | 'background';

export const useAppState = () => {
  const [appState, setAppState] = useState<AppState>('active');

  useEffect(() => {
    if (!isNativePlatform()) return;

    let listener: any;

    const setupListener = async () => {
      const App = await loadApp();
      if (!App) return;

      listener = await App.addListener('appStateChange', ({ isActive }: any) => {
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
  }, []);

  return appState;
};
