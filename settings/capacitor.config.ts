import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'dz.dzdoc.app',
  appName: 'DZDoc',
  webDir: 'public',
  server: {
    // Development: Use your Mac's local IP for iOS simulator
    // Replace with your actual IP from ifconfig or System Preferences > Network
    url: 'http://192.168.50.52:3000',
    cleartext: true,
    androidScheme: 'https',
    iosScheme: 'https',
    hostname: 'dzdoc.app'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#0EA5E9',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      androidSpinnerStyle: 'large',
      iosSpinnerStyle: 'small',
      spinnerColor: '#ffffff',
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: 'light',
      backgroundColor: '#0EA5E9',
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    Keyboard: {
      resize: 'body',
      style: 'dark',
      resizeOnFullScreen: true,
    },
    Camera: {
      quality: 90,
      allowEditing: true,
      resultType: 'base64',
      saveToGallery: true,
    },
    Geolocation: {
      timeout: 10000,
      enableHighAccuracy: true,
      maximumAge: 3600000,
    },
  },
  android: {
    backgroundColor: '#ffffff',
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: true,
  },
  ios: {
    contentInset: 'automatic',
    backgroundColor: '#ffffff',
  },
};

export default config;
