# DZDoc Mobile App Build Guide

This guide explains how to build DZDoc for iOS and Android using Capacitor.

## Prerequisites

### For Both Platforms
- Node.js 18+ installed
- npm or bun package manager

### For iOS
- macOS computer (required)
- Xcode 14+ installed from App Store
- iOS Simulator or physical iPhone/iPad
- Apple Developer Account (for App Store deployment)

### For Android
- Android Studio installed
- Android SDK (API level 33+)
- Android Emulator or physical device
- Google Play Developer Account (for Play Store deployment)

## Setup Instructions

### 1. Install Dependencies

\`\`\`bash
# Install Capacitor CLI and core
npm install @capacitor/cli @capacitor/core

# Install native platforms
npm install @capacitor/ios @capacitor/android

# Install plugins for DZDoc features
npm install @capacitor/camera          # Prescription photos
npm install @capacitor/geolocation     # Find nearby pharmacies
npm install @capacitor/push-notifications  # Appointment reminders
npm install @capacitor/local-notifications # Local reminders
npm install @capacitor/haptics         # Native touch feedback
npm install @capacitor/share           # Share prescriptions
npm install @capacitor/splash-screen   # App launch screen
npm install @capacitor/status-bar      # Status bar styling
npm install @capacitor/keyboard        # Keyboard handling
npm install @capacitor/app             # App lifecycle
\`\`\`

### 2. Build the Web App

\`\`\`bash
# Build Next.js for static export
npm run build

# This creates the 'out' directory that Capacitor uses
\`\`\`

### 3. Add Native Platforms

\`\`\`bash
# Add iOS platform
npx cap add ios

# Add Android platform  
npx cap add android
\`\`\`

### 4. Sync Web Assets to Native

\`\`\`bash
# Copy web build to native projects
npx cap sync
\`\`\`

## Building for iOS

### Development

\`\`\`bash
# Open in Xcode
npx cap open ios

# Or run directly (requires Xcode CLI)
npx cap run ios
\`\`\`

### In Xcode
1. Select your target device/simulator
2. Click the Play button to build and run
3. For physical devices, configure signing in "Signing & Capabilities"

### App Store Release

1. In Xcode, select "Any iOS Device" as target
2. Product → Archive
3. Window → Organizer → Distribute App
4. Follow App Store Connect submission process

## Building for Android

### Development

\`\`\`bash
# Open in Android Studio
npx cap open android

# Or run directly
npx cap run android
\`\`\`

### In Android Studio
1. Select your target device/emulator
2. Click the Run button (green play)
3. For physical devices, enable USB debugging

### Play Store Release

\`\`\`bash
# Build release APK
cd android
./gradlew assembleRelease

# Build release AAB (recommended for Play Store)
./gradlew bundleRelease
\`\`\`

Output files:
- APK: `android/app/build/outputs/apk/release/app-release.apk`
- AAB: `android/app/build/outputs/bundle/release/app-release.aab`

## Development Workflow

### Making Changes

1. Edit your Next.js code as normal
2. Rebuild: `npm run build`
3. Sync to native: `npx cap sync`
4. Run on device: `npx cap run ios` or `npx cap run android`

### Live Reload (Development)

For faster development, enable live reload:

\`\`\`typescript
// In capacitor.config.ts, uncomment:
server: {
  url: 'http://YOUR_LOCAL_IP:3000',
  cleartext: true,
}
\`\`\`

Then run `npm run dev` and `npx cap run ios/android`

## App Icons and Splash Screens

### Generate Icons

Use a 1024x1024 PNG as source, then:

\`\`\`bash
# Install icon generator
npm install -g cordova-res

# Generate all icon sizes
cordova-res ios --skip-config --copy
cordova-res android --skip-config --copy
\`\`\`

### Icon Locations
- iOS: `ios/App/App/Assets.xcassets/AppIcon.appiconset/`
- Android: `android/app/src/main/res/mipmap-*/`

### Splash Screen
- iOS: `ios/App/App/Assets.xcassets/Splash.imageset/`
- Android: `android/app/src/main/res/drawable*/splash.png`

## Native Feature Configuration

### Camera Permissions

**iOS** - Add to `ios/App/App/Info.plist`:
\`\`\`xml
<key>NSCameraUsageDescription</key>
<string>DZDoc needs camera access to capture prescription photos and medical documents</string>
<key>NSPhotoLibraryUsageDescription</key>
<string>DZDoc needs photo library access to upload medical documents</string>
\`\`\`

**Android** - Already configured in AndroidManifest.xml

### Location Permissions

**iOS** - Add to `ios/App/App/Info.plist`:
\`\`\`xml
<key>NSLocationWhenInUseUsageDescription</key>
<string>DZDoc needs your location to find nearby pharmacies and doctors</string>
\`\`\`

**Android** - Already configured in AndroidManifest.xml

### Push Notifications

**iOS**:
1. Enable Push Notifications capability in Xcode
2. Register with Apple Push Notification service (APNs)
3. Upload APNs key to your push service (e.g., Firebase)

**Android**:
1. Add `google-services.json` from Firebase Console
2. Configure Firebase Cloud Messaging

## Troubleshooting

### Build Errors

\`\`\`bash
# Clean and rebuild
npx cap sync --force

# For iOS
cd ios && pod install && cd ..

# For Android
cd android && ./gradlew clean && cd ..
\`\`\`

### Common Issues

1. **White screen on launch**: Ensure `webDir: 'out'` in capacitor.config.ts
2. **API calls failing**: Check CORS settings for your Supabase project
3. **Plugins not working**: Run `npx cap sync` after installing plugins
4. **iOS signing errors**: Configure team in Xcode Signing & Capabilities

## App Store Checklist

### iOS App Store
- [ ] App icons (all sizes)
- [ ] Screenshots (6.5", 5.5" iPhones, iPad)
- [ ] App description (Arabic, French, English)
- [ ] Privacy policy URL
- [ ] Support URL
- [ ] Age rating questionnaire
- [ ] App Review information

### Google Play Store
- [ ] App icons (512x512)
- [ ] Feature graphic (1024x500)
- [ ] Screenshots (phone, tablet)
- [ ] Short and full descriptions
- [ ] Privacy policy URL
- [ ] Content rating questionnaire
- [ ] Target audience and content

## Support

For issues specific to:
- **Capacitor**: https://capacitorjs.com/docs
- **iOS Development**: https://developer.apple.com
- **Android Development**: https://developer.android.com
