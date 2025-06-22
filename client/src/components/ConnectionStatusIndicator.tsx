import { useState, useEffect } from "react";
import { Wifi, WifiOff, Clock, AlertCircle, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ConnectionState {
  isConnected: boolean;
  isReconnecting: boolean;
  reconnectAttempts: number;
  lastReconnectTime: number;
}

interface ConnectionStatusIndicatorProps {
  connectionState: ConnectionState;
  pendingMessageCount: number;
  className?: string;
}

export function ConnectionStatusIndicator({ 
  connectionState, 
  pendingMessageCount, 
  className 
}: ConnectionStatusIndicatorProps) {
  const [showDetails, setShowDetails] = useState(false);
  
  // Auto-hide details after a few seconds
  useEffect(() => {
    if (showDetails) {
      const timer = setTimeout(() => setShowDetails(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [showDetails]);

  const getStatusInfo = () => {
    if (connectionState.isConnected) {
      return {
        icon: CheckCircle,
        color: "text-green-500",
        bgColor: "bg-green-50",
        borderColor: "border-green-200",
        status: "연결됨",
        description: "실시간 메시징 활성화"
      };
    }
    
    if (connectionState.isReconnecting) {
      return {
        icon: Clock,
        color: "text-yellow-500",
        bgColor: "bg-yellow-50",
        borderColor: "border-yellow-200",
        status: "재연결 중",
        description: `시도 ${connectionState.reconnectAttempts}회`
      };
    }
    
    return {
      icon: WifiOff,
      color: "text-red-500",
      bgColor: "bg-red-50",
      borderColor: "border-red-200",
      status: "연결 끊김",
      description: "메시지 전송 불가"
    };
  };

  const statusInfo = getStatusInfo();
  const StatusIcon = statusInfo.icon;
  
  // Don't show if connected and no pending messages
  if (connectionState.isConnected && pendingMessageCount === 0) {
    return null;
  }
  
  // Only show connection status if there are pending messages or if reconnecting for extended time
  if (!connectionState.isConnected && pendingMessageCount === 0) {
    return null;
  }
  
  // Don't show brief disconnection notices - only show after significant reconnection attempts
  if (!connectionState.isConnected && !connectionState.isReconnecting && connectionState.reconnectAttempts < 5) {
    return null;
  }

  return (
    <div 
      className={cn(
        "flex items-center space-x-2 px-2 py-1 rounded-lg border transition-all duration-200 cursor-pointer hover:shadow-sm",
        statusInfo.bgColor,
        statusInfo.borderColor,
        className
      )}
      onClick={() => setShowDetails(!showDetails)}
    >
      <StatusIcon 
        className={cn("h-3 w-3", statusInfo.color)}
        strokeWidth={2}
      />
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center space-x-2">
          <span className={cn("text-xs font-medium", statusInfo.color)}>
            {statusInfo.status}
          </span>
          
          {pendingMessageCount > 0 && (
            <div className="flex items-center space-x-1">
              <Clock className="h-3 w-3 text-orange-500" />
              <span className="text-xs text-orange-600 font-medium">
                {pendingMessageCount}
              </span>
            </div>
          )}
        </div>
        
        {showDetails && (
          <div className="mt-1">
            <p className="text-xs text-gray-600">
              {statusInfo.description}
            </p>
            
            {pendingMessageCount > 0 && (
              <p className="text-xs text-orange-600 mt-0.5">
                {pendingMessageCount}개 메시지 대기 중
              </p>
            )}
            
            {connectionState.reconnectAttempts > 0 && (
              <p className="text-xs text-gray-500 mt-0.5">
                마지막 시도: {new Date(connectionState.lastReconnectTime).toLocaleTimeString()}
              </p>
            )}
          </div>
        )}
      </div>
      
      {connectionState.isReconnecting && (
        <div className="animate-spin">
          <div className="h-2 w-2 bg-yellow-500 rounded-full"></div>
        </div>
      )}
    </div>
  );
}