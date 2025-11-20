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
    // Standard Service Worker for Android PWA and web browsers
    // iOS uses native app (not PWA)
    console.log('[SW] Registering Service Worker for Android PWA/Web:', '/sw.js');
    
    navigator.serviceWorker.register('/sw.js')
      .then(registration => {
        console.log('[SW] Service Worker registered successfully:', registration.scope);
        console.log('[Badge] Service Worker registered - setAppBadge API available for Android PWA');
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
  console.log('[Badge] Service Worker not supported - this is expected in Replit preview');
}

createRoot(document.getElementById("root")!).render(<App />);
