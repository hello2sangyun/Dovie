import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import type { User } from "@shared/schema";
import { useInstantImageCache } from "./useInstantImageCache";
import { usePermissions } from "./usePermissions";
import { clearServiceWorkerCaches, performPWAAuthCheck } from "../utils/serviceWorkerHelper";

interface AuthContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  logout: () => void;
  isLoading: boolean;
  isPreloadingImages: boolean;
  loginWithUsername: (username: string, password: string) => Promise<any>;
  loginWithEmail: (email: string, password: string) => Promise<any>;
  requestPermissions: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [profileImagesLoaded, setProfileImagesLoaded] = useState(false);
  const [isPreloadingImages, setIsPreloadingImages] = useState(false);

  // PWAPushManager가 처리하므로 간소화됨
  const autoEnablePushNotifications = async (userId?: number) => {
    console.log('PWAPushManager가 푸시 알림을 처리합니다.');
    return;
  };

  // Try to get user from localStorage on app start
  const storedUserId = localStorage.getItem("userId");

  const { data, isLoading, error } = useQuery({
    queryKey: ["/api/auth/me"],
    enabled: !!storedUserId,
    refetchInterval: false,
    staleTime: 0, // Always fetch fresh data for PWA compatibility
    gcTime: 0, // Don't cache authentication data
    queryFn: async () => {
      const response = await fetch("/api/auth/me", {
        method: "GET",
        headers: {
          "x-user-id": storedUserId!,
          "Cache-Control": "no-cache, no-store, must-revalidate", // Force fresh request
          "Pragma": "no-cache",
          "Expires": "0"
        },
      });
      
      if (!response.ok) {
        localStorage.removeItem("userId");
        localStorage.removeItem("rememberLogin");
        throw new Error("Authentication failed");
      }
      
      return response.json();
    },
    retry: false,
  });

  // 연락처와 채팅룸 데이터에서 프로필 이미지 URL 추출 및 프리로딩 (백그라운드에서만 실행)
  const preloadProfileImages = async (userId: string) => {
    try {
      console.log("🚀 Starting background profile image preloading...");
      
      // 짧은 타임아웃으로 앱 성능에 영향 최소화
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Preloading timeout")), 5000);
      });
      
      const preloadingPromise = async () => {
        // 연락처 데이터 가져오기
        const contactsResponse = await fetch("/api/contacts", {
          headers: { "x-user-id": userId },
        });
        
        // 채팅룸 데이터 가져오기
        const chatRoomsResponse = await fetch("/api/chat-rooms", {
          headers: { "x-user-id": userId },
        });
        
        const profileImageUrls = new Set<string>();
        
        if (contactsResponse.ok) {
          const contactsData = await contactsResponse.json();
          contactsData.contacts?.forEach((contact: any) => {
            if (contact.contactUser?.profilePicture) {
              profileImageUrls.add(contact.contactUser.profilePicture);
            }
          });
        }
        
        if (chatRoomsResponse.ok) {
          const chatRoomsData = await chatRoomsResponse.json();
          chatRoomsData.chatRooms?.forEach((chatRoom: any) => {
            if (chatRoom.profilePicture) {
              profileImageUrls.add(chatRoom.profilePicture);
            }
            // 채팅방 참가자 프로필 이미지들도 포함
            if (chatRoom.participants) {
              chatRoom.participants.forEach((participant: any) => {
                if (participant.profilePicture) {
                  profileImageUrls.add(participant.profilePicture);
                }
              });
            }
          });
        }
        
        // 현재 사용자 프로필 이미지도 포함
        if (data?.user?.profilePicture) {
          profileImageUrls.add(data.user.profilePicture);
        }
        
        console.log(`📥 Found ${profileImageUrls.size} profile images to preload`);
        
        // 최대 20개 이미지만 프리로드 (성능 고려)
        const imagesToPreload = Array.from(profileImageUrls).slice(0, 20);
        
        // 모든 프로필 이미지를 병렬로 다운로드 (각각 3초 타임아웃)
        const imagePromises = imagesToPreload.map(async (imageUrl) => {
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3000);
            
            const response = await fetch(imageUrl, { signal: controller.signal });
            clearTimeout(timeoutId);
            
            if (response.ok) {
              const blob = await response.blob();
              const objectUrl = URL.createObjectURL(blob);
              
              // 전역 캐시 초기화 (없으면 생성)
              if (!(window as any).globalImageCache) {
                (window as any).globalImageCache = new Map();
              }
              
              // 이미지 캐시에 저장
              (window as any).globalImageCache.set(imageUrl, {
                blob,
                objectUrl,
                timestamp: Date.now(),
                preloaded: true
              });
              
              console.log("✅ Preloaded profile image:", imageUrl);
            }
          } catch (error) {
            console.log("⚠️ Skipped image:", imageUrl);
          }
        });
        
        await Promise.allSettled(imagePromises);
        console.log("🎉 Profile image preloading completed!");
      };
      
      // 타임아웃과 함께 백그라운드 프리로딩 실행
      await Promise.race([preloadingPromise(), timeoutPromise]);
    } catch (error) {
      console.log("⚠️ Background profile image preloading completed with timeout");
    }
  };

  useEffect(() => {
    if (data?.user && !initialized) {
      console.log("🔄 Auth context updating user:", data.user.id, "profilePicture:", data.user.profilePicture);
      setUser(data.user);
      setInitialized(true);
      setProfileImagesLoaded(true); // Skip preloading completely for PWA
      setIsPreloadingImages(false);
      
      // Background image loading for performance (non-blocking)
      setTimeout(() => {
        preloadProfileImages(data.user.id.toString()).catch(() => {
          console.log("Background profile image loading failed");
        });
      }, 5000); // Increased delay to ensure app loads first
    } else if (error && storedUserId) {
      console.log("❌ Authentication failed, clearing user data");
      setUser(null);
      localStorage.removeItem("userId");
      localStorage.removeItem("rememberLogin");
      setInitialized(true);
      setProfileImagesLoaded(true);
      setIsPreloadingImages(false);
    } else if (!storedUserId && !initialized) {
      console.log("📱 로그아웃 상태로 초기화");
      setUser(null);
      setInitialized(true);
      setProfileImagesLoaded(true);
      setIsPreloadingImages(false);
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

  // Logout function with PWA cache clearing
  const logout = async (forceRedirect: boolean = true) => {
    try {
      // Call logout API endpoint
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch (error) {
      console.error("Logout API call failed:", error);
    } finally {
      // Clear all auto-login related storage
      localStorage.removeItem("userId");
      localStorage.removeItem("rememberLogin");
      localStorage.removeItem("lastLoginTime");
      setUser(null);
      setInitialized(false);
      setProfileImagesLoaded(false);
      setIsPreloadingImages(false);

      // Clear image cache
      if ((window as any).globalImageCache) {
        (window as any).globalImageCache.clear();
      }

      // Clear Service Worker caches to prevent authentication issues
      await clearServiceWorkerCaches();

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
      isPreloadingImages,
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
