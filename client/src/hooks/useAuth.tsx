import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import type { User } from "@shared/schema";

interface AuthContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  logout: () => void;
  isLoading: boolean;
  loginWithUsername: (username: string, password: string) => Promise<any>;
  loginWithEmail: (email: string, password: string) => Promise<any>;
  requestPermissions: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [initialized, setInitialized] = useState(false);

  // PWAPushManager가 처리하므로 간소화됨
  const autoEnablePushNotifications = async (userId?: number) => {
    console.log('PWAPushManager가 푸시 알림을 처리합니다.');
    return;
  };

  // Try to get user from localStorage on app start
  const storedUserId = localStorage.getItem("userId");

  const { data, isLoading, error } = useQuery({
    queryKey: ["/api/auth/me"],
    enabled: !!storedUserId, // 저장된 ID가 있는 경우에만 실행
    refetchInterval: false, // 자동 새로고침 비활성화 (불필요한 요청 방지)
    staleTime: 5 * 60 * 1000, // 5분 동안 캐시 유지
    gcTime: 10 * 60 * 1000, // 10분 동안 메모리에 보관 (v5에서 cacheTime -> gcTime)
    queryFn: async () => {
      const response = await fetch("/api/auth/me", {
        headers: {
          "x-user-id": storedUserId!,
        },
      });
      
      if (!response.ok) {
        // 인증 실패 시 저장된 사용자 ID 제거
        localStorage.removeItem("userId");
        localStorage.removeItem("rememberLogin"); // 자동 로그인 해제
        throw new Error("Authentication failed");
      }
      
      return response.json();
    },
    retry: false,
  });

  // Store auth token in Service Worker for independent badge updates
  const storeAuthTokenInSW = async (userId: string) => {
    try {
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        // Store user ID as auth token for badge refresh
        navigator.serviceWorker.controller.postMessage({
          type: 'STORE_AUTH_TOKEN',
          token: userId,
          timestamp: Date.now()
        });
        console.log('[Auth] Stored auth token in Service Worker for badge refresh');
      }
    } catch (error) {
      console.error('[Auth] Failed to store auth token in SW:', error);
    }
  };

  useEffect(() => {
    if (data?.user && !initialized) {
      console.log("🔄 Auth context updating user:", data.user.id, "profilePicture:", data.user.profilePicture);
      setUser(data.user);
      setInitialized(true);
      
      // Store auth token for independent badge refresh
      storeAuthTokenInSW(data.user.id.toString());
    } else if (error && storedUserId) {
      // Clear user data if authentication fails for stored user
      console.log("❌ Authentication failed, clearing user data");
      setUser(null);
      localStorage.removeItem("userId");
      localStorage.removeItem("rememberLogin");
      setInitialized(true);
    } else if (!storedUserId && !initialized) {
      // No stored user ID, mark as initialized immediately
      console.log("📱 No stored user, initializing as logged out");
      setUser(null);
      setInitialized(true);
    }
  }, [data, error, storedUserId, initialized]);

  // Clear user data when logging out
  const handleSetUser = (newUser: User | null) => {
    setUser(newUser);
    if (!newUser) {
      localStorage.removeItem("userId");
    }
  };

  // Username login function
  const loginWithUsername = async (username: string, password: string) => {
    const response = await fetch("/api/auth/username-login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username, password }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message);
    }
    
    const data = await response.json();
    setUser(data.user);
    
    // 자동 로그인 정보 저장
    localStorage.setItem("userId", data.user.id.toString());
    localStorage.setItem("rememberLogin", "true");
    localStorage.setItem("lastLoginTime", Date.now().toString());
    
    console.log("✅ 자동 로그인이 설정되었습니다");
    
    // 로그인 후 즉시 푸시 알림 자동 활성화 (2초 후)
    setTimeout(() => autoEnablePushNotifications(data.user.id), 2000);
    
    return data;
  };

  // Email login function
  const loginWithEmail = async (email: string, password: string) => {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message);
    }
    
    const data = await response.json();
    setUser(data.user);
    
    // 자동 로그인 정보 저장
    localStorage.setItem("userId", data.user.id.toString());
    localStorage.setItem("rememberLogin", "true");
    localStorage.setItem("lastLoginTime", Date.now().toString());
    
    console.log("✅ 자동 로그인이 설정되었습니다");
    
    // 로그인 후 즉시 푸시 알림 자동 활성화 (2초 후)
    setTimeout(() => autoEnablePushNotifications(data.user.id), 2000);
    
    return data;
  };

  // Logout function
  const logout = async (forceRedirect: boolean = true) => {
    try {
      // Get userId before clearing storage
      const userId = localStorage.getItem("userId");
      
      // Call logout API endpoint with userId header
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
        headers: {
          ...(userId ? { "x-user-id": userId } : {})
        }
      });
      
      console.log("🔒 로그아웃 API 호출 완료 - 푸시 구독 및 토큰 삭제됨");
    } catch (error) {
      console.error("Logout API call failed:", error);
    } finally {
      // Clear all auto-login related storage
      localStorage.removeItem("userId");
      localStorage.removeItem("rememberLogin");
      localStorage.removeItem("lastLoginTime");
      setUser(null);
      setInitialized(false);

      // Clear image cache
      if ((window as any).globalImageCache) {
        (window as any).globalImageCache.clear();
      }

      console.log("로그아웃 완료 - 자동 로그인 설정 해제됨");
      
      // 강제 리디렉션을 원하는 경우에만 로그인 페이지로 이동
      if (forceRedirect) {
        window.location.href = "/login";
      }
    }
  };

  // Request permissions for PWA functionality
  const requestPermissions = async () => {
    try {
      console.log('📱 PWA 권한 요청 시작');
      
      // Request microphone permission
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ 
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true
            }
          });
          stream.getTracks().forEach(track => track.stop());
          localStorage.setItem('microphonePermissionGranted', 'true');
          console.log('🎤 마이크 권한 허용됨');
        } catch (error) {
          console.log('🎤 마이크 권한 거부됨');
          localStorage.setItem('microphonePermissionGranted', 'false');
        }
      }

      // Request notification permission for iPhone PWA
      if ('Notification' in window && 'serviceWorker' in navigator) {
        try {
          const permission = await Notification.requestPermission();
          if (permission === 'granted') {
            console.log('🔔 알림 권한 허용됨');
            localStorage.setItem('notificationPermissionGranted', 'true');
            
            // Register for push notifications if service worker is ready
            const registration = await navigator.serviceWorker.ready;
            if (registration.pushManager) {
              try {
                const subscription = await registration.pushManager.subscribe({
                  userVisibleOnly: true,
                  applicationServerKey: 'BNWgP2Q4W_Ac-iVjG5mF8D1hF9oJ0pQa2I_RnZ1Y3PYq7fghjkl'
                });
                
                // Send subscription to server
                await fetch('/api/push-subscription', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'x-user-id': user?.id.toString() || ''
                  },
                  body: JSON.stringify({ subscription })
                });
                
                console.log('📱 푸시 알림 구독 완료');
              } catch (error) {
                console.error('푸시 알림 구독 실패:', error);
              }
            }
          } else {
            console.log('🔔 알림 권한 거부됨');
            localStorage.setItem('notificationPermissionGranted', 'false');
          }
        } catch (error) {
          console.error('알림 권한 요청 실패:', error);
        }
      }
    } catch (error) {
      console.error('권한 요청 중 오류:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      setUser: handleSetUser, 
      logout,
      isLoading: (isLoading && !!storedUserId) || !initialized,
      loginWithUsername,
      loginWithEmail,
      requestPermissions
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
