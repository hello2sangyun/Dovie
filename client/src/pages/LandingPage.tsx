import { useEffect } from "react";
import { useLocation } from "wouter";
import DovieLogo from "@/components/DovieLogo";
import { Loader2 } from "lucide-react";

export default function LandingPage() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    const timer = setTimeout(() => {
      setLocation("/login");
    }, 2000);

    return () => clearTimeout(timer);
  }, [setLocation]);

  return (
    <div className="fixed inset-0 bg-white flex items-center justify-center z-50">
      <div className="text-center animate-fade-in">
        <DovieLogo withText={true} className="mx-auto mb-6" animated />
        <p className="text-gray-600 text-lg mb-8">스마트한 메시지 관리 솔루션</p>
        <div className="flex justify-center">
          <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
        </div>
      </div>
    </div>
  );
}
