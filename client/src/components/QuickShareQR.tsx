import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { QrCode, Share2, Download, Copy, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import QRCode from "qrcode";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

interface QuickShareQRProps {
  className?: string;
  trigger?: "button" | "icon";
  size?: "sm" | "md" | "lg";
}

export default function QuickShareQR({ 
  className, 
  trigger = "button", 
  size = "md" 
}: QuickShareQRProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [shareUrl, setShareUrl] = useState<string>("");
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Generate QR code when dialog opens
  useEffect(() => {
    if (isOpen && user) {
      generateQRCode();
    }
  }, [isOpen, user]);

  const generateQRCode = async () => {
    if (!user) return;

    setIsGenerating(true);
    
    try {
      // Create share URL for the user's business card
      const baseUrl = window.location.origin;
      const shareUrl = `${baseUrl}/share/${user.id}`;
      setShareUrl(shareUrl);

      // Generate QR code with custom styling
      const qrOptions = {
        width: 300,
        margin: 2,
        color: {
          dark: '#1f2937', // Gray-800
          light: '#ffffff'
        },
        errorCorrectionLevel: 'M' as const,
      };

      const dataUrl = await QRCode.toDataURL(shareUrl, qrOptions);
      
      // Simulate generation animation
      setTimeout(() => {
        setQrDataUrl(dataUrl);
        setIsGenerating(false);
      }, 800);

    } catch (error) {
      console.error('QR Code generation failed:', error);
      toast({
        variant: "destructive",
        title: "QR 코드 생성 실패",
        description: "QR 코드를 생성하는 중 오류가 발생했습니다.",
      });
      setIsGenerating(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "복사 완료",
        description: "링크가 클립보드에 복사되었습니다.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "복사 실패",
        description: "클립보드 복사 중 오류가 발생했습니다.",
      });
    }
  };

  const downloadQRCode = () => {
    if (!qrDataUrl) return;

    const link = document.createElement('a');
    link.download = `${user?.displayName || 'contact'}-qr-code.png`;
    link.href = qrDataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "다운로드 완료",
      description: "QR 코드가 다운로드되었습니다.",
    });
  };

  const shareQRCode = async () => {
    if (!shareUrl) return;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `${user?.displayName}의 명함`,
          text: "One Pager에서 내 명함을 확인하세요",
          url: shareUrl,
        });
      } catch (error) {
        // Fallback to clipboard if share fails
        copyToClipboard(shareUrl);
      }
    } else {
      copyToClipboard(shareUrl);
    }
  };

  const TriggerComponent = trigger === "icon" ? (
    <Button
      variant="ghost"
      size={size === "sm" ? "sm" : "default"}
      className={cn("h-10 w-10 rounded-full p-0", className)}
    >
      <QrCode className="h-5 w-5" />
    </Button>
  ) : (
    <Button
      variant="outline"
      size={size === "sm" ? "sm" : size === "lg" ? "lg" : "default"}
      className={cn("gap-2", className)}
    >
      <QrCode className="h-4 w-4" />
      빠른 공유
    </Button>
  );

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {TriggerComponent}
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            빠른 QR 공유
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* QR Code Display Area */}
          <Card className="border-2 border-dashed border-gray-200">
            <CardContent className="flex items-center justify-center p-6">
              {isGenerating ? (
                <div className="flex flex-col items-center space-y-4">
                  {/* Animated QR Generation */}
                  <div className="relative">
                    <div className="w-[200px] h-[200px] bg-gray-100 rounded-lg flex items-center justify-center">
                      <div className="grid grid-cols-6 gap-1">
                        {Array.from({ length: 36 }).map((_, i) => (
                          <div
                            key={i}
                            className={cn(
                              "w-3 h-3 rounded-sm transition-all duration-200",
                              "animate-pulse"
                            )}
                            style={{
                              backgroundColor: Math.random() > 0.5 ? '#1f2937' : '#f3f4f6',
                              animationDelay: `${i * 50}ms`,
                            }}
                          />
                        ))}
                      </div>
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-sweep" />
                  </div>
                  <p className="text-sm text-gray-500">QR 코드 생성 중...</p>
                </div>
              ) : qrDataUrl ? (
                <div className="flex flex-col items-center space-y-4">
                  <div className="qr-code-container animate-in fade-in duration-500">
                    <img 
                      src={qrDataUrl} 
                      alt="QR Code" 
                      className="w-[200px] h-[200px] rounded-lg shadow-sm"
                    />
                  </div>
                  <p className="text-sm text-gray-600 text-center">
                    QR 코드를 스캔하여 내 명함을 확인하세요
                  </p>
                </div>
              ) : (
                <div className="text-center">
                  <QrCode className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">QR 코드를 생성할 수 없습니다</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Share URL Display */}
          {shareUrl && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">공유 링크</label>
              <div className="flex items-center space-x-2">
                <div className="flex-1 p-2 bg-gray-50 rounded-md text-sm text-gray-600 truncate">
                  {shareUrl}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(shareUrl)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-2">
            <Button
              variant="default"
              className="flex-1 gap-2"
              onClick={shareQRCode}
              disabled={!shareUrl}
            >
              <Share2 className="h-4 w-4" />
              공유하기
            </Button>
            <Button
              variant="outline"
              className="flex-1 gap-2"
              onClick={downloadQRCode}
              disabled={!qrDataUrl}
            >
              <Download className="h-4 w-4" />
              다운로드
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}