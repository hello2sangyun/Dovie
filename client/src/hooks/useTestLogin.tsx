import { useMutation } from "@tanstack/react-query";
import { useAuth } from "./useAuth";

export function useTestLogin() {
  const { setUser } = useAuth();

  return useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/auth/test-login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username: "testuser" }),
      });

      if (!response.ok) {
        throw new Error("Test login failed");
      }

      return response.json();
    },
    onSuccess: (data) => {
      if (data.user) {
        localStorage.setItem("userId", data.user.id.toString());
        setUser(data.user);
        window.location.href = "/app";
      }
    },
    onError: (error) => {
      console.error("Test login error:", error);
    },
  });
}