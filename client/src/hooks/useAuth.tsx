import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import type { User } from "@shared/schema";
import { useInstantImageCache } from "./useInstantImageCache";

interface AuthContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  logout: () => void;
  isLoading: boolean;
  isPreloadingImages: boolean;
  loginWithUsername: (username: string, password: string) => Promise<any>;
  loginWithEmail: (email: string, password: string) => Promise<any>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [profileImagesLoaded, setProfileImagesLoaded] = useState(false);
  const [isPreloadingImages, setIsPreloadingImages] = useState(false);


  // Try to get user from localStorage on app start (with safety check)
  const [storedUserId, setStoredUserId] = useState<string | null>(null);
  const [rememberLogin, setRememberLogin] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setStoredUserId(localStorage.getItem("userId"));
      setRememberLogin(localStorage.getItem("rememberLogin"));
    }
  }, []);

  const { data, isLoading, error } = useQuery({
    queryKey: ["/api/auth/me"],
    enabled: !!storedUserId && rememberLogin === "true", // 저장된 ID와 자동로그인 설정 모두 확인
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

  // 프로필 이미지 프리로딩 완전 비활성화 (로딩 문제 해결)
  const preloadProfileImages = async (userId: string) => {
    setIsPreloadingImages(true);
    try {
      console.log("⚡ Profile image preloading disabled for faster loading");
      // 즉시 완료 처리
      setProfileImagesLoaded(true);
    } catch (error) {
      console.log("Profile image preloading skipped");
      setProfileImagesLoaded(true);
    } finally {
      setIsPreloadingImages(false);
    }
  };

  useEffect(() => {
    if (data?.user && !profileImagesLoaded) {
      console.log("🔄 Auth context updating user:", data.user.id, "profilePicture:", data.user.profilePicture);
      setUser(data.user);
      
      // 프로필 이미지 프리로딩 시작 - 완료될 때까지 기다림
      preloadProfileImages(data.user.id.toString()).then(() => {
        setInitialized(true);
      });
    } else if (data?.user && profileImagesLoaded) {
      // 이미지가 이미 로드된 경우 바로 초기화 완료
      setUser(data.user);
      setInitialized(true);
    } else if (error && storedUserId) {
      // Clear user data if authentication fails for stored user
      console.log("❌ Authentication failed, clearing user data");
      setUser(null);
      localStorage.removeItem("userId");
      localStorage.removeItem("rememberLogin");
      setInitialized(true);
      setProfileImagesLoaded(false);
      setIsPreloadingImages(false);
    } else if ((!storedUserId || rememberLogin !== "true") && !initialized) {
      // No stored user ID or auto-login disabled, mark as initialized immediately
      console.log("📱 No stored user or auto-login disabled, initializing as logged out");
      setUser(null);
      setInitialized(true);
      setProfileImagesLoaded(false);
      setIsPreloadingImages(false);
      // Clear any invalid stored data
      if (storedUserId && rememberLogin !== "true") {
        localStorage.removeItem("userId");
        localStorage.removeItem("rememberLogin");
      }
    }
  }, [data, error, storedUserId, profileImagesLoaded, initialized]);

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
    return data;
  };

  // Logout function
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

      console.log("로그아웃 완료 - 자동 로그인 설정 해제됨");
      
      // 강제 리디렉션을 원하는 경우에만 로그인 페이지로 이동
      if (forceRedirect) {
        window.location.href = "/login";
      }
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      setUser: handleSetUser, 
      logout,
      isLoading: (isLoading && !!storedUserId) || !initialized || (!!user && !profileImagesLoaded),
      isPreloadingImages,
      loginWithUsername,
      loginWithEmail
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
