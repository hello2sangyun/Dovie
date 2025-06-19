import { useMutation } from "@tanstack/react-query";
import { useAuth } from "./useAuth";
import { useLocation } from "wouter";

export function useTestLogin() {
  const { setUser } = useAuth();
  const [, setLocation] = useLocation();

  return useMutation({
    mutationFn: async () => {
      console.log("Starting test login...");
      const response = await fetch("/api/auth/test-login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username: "testuser" }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Test login failed:", response.status, errorText);
        throw new Error(`Test login failed: ${response.status}`);
      }

      const data = await response.json();
      console.log("Test login response:", data);
      return data;
    },
    onSuccess: (data) => {
      if (data.user) {
        console.log("Test login successful, setting user:", data.user.id);
        localStorage.setItem("userId", data.user.id.toString());
        setUser(data.user);
        // Use wouter navigation instead of window.location
        setTimeout(() => setLocation("/app"), 100);
      }
    },
    onError: (error) => {
      console.error("Test login error:", error);
      // Try again after a short delay
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    },
  });
}