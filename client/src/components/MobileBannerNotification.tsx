import { useState, useEffect } from "react";
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface BannerNotificationProps {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title?: string;
  message: string;
  duration?: number;
  onClose: (id: string) => void;
}

export function MobileBannerNotification({ 
  id, 
  type, 
  title, 
  message, 
  duration = 4000, 
  onClose 
}: BannerNotificationProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    // 입장 애니메이션
    const showTimer = setTimeout(() => setIsVisible(true), 100);
    
    // 자동 닫기
    const autoCloseTimer = setTimeout(() => {
      handleClose();
    }, duration);

    return () => {
      clearTimeout(showTimer);
      clearTimeout(autoCloseTimer);
    };
  }, [duration]);

  const handleClose = () => {
    setIsLeaving(true);
    setTimeout(() => {
      onClose(id);
    }, 300);
  };

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-white" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-white" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-white" />;
      default:
        return <Info className="h-5 w-5 text-white" />;
    }
  };

  const getColors = () => {
    switch (type) {
      case 'success':
        return 'from-green-500 to-emerald-600 shadow-green-200/50';
      case 'error':
        return 'from-red-500 to-red-600 shadow-red-200/50';
      case 'warning':
        return 'from-orange-500 to-amber-600 shadow-orange-200/50';
      default:
        return 'from-blue-500 to-blue-600 shadow-blue-200/50';
    }
  };

  return (
    <div
      className={cn(
        "fixed top-0 left-0 right-0 z-[150] transition-all duration-300 ease-in-out lg:hidden",
        isVisible && !isLeaving ? "transform translate-y-0 opacity-100" : "transform -translate-y-full opacity-0"
      )}
    >
      <div className={cn(
        "mx-3 mt-2 mb-1 rounded-lg shadow-lg bg-gradient-to-r",
        getColors()
      )}>
        {/* Progress bar */}
        <div className="absolute bottom-0 left-0 h-1 bg-white/30 rounded-b-lg overflow-hidden">
          <div 
            className="h-full bg-white/60 rounded-b-lg animate-progress-countdown"
            style={{ animationDuration: `${duration}ms` }}
          />
        </div>
        
        <div className="flex items-center justify-between p-4 pr-12">
          <div className="flex items-center space-x-3 flex-1 min-w-0">
            {getIcon()}
            
            <div className="flex-1 min-w-0">
              {title && (
                <h4 className="font-semibold text-white text-sm leading-tight mb-1">
                  {title}
                </h4>
              )}
              <p className="text-white/95 text-sm leading-tight break-words">
                {message}
              </p>
            </div>
          </div>
          
          <button
            onClick={handleClose}
            className="absolute right-3 top-3 p-1 rounded-md text-white/80 hover:text-white hover:bg-white/20 transition-all duration-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// 글로벌 배너 알림 관리자
interface BannerNotification extends BannerNotificationProps {
  id: string;
}

let notificationId = 0;
const notifications: BannerNotification[] = [];
let notificationCallbacks: ((notifications: BannerNotification[]) => void)[] = [];

export const bannerNotificationManager = {
  show: (notification: Omit<BannerNotification, 'id' | 'onClose'>) => {
    const id = `notification-${++notificationId}`;
    const newNotification: BannerNotification = {
      ...notification,
      id,
      onClose: (id: string) => {
        const index = notifications.findIndex(n => n.id === id);
        if (index > -1) {
          notifications.splice(index, 1);
          notificationCallbacks.forEach(callback => callback([...notifications]));
        }
      }
    };
    
    // 모바일에서는 한 번에 하나의 알림만 표시
    notifications.splice(0, notifications.length);
    notifications.push(newNotification);
    notificationCallbacks.forEach(callback => callback([...notifications]));
    
    return id;
  },
  
  subscribe: (callback: (notifications: BannerNotification[]) => void) => {
    notificationCallbacks.push(callback);
    return () => {
      notificationCallbacks = notificationCallbacks.filter(cb => cb !== callback);
    };
  },
  
  clear: () => {
    notifications.splice(0, notifications.length);
    notificationCallbacks.forEach(callback => callback([]));
  }
};

// React Hook
export function useBannerNotifications() {
  const [notifications, setNotifications] = useState<BannerNotification[]>([]);
  
  useEffect(() => {
    return bannerNotificationManager.subscribe(setNotifications);
  }, []);
  
  return notifications;
}

// 컨테이너 컴포넌트
export function BannerNotificationContainer() {
  const notifications = useBannerNotifications();
  
  return (
    <>
      {notifications.map(notification => (
        <MobileBannerNotification key={notification.id} {...notification} />
      ))}
    </>
  );
}