import { useEffect, useRef, useCallback } from "react";
import { useAdvancedImageCache } from "./useAdvancedImageCache";
import { useAuth } from "./useAuth";

export function useGlobalImagePreloader() {
  const { preloadImages } = useAdvancedImageCache();
  const { user } = useAuth();
  const preloadedUrlsRef = useRef(new Set<string>());
  const isPreloadingRef = useRef(false);

  // 백그라운드에서 모든 프로필 이미지를 점진적으로 다운로드
  const startBackgroundPreloading = useCallback(async () => {
    if (!user || isPreloadingRef.current) return;
    
    isPreloadingRef.current = true;

    // 1단계: 연락처 프로필 이미지 우선 다운로드
    try {
      const contactsResponse = await fetch("/api/contacts", {
        headers: { "x-user-id": user.id.toString() },
      });
      
      if (contactsResponse.ok) {
        const contactsData = await contactsResponse.json();
        const contactImageUrls = contactsData.contacts
          ?.map((contact: any) => contact.contactUser?.profilePicture)
          .filter((url: string) => url && !preloadedUrlsRef.current.has(url)) || [];
        
        // 즉시 보이는 이미지들 먼저 (첫 8개)
        const visibleImages = contactImageUrls.slice(0, 8);
        if (visibleImages.length > 0) {
          preloadImages(visibleImages, 10); // 최고 우선순위
          visibleImages.forEach((url: string) => preloadedUrlsRef.current.add(url));
        }
        
        // 나머지 이미지들 점진적 다운로드
        const remainingImages = contactImageUrls.slice(8);
        remainingImages.forEach((url: string, index: number) => {
          setTimeout(() => {
            if (!preloadedUrlsRef.current.has(url)) {
              preloadImages([url], 7); // 중간 우선순위
              preloadedUrlsRef.current.add(url);
            }
          }, index * 150); // 150ms 간격으로 점진적 다운로드
        });
      }
    } catch (error) {
      console.log("Contacts preload failed:", error);
    }

    // 2단계: 채팅방 프로필 이미지 다운로드 (800ms 후 시작)
    setTimeout(async () => {
      try {
        const chatRoomsResponse = await fetch("/api/chat-rooms", {
          headers: { "x-user-id": user.id.toString() },
        });
        
        if (chatRoomsResponse.ok) {
          const chatRoomsData = await chatRoomsResponse.json();
          const chatImageUrls: string[] = [];
          
          chatRoomsData.chatRooms?.forEach((room: any) => {
            if (room.groupImage && !preloadedUrlsRef.current.has(room.groupImage)) {
              chatImageUrls.push(room.groupImage);
            }
            
            room.participants?.forEach((participant: any) => {
              const profileUrl = participant.user?.profilePicture;
              if (profileUrl && !preloadedUrlsRef.current.has(profileUrl)) {
                chatImageUrls.push(profileUrl);
              }
            });
          });
          
          // 채팅방 이미지들 점진적 다운로드
          chatImageUrls.forEach((url, index) => {
            setTimeout(() => {
              if (!preloadedUrlsRef.current.has(url)) {
                preloadImages([url], 5); // 낮은 우선순위
                preloadedUrlsRef.current.add(url);
              }
            }, index * 200); // 200ms 간격
          });
        }
      } catch (error) {
        console.log("Chat rooms preload failed:", error);
      }
    }, 800);
  }, [user, preloadImages]);

  // 현재 화면에 보이는 이미지들을 최우선으로 프리로드
  const preloadVisibleImages = useCallback((imageUrls: string[]) => {
    const newUrls = imageUrls.filter(url => url && !preloadedUrlsRef.current.has(url));
    if (newUrls.length > 0) {
      preloadImages(newUrls, 10); // 최고 우선순위
      newUrls.forEach(url => preloadedUrlsRef.current.add(url));
    }
  }, [preloadImages]);

  // 스크롤 예상 영역의 이미지들 프리로드
  const preloadScrollAheadImages = useCallback((imageUrls: string[]) => {
    const newUrls = imageUrls.filter(url => url && !preloadedUrlsRef.current.has(url));
    if (newUrls.length > 0) {
      preloadImages(newUrls, 8); // 높은 우선순위
      newUrls.forEach(url => preloadedUrlsRef.current.add(url));
    }
  }, [preloadImages]);

  // 앱 시작 후 백그라운드 프리로딩 시작
  useEffect(() => {
    if (user) {
      // 500ms 후 백그라운드 프리로딩 시작
      const timer = setTimeout(() => {
        startBackgroundPreloading();
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [user, startBackgroundPreloading]);

  return {
    preloadVisibleImages,
    preloadScrollAheadImages,
    startBackgroundPreloading
  };
}