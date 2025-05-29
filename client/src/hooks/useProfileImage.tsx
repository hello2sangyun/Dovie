import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';

export function useProfileImage(userId?: number) {
  const { user: currentUser } = useAuth();
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // 현재 사용자인지 확인
  const isCurrentUser = !userId || userId === currentUser?.id;
  const targetUser = isCurrentUser ? currentUser : null;
  
  useEffect(() => {
    if (!targetUser?.profilePicture) {
      setImageUrl(null);
      return;
    }
    
    // 고유한 타임스탬프를 추가하여 브라우저 캐시 우회
    const cacheBuster = Date.now();
    const url = `${targetUser.profilePicture}?t=${cacheBuster}`;
    
    console.log("🖼️ Loading profile image for user:", targetUser.id, "URL:", url);
    
    setIsLoading(true);
    setError(null);
    
    // 이미지가 실제로 로드 가능한지 확인
    const img = new Image();
    
    img.onload = () => {
      console.log("✅ Profile image loaded successfully:", url);
      setImageUrl(url);
      setIsLoading(false);
    };
    
    img.onerror = () => {
      console.error("❌ Profile image failed to load:", url);
      setError("이미지를 불러올 수 없습니다");
      setImageUrl(null);
      setIsLoading(false);
    };
    
    img.src = url;
    
  }, [targetUser?.profilePicture, targetUser?.id]);
  
  return {
    imageUrl,
    isLoading,
    error,
    hasImage: !!imageUrl
  };
}