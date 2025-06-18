import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MapPin, Share, X } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface LocationShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  chatRoomId: number;
  requestId?: number;
}

export function LocationShareModal({ isOpen, onClose, chatRoomId, requestId }: LocationShareModalProps) {
  const [isSharing, setIsSharing] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{
    latitude: number;
    longitude: number;
    locationName?: string;
  } | null>(null);
  const { toast } = useToast();

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast({
        title: "위치 서비스 미지원",
        description: "이 브라우저는 위치 서비스를 지원하지 않습니다.",
        variant: "destructive"
      });
      return;
    }

    setIsSharing(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setCurrentLocation({ latitude, longitude });
        setIsSharing(false);
      },
      (error) => {
        setIsSharing(false);
        let message = "위치를 가져올 수 없습니다.";
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            message = "위치 권한이 거부되었습니다. 브라우저 설정에서 위치 권한을 허용해주세요.";
            break;
          case error.POSITION_UNAVAILABLE:
            message = "위치 정보를 사용할 수 없습니다.";
            break;
          case error.TIMEOUT:
            message = "위치 요청 시간이 초과되었습니다.";
            break;
        }
        
        toast({
          title: "위치 오류",
          description: message,
          variant: "destructive"
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      }
    );
  };

  const shareLocation = async () => {
    if (!currentLocation) {
      toast({
        title: "위치 정보 없음",
        description: "먼저 현재 위치를 가져와주세요.",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsSharing(true);
      
      // Get location name using reverse geocoding (optional)
      let locationName = "현재 위치";
      try {
        const response = await fetch(
          `https://api.openweathermap.org/geo/1.0/reverse?lat=${currentLocation.latitude}&lon=${currentLocation.longitude}&limit=1&appid=${import.meta.env.VITE_OPENWEATHER_API_KEY}`
        );
        if (response.ok) {
          const [location] = await response.json();
          if (location) {
            locationName = `${location.name}${location.country === 'KR' ? `, ${location.state || ''}` : `, ${location.country}`}`;
          }
        }
      } catch (error) {
        console.log("Reverse geocoding failed, using default name");
      }

      await apiRequest("/api/location/share", "POST", {
        chatRoomId,
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        locationName,
        messageId: null // Will be created by the API
      });

      toast({
        title: "위치 공유 완료",
        description: "현재 위치가 채팅방에 공유되었습니다."
      });

      onClose();
    } catch (error) {
      console.error("Location share error:", error);
      toast({
        title: "위치 공유 실패",
        description: "위치 공유 중 오류가 발생했습니다.",
        variant: "destructive"
      });
    } finally {
      setIsSharing(false);
    }
  };

  const generateGoogleMapsUrl = () => {
    if (!currentLocation) return "";
    return `https://maps.google.com/maps?q=${currentLocation.latitude},${currentLocation.longitude}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-blue-500" />
            위치 공유
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            현재 위치를 채팅방에 공유하시겠습니까?
          </div>

          {currentLocation ? (
            <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
              <div className="text-sm font-medium">위치 정보</div>
              <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                위도: {currentLocation.latitude.toFixed(6)}<br />
                경도: {currentLocation.longitude.toFixed(6)}
              </div>
              {currentLocation.locationName && (
                <div className="text-sm mt-2">{currentLocation.locationName}</div>
              )}
              <Button
                variant="outline"
                size="sm"
                className="mt-2 w-full"
                onClick={() => window.open(generateGoogleMapsUrl(), '_blank')}
              >
                Google 지도에서 보기
              </Button>
            </div>
          ) : (
            <div className="text-center py-8">
              <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <div className="text-sm text-gray-600 dark:text-gray-400">
                위치 정보를 가져와주세요
              </div>
            </div>
          )}

          <div className="flex gap-2">
            {!currentLocation ? (
              <Button
                onClick={getCurrentLocation}
                disabled={isSharing}
                className="flex-1"
              >
                <MapPin className="h-4 w-4 mr-2" />
                {isSharing ? "위치 가져오는 중..." : "현재 위치 가져오기"}
              </Button>
            ) : (
              <Button
                onClick={shareLocation}
                disabled={isSharing}
                className="flex-1"
              >
                <Share className="h-4 w-4 mr-2" />
                {isSharing ? "공유 중..." : "위치 공유하기"}
              </Button>
            )}
            
            <Button variant="outline" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}