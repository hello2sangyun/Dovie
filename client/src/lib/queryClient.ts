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
    ...(data ? { "Content-Type": "application/json" } : {}),
    ...(userId ? { "x-user-id": userId } : {})
  };

  const res = await fetch(url, {
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
      staleTime: 30 * 1000, // 30초 캐시로 줄여서 더 빠른 응답
      gcTime: 5 * 60 * 1000, // 5분 가비지 컬렉션
      retry: (failureCount: number, error: any) => {
        if (error?.message?.includes('404')) return false;
        return failureCount < 1; // 재시도 횟수 줄임
      },
      refetchOnMount: false,
      refetchOnReconnect: false, // 재연결 시 자동 새로고침 비활성화
      networkMode: 'always', // 네트워크 상태와 관계없이 요청
    },
    mutations: {
      retry: 0, // 뮤테이션 재시도 비활성화로 빠른 응답
      networkMode: 'always',
    },
  },
});
