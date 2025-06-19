import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { MapPin, Loader2, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface LocationShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  chatRoomId: number;
  requestMessage: string;
  onLocationShared?: () => void;
}

interface LocationData {
  latitude: number;
  longitude: number;
  address?: string;
  accuracy?: number;
}

export function LocationShareModal({ 
  isOpen, 
  onClose, 
  chatRoomId, 
  requestMessage,
  onLocationShared 
}: LocationShareModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [locationData, setLocationData] = useState<LocationData | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const { toast } = useToast();

  // Check geolocation permission when modal opens
  useEffect(() => {
    if (isOpen && navigator.geolocation) {
      navigator.permissions?.query({ name: 'geolocation' }).then((result) => {
        setHasPermission(result.state === 'granted');
      });
    }
  }, [isOpen]);

  const getCurrentLocation = async (): Promise<LocationData> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by this browser'));
        return;
      }

      const options = {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      };

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude, accuracy } = position.coords;
          
          try {
            // Get address from coordinates using reverse geocoding
            const response = await fetch(
              `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=ko`
            );
            const data = await response.json();
            
            resolve({
              latitude,
              longitude,
              accuracy,
              address: data.display_name || `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
            });
          } catch (error) {
            // If reverse geocoding fails, just use coordinates
            resolve({
              latitude,
              longitude,
              accuracy,
              address: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
            });
          }
        },
        (error) => {
          let errorMessage = 'Unable to get location';
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'Location access denied by user';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Location information unavailable';
              break;
            case error.TIMEOUT:
              errorMessage = 'Location request timed out';
              break;
          }
          reject(new Error(errorMessage));
        },
        options
      );
    });
  };

  const handleShareLocation = async () => {
    setIsLoading(true);
    
    try {
      // Get current location
      const location = await getCurrentLocation();
      setLocationData(location);

      // Create Google Maps URL
      const googleMapsUrl = `https://www.google.com/maps?q=${location.latitude},${location.longitude}`;
      
      // Send location share to backend
      const response = await fetch('/api/location/share', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chatRoomId,
          latitude: location.latitude.toString(),
          longitude: location.longitude.toString(),
          address: location.address,
          googleMapsUrl,
          requestMessage
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to share location');
      }

      const result = await response.json();
      
      toast({
        title: "위치 공유 완료",
        description: "위치가 성공적으로 공유되었습니다.",
      });

      onLocationShared?.();
      onClose();
      
    } catch (error) {
      console.error('Location sharing error:', error);
      toast({
        title: "위치 공유 실패",
        description: error instanceof Error ? error.message : "위치를 공유할 수 없습니다.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRequestPermission = () => {
    handleShareLocation();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-blue-500" />
            위치 공유
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
            <p className="font-medium mb-1">메시지:</p>
            <p>"{requestMessage}"</p>
          </div>

          {locationData && (
            <div className="space-y-3">
              <div className="p-3 bg-green-50 rounded-lg">
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-green-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-green-800">현재 위치</p>
                    <p className="text-xs text-green-600">{locationData.address}</p>
                    {locationData.accuracy && (
                      <p className="text-xs text-green-500">정확도: {Math.round(locationData.accuracy)}m</p>
                    )}
                  </div>
                </div>
              </div>
              
              <Button
                onClick={() => window.open(`https://www.google.com/maps?q=${locationData.latitude},${locationData.longitude}`, '_blank')}
                variant="outline"
                size="sm"
                className="w-full"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Google Maps에서 보기
              </Button>
            </div>
          )}

          <div className="flex flex-col gap-2">
            {hasPermission === false ? (
              <div className="text-sm text-amber-600 bg-amber-50 p-3 rounded-lg">
                위치 접근 권한이 필요합니다. 브라우저에서 위치 접근을 허용해주세요.
              </div>
            ) : null}
            
            <Button
              onClick={handleRequestPermission}
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  위치 확인 중...
                </>
              ) : (
                <>
                  <MapPin className="h-4 w-4 mr-2" />
                  내 위치 공유하기
                </>
              )}
            </Button>
            
            <Button
              onClick={onClose}
              variant="outline"
              disabled={isLoading}
              className="w-full"
            >
              취소
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}