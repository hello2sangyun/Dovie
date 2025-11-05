import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
// import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";
import LandingPage from "@/pages/LandingPage";
import LoginPage from "@/pages/LoginPage";
import SignupPage from "@/pages/SignupPage";
import ProfileSetupPage from "@/pages/ProfileSetupPage";
import PhoneLogin from "@/pages/PhoneLogin";
import MainApp from "@/pages/MainApp";
import AdminPage from "@/pages/AdminPage";
import FriendProfilePage from "@/pages/FriendProfilePage";
import UserProfilePage from "@/pages/UserProfilePage";
import GroupInfoPage from "@/pages/GroupInfoPage";
import NotFound from "@/pages/not-found";
import { useEffect } from "react";
import { App as CapacitorApp } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { handleAuthCallback } from "@/lib/firebase";

function Router() {
  return (
    <Switch>
      <Route path="/" component={LandingPage} />
      <Route path="/login" component={LoginPage} />
      <Route path="/signup" component={SignupPage} />
      <Route path="/profile-setup" component={ProfileSetupPage} />
      <Route path="/phone-login" component={PhoneLogin} />
      <Route path="/app" component={MainApp} />
      <Route path="/chat-rooms" component={MainApp} />
      <Route path="/chat-rooms/:chatRoomId" component={MainApp} />
      <Route path="/group-info/:chatRoomId" component={GroupInfoPage} />
      <Route path="/admin" component={AdminPage} />
      <Route path="/friend/:userId" component={FriendProfilePage} />
      <Route path="/profile/:userId" component={UserProfilePage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
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

  // Handle OAuth callback from Capacitor Browser (iOS/Android)
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    let listenerHandle: any = null;

    const setupListener = async () => {
      const handleUrlOpen = (event: { url: string }) => {
        console.log('📱 App opened with URL:', event.url);
        
        // Check if this is an auth callback URL
        // Expected format: dovie://auth?token=FIREBASE_ID_TOKEN
        if (event.url.includes('auth')) {
          try {
            const url = new URL(event.url);
            const token = url.searchParams.get('token');
            
            if (token) {
              console.log('✅ Auth token received from callback');
              handleAuthCallback(token);
            } else {
              console.log('❌ No token in callback URL');
              handleAuthCallback(null);
            }
          } catch (error) {
            console.error('Error parsing auth callback URL:', error);
            handleAuthCallback(null);
          }
        }
      };

      // Listen for app URL open events
      listenerHandle = await CapacitorApp.addListener('appUrlOpen', handleUrlOpen);
    };

    setupListener();

    return () => {
      if (listenerHandle) {
        listenerHandle.remove();
      }
    };
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
        <Toaster />
        <PWAInstallPrompt />
        <Router />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
