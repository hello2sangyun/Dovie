import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import VaultLogo from "@/components/VaultLogo";
import { Phone, UserPlus } from "lucide-react";
import { useLocation } from "wouter";

export default function LoginChoice() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <VaultLogo size="lg" animated />
          </div>
          <CardTitle className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            Dovie Messenger
          </CardTitle>
          <CardDescription>
            안전하고 간편한 메신저
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <Button 
            onClick={() => setLocation("/phone-login")}
            className="w-full h-12 purple-gradient text-white text-lg"
          >
            <Phone className="w-5 h-5 mr-2" />
            전화번호 인증 (로그인)
          </Button>

          <div className="text-center">
            <button 
              onClick={() => setLocation("/signup")}
              className="text-purple-600 hover:text-purple-800 text-sm underline transition-colors"
            >
              회원가입하기
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}