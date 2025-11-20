import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.dovie.messenger',
  appName: 'Dovie Messenger',
  webDir: 'client/dist',
  server: {
    url: 'https://dovie.online',
    cleartext: true
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert']
    },
    LocalNotifications: {
      smallIcon: 'ic_stat_icon_config_sample',
      iconColor: '#8B5CF6',
      sound: 'beep.wav'
    },
    SplashScreen: {
      launchShowDuration: 1000,
      backgroundColor: '#FFFFFF',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      spinnerColor: '#8B5CF6'
    },
    StatusBar: {
      style: 'dark'
    },
    Keyboard: {
      resize: 'native',
      style: 'dark',
      resizeOnFullScreen: false
    }
  }
};

export default config;
