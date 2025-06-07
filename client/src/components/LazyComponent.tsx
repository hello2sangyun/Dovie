import { Suspense, lazy, ComponentType } from "react";

interface LazyComponentProps {
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export function LazyWrapper({ fallback = <div className="animate-pulse bg-gray-200 rounded h-32"></div>, children }: LazyComponentProps) {
  return (
    <Suspense fallback={fallback}>
      {children}
    </Suspense>
  );
}

// 지연 로딩을 위한 HOC
export function withLazyLoading<T extends {}>(
  Component: ComponentType<T>,
  fallback?: React.ReactNode
) {
  return (props: T) => (
    <LazyWrapper fallback={fallback}>
      <Component {...props} />
    </LazyWrapper>
  );
}

// 스켈레톤 로더 컴포넌트들
export const CardSkeleton = () => (
  <div className="animate-pulse">
    <div className="bg-gray-200 rounded-lg h-32 mb-4"></div>
    <div className="bg-gray-200 rounded h-4 mb-2"></div>
    <div className="bg-gray-200 rounded h-4 w-3/4"></div>
  </div>
);

export const ProfileSkeleton = () => (
  <div className="animate-pulse">
    <div className="bg-gray-200 rounded-full w-16 h-16 mb-4"></div>
    <div className="bg-gray-200 rounded h-4 mb-2"></div>
    <div className="bg-gray-200 rounded h-4 w-2/3"></div>
  </div>
);

export const MessageSkeleton = () => (
  <div className="animate-pulse">
    <div className="flex space-x-3 mb-3">
      <div className="bg-gray-200 rounded-full w-8 h-8"></div>
      <div className="flex-1">
        <div className="bg-gray-200 rounded h-4 mb-1"></div>
        <div className="bg-gray-200 rounded h-4 w-3/4"></div>
      </div>
    </div>
  </div>
);