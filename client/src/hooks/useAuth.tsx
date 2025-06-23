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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [initialized, setInitialized] = useState(false);

  // Try to get user from localStorage on app start (with safety check)
  const [storedUserId, setStoredUserId] = useState<string | null>(null);
  const [rememberLogin, setRememberLogin] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const userId = localStorage.getItem("userId");
      const remember = localStorage.getItem("rememberLogin");
      setStoredUserId(userId);
      setRememberLogin(remember);
      console.log("📱 Checking auto-login:", { userId, remember });
    }
  }, []);

  // Only try to authenticate if we have a stored user ID and auto-login is enabled
  const { data, error, isLoading } = useQuery({
    queryKey: ['/api/auth/me'],
    enabled: !!(storedUserId && rememberLogin === "true"),
    gcTime: 60 * 1000, // 1 minute
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
    retry: false,
  });

  useEffect(() => {
    if (data?.user) {
      console.log("🔄 Auth context updating user:", data.user.id, "profilePicture:", data.user.profilePicture);
      setUser(data.user);
      setInitialized(true);
    } else if (error && storedUserId) {
      // Clear user data if authentication fails for stored user
      console.log("❌ Authentication failed, clearing user data");
      setUser(null);
      localStorage.removeItem("userId");
      localStorage.removeItem("rememberLogin");
      setInitialized(true);
    } else if ((!storedUserId || rememberLogin !== "true") && !initialized) {
      // No stored user ID or auto-login disabled, mark as initialized immediately
      console.log("📱 No stored user or auto-login disabled, initializing as logged out");
      setUser(null);
      setInitialized(true);
      // Clear any invalid stored data
      if (storedUserId && rememberLogin !== "true") {
        localStorage.removeItem("userId");
        localStorage.removeItem("rememberLogin");
      }
    }
  }, [data, error, storedUserId, initialized]);

  // Clear user data when logging out
  const handleSetUser = (newUser: User | null) => {
    setUser(newUser);
    if (!newUser) {
      localStorage.removeItem("userId");
      localStorage.removeItem("rememberLogin");
      localStorage.removeItem("lastLoginTime");
    }
  };

  // Username login function
  const loginWithUsername = async (username: string, password: string) => {
    const response = await fetch("/api/auth/login", {
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
    
    // Save auto-login information
    localStorage.setItem("userId", data.user.id.toString());
    localStorage.setItem("rememberLogin", "true");
    localStorage.setItem("lastLoginTime", Date.now().toString());
    
    console.log("✅ Auto-login has been set up");
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
    
    // Save auto-login information
    localStorage.setItem("userId", data.user.id.toString());
    localStorage.setItem("rememberLogin", "true");
    localStorage.setItem("lastLoginTime", Date.now().toString());
    
    console.log("✅ Auto-login has been set up");
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

      // Clear image cache
      if ((window as any).globalImageCache) {
        (window as any).globalImageCache.clear();
      }

      console.log("Logout complete - auto-login disabled");
      
      // Force redirect to login page only if requested
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
      isLoading: false, // 로딩 화면 문제 해결을 위해 항상 false로 설정
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