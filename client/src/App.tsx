import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
// import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { WebSocketProvider } from "@/hooks/useWebSocketContext";
import { ChatPresenceProvider } from "@/contexts/ChatPresenceContext";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";
import { SimplePushManager } from "@/components/SimplePushManager";
import SplashScreen from "@/components/SplashScreen";
import LandingPage from "@/pages/LandingPage";
import NotFound from "@/pages/not-found";
import { useEffect, useState, lazy, Suspense, ComponentType } from "react";

// Capacitor helper to check if running in native app
// Only import Capacitor if it's actually available (native platform)
const isCapacitorAvailable = () => {
  return typeof window !== 'undefined' && 
         (window as any).Capacitor !== undefined;
};

const isNativePlatform = () => {
  if (!isCapacitorAvailable()) return false;
  try {
    const Capacitor = (window as any).Capacitor;
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
};

// lazyWithPreload: lazy loading with optional preload capability
function lazyWithPreload<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>
) {
  const Component = lazy(factory);
  (Component as any).preload = factory;
  return Component;
}

// 모든 페이지를 lazy loading (웹과 네이티브 모두)
// 네이티브에서는 아래에서 preload하여 키보드 렉 방지
const LoginPage = lazyWithPreload(() => import("@/pages/LoginPage"));
const SignupPage = lazyWithPreload(() => import("@/pages/SignupPage"));
const ForgotPasswordPage = lazyWithPreload(() => import("@/pages/ForgotPasswordPage"));
const MainApp = lazyWithPreload(() => import("@/pages/MainApp"));

// 나머지 화면은 preload 없이 lazy loading만
const ProfileSetupPage = lazy(() => import("@/pages/ProfileSetupPage"));
const PhoneLogin = lazy(() => import("@/pages/PhoneLogin"));
const AdminPage = lazy(() => import("@/pages/AdminPage"));
const FriendProfilePage = lazy(() => import("@/pages/FriendProfilePage"));
const GroupInfoPage = lazy(() => import("@/pages/GroupInfoPage"));
const ScreenshotDemo = lazy(() => import("@/pages/ScreenshotDemo"));
const PushDebugPage = lazy(() => import("@/pages/PushDebugPage"));

// 네이티브 앱에서는 초기 화면을 preload하여 키보드 렉 방지
if (isNativePlatform()) {
  console.log('🚀 Native platform detected - preloading critical pages');
  (LoginPage as any).preload?.();
  (SignupPage as any).preload?.();
  (ForgotPasswordPage as any).preload?.();
  (MainApp as any).preload?.();
}

const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-dvh bg-gradient-to-br from-purple-50 via-white to-blue-50">
    <div className="text-center">
      <div className="w-12 h-12 mx-auto mb-4 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
      <p className="text-gray-600">로딩 중...</p>
    </div>
  </div>
);

function Router() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <Switch>
        <Route path="/" component={LandingPage} />
        <Route path="/login" component={LoginPage} />
        <Route path="/signup" component={SignupPage} />
        <Route path="/forgot-password" component={ForgotPasswordPage} />
        <Route path="/profile-setup" component={ProfileSetupPage} />
        <Route path="/phone-login" component={PhoneLogin} />
        <Route path="/app" component={MainApp} />
        <Route path="/chat-rooms" component={MainApp} />
        <Route path="/chat-rooms/:chatRoomId" component={MainApp} />
        <Route path="/group-info/:chatRoomId" component={GroupInfoPage} />
        <Route path="/admin" component={AdminPage} />
        <Route path="/friend/:userId" component={FriendProfilePage} />
        <Route path="/profile/:userId" component={FriendProfilePage} />
        <Route path="/screenshots/:id" component={ScreenshotDemo} />
        <Route path="/push-debug" component={PushDebugPage} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function App() {
  // Splash screen state - only show on native apps on first load
  const [showSplash, setShowSplash] = useState(() => {
    // Only show splash screen on native platforms
    if (isNativePlatform()) {
      // Check if we've already shown the splash on this session
      const hasShownSplash = sessionStorage.getItem('hasShownSplash');
      return !hasShownSplash;
    }
    return false;
  });

  const handleSplashComplete = () => {
    sessionStorage.setItem('hasShownSplash', 'true');
    setShowSplash(false);
  };

  // Dark mode initialization
  useEffect(() => {
    const savedDarkMode = localStorage.getItem('darkMode');
    // 새로운 사용자는 라이트 모드로 시작, 명시적으로 다크모드를 설정한 경우에만 적용
    const shouldUseDarkMode = savedDarkMode === 'true';
    
    if (shouldUseDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  // 브라우저 뒤로 가기 버튼 처리 - 로그아웃 대신 페이지 히스토리 기반 네비게이션
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      // popstate 이벤트는 자연스럽게 발생하도록 하고, 로그아웃을 방지
      console.log('Browser back button pressed, navigating to previous page');
    };

    // 브라우저 히스토리 변경 감지
    window.addEventListener('popstate', handlePopState);

    // 히스토리 스택에 현재 페이지 추가 (처음 방문 시)
    if (window.history.state === null) {
      window.history.replaceState({ page: window.location.pathname }, '', window.location.pathname);
    }

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  // 선택적 드래그 앤 드롭 이벤트 처리로 페이지 깜빡임 방지
  useEffect(() => {
    const handleDragOver = (e: DragEvent) => {
      // 채팅 영역이 아닌 곳에서만 차단
      const target = e.target as HTMLElement;
      const isInChatArea = target.closest('[data-chat-area]');
      
      if (!isInChatArea) {
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer!.dropEffect = "none";
      }
    };

    const handleDrop = (e: DragEvent) => {
      // 채팅 영역이 아닌 곳에서만 차단
      const target = e.target as HTMLElement;
      const isInChatArea = target.closest('[data-chat-area]');
      
      if (!isInChatArea) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    // document에만 이벤트 리스너 추가 (window 제거로 덜 간섭적으로)
    document.addEventListener('dragover', handleDragOver, false);
    document.addEventListener('drop', handleDrop, false);

    return () => {
      document.removeEventListener('dragover', handleDragOver, false);
      document.removeEventListener('drop', handleDrop, false);
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ChatPresenceProvider>
          <WebSocketProvider>
            <Toaster />
            <PWAInstallPrompt />
            {/* SimplePushManager: PWA/웹에서만 작동 (iOS 네이티브는 useCapacitorPushNotifications 사용) */}
            {!isNativePlatform() && <SimplePushManager />}
            {showSplash && <SplashScreen onComplete={handleSplashComplete} />}
            <Router />
          </WebSocketProvider>
        </ChatPresenceProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
