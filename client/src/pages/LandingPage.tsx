import { useEffect } from "react";
import { useLocation } from "wouter";
import VaultLogo from "@/components/VaultLogo";
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
    <div className="fixed inset-0 purple-gradient flex items-center justify-center z-50">
      <div className="text-center animate-fade-in">
        <VaultLogo size="xl" className="mx-auto mb-6" animated />
        <h1 className="text-4xl font-bold text-white mb-2">Vault Messenger</h1>
        <p className="text-purple-100 text-lg mb-8">안전하고 스마트한 메신저</p>
        <div className="flex justify-center">
          <Loader2 className="w-8 h-8 text-white animate-spin" />
        </div>
      </div>
    </div>
  );
}
