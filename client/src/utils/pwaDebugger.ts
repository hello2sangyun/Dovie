// PWA 디버깅 유틸리티
export class PWADebugger {
  private static instance: PWADebugger;
  private logs: string[] = [];

  static getInstance(): PWADebugger {
    if (!PWADebugger.instance) {
      PWADebugger.instance = new PWADebugger();
    }
    return PWADebugger.instance;
  }

  log(message: string, data?: any) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}`;
    
    console.log(logMessage, data || '');
    this.logs.push(logMessage + (data ? ' ' + JSON.stringify(data) : ''));
    
    // 최대 100개 로그만 유지
    if (this.logs.length > 100) {
      this.logs = this.logs.slice(-100);
    }
  }

  getLogs(): string[] {
    return [...this.logs];
  }

  exportLogs(): string {
    return this.logs.join('\n');
  }

  detectEnvironment() {
    const isPWA = window.matchMedia('(display-mode: standalone)').matches ||
                  (window.navigator as any).standalone === true;
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isAndroid = /Android/.test(navigator.userAgent);
    const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
    
    const env = {
      isPWA,
      isIOS,
      isAndroid,
      isSafari,
      userAgent: navigator.userAgent,
      standalone: (window.navigator as any).standalone,
      displayMode: window.matchMedia('(display-mode: standalone)').matches ? 'standalone' : 'browser'
    };

    this.log('🔍 Environment Detection:', env);
    return env;
  }

  checkLocalStorage() {
    const storage = {
      userId: localStorage.getItem('userId'),
      rememberLogin: localStorage.getItem('rememberLogin'),
      lastLoginTime: localStorage.getItem('lastLoginTime')
    };

    this.log('🔍 LocalStorage Check:', storage);
    return storage;
  }

  checkServiceWorker() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(registrations => {
        this.log('🔍 Service Worker Registrations:', {
          count: registrations.length,
          scopes: registrations.map(reg => reg.scope),
          states: registrations.map(reg => reg.active?.state)
        });
      });
    } else {
      this.log('❌ Service Worker not supported');
    }
  }
}

export const pwaDebugger = PWADebugger.getInstance();