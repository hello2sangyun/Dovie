import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { AccessibilitySettings } from "@/components/AccessibilitySettingsModal";

interface AccessibilityContextType {
  settings: AccessibilitySettings;
  updateSettings: (settings: AccessibilitySettings) => void;
  isLoading: boolean;
}

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined);

const defaultSettings: AccessibilitySettings = {
  visualRecordingMode: false,
  highContrastMode: false,
  reducedMotion: false,
  largeButtons: false,
  hapticFeedback: true,
  screenReaderMode: false,
  voiceGuidance: false,
  keyboardNavigation: true,
};

const STORAGE_KEY = "accessibility-settings";

export function AccessibilityProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AccessibilitySettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);

  // Load settings from localStorage on mount
  useEffect(() => {
    try {
      const storedSettings = localStorage.getItem(STORAGE_KEY);
      if (storedSettings) {
        const parsed = JSON.parse(storedSettings);
        setSettings({ ...defaultSettings, ...parsed });
      }
    } catch (error) {
      console.error("Failed to load accessibility settings:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Apply CSS classes based on settings
  useEffect(() => {
    const root = document.documentElement;
    
    // High contrast mode
    if (settings.highContrastMode) {
      root.classList.add("high-contrast");
    } else {
      root.classList.remove("high-contrast");
    }

    // Reduced motion
    if (settings.reducedMotion) {
      root.classList.add("reduce-motion");
    } else {
      root.classList.remove("reduce-motion");
    }

    // Large buttons
    if (settings.largeButtons) {
      root.classList.add("large-buttons");
    } else {
      root.classList.remove("large-buttons");
    }

    // Screen reader mode
    if (settings.screenReaderMode) {
      root.classList.add("screen-reader");
    } else {
      root.classList.remove("screen-reader");
    }

    // Keyboard navigation
    if (settings.keyboardNavigation) {
      root.classList.add("keyboard-nav");
    } else {
      root.classList.remove("keyboard-nav");
    }
  }, [settings]);

  const updateSettings = (newSettings: AccessibilitySettings) => {
    setSettings(newSettings);
    
    // Save to localStorage
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newSettings));
    } catch (error) {
      console.error("Failed to save accessibility settings:", error);
    }

    // Announce changes for screen readers
    if (settings.screenReaderMode) {
      announceToScreenReader("접근성 설정이 업데이트되었습니다");
    }
  };

  const announceToScreenReader = (message: string) => {
    const announcement = document.createElement("div");
    announcement.setAttribute("aria-live", "polite");
    announcement.setAttribute("aria-atomic", "true");
    announcement.style.position = "absolute";
    announcement.style.left = "-10000px";
    announcement.style.width = "1px";
    announcement.style.height = "1px";
    announcement.style.overflow = "hidden";
    announcement.textContent = message;
    
    document.body.appendChild(announcement);
    
    // Remove after announcement
    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  };

  return (
    <AccessibilityContext.Provider value={{ settings, updateSettings, isLoading }}>
      {children}
    </AccessibilityContext.Provider>
  );
}

export function useAccessibility() {
  const context = useContext(AccessibilityContext);
  if (context === undefined) {
    throw new Error("useAccessibility must be used within an AccessibilityProvider");
  }
  return context;
}

// Hook for haptic feedback
export function useHapticFeedback() {
  const { settings } = useAccessibility();
  
  const triggerHaptic = (type: "light" | "medium" | "heavy" = "light") => {
    if (!settings.hapticFeedback) return;
    
    // Check if device supports haptic feedback
    if ("vibrate" in navigator) {
      const patterns = {
        light: [10],
        medium: [20],
        heavy: [30]
      };
      navigator.vibrate(patterns[type]);
    }
  };

  return { triggerHaptic };
}

// Hook for voice guidance
export function useVoiceGuidance() {
  const { settings } = useAccessibility();
  
  const speak = (text: string, priority: "polite" | "assertive" = "polite") => {
    if (!settings.voiceGuidance) return;
    
    // Use Speech Synthesis API if available
    if ("speechSynthesis" in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "ko-KR";
      utterance.rate = 0.9;
      utterance.volume = 0.8;
      speechSynthesis.speak(utterance);
    }
    
    // Also announce to screen readers
    const announcement = document.createElement("div");
    announcement.setAttribute("aria-live", priority);
    announcement.setAttribute("aria-atomic", "true");
    announcement.style.position = "absolute";
    announcement.style.left = "-10000px";
    announcement.style.width = "1px";
    announcement.style.height = "1px";
    announcement.style.overflow = "hidden";
    announcement.textContent = text;
    
    document.body.appendChild(announcement);
    
    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 2000);
  };

  return { speak };
}