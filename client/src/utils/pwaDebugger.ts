// PWA 디버깅 유틸리티
export const pwaDebugger = {
  // PWA 환경 감지
  detectEnvironment: () => {
    const isPWA = window.matchMedia('(display-mode: standalone)').matches ||
                  (window.navigator as any).standalone === true;
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    
    console.log('🔍 Environment Detection:', {
      isPWA,
      isMobile,
      isIOS,
      userAgent: navigator.userAgent,
      standalone: (window.navigator as any).standalone,
      displayMode: window.matchMedia('(display-mode: standalone)').matches
    });
    
    return { isPWA, isMobile, isIOS };
  },

  // localStorage 상태 확인
  checkStorageState: () => {
    const userId = localStorage.getItem('userId');
    const notificationPermission = localStorage.getItem('notificationPermissionGranted');
    const authToken = localStorage.getItem('authToken');
    
    console.log('💾 localStorage State:', {
      userId: userId ? `User ${userId}` : 'Not found',
      notificationPermission,
      authToken: authToken ? 'Present' : 'Missing',
      storageKeys: Object.keys(localStorage)
    });
    
    return { userId, notificationPermission, authToken };
  },

  // Service Worker 상태 확인
  checkServiceWorkerState: async () => {
    if (!('serviceWorker' in navigator)) {
      console.log('❌ Service Worker not supported');
      return { supported: false };
    }

    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      console.log('🔧 Service Worker Registrations:', {
        count: registrations.length,
        registrations: registrations.map(reg => ({
          scope: reg.scope,
          active: !!reg.active,
          installing: !!reg.installing,
          waiting: !!reg.waiting
        }))
      });

      const ready = await navigator.serviceWorker.ready;
      console.log('✅ Service Worker Ready:', {
        scope: ready.scope,
        scriptURL: ready.active?.scriptURL
      });

      return { supported: true, ready, registrations };
    } catch (error) {
      console.error('❌ Service Worker Error:', error);
      return { supported: true, error };
    }
  },

  // 인증 상태 확인
  checkAuthState: async () => {
    const userId = localStorage.getItem('userId');
    if (!userId) {
      console.log('❌ No userId in localStorage');
      return { authenticated: false };
    }

    try {
      const response = await fetch('/api/auth/me', {
        headers: { 'X-User-ID': userId }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Authentication Success:', {
          userId: data.user?.id,
          username: data.user?.username,
          displayName: data.user?.displayName
        });
        return { authenticated: true, user: data.user };
      } else {
        console.log('❌ Authentication Failed:', response.status);
        return { authenticated: false, error: response.status };
      }
    } catch (error) {
      console.error('❌ Auth Check Error:', error);
      return { authenticated: false, error };
    }
  },

  // 완전한 PWA 진단
  runFullDiagnostic: async () => {
    console.log('🚀 PWA Full Diagnostic Starting...');
    console.log('⏰ Timestamp:', new Date().toISOString());
    
    const environment = pwaDebugger.detectEnvironment();
    const storage = pwaDebugger.checkStorageState();
    const serviceWorker = await pwaDebugger.checkServiceWorkerState();
    const auth = await pwaDebugger.checkAuthState();
    
    const diagnostic = {
      timestamp: new Date().toISOString(),
      environment,
      storage,
      serviceWorker,
      auth
    };
    
    console.log('📊 Complete Diagnostic Result:', diagnostic);
    return diagnostic;
  }
};

// PWA 자동 진단 제거 (불필요한 로그 방지)