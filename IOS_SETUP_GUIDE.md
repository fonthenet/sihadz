# DZDoc iOS Setup Guide

## Current Issues & Fixes

You encountered these errors - here's how to fix them:

### ✅ Issue 1: Node Version Warning (SOLVED)
**Error:** `Capacitor 8.0.1 requires Node >=22.0.0, you have v20.19.5`

**Solution:** I've downgraded Capacitor from v8 to v6 which supports Node 18-20.

### ✅ Issue 2: Missing appId (SOLVED)
**Error:** `Missing appId for new platform`

**Solution:** The appId exists in `capacitor.config.ts` - Capacitor was looking for the wrong file format.

### 🔧 Issue 3: CocoaPods Not Installed (ACTION NEEDED)
**Error:** `cocoapods is not installed`

**Solution:** Install CocoaPods by running:
\`\`\`bash
sudo gem install cocoapods
\`\`\`

---

## Fresh Start - Complete iOS Build Steps

Follow these steps in order:

### 1. Clean Up Previous Attempts
\`\`\`bash
cd /Users/pc/Documents/DZDoc

# Remove node_modules and reinstall with correct versions
rm -rf node_modules package-lock.json
\`\`\`

### 2. Install CocoaPods
\`\`\`bash
sudo gem install cocoapods
\`\`\`
Enter your Mac password when prompted. This takes 2-3 minutes.

### 3. Install Dependencies
\`\`\`bash
npm install
\`\`\`
This will install Capacitor v6 (compatible with Node 20).

### 4. Build Next.js for Static Export

First, enable static export in `next.config.mjs`:

**Edit `/next.config.mjs`:**
\`\`\`javascript
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  output: 'export',  // ← Uncomment this line
}
\`\`\`

Then build:
\`\`\`bash
npm run build
\`\`\`

This creates the `out` folder that Capacitor needs.

### 5. Add iOS Platform
\`\`\`bash
npx cap add ios
\`\`\`

This creates the `ios` folder with Xcode project.

### 6. Sync Web Assets to iOS
\`\`\`bash
npx cap sync ios
\`\`\`

This copies your built web app into the iOS project.

### 7. Open in Xcode
\`\`\`bash
npx cap open ios
\`\`\`

This launches Xcode with your project.

---

## In Xcode (First Time Setup)

### A. Select Your Team
1. Click on "App" in the left sidebar (blue icon)
2. Under "Signing & Capabilities" tab
3. Select your Team (Apple Developer account)
   - If you don't see a team, click "Add Account" and sign in with your Apple ID

### B. Change Bundle Identifier (if needed)
The default is `dz.dzdoc.app`. You can change it to:
- `com.yourname.dzdoc`
- `com.dzdoc.healthcare`

### C. Select a Target Device
At the top of Xcode, select either:
- **Simulator:** iPhone 15 Pro (for testing without a real device)
- **Physical Device:** Your connected iPhone

### D. Run the App
Click the Play button (▶️) at the top left.

First build takes 5-10 minutes. Subsequent builds are faster.

---

## Common Xcode Errors & Fixes

### Error: "Failed to register bundle identifier"
**Fix:** Change the Bundle Identifier to something unique:
- Go to Signing & Capabilities
- Change `dz.dzdoc.app` to `com.yourname.dzdoc`

### Error: "No provisioning profile found"
**Fix:** 
1. Select your Apple ID as the Team
2. Or enroll in Apple Developer Program ($99/year) at developer.apple.com

### Error: "iPhone is not available"
**Fix:** Update Xcode or select a different simulator from the device dropdown

---

## Testing on Real iPhone (Free)

You CAN test on your iPhone without paying $99:

1. Connect iPhone to Mac with cable
2. On iPhone: Settings → General → VPN & Device Management
3. Trust your developer certificate
4. In Xcode: Select your iPhone from device dropdown
5. Click Play

**Note:** Free certificates expire after 7 days. You'll need to rebuild.

---

## After Successful Build

### Update the App (when you make changes)
\`\`\`bash
npm run build
npx cap sync ios
\`\`\`

Then click Play in Xcode again. Changes are reflected instantly.

### Add App Icons

You need icons in these sizes:
- 20x20, 29x29, 40x40, 58x58, 60x60, 76x76, 80x80, 87x87, 120x120, 152x152, 167x167, 180x180, 1024x1024

Place them in: `ios/App/App/Assets.xcassets/AppIcon.appiconset/`

**I can generate these for you if needed.**

---

## App Store Submission Checklist

Before submitting to App Store:

### Required Items:
- [ ] App icons (all sizes)
- [ ] Launch screen/splash screen (already configured)
- [ ] Privacy Policy URL (you need to create this)
- [ ] App description in English, French, Arabic
- [ ] Screenshots for all device sizes:
  - iPhone 6.7" (iPhone 15 Pro Max)
  - iPhone 6.5" (iPhone 14 Plus)
  - iPhone 5.5" (iPhone 8 Plus)
  - iPad Pro 12.9"
- [ ] Apple Developer account ($99/year)
- [ ] App Store Connect setup

### Privacy Policy Requirements:
DZDoc collects:
- Personal info (name, phone, email)
- Health data (appointments, prescriptions)
- Location (for pharmacy finder)
- Camera (for document uploads)

You MUST have a privacy policy URL before submission.

---

## Next Steps

1. Run through steps 1-7 above
2. Let me know if you hit any errors
3. Once running in Xcode, I can help with:
   - Generating app icons
   - Creating privacy policy page
   - Setting up push notifications
   - Camera permissions
   - App Store submission

---

## Quick Reference Commands

\`\`\`bash
# Build web app
npm run build

# Sync to iOS
npx cap sync ios

# Open Xcode
npx cap open ios

# Update Capacitor
npx cap update ios

# View logs (if app crashes)
npx cap run ios --livereload --external
\`\`\`

---

## Need Help?

If you encounter errors, send me:
1. The exact error message
2. Which step you're on
3. Screenshot if helpful

I'll help you debug!
