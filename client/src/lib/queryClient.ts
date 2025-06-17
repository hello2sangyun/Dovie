import { QueryClient, QueryFunction } from "@tanstack/react-query";

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
    ...(userId ? { "x-user-id": userId } : {})
  };

  // FormData인 경우 Content-Type을 설정하지 않음 (브라우저가 자동 설정)
  let body: string | FormData | undefined;
  if (data instanceof FormData) {
    body = data;
  } else if (data) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(data);
  }

  const res = await fetch(url, {
    method,
    headers,
    body,
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

    const res = await fetch(queryKey[0] as string, {
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
