import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.dovie.messenger',
  appName: 'Dovie Messenger',
  webDir: 'client/dist',
  server: {
    url: 'http://localhost:5000',
    cleartext: true,
    androidScheme: 'https'
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
      launchShowDuration: 3000,
      backgroundColor: '#8B5CF6',
      androidScaleType: 'CENTER_CROP',
      showSpinner: true,
      spinnerColor: '#ffffff'
    },
    StatusBar: {
      style: 'dark'
    }
  }
};

export default config;
