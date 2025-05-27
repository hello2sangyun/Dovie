import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import LandingPage from "@/pages/LandingPage";
import LoginPage from "@/pages/LoginPage";
import LoginChoice from "@/pages/LoginChoice";
import PhoneLogin from "@/pages/PhoneLogin";
import Signup from "@/pages/Signup";
import EmailVerification from "@/pages/EmailVerification";
import ProfileSetup from "@/pages/ProfileSetup";
import MainApp from "@/pages/MainApp";
import NotFound from "@/pages/not-found";
import { useEffect } from "react";

function Router() {
  return (
    <Switch>
      <Route path="/" component={LoginChoice} />
      <Route path="/login" component={LoginPage} />
      <Route path="/phone-login" component={PhoneLogin} />
      <Route path="/signup" component={Signup} />
      <Route path="/email-verification" component={EmailVerification} />
      <Route path="/profile-setup" component={ProfileSetup} />
      <Route path="/app" component={MainApp} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
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
