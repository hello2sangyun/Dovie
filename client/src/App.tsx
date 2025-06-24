import { Switch, Route } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/hooks/useAuth";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";

import LoginPage from "@/pages/LoginPage";
import SignupPage from "@/pages/SignupPage";
import MainApp from "@/pages/MainApp";
import ProfileSetupPage from "@/pages/ProfileSetupPage";
import PhoneLogin from "@/pages/PhoneLogin";
import LoadingScreen from "@/components/LoadingScreen";

import { useAuth } from "@/hooks/useAuth";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000,   // 10 minutes
      refetchOnWindowFocus: false,
      retry: 3,
    },
  },
});

function AppContent() {
  const { user, isLoading, isPreloadingImages } = useAuth();

  if (isLoading || isPreloadingImages) {
    return <LoadingScreen />;
  }

  if (user) {
    return <MainApp />;
  }

  return (
    <Switch>
      <Route path="/signup" component={SignupPage} />
      <Route path="/phone-auth" component={PhoneLogin} />
      <Route path="/profile-setup" component={ProfileSetupPage} />
      <Route path="/" component={LoginPage} />
      <Route>
        <LoginPage />
      </Route>
    </Switch>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <AppContent />
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}