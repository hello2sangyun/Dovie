import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import type { User } from "@shared/schema";

interface AuthContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  isLoading: boolean;
  locationPermissionGranted: boolean;
  requestLocationPermission: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [locationPermissionGranted, setLocationPermissionGranted] = useState<boolean>(
    localStorage.getItem("locationPermissionGranted") === "true"
  );

  // Try to get user from localStorage on app start
  const storedUserId = localStorage.getItem("userId");

  // Location permission request function
  const requestLocationPermission = async (): Promise<boolean> => {
    if (!navigator.geolocation) {
      return false;
    }

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          localStorage.setItem("locationPermissionGranted", "true");
          localStorage.setItem("userLocation", JSON.stringify({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: Date.now()
          }));
          setLocationPermissionGranted(true);
          resolve(true);
        },
        (error) => {
          console.warn("위치 정보 접근 거부:", error);
          localStorage.setItem("locationPermissionGranted", "false");
          setLocationPermissionGranted(false);
          resolve(false);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000
        }
      );
    });
  };

  const { data, isLoading } = useQuery({
    queryKey: ["/api/auth/me"],
    enabled: !!storedUserId,
    refetchInterval: 30000, // 30초마다 자동 새로고침
    staleTime: 0, // 항상 최신 데이터 요청
    queryFn: async () => {
      const response = await fetch("/api/auth/me", {
        headers: {
          "x-user-id": storedUserId!,
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

  useEffect(() => {
    if (data?.user) {
      console.log("🔄 Auth context updating user:", data.user.id, "profilePicture:", data.user.profilePicture);
      setUser(data.user);
    }
  }, [data]);

  // Clear user data when logging out
  const handleSetUser = (newUser: User | null) => {
    setUser(newUser);
    if (!newUser) {
      localStorage.removeItem("userId");
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
