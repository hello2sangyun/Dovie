import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import type { User } from "@shared/schema";

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
  const [isPreloadingImages, setIsPreloadingImages] = useState(false);

  // Get stored user ID from localStorage
  const storedUserId = localStorage.getItem("userId");
  console.log('SIMPLE AUTH: Stored userId:', storedUserId);

  // Simple auth query
  const { data, isLoading, error } = useQuery({
    queryKey: ["/api/auth/me"],
    enabled: !!storedUserId,
    retry: false,
    throwOnError: false,
    queryFn: async () => {
      console.log('SIMPLE AUTH: Making auth request');
      
      const response = await fetch("/api/auth/me", {
        headers: {
          "x-user-id": storedUserId!,
        },
      });
      
      if (!response.ok) {
        console.log('SIMPLE AUTH: Auth failed, clearing localStorage');
        localStorage.removeItem("userId");
        throw new Error("Authentication failed");
      }
      
      const userData = await response.json();
      console.log('SIMPLE AUTH: Success:', userData.user?.id);
      return userData;
    },
  });

  // Handle auth result
  useEffect(() => {
    if (data?.user) {
      console.log('SIMPLE AUTH: Setting user:', data.user.id);
      setUser(data.user);
    } else if (error) {
      console.log('SIMPLE AUTH: Auth error, clearing user');
      setUser(null);
      localStorage.removeItem("userId");
    } else if (!storedUserId) {
      console.log('SIMPLE AUTH: No stored user');
      setUser(null);
    }
  }, [data, error, storedUserId]);

  // Login functions
  const loginWithUsername = async (username: string, password: string) => {
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        throw new Error("Login failed");
      }

      const userData = await response.json();
      localStorage.setItem("userId", userData.user.id.toString());
      setUser(userData.user);
      return userData;
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    }
  };

  const loginWithEmail = async (email: string, password: string) => {
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        throw new Error("Login failed");
      }

      const userData = await response.json();
      localStorage.setItem("userId", userData.user.id.toString());
      setUser(userData.user);
      return userData;
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    }
  };

  const logout = () => {
    console.log('SIMPLE AUTH: Logging out');
    localStorage.removeItem("userId");
    localStorage.removeItem("rememberLogin");
    setUser(null);
  };

  const requestPermissions = async () => {
    // Simplified permission request
    console.log('SIMPLE AUTH: Permission request (simplified)');
  };

  const contextValue: AuthContextType = {
    user,
    setUser,
    logout,
    isLoading,
    isPreloadingImages,
    loginWithUsername,
    loginWithEmail,
    requestPermissions,
  };

  return (
    <AuthContext.Provider value={contextValue}>
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