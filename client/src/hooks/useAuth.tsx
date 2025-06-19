import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import type { User } from "@shared/schema";

interface AuthContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [initialized, setInitialized] = useState(false);

  // Try to get user from localStorage on app start
  const storedUserId = localStorage.getItem("userId");

  const { data, isLoading, error } = useQuery({
    queryKey: ["/api/auth/me"],
    enabled: !!storedUserId && !user, // Only query if we have stored ID and no current user
    refetchInterval: 30000, // 30초마다 자동 새로고침
    staleTime: 5000, // 5초 동안 캐시 유지
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
    retry: 1,
  });

  useEffect(() => {
    if (data?.user) {
      console.log("🔄 Auth context updating user:", data.user.id, "profilePicture:", data.user.profilePicture);
      setUser(data.user);
      setInitialized(true);
    } else if (error) {
      // Clear user data if authentication fails
      console.log("❌ Authentication failed, clearing user data");
      setUser(null);
      localStorage.removeItem("userId");
      setInitialized(true);
    } else if (!storedUserId) {
      // No stored user ID, mark as initialized
      setInitialized(true);
    }
  }, [data, error, storedUserId]);

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
      isLoading: (isLoading && !!storedUserId) || !initialized
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
