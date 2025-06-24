import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import type { User } from "@shared/schema";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isPreloadingImages: boolean;
  setUser: (user: User | null) => void;
  logout: () => void;
  loginWithUsername: (username: string, password: string) => Promise<any>;
  loginWithEmail: (email: string, password: string) => Promise<any>;
  requestPermissions: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const storedUserId = localStorage.getItem("userId");
        if (!storedUserId) {
          setIsLoading(false);
          return;
        }

        const response = await fetch("/api/auth/me", {
          headers: { "x-user-id": storedUserId },
        });

        if (response.ok) {
          const data = await response.json();
          setUser(data.user);
        } else {
          localStorage.removeItem("userId");
        }
      } catch (error) {
        console.error("Auth error:", error);
        localStorage.removeItem("userId");
      } finally {
        setIsLoading(false);
      }
    };

    loadUser();
  }, []);

  const loginWithUsername = async (username: string, password: string) => {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    if (!response.ok) {
      throw new Error("Login failed");
    }

    const data = await response.json();
    localStorage.setItem("userId", data.user.id.toString());
    setUser(data.user);
    return data;
  };

  const loginWithEmail = async (email: string, password: string) => {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      throw new Error("Login failed");
    }

    const data = await response.json();
    localStorage.setItem("userId", data.user.id.toString());
    setUser(data.user);
    return data;
  };

  const logout = () => {
    localStorage.removeItem("userId");
    setUser(null);
  };

  const requestPermissions = async () => {
    // Minimal implementation
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isLoading, 
      isPreloadingImages: false,
      setUser, 
      logout,
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
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}