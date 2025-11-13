import { useState, useEffect } from 'react';
import { App } from '@capacitor/app';

export type AppState = 'active' | 'background';

export const useAppState = () => {
  const [appState, setAppState] = useState<AppState>('active');

  useEffect(() => {
    let listener: any;

    const setupListener = async () => {
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
  }, []);

  return appState;
};
