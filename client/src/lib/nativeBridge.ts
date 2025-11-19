/**
 * Native Bridge - Lazy-load Capacitor modules only on native platforms
 * 
 * This abstraction prevents Capacitor from being bundled in web builds,
 * which would delete navigator.serviceWorker and break PWA push notifications.
 * 
 * Usage:
 *   const bridge = await getNativeBridge();
 *   if (bridge.isNative) {
 *     const filesystem = await bridge.loadFilesystem();
 *     // Use filesystem
 *   }
 */

// Platform detection - safe for web builds
export function isNativePlatform(): boolean {
  if (typeof window === 'undefined') return false;
  const cap = (window as any).Capacitor;
  return cap?.isNativePlatform?.() === true;
}

export function getPlatform(): string {
  if (typeof window === 'undefined') return 'web';
  const cap = (window as any).Capacitor;
  return cap?.getPlatform?.() || 'web';
}

// Bridge interface
export interface NativeBridge {
  isNative: boolean;
  platform: string;
  loadFilesystem: () => Promise<any>;
  loadShare: () => Promise<any>;
  loadPushNotifications: () => Promise<any>;
  loadApp: () => Promise<any>;
  loadKeyboard: () => Promise<any>;
  loadBadge: () => Promise<any>;
  getCapacitor: () => any;
}

// Singleton bridge instance
let bridgeInstance: NativeBridge | null = null;

export async function getNativeBridge(): Promise<NativeBridge> {
  if (bridgeInstance) return bridgeInstance;

  const isNative = isNativePlatform();
  const platform = getPlatform();

  bridgeInstance = {
    isNative,
    platform,
    
    getCapacitor: () => {
      if (typeof window === 'undefined') return null;
      return (window as any).Capacitor || null;
    },

    loadFilesystem: async () => {
      if (!isNative) {
        console.warn('[NativeBridge] Filesystem not available on web');
        return null;
      }
      try {
        // Return the entire module with Filesystem, Directory, and Encoding
        const fs = await import('@capacitor/filesystem');
        return fs;
      } catch (err) {
        console.error('[NativeBridge] Failed to load Filesystem:', err);
        return null;
      }
    },

    loadShare: async () => {
      if (!isNative) {
        console.warn('[NativeBridge] Share not available on web');
        return null;
      }
      try {
        const { Share } = await import('@capacitor/share');
        return Share;
      } catch (err) {
        console.error('[NativeBridge] Failed to load Share:', err);
        return null;
      }
    },

    loadPushNotifications: async () => {
      if (!isNative) {
        console.warn('[NativeBridge] PushNotifications not available on web');
        return null;
      }
      try {
        const { PushNotifications } = await import('@capacitor/push-notifications');
        return PushNotifications;
      } catch (err) {
        console.error('[NativeBridge] Failed to load PushNotifications:', err);
        return null;
      }
    },

    loadApp: async () => {
      if (!isNative) {
        console.warn('[NativeBridge] App not available on web');
        return null;
      }
      try {
        const { App } = await import('@capacitor/app');
        return App;
      } catch (err) {
        console.error('[NativeBridge] Failed to load App:', err);
        return null;
      }
    },

    loadKeyboard: async () => {
      if (!isNative) {
        console.warn('[NativeBridge] Keyboard not available on web');
        return null;
      }
      try {
        const { Keyboard } = await import('@capacitor/keyboard');
        return Keyboard;
      } catch (err) {
        console.error('[NativeBridge] Failed to load Keyboard:', err);
        return null;
      }
    },

    loadBadge: async () => {
      if (!isNative) {
        console.warn('[NativeBridge] Badge not available on web');
        return null;
      }
      try {
        const { Badge } = await import('@capawesome/capacitor-badge');
        return Badge;
      } catch (err) {
        console.error('[NativeBridge] Failed to load Badge:', err);
        return null;
      }
    },
  };

  return bridgeInstance;
}

// Convenience helpers
export async function loadFilesystem() {
  const bridge = await getNativeBridge();
  return bridge.loadFilesystem();
}

export async function loadShare() {
  const bridge = await getNativeBridge();
  return bridge.loadShare();
}

export async function loadPushNotifications() {
  const bridge = await getNativeBridge();
  return bridge.loadPushNotifications();
}

export async function loadApp() {
  const bridge = await getNativeBridge();
  return bridge.loadApp();
}

export async function loadKeyboard() {
  const bridge = await getNativeBridge();
  return bridge.loadKeyboard();
}

export async function loadBadge() {
  const bridge = await getNativeBridge();
  return bridge.loadBadge();
}
