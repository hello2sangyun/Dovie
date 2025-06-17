import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { bannerNotificationManager } from "@/components/MobileBannerNotification";

// Hook to detect mobile device
function useIsMobile() {
  const checkMobile = () => {
    return window.innerWidth < 1024; // lg breakpoint
  };

  return checkMobile();
}

// Enhanced notification hook that uses banner notifications on mobile
export function useMobileNotification() {
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const showNotification = ({
    title,
    description,
    variant = "default",
    duration = 4000
  }: {
    title?: string;
    description: string;
    variant?: "default" | "destructive" | "success" | "warning";
    duration?: number;
  }) => {
    if (isMobile) {
      // Use banner notification on mobile
      const type = variant === "destructive" ? "error" : 
                   variant === "success" ? "success" :
                   variant === "warning" ? "warning" : "info";
      
      bannerNotificationManager.show({
        type,
        title,
        message: description,
        duration
      });
    } else {
      // Use regular toast on desktop
      toast({
        title,
        description,
        variant: variant === "success" || variant === "warning" ? "default" : variant,
        duration
      });
    }
  };

  return {
    showNotification,
    isMobile
  };
}

// Helper functions for common notification types
export const mobileNotifications = {
  success: (message: string, title?: string) => {
    const isMobile = window.innerWidth < 1024;
    if (isMobile) {
      bannerNotificationManager.show({
        type: "success",
        title,
        message,
        duration: 3000
      });
    }
  },
  
  error: (message: string, title?: string) => {
    const isMobile = window.innerWidth < 1024;
    if (isMobile) {
      bannerNotificationManager.show({
        type: "error",
        title,
        message,
        duration: 5000
      });
    }
  },
  
  info: (message: string, title?: string) => {
    const isMobile = window.innerWidth < 1024;
    if (isMobile) {
      bannerNotificationManager.show({
        type: "info",
        title,
        message,
        duration: 4000
      });
    }
  },
  
  warning: (message: string, title?: string) => {
    const isMobile = window.innerWidth < 1024;
    if (isMobile) {
      bannerNotificationManager.show({
        type: "warning",
        title,
        message,
        duration: 4000
      });
    }
  }
};