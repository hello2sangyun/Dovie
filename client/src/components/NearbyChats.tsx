import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { MapPin, Users, Plus, Clock, Star, Navigation, Camera, User, Map, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserAvatar } from "@/components/UserAvatar";


interface LocationChatRoom {
  id: number;
  name: string;
  latitude: string;
  longitude: string;
  radius: number;
  address: string;
  isOfficial: boolean;
  participantCount: number;
  maxParticipants: number;
  lastActivity: string;
  businessOwner?: {
    id: number;
    displayName: string;
    businessName: string;
  };
}

interface UserLocation {
  latitude: number;
  longitude: number;
  accuracy: number;
}

interface NearbyChatsProps {
  onChatRoomSelect: (chatRoomId: number) => void;
}

export default function NearbyChats({ onChatRoomSelect }: NearbyChatsProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [hasNewChats, setHasNewChats] = useState(false);
  const [exitCountdown, setExitCountdown] = useState<{roomId: number, seconds: number} | null>(null);
  const [locationPermission, setLocationPermission] = useState<"granted" | "denied" | "prompt">(() => {
    return localStorage.getItem("locationPermission") as "granted" | "denied" | "prompt" || "prompt";
  });
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [newRoomName, setNewRoomName] = useState("");
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<LocationChatRoom | null>(null);
  const [joinNickname, setJoinNickname] = useState("");
  const [tempProfileImage, setTempProfileImage] = useState<File | null>(null);
  const [tempProfilePreview, setTempProfilePreview] = useState<string | null>(null);
  const [showMap, setShowMap] = useState(false);
  const [mapZoom, setMapZoom] = useState(1);
  const [mapCenter, setMapCenter] = useState({ x: 200, y: 150 });

  // Request location permission and get current location
  useEffect(() => {
    if (navigator.geolocation) {
      const storedPermission = localStorage.getItem("locationPermission");
      if (storedPermission === "granted") {
        setLocationPermission("granted");
        getCurrentLocation();
      } else {
        navigator.permissions.query({ name: 'geolocation' }).then(result => {
          setLocationPermission(result.state);
          localStorage.setItem("locationPermission", result.state);
          
          if (result.state === 'granted') {
            getCurrentLocation();
          }
        }).catch(() => {
          requestLocationPermission();
        });
      }
    }
  }, []);

  const getCurrentLocation = () => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy
        };
        setUserLocation(location);
        updateUserLocationMutation.mutate(location);
      },
      (error) => {
        toast({
          variant: "destructive",
          title: "위치 정보 오류",
          description: "현재 위치를 가져올 수 없습니다.",
        });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
    );
  };

  const requestLocationPermission = () => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocationPermission("granted");
        localStorage.setItem("locationPermission", "granted");
        const location = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy
        };
        setUserLocation(location);
        updateUserLocationMutation.mutate(location);
      },
      () => {
        setLocationPermission("denied");
        localStorage.setItem("locationPermission", "denied");
        toast({
          variant: "destructive",
          title: "위치 권한 거부",
          description: "주변챗 기능을 사용하려면 위치 권한이 필요합니다.",
        });
      }
    );
  };

  // 10초마다 위치 업데이트 및 알림 체크
  useEffect(() => {
    if (locationPermission === "granted" && user) {
      const updateLocationAndCheck = async () => {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const location = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy
            };
            setUserLocation(location);
            updateUserLocationMutation.mutate(location);
          },
          (error) => {
            console.error("Location update error:", error);
          },
          { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
        );

        try {
          const response = await apiRequest(`/api/location/check-proximity`, "GET");
          const data = await response.json();
          
          if (data.hasNewChats && data.hasNewChats.length > 0) {
            setHasNewChats(true);
            toast({
              title: "주변챗 알림",
              description: "새로운 주변 채팅방이 발견되었습니다!",
            });
          }
        } catch (error) {
          console.error("Proximity check error:", error);
        }
      };

      updateLocationAndCheck();
      const locationInterval = setInterval(updateLocationAndCheck, 10000);

      return () => clearInterval(locationInterval);
    }
  }, [locationPermission, user]);

  // 자동 퇴장 카운트다운 처리
  useEffect(() => {
    if (exitCountdown) {
      const countdown = setInterval(() => {
        setExitCountdown(prev => {
          if (!prev) return null;
          
          const newSeconds = prev.seconds - 1;
          if (newSeconds <= 0) {
            leaveLocationChatRoomMutation.mutate(prev.roomId);
            clearInterval(countdown);
            return null;
          }
          
          return { ...prev, seconds: newSeconds };
        });
      }, 1000);

      return () => clearInterval(countdown);
    }
  }, [exitCountdown]);

  // Update user location mutation
  const updateUserLocationMutation = useMutation({
    mutationFn: async (location: UserLocation) => {
      const response = await apiRequest("/api/location/update", "POST", location);
      return response.json();
    },
    onSuccess: async () => {
      try {
        const response = await apiRequest("/api/location/check-exit", "GET");
        const data = await response.json();
        
        if (data.shouldExit && data.roomId) {
          setExitCountdown({ roomId: data.roomId, seconds: 20 });
          toast({
            title: "주변챗 알림",
            description: "위치를 벗어나 20초 후 자동으로 채팅방을 나갑니다.",
            variant: "destructive"
          });
        }
      } catch (error) {
        console.error("Exit check error:", error);
      }
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "위치 업데이트 실패",
        description: "위치 정보를 서버에 저장할 수 없습니다.",
      });
    },
  });

  // Join location chat room mutation  
  const joinLocationChatMutation = useMutation({
    mutationFn: async ({ roomId, profileData, profileImageUrl }: { 
      roomId: number; 
      profileData: { nickname: string; profileImage: File | null }; 
      profileImageUrl?: string 
    }) => {
      let finalProfileImageUrl = profileImageUrl;
      
      // Upload profile image if provided
      if (profileData.profileImage) {
        const formData = new FormData();
        formData.append('file', profileData.profileImage);
        
        const uploadResponse = await fetch('/api/upload', {
          method: 'POST',
          headers: {
            'x-user-id': user?.id?.toString() || '',
          },
          body: formData,
        });
        
        if (uploadResponse.ok) {
          const uploadResult = await uploadResponse.json();
          finalProfileImageUrl = uploadResult.fileUrl;
        }
      }

      // Join the location chat with profile data
      const response = await apiRequest(`/api/location/chat-rooms/${roomId}/join`, "POST", {
        nickname: profileData.nickname,
        profileImageUrl: finalProfileImageUrl
      });
      
      if (!response.ok) throw new Error("Failed to join location chat");
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/location/nearby-chats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/chat-rooms"] });
      toast({
        title: "성공",
        description: "주변챗에 참여했습니다.",
      });
      setShowJoinModal(false);
      setJoinNickname("");
      setTempProfileImage(null);
      setTempProfilePreview(null);
      
      // Navigate to the chat room
      if (data.chatRoomId) {
        onChatRoomSelect(data.chatRoomId);
      }
    },
    onError: (error) => {
      console.error("Join location chat error:", error);
      toast({
        title: "오류",
        description: "주변챗 참여에 실패했습니다.",
        variant: "destructive",
      });
    },
  });

  // Leave location chat room mutation
  const leaveLocationChatRoomMutation = useMutation({
    mutationFn: async (roomId: number) => {
      const response = await apiRequest(`/api/location/chat-rooms/${roomId}/leave`, "POST");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/location/nearby-chats"] });
      setExitCountdown(null);
      toast({
        title: "채팅방 퇴장",
        description: "위치를 벗어나 채팅방에서 자동으로 나갔습니다.",
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "퇴장 실패",
        description: "채팅방 퇴장에 실패했습니다.",
      });
    },
  });

  // Get nearby chat rooms
  const { data: nearbyChatRooms, isLoading } = useQuery({
    queryKey: ["/api/location/nearby-chats", userLocation],
    queryFn: async () => {
      if (!userLocation) return { chatRooms: [] };
      
      const params = new URLSearchParams({
        latitude: userLocation.latitude.toString(),
        longitude: userLocation.longitude.toString(),
        radius: "100"
      });
      
      const response = await apiRequest(`/api/location/nearby-chats?${params}`, "GET");
      return response.json();
    },
    enabled: !!userLocation && !!user,
    refetchInterval: 10000,
  });

  // Create location chat room mutation
  const createLocationChatMutation = useMutation({
    mutationFn: async (roomData: { name: string; latitude: number; longitude: number; address: string }) => {
      const response = await apiRequest("/api/location/chat-rooms", "POST", roomData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/location/nearby-chats"] });
      setShowCreateRoom(false);
      setNewRoomName("");
      toast({
        title: "채팅방 생성 완료",
        description: "새로운 주변 채팅방이 생성되었습니다.",
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "채팅방 생성 실패",
        description: "다시 시도해주세요.",
      });
    },
  });

  // Join location chat room
  const joinChatRoomMutation = useMutation({
    mutationFn: async (roomId: number) => {
      const response = await apiRequest(`/api/location/chat-rooms/${roomId}/join`, "POST");
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/location/nearby-chats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/chat-rooms"] });
      toast({
        title: "채팅방 참여 완료",
        description: "주변 채팅방에 성공적으로 참여했습니다.",
      });
      if (data.chatRoomId) {
        onChatRoomSelect(data.chatRoomId);
      } else {
        onChatRoomSelect(data.id);
      }
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "참여 실패",
        description: "채팅방 참여에 실패했습니다.",
      });
    },
  });

  const handleTempProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setTempProfileImage(file);
      const reader = new FileReader();
      reader.onload = () => {
        setTempProfilePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleJoinRoom = async (room: LocationChatRoom) => {
    setSelectedRoom(room);
    
    // Check if user already has a profile for this nearby chat room
    try {
      const response = await apiRequest(`/api/location/chat-rooms/${room.id}/profile`);
      if (response.ok) {
        const profileData = await response.json();
        if (profileData.nickname && profileData.profileImageUrl) {
          // User already has a profile, join directly
          joinLocationChatMutation.mutate({
            roomId: room.id,
            profileData: {
              nickname: profileData.nickname,
              profileImage: null // Use existing uploaded image
            },
            profileImageUrl: profileData.profileImageUrl
          });
          return;
        }
      }
    } catch (error) {
      console.log("No existing profile found, will create new one");
    }
    
    // No existing profile, show setup modal
    setJoinNickname("");
    setTempProfileImage(null);
    setTempProfilePreview(null);
    setShowJoinModal(true);
  };

  const handleConfirmJoin = () => {
    if (!selectedRoom || !joinNickname.trim() || !tempProfileImage) return;
    setShowJoinModal(false);
    
    // Upload profile image and join with nickname
    const formData = new FormData();
    formData.append('file', tempProfileImage);
    formData.append('nickname', joinNickname.trim());
    
    joinLocationChatMutation.mutate({
      roomId: selectedRoom.id,
      profileData: {
        nickname: joinNickname.trim(),
        profileImage: tempProfileImage
      }
    });
  };

  const handleCreateRoom = () => {
    if (!newRoomName.trim() || !userLocation) return;
    
    createLocationChatMutation.mutate({
      name: newRoomName,
      latitude: userLocation.latitude,
      longitude: userLocation.longitude,
      address: "현재 위치"
    });
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3;
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
  };

  const formatDistance = (distance: number) => {
    if (distance < 1000) {
      return `${Math.round(distance)}m`;
    }
    return `${(distance / 1000).toFixed(1)}km`;
  };

  const handleZoomIn = () => {
    setMapZoom(prev => Math.min(prev * 1.5, 5));
  };

  const handleZoomOut = () => {
    setMapZoom(prev => Math.max(prev / 1.5, 0.3));
  };

  const handleResetView = () => {
    setMapZoom(1);
    setMapCenter({ x: 200, y: 150 });
  };

  if (!user) return null;

  if (locationPermission !== "granted") {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center">
        <Navigation className="h-16 w-16 text-gray-400 mb-4" />
        <h3 className="text-lg font-semibold mb-2">위치 권한이 필요합니다</h3>
        <p className="text-gray-600 mb-6">
          주변 채팅방을 찾기 위해 현재 위치 정보가 필요합니다.
        </p>
        <Button onClick={requestLocationPermission} className="purple-gradient">
          위치 권한 허용
        </Button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header with map toggle - Optimized for mobile */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <MapPin className="h-4 w-4 text-purple-600 flex-shrink-0" />
          <h2 className="text-base font-semibold whitespace-nowrap">주변챗</h2>
          {userLocation && (
            <Badge variant="secondary" className="text-xs whitespace-nowrap flex-shrink-0">
              {Math.round(userLocation.accuracy)}m
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <Button
            variant={showMap ? "default" : "outline"}
            size="sm"
            onClick={() => setShowMap(!showMap)}
            className="flex items-center gap-1 h-8 px-2 text-xs"
          >
            <Map className="h-3 w-3" />
            지도
          </Button>
          <Dialog open={showCreateRoom} onOpenChange={setShowCreateRoom}>
            <DialogTrigger asChild>
              <Button size="sm" className="purple-gradient h-8 px-2 text-xs">
                <Plus className="h-3 w-3 mr-1" />
                만들기
              </Button>
            </DialogTrigger>
          </Dialog>
        </div>
      </div>

      {/* 자동 퇴장 카운트다운 알림 */}
      {exitCountdown && (
        <div className="p-4 bg-orange-50 dark:bg-orange-900/20 border-l-4 border-orange-500">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Clock className="h-5 w-5 text-orange-500 mr-2" />
              <div>
                <p className="text-sm font-medium text-orange-800 dark:text-orange-200">자동 퇴장 예정</p>
                <p className="text-sm text-orange-700 dark:text-orange-300">
                  위치를 벗어나 {exitCountdown.seconds}초 후 자동으로 채팅방을 나갑니다
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setExitCountdown(null)}
              className="text-orange-600 border-orange-300 hover:bg-orange-100"
            >
              취소
            </Button>
          </div>
        </div>
      )}

      {/* NEW 알림 */}
      {hasNewChats && (
        <div className="p-3 bg-purple-50 dark:bg-purple-900/20 border-l-4 border-purple-500">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-2 h-2 bg-purple-500 rounded-full mr-2 animate-pulse"></div>
              <p className="text-sm font-medium text-purple-800 dark:text-purple-200">
                새로운 주변 채팅방이 발견되었습니다!
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setHasNewChats(false)}
              className="text-purple-600 hover:bg-purple-100"
            >
              확인
            </Button>
          </div>
        </div>
      )}

      {/* Map or Chat List View */}
      {showMap ? (
        <div className="flex-1 p-4">
          <div className="bg-gray-100 dark:bg-gray-800 rounded-lg h-full min-h-[400px] relative overflow-hidden">
            {/* Zoom Controls */}
            <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleZoomIn}
                className="w-10 h-10 p-0 bg-white/90 backdrop-blur-sm hover:bg-white"
                disabled={mapZoom >= 5}
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleZoomOut}
                className="w-10 h-10 p-0 bg-white/90 backdrop-blur-sm hover:bg-white"
                disabled={mapZoom <= 0.3}
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetView}
                className="w-10 h-10 p-0 bg-white/90 backdrop-blur-sm hover:bg-white"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Zoom Level Indicator */}
            <div className="absolute top-4 left-4 z-10 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-1 text-sm font-medium">
              {Math.round(mapZoom * 100)}%
            </div>
            
            <div className="absolute inset-0 flex items-center justify-center">
              <svg 
                width="100%" 
                height="100%" 
                viewBox={`${-200 * mapZoom + mapCenter.x} ${-150 * mapZoom + mapCenter.y} ${400 * mapZoom} ${300 * mapZoom}`} 
                className="text-gray-400 transition-all duration-300"
              >
                <defs>
                  <pattern id="grid" width={20 / mapZoom} height={20 / mapZoom} patternUnits="userSpaceOnUse">
                    <path d={`M ${20 / mapZoom} 0 L 0 0 0 ${20 / mapZoom}`} fill="none" stroke="currentColor" strokeWidth={0.5 / mapZoom} opacity="0.3"/>
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid)" />
                
                {/* User Location */}
                <g transform={`translate(${mapCenter.x}, ${mapCenter.y})`}>
                  <circle cx="0" cy="0" r={8 / mapZoom} fill="#8b5cf6" />
                  <circle cx="0" cy="0" r={12 / mapZoom} fill="none" stroke="#8b5cf6" strokeWidth={2 / mapZoom} opacity="0.5" />
                  <circle cx="0" cy="0" r={50 / mapZoom} fill="none" stroke="#8b5cf6" strokeWidth={1 / mapZoom} opacity="0.2" strokeDasharray={`${5 / mapZoom},${3 / mapZoom}`} />
                  <text x="0" y={-30 / mapZoom} textAnchor="middle" className="text-xs font-medium fill-purple-600" fontSize={12 / mapZoom}>
                    내 위치
                  </text>
                  <text x="0" y={40 / mapZoom} textAnchor="middle" className="text-xs fill-gray-500" fontSize={10 / mapZoom}>
                    0m
                  </text>
                </g>

                {/* Chat Rooms */}
                {nearbyChatRooms?.chatRooms?.map((room: LocationChatRoom, index: number) => {
                  if (!userLocation) return null;
                  
                  const distance = calculateDistance(
                    userLocation.latitude,
                    userLocation.longitude,
                    parseFloat(room.latitude),
                    parseFloat(room.longitude)
                  );
                  
                  // Calculate position based on actual lat/lng difference (simplified)
                  const latDiff = parseFloat(room.latitude) - userLocation.latitude;
                  const lngDiff = parseFloat(room.longitude) - userLocation.longitude;
                  
                  // Convert to map coordinates (1 degree ≈ 111km, scaled to fit map)
                  const scale = 100000; // Adjust this to fit your map scale
                  const x = mapCenter.x + (lngDiff * scale);
                  const y = mapCenter.y - (latDiff * scale); // Negative because SVG Y increases downward
                  
                  return (
                    <g key={room.id} transform={`translate(${x}, ${y})`}>
                      {/* Chat room range circle */}
                      <circle 
                        cx="0" 
                        cy="0" 
                        r={room.radius / mapZoom || 30 / mapZoom} 
                        fill={room.isOfficial ? "#059669" : "#3b82f6"}
                        fillOpacity="0.1"
                        stroke={room.isOfficial ? "#059669" : "#3b82f6"}
                        strokeWidth={1 / mapZoom}
                        strokeDasharray={`${3 / mapZoom},${2 / mapZoom}`}
                      />
                      {/* Chat room marker */}
                      <circle 
                        cx="0" 
                        cy="0" 
                        r={8 / mapZoom} 
                        fill={room.isOfficial ? "#059669" : "#3b82f6"}
                        className="cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => handleJoinRoom(room)}
                      />
                      {/* Participant indicator */}
                      <circle 
                        cx={6 / mapZoom} 
                        cy={-6 / mapZoom} 
                        r={4 / mapZoom} 
                        fill="#ffffff"
                        stroke={room.isOfficial ? "#059669" : "#3b82f6"}
                        strokeWidth={1 / mapZoom}
                      />
                      <text 
                        x={6 / mapZoom} 
                        y={-3 / mapZoom} 
                        textAnchor="middle" 
                        className="text-xs font-bold"
                        fontSize={8 / mapZoom}
                        fill={room.isOfficial ? "#059669" : "#3b82f6"}
                      >
                        {room.participantCount}
                      </text>
                      {/* Room name */}
                      <text 
                        x="0" 
                        y={-15 / mapZoom} 
                        textAnchor="middle" 
                        className="text-xs font-medium fill-current"
                        fontSize={11 / mapZoom}
                      >
                        {room.name.length > 8 ? room.name.substring(0, 8) + '...' : room.name}
                      </text>
                      {/* Distance */}
                      <text 
                        x="0" 
                        y={25 / mapZoom} 
                        textAnchor="middle" 
                        className="text-xs fill-gray-500"
                        fontSize={9 / mapZoom}
                      >
                        {formatDistance(distance)}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
            
            <div className="absolute bottom-4 left-4 bg-white dark:bg-gray-900 rounded-lg p-3 shadow-lg border border-gray-200 dark:border-gray-700">
              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-purple-600 rounded-full"></div>
                  <span>내 위치</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-600 rounded-full"></div>
                  <span>공식 채팅방</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
                  <span>일반 채팅방</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-auto">
          {isLoading && (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            </div>
          )}

          {!isLoading && nearbyChatRooms?.chatRooms?.length === 0 && (
            <div className="text-center py-8">
              <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500 mb-4">주변에 채팅방이 없습니다</p>
              <p className="text-sm text-gray-400 mb-4">
                첫 번째 채팅방을 만들어보세요!
              </p>
            </div>
          )}

          {nearbyChatRooms?.chatRooms?.map((room: LocationChatRoom) => {
            const distance = userLocation ? calculateDistance(
              userLocation.latitude,
              userLocation.longitude,
              parseFloat(room.latitude),
              parseFloat(room.longitude)
            ) : 0;

            return (
              <div
                key={room.id}
                className="p-4 border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors"
                onClick={() => handleJoinRoom(room)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-gray-900 dark:text-gray-100">
                        {room.name}
                      </h3>
                      {room.isOfficial && (
                        <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">
                          공식
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        <span>{room.participantCount}/{room.maxParticipants}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        <span>{formatDistance(distance)}</span>
                      </div>
                      {room.lastActivity && (
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          <span>{new Date(room.lastActivity).toLocaleTimeString('ko-KR', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}</span>
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{room.address}</p>
                  </div>
                  {room.businessOwner && (
                    <div className="ml-4 text-right">
                      <div className="text-xs text-gray-500">사업자</div>
                      <div className="text-sm font-medium">{room.businessOwner.businessName}</div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create room dialog */}
      <Dialog open={showCreateRoom} onOpenChange={setShowCreateRoom}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>새 주변 채팅방 만들기</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="roomName">채팅방 이름</Label>
              <Input
                id="roomName"
                value={newRoomName}
                onChange={(e) => setNewRoomName(e.target.value)}
                placeholder="예: 이태원 브런치카페 채팅방"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCreateRoom(false)}>
                취소
              </Button>
              <Button
                onClick={handleCreateRoom}
                disabled={!newRoomName.trim() || createLocationChatMutation.isPending}
                className="purple-gradient"
              >
                {createLocationChatMutation.isPending ? "생성 중..." : "만들기"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Join room dialog */}
      <Dialog open={showJoinModal} onOpenChange={setShowJoinModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedRoom?.name} 참여하기
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="tempNickname">임시 닉네임</Label>
              <Input
                id="tempNickname"
                value={joinNickname}
                onChange={(e) => setJoinNickname(e.target.value)}
                placeholder="닉네임을 입력하세요"
                className="mt-1"
                required
              />
            </div>
            
            <div>
              <Label htmlFor="tempProfile">프로필 이미지 (필수)</Label>
              <div className="flex items-center gap-3 mt-2">
                {tempProfilePreview && (
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={tempProfilePreview} />
                    <AvatarFallback>
                      <User className="h-6 w-6" />
                    </AvatarFallback>
                  </Avatar>
                )}
                <Input
                  id="tempProfile"
                  type="file"
                  accept="image/*"
                  onChange={handleTempProfileChange}
                  className="cursor-pointer"
                  required
                />
              </div>
              {!tempProfileImage && (
                <p className="text-xs text-gray-500 mt-1">
                  주변챗 참여를 위해 임시 프로필 이미지가 필요합니다
                </p>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowJoinModal(false)}>
                취소
              </Button>
              <Button
                onClick={() => handleConfirmJoin()}
                disabled={joinChatRoomMutation.isPending || 
                  !joinNickname.trim() || !tempProfileImage}
                className="purple-gradient"
              >
                {joinChatRoomMutation.isPending ? "참여 중..." : "참여하기"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}