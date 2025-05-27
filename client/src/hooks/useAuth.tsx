import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import type { User } from "@shared/schema";

interface AuthContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  // 앱 시작시 localStorage에서 사용자 정보 복원 시도
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    const storedUserId = localStorage.getItem("userId");
    
    if (storedUser && storedUserId) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        console.log("로그인 상태 복원됨:", parsedUser.displayName);
      } catch (error) {
        console.error("저장된 사용자 정보 파싱 오류:", error);
        localStorage.removeItem("user");
        localStorage.removeItem("userId");
      }
    }
  }, []);

  // 서버에서 사용자 정보 확인 (백업용)
  const storedUserId = localStorage.getItem("userId");
  const { data, isLoading } = useQuery({
    queryKey: ["/api/auth/me"],
    enabled: !!storedUserId && !user,
    queryFn: async () => {
      const response = await fetch("/api/auth/me", {
        headers: {
          "x-user-id": storedUserId!,
        },
      });
      if (!response.ok) {
        // 인증 실패시 저장된 정보 삭제
        localStorage.removeItem("userId");
        localStorage.removeItem("user");
        throw new Error("Authentication failed");
      }
      return response.json();
    },
    retry: false,
  });

  useEffect(() => {
    if (data?.user && !user) {
      setUser(data.user);
      localStorage.setItem("user", JSON.stringify(data.user));
      localStorage.setItem("userId", data.user.id.toString());
    }
  }, [data, user]);

  // 사용자 상태 변경 처리
  const handleSetUser = (newUser: User | null) => {
    setUser(newUser);
    if (newUser) {
      // 로그인시 localStorage에 정보 저장
      localStorage.setItem("user", JSON.stringify(newUser));
      localStorage.setItem("userId", newUser.id.toString());
      console.log("로그인 상태 저장됨:", newUser.displayName);
    } else {
      // 로그아웃시 localStorage 정보 삭제
      localStorage.removeItem("userId");
      localStorage.removeItem("user");
      console.log("로그아웃 완료");
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      setUser: handleSetUser, 
      isLoading: isLoading && !!storedUserId 
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
