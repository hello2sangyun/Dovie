import { useEffect } from "react";
import { useLocation } from "wouter";
import VaultLogo from "@/components/VaultLogo";
import { useToast } from "@/hooks/use-toast";

export default function LandingPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    // Check if user is already stored
    const storedUserId = localStorage.getItem("userId");
    
    if (storedUserId) {
      // Check if user is admin
      const checkUserAndRedirect = async () => {
        try {
          const response = await fetch("/api/auth/me", {
            headers: {
              "x-user-id": storedUserId,
            },
          });
          
          if (response.ok) {
            const data = await response.json();
            // Redirect admin to /admin, others to /app
            if (data.user.email === "master@master.com") {
              // 관리자 계정 - 모바일 체크
              const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
              if (isMobile) {
                // 모바일에서는 토스트 메시지 표시 후 로그아웃하고 로그인 페이지로
                toast({
                  title: "접근 불가",
                  description: "관리자 페이지는 PC에서만 접속 가능합니다.",
                  variant: "destructive",
                });
                localStorage.removeItem("userId");
                setTimeout(() => setLocation("/login"), 100); // 토스트가 표시될 시간 확보
              } else {
                setLocation("/admin");
              }
            } else {
              setLocation("/app");
            }
          } else {
            // If auth fails, go to login
            localStorage.removeItem("userId");
            setLocation("/login");
          }
        } catch (error) {
          console.error("User check failed:", error);
          setLocation("/login");
        }
      };
      
      checkUserAndRedirect();
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
