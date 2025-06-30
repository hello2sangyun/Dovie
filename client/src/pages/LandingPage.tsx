import { useEffect } from "react";
import { useLocation } from "wouter";
import VaultLogo from "@/components/VaultLogo";

export default function LandingPage() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    // Check if user is already stored
    const storedUserId = localStorage.getItem("userId");
    
    if (storedUserId) {
      // User exists, go to app
      setLocation("/app");
    } else {
      // Deploy 환경에서 데모 계정 자동 로그인
      const autoLoginDemo = async () => {
        try {
          const response = await fetch("/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              identifier: "hello2sangyun@gmail.com",
              password: "sangyun"
            })
          });

          if (response.ok) {
            const data = await response.json();
            localStorage.setItem("userId", data.user.id.toString());
            localStorage.setItem("rememberLogin", "true");
            setLocation("/app");
          } else {
            // 로그인 실패 시 로그인 페이지로
            setLocation("/login");
          }
        } catch (error) {
          console.error("Auto login failed:", error);
          setLocation("/login");
        }
      };

      // 2초 후 자동 로그인 시도
      const timer = setTimeout(() => {
        autoLoginDemo();
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [setLocation]);

  return (
    <div className="fixed inset-0 bg-white flex items-center justify-center z-50">
      <div className="text-center">
        <div className="relative mb-8">
          <VaultLogo size="xl" className="mx-auto" animated />
          {/* 새 날개 애니메이션 */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative w-24 h-24">
              {/* 왼쪽 날개 */}
              <div className="absolute left-2 top-6 w-8 h-12 bg-gradient-to-br from-purple-400 to-purple-600 rounded-full transform origin-bottom animate-wing-left opacity-60"></div>
              {/* 오른쪽 날개 */}
              <div className="absolute right-2 top-6 w-8 h-12 bg-gradient-to-bl from-purple-400 to-purple-600 rounded-full transform origin-bottom animate-wing-right opacity-60"></div>
            </div>
          </div>
        </div>
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Dovie Messenger</h1>
        <p className="text-gray-600 text-lg mb-8">안전하고 스마트한 메신저</p>
        
        {/* 로딩 애니메이션 */}
        <div className="flex justify-center items-center space-x-1">
          <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse-dot" style={{animationDelay: '0ms'}}></div>
          <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse-dot" style={{animationDelay: '150ms'}}></div>
          <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse-dot" style={{animationDelay: '300ms'}}></div>
        </div>
      </div>
    </div>
  );
}
