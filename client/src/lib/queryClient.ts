import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { getApiUrl } from "./api-config";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  url: string,
  method: string,
  data?: unknown | undefined,
): Promise<Response> {
  const userId = localStorage.getItem("userId");
  const headers: Record<string, string> = {
    ...(data ? { "Content-Type": "application/json" } : {}),
    ...(userId ? { "x-user-id": userId } : {})
  };

  // Convert relative URL to absolute URL if needed (for native apps)
  const fullUrl = getApiUrl(url);

  const res = await fetch(fullUrl, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const userId = localStorage.getItem("userId");
    const headers: Record<string, string> = {
      ...(userId ? { "x-user-id": userId } : {})
    };

    // Convert relative URL to absolute URL if needed (for native apps)
    const fullUrl = getApiUrl(queryKey[0] as string);

    const res = await fetch(fullUrl, {
      headers,
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 30 * 1000, // 30 seconds cache for faster updates
      gcTime: 5 * 60 * 1000, // 5 minutes garbage collection
      retry: (failureCount: number, error: any) => {
        if (error?.message?.includes('404')) return false;
        return failureCount < 1; // Reduce retries for faster response
      },
      refetchOnMount: true, // Always refetch on mount for fresh data
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 1,
      gcTime: 1000 * 60 * 5, // 5 minutes for mutations
    },
  },
});
