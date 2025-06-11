import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import LandingPage from "@/pages/LandingPage";
import LoginPage from "@/pages/LoginPage";
import SignupPage from "@/pages/SignupPage";
import ProfileSetupPage from "@/pages/ProfileSetupPage";
import PhoneLogin from "@/pages/PhoneLogin";
import MainApp from "@/pages/MainApp";
import AdminPage from "@/pages/AdminPage";
import FriendProfilePage from "@/pages/FriendProfilePage";
import CardScannerPage from "@/pages/CardScannerPage";
import SharePage from "@/pages/SharePage";
import BusinessCardDetail from "@/pages/BusinessCardDetail";
import NotFound from "@/pages/not-found";
import { useEffect } from "react";

function Router() {
  return (
    <Switch>
      <Route path="/" component={LandingPage} />
      <Route path="/login" component={LoginPage} />
      <Route path="/signup" component={SignupPage} />
      <Route path="/profile-setup" component={ProfileSetupPage} />
      <Route path="/phone-login" component={PhoneLogin} />
      <Route path="/app" component={MainApp} />
      <Route path="/admin" component={AdminPage} />
      <Route path="/friend/:userId" component={FriendProfilePage} />
      <Route path="/card-scanner" component={CardScannerPage} />
      <Route path="/share/:userId" component={SharePage} />
      <Route path="/business-card/:contactId" component={BusinessCardDetail} />
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
      <TooltipProvider>
        <AuthProvider>
          <Toaster />
          <Router />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
