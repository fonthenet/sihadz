import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Dev switching:
 * - Emulator:  set CAP_SERVER_URL=http://10.0.2.2:3000
 * - Phone:     set CAP_SERVER_URL=http://YOUR_PC_IP:3000
 * If CAP_SERVER_URL is NOT set, the app uses bundled web assets (production-style).
 */
const DEV_SERVER = process.env.CAP_SERVER_URL?.trim();

const config: CapacitorConfig = {
  // ✅ Must be a valid reverse-domain package id
  appId: 'com.sihadz.dzdoc',
  appName: 'SihaDZ',

  /**
   * ✅ Must point to your web build output folder (NOT "public")
   * Common:
   * - Next.js export => "out"
   * - Vite/React     => "dist"
   * - Ionic          => "www"
   */
  webDir: 'out',

  bundledWebRuntime: false,

  // ✅ Only set server.url when you explicitly want live dev loading
  ...(DEV_SERVER
    ? {
        server: {
          url: DEV_SERVER,
          cleartext: DEV_SERVER.startsWith('http://'),
        },
      }
    : {}),

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

    /**
     * Dev tip:
     * If you load http://... locally and your app pulls https assets (or vice versa),
     * mixed content can cause blank screens. Allow it for dev, tighten later if needed.
     */
    allowMixedContent: true,

    captureInput: true,
    webContentsDebuggingEnabled: true,
  },

  ios: {
    contentInset: 'automatic',
    backgroundColor: '#ffffff',
  },
};

export default config;
