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
    enabled: !!storedUserId, // Always query if we have stored ID
    refetchInterval: 30000, // 30초마다 자동 새로고침
    staleTime: 1000, // 1초 동안만 캐시 유지
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
        // If auth fails, clear stored user ID
        localStorage.removeItem("userId");
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
      
      // 모든 프로필 이미지를 병렬로 다운로드
      const imagePromises = Array.from(profileImageUrls).map(async (imageUrl) => {
        try {
          const response = await fetch(imageUrl);
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
          console.error("❌ Failed to preload image:", imageUrl, error);
        }
      });
      
      await Promise.all(imagePromises);
      console.log("🎉 Profile image preloading completed! Total:", profileImageUrls.size, "images");
      setProfileImagesLoaded(true);
    } catch (error) {
      console.error("❌ Profile image preloading failed:", error);
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

  // Logout function
  const logout = async () => {
    try {
      // Call logout API endpoint
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch (error) {
      console.error("Logout API call failed:", error);
    } finally {
      // Clear local storage and user state regardless of API call result
      localStorage.removeItem("userId");
      setUser(null);
      
      // Redirect to login page
      window.location.href = "/login";
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      setUser: handleSetUser, 
      logout,
      isLoading: (isLoading && !!storedUserId) || !initialized || !profileImagesLoaded,
      isPreloadingImages
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
