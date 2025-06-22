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


  // Try to get user from localStorage on app start
  const storedUserId = localStorage.getItem("userId");

  const { data, isLoading, error } = useQuery({
    queryKey: ["/api/auth/me"],
    enabled: !!storedUserId || !initialized, // 저장된 ID가 있거나 초기화되지 않은 경우 실행
    refetchInterval: false, // 자동 새로고침 비활성화 (불필요한 요청 방지)
    staleTime: 5 * 60 * 1000, // 5분 동안 캐시 유지
    gcTime: 10 * 60 * 1000, // 10분 동안 메모리에 보관 (v5에서 cacheTime -> gcTime)
    queryFn: async () => {
      if (!storedUserId) {
        throw new Error("No stored user ID");
      }
      
      const response = await fetch("/api/auth/me", {
        headers: {
          "x-user-id": storedUserId,
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

  // 연락처와 채팅룸 데이터에서 프로필 이미지 URL 추출 및 프리로딩
  const preloadProfileImages = async (userId: string) => {
    setIsPreloadingImages(true);
    try {
      console.log("🚀 Starting profile image preloading...");
      
      // 프리로딩 타임아웃 설정 (최대 10초)
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Preloading timeout")), 10000);
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
      
      // 타임아웃과 함께 프리로딩 실행
      await Promise.race([preloadingPromise(), timeoutPromise]);
      setProfileImagesLoaded(true);
    } catch (error) {
      console.log("⚠️ Profile image preloading timed out or failed, proceeding anyway");
      setProfileImagesLoaded(true); // 실패해도 로그인은 진행
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
    } else if (error) {
      // Clear user data if authentication fails
      console.log("❌ Authentication failed, clearing user data");
      setUser(null);
      localStorage.removeItem("userId");
      setInitialized(true);
      setProfileImagesLoaded(false);
      setIsPreloadingImages(false);
    } else if (!storedUserId) {
      // No stored user ID, mark as initialized
      setInitialized(true);
      setProfileImagesLoaded(false);
      setIsPreloadingImages(false);
    }
  }, [data, error, storedUserId, profileImagesLoaded]);

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
      isLoading: (isLoading && !!storedUserId) || !initialized || !profileImagesLoaded,
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
