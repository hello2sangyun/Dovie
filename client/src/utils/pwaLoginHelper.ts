// PWA 로그인 진단 도구

export const diagnosePWALogin = async (): Promise<void> => {
  console.log('🔍 PWA 로그인 진단 시작');
  
  // 1. PWA 모드 확인
  const isPWAMode = window.navigator.standalone === true || 
                   window.matchMedia('(display-mode: standalone)').matches;
  const isPWAInstalled = window.matchMedia('(display-mode: standalone)').matches ||
                         window.navigator.standalone === true ||
                         document.referrer.includes('android-app://');
  console.log('📱 PWA 모드:', isPWAMode);
  console.log('📱 PWA 설치됨:', isPWAInstalled);
  
  // 2. Service Worker 상태 확인
  if ('serviceWorker' in navigator) {
    const registration = await navigator.serviceWorker.getRegistration();
    console.log('🔧 Service Worker 상태:', {
      registered: !!registration,
      active: !!registration?.active,
      controller: !!navigator.serviceWorker.controller
    });
  }
  
  // 3. localStorage 상태 확인
  console.log('💾 localStorage 상태:', {
    userId: localStorage.getItem('userId'),
    rememberLogin: localStorage.getItem('rememberLogin'),
    lastLoginTime: localStorage.getItem('lastLoginTime')
  });
  
  // 4. 캐시 상태 확인
  if ('caches' in window) {
    const cacheNames = await caches.keys();
    console.log('🗃️ 캐시 목록:', cacheNames);
  }
  
  // 5. 네트워크 연결 확인
  if ('onLine' in navigator) {
    console.log('🌐 네트워크 상태:', navigator.onLine);
  }
};

export const testPWAAuth = async (userId: string): Promise<boolean> => {
  try {
    console.log('🧪 PWA 인증 테스트 시작:', userId);
    
    const response = await fetch('/api/auth/me', {
      method: 'GET',
      headers: {
        'x-user-id': userId,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'PWA-Test': 'true'
      }
    });
    
    console.log('🧪 인증 테스트 응답:', {
      status: response.status,
      ok: response.ok,
      headers: Object.fromEntries(response.headers.entries())
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ 인증 테스트 성공:', data.user?.id);
      return true;
    } else {
      console.log('❌ 인증 테스트 실패');
      return false;
    }
  } catch (error) {
    console.error('🚨 인증 테스트 오류:', error);
    return false;
  }
};

// PWA 전용 로그인 함수
export const performPWALogin = async (credentials: { email?: string, username?: string, password: string }) => {
  console.log('🔐 PWA 로그인 시도');
  
  const endpoint = credentials.email ? '/api/auth/login' : '/api/auth/username-login';
  const body = credentials.email 
    ? { email: credentials.email, password: credentials.password }
    : { username: credentials.username, password: credentials.password };
  
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'PWA-Login': 'true'
      },
      body: JSON.stringify(body)
    });
    
    console.log('🔐 PWA 로그인 응답:', response.status, response.ok);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ PWA 로그인 성공:', data.user?.id);
      
      // localStorage에 저장
      localStorage.setItem('userId', data.user.id.toString());
      localStorage.setItem('rememberLogin', 'true');
      localStorage.setItem('lastLoginTime', Date.now().toString());
      
      return data;
    } else {
      const error = await response.json().catch(() => ({ message: 'Login failed' }));
      console.log('❌ PWA 로그인 실패:', error);
      throw new Error(error.message);
    }
  } catch (error) {
    console.error('🚨 PWA 로그인 오류:', error);
    throw error;
  }
};