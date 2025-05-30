import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { MapPin, Users, Plus, Clock, Star, Navigation, Camera, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserAvatar } from "@/components/UserAvatar";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

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
  const [joinNickname, setJoinNickname] = useState(user?.displayName || "");
  const [profileOption, setProfileOption] = useState<"main" | "temp">("main");
  const [tempProfileImage, setTempProfileImage] = useState<File | null>(null);
  const [tempProfilePreview, setTempProfilePreview] = useState<string | null>(null);

  // Request location permission and get current location
  useEffect(() => {
    if (navigator.geolocation) {
      // Check stored permission first
      const storedPermission = localStorage.getItem("locationPermission");
      if (storedPermission === "granted") {
        setLocationPermission("granted");
        getCurrentLocation();
      } else {
        // Check actual browser permission
        navigator.permissions.query({ name: 'geolocation' }).then(result => {
          setLocationPermission(result.state);
          localStorage.setItem("locationPermission", result.state);
          
          if (result.state === 'granted') {
            getCurrentLocation();
          }
        }).catch(() => {
          // Fallback if permissions API is not supported
          if (storedPermission) {
            setLocationPermission(storedPermission as "granted" | "denied" | "prompt");
            if (storedPermission === "granted") {
              getCurrentLocation();
            }
          }
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

  // 위치 기반 알림 체크
  useEffect(() => {
    if (userLocation && user) {
      const checkProximity = setInterval(async () => {
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
      }, 30000); // 30초마다 체크

      return () => clearInterval(checkProximity);
    }
  }, [userLocation, user]);

  // 자동 퇴장 카운트다운 처리
  useEffect(() => {
    if (exitCountdown) {
      const countdown = setInterval(() => {
        setExitCountdown(prev => {
          if (!prev) return null;
          
          const newSeconds = prev.seconds - 1;
          if (newSeconds <= 0) {
            // 자동 퇴장 실행
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
      // 위치 업데이트 후 자동 퇴장 체크
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
        radius: "50"
      });
      
      const response = await apiRequest(`/api/location/nearby-chats?${params}`, "GET");
      return response.json();
    },
    enabled: !!userLocation && !!user,
    refetchInterval: 30000, // Refresh every 30 seconds
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
      console.log("Attempting to join room:", roomId);
      try {
        const response = await apiRequest(`/api/location/chat-rooms/${roomId}/join`, "POST");
        console.log("Response status:", response.status);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error("Response error:", errorText);
          throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
        }
        
        const data = await response.json();
        console.log("Response data:", data);
        return data;
      } catch (error) {
        console.error("Request failed:", error);
        throw error;
      }
    },
    onSuccess: (data, roomId) => {
      console.log("Join success - data:", data, "roomId:", roomId);
      queryClient.invalidateQueries({ queryKey: ["/api/location/nearby-chats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/chat-rooms"] });
      toast({
        title: "채팅방 입장",
        description: "채팅방에 입장했습니다.",
      });
      // 서버에서 반환된 실제 채팅방 ID로 이동
      if (data && data.chatRoomId) {
        console.log("Moving to chat room:", data.chatRoomId);
        onChatRoomSelect(data.chatRoomId);
      } else {
        console.log("No chatRoomId in response, using original roomId:", roomId);
        onChatRoomSelect(roomId);
      }
    },
    onError: (error) => {
      console.error("Join chat room error:", error);
      toast({
        variant: "destructive",
        title: "입장 실패",
        description: `채팅방에 입장할 수 없습니다: ${error.message}`,
      });
    },
  });

  const handleTempImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setTempProfileImage(file);
      const url = URL.createObjectURL(file);
      setTempProfilePreview(url);
    }
  };



  const handleJoinRoom = (room: LocationChatRoom) => {
    setSelectedRoom(room);
    setJoinNickname(user?.displayName || "");
    setProfileOption("main");
    setTempProfileImage(null);
    setTempProfilePreview(null);
    setShowJoinModal(true);
  };

  const handleConfirmJoin = async () => {
    if (!selectedRoom) return;

    // 주변 채팅방에서는 임시 프로필만 사용 (실제 사용자 프로필 변경하지 않음)
    // 커스텀 프로필 기능은 향후 구현 예정
    joinChatRoomMutation.mutate(selectedRoom.id);
    setShowJoinModal(false);
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(word => word.charAt(0).toUpperCase()).join('').slice(0, 2);
  };

  const handleCreateRoom = () => {
    if (!newRoomName.trim() || !userLocation) return;
    
    createLocationChatMutation.mutate({
      name: newRoomName.trim(),
      latitude: userLocation.latitude,
      longitude: userLocation.longitude,
      address: "현재 위치" // TODO: Reverse geocoding
    });
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c; // Distance in meters
  };

  const formatDistance = (distance: number) => {
    if (distance < 1000) {
      return `${Math.round(distance)}m`;
    }
    return `${(distance / 1000).toFixed(1)}km`;
  };

  if (!user) return null;

  // Location permission not granted
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
      {/* 자동 퇴장 카운트다운 알림 */}
      {exitCountdown && (
        <div className="p-4 bg-orange-50 dark:bg-orange-900/20 border-l-4 border-orange-500">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Clock className="h-5 w-5 text-orange-500 mr-2" />
              <div>
                <p className="text-sm font-medium text-orange-800 dark:text-orange-200">
                  주변챗 자동 퇴장 예정
                </p>
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

      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-purple-600" />
            <h2 className="text-lg font-semibold">주변챗</h2>
            {hasNewChats && (
              <Badge className="bg-red-500 text-white text-xs px-1.5 py-0.5 animate-pulse">
                NEW
              </Badge>
            )}
          </div>
          
          <Dialog open={showCreateRoom} onOpenChange={setShowCreateRoom}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">
                <Plus className="h-4 w-4 mr-1" />
                방 만들기
              </Button>
            </DialogTrigger>
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
        </div>
        
        {userLocation && (
          <p className="text-sm text-gray-500">
            현재 위치 기준 반경 100m 내 채팅방
          </p>
        )}
      </div>

      {/* Chat rooms list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
            <p className="text-sm text-gray-500 mt-2">주변 채팅방을 찾는 중...</p>
          </div>
        ) : nearbyChatRooms?.chatRooms?.length > 0 ? (
          nearbyChatRooms.chatRooms.map((room: LocationChatRoom) => {
            const distance = userLocation ? calculateDistance(
              userLocation.latitude,
              userLocation.longitude,
              parseFloat(room.latitude),
              parseFloat(room.longitude)
            ) : 0;

            return (
              <Card key={room.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium">{room.name}</h3>
                        {room.isOfficial && (
                          <Badge variant="secondary" className="text-xs">
                            <Star className="h-3 w-3 mr-1" />
                            공식
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {room.participantCount}/{room.maxParticipants}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {formatDistance(distance)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          방금 전
                        </span>
                      </div>
                      
                      {room.address && (
                        <p className="text-xs text-gray-400 mt-1">{room.address}</p>
                      )}
                      
                      {room.businessOwner && (
                        <p className="text-xs text-purple-600 mt-1">
                          운영: {room.businessOwner.businessName}
                        </p>
                      )}
                    </div>
                    
                    <Button
                      size="sm"
                      onClick={() => handleJoinRoom(room)}
                      disabled={joinChatRoomMutation.isPending}
                      className="ml-2"
                    >
                      입장
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })
        ) : (
          <div className="text-center py-8">
            <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">주변에 채팅방이 없습니다</h3>
            <p className="text-gray-600 mb-4">
              이 지역에 첫 번째 채팅방을 만들어보세요!
            </p>
            <Button onClick={() => setShowCreateRoom(true)} className="purple-gradient">
              채팅방 만들기
            </Button>
          </div>
        )}
      </div>

      {/* Join Room Profile Setup Modal */}
      <Dialog open={showJoinModal} onOpenChange={setShowJoinModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>채팅방 입장 설정</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="nickname">채팅방에서 사용할 이름</Label>
              <Input
                id="nickname"
                value={joinNickname}
                onChange={(e) => setJoinNickname(e.target.value)}
                placeholder="닉네임을 입력하세요"
                className="mt-1"
              />
            </div>

            <div>
              <Label>프로필 설정</Label>
              <div className="mt-3 space-y-3">
                <div className="flex items-center space-x-3">
                  <input
                    type="radio"
                    id="main-profile"
                    name="profile-option"
                    value="main"
                    checked={profileOption === "main"}
                    onChange={(e) => setProfileOption(e.target.value as "main" | "temp")}
                    className="w-4 h-4"
                  />
                  <label htmlFor="main-profile" className="flex items-center space-x-3 cursor-pointer flex-1">
                    <UserAvatar user={user} size="sm" />
                    <div>
                      <div className="text-sm font-medium">메인 프로필 사용</div>
                      <div className="text-xs text-gray-500">현재 설정된 프로필과 이름</div>
                    </div>
                  </label>
                </div>
                
                <div className="flex items-center space-x-3">
                  <input
                    type="radio"
                    id="temp-profile"
                    name="profile-option"
                    value="temp"
                    checked={profileOption === "temp"}
                    onChange={(e) => setProfileOption(e.target.value as "main" | "temp")}
                    className="w-4 h-4"
                  />
                  <label htmlFor="temp-profile" className="flex items-center space-x-3 cursor-pointer flex-1">
                    <div className="relative">
                      {tempProfilePreview ? (
                        <img 
                          src={tempProfilePreview} 
                          alt="임시 프로필" 
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                          <Camera className="w-4 h-4 text-gray-400" />
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="text-sm font-medium">임시 프로필 사용</div>
                      <div className="text-xs text-gray-500">이 채팅방에서만 사용할 프로필</div>
                    </div>
                  </label>
                </div>
                
                {profileOption === "temp" && (
                  <div className="ml-7 space-y-2">
                    <input
                      type="file"
                      id="temp-profile-upload"
                      accept="image/*"
                      onChange={handleTempImageSelect}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => document.getElementById('temp-profile-upload')?.click()}
                      className="w-full"
                    >
                      <Camera className="w-4 h-4 mr-2" />
                      임시 프로필 사진 선택
                    </Button>
                    {tempProfilePreview && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setTempProfileImage(null);
                          setTempProfilePreview(null);
                        }}
                        className="w-full text-red-500 hover:text-red-600"
                      >
                        프로필 사진 제거
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-2 mt-6">
            <Button variant="outline" onClick={() => setShowJoinModal(false)} className="flex-1">
              취소
            </Button>
            <Button 
              onClick={handleConfirmJoin}
              disabled={!joinNickname.trim() || joinChatRoomMutation.isPending}
              className="flex-1"
            >
              {joinChatRoomMutation.isPending ? "입장 중..." : "입장하기"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}