import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Register service worker for PWA features (push notifications, offline, call sessions)
console.log('[SW] Service Worker support check:', {
  supported: 'serviceWorker' in navigator,
  navigatorSW: typeof (navigator as any).serviceWorker,
  isSecureContext: window.isSecureContext
});

if ('serviceWorker' in navigator) {
  const registerSW = () => {
    // Detect iOS PWA (standalone mode)
    const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
    const isStandalone = (window.navigator as any).standalone === true || 
                        window.matchMedia('(display-mode: standalone)').matches;
    const isIOSPWA = isIOS && isStandalone;
    
    // Use enhanced iOS 16 Service Worker for iOS PWA (better badge support)
    const swPath = isIOSPWA ? '/sw-ios16-enhanced.js' : '/sw.js';
    
    console.log('[SW] Registering Service Worker:', {
      path: swPath,
      isIOS,
      isStandalone,
      isIOSPWA
    });
    
    navigator.serviceWorker.register(swPath)
      .then(registration => {
        console.log('[SW] Service Worker registered successfully:', registration.scope);
        console.log('[Badge] Service Worker registered - setAppBadge should now be available');
      })
      .catch(error => {
        console.error('[SW] Service Worker registration failed:', error);
      });
  };
  
  // Register immediately or on load (works with HMR and first load)
  if (document.readyState === 'complete') {
    registerSW();
  } else {
    window.addEventListener('load', registerSW);
  }
} else {
  console.warn('[SW] Service Workers not supported in this environment (WKWebView/Replit preview)');
  console.warn('[SW] To test SW features, open the app in a real browser: Chrome, Firefox, Safari');
  console.log('[Badge] Service Worker not supported');
}

createRoot(document.getElementById("root")!).render(<App />);
