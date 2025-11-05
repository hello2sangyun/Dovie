import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.dovie.messenger',
  appName: 'Dovie Messenger',
  webDir: 'client/dist',
  server: {
    url: 'https://85060192-a63a-4476-a654-17f1dcfbd4a2-00-2gd912molkufa.worf.replit.dev',
    cleartext: false,
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
      launchShowDuration: 1000,
      backgroundColor: '#FFFFFF',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      spinnerColor: '#8B5CF6'
    },
    StatusBar: {
      style: 'dark'
    },
    FirebaseAuthentication: {
      skipNativeAuth: false,
      providers: ['google.com', 'apple.com']
    }
  }
};

export default config;
