# iOS Quick Start - DZDoc

## What You Need to Do (In Order)

Your dev server is already running on port 3000. Follow these steps:

### Step 1: Kill the existing dev server
\`\`\`bash
# Press Ctrl+C in the terminal where npm run dev is running
# Or close that terminal window
\`\`\`

### Step 2: Sync Capacitor with your iOS project
\`\`\`bash
npx cap sync ios
\`\`\`

### Step 3: Start the dev server fresh
\`\`\`bash
npm run dev
\`\`\`

### Step 4: Open Xcode (in a NEW terminal window)
\`\`\`bash
npx cap open ios
\`\`\`

### Step 5: In Xcode
1. Wait for Xcode to fully load (may take 1-2 minutes first time)
2. At the top, select a simulator (like "iPhone 16 Pro")
3. Click the Play button ▶️
4. The app will launch in the simulator and load from http://localhost:3000

---

## What I Fixed

- Changed Capacitor to point to your dev server (localhost:3000)
- Added a placeholder index.html so Capacitor sync works
- The app now runs using your Next.js dev server, so all features work

## Troubleshooting

**If you see "ios platform already exists":**
You already ran `npx cap add ios`. Skip to Step 2.

**If port 3000 is in use:**
Another npm run dev is still running. Kill it first with Ctrl+C.

**If the app shows a white screen:**
Make sure npm run dev is running in another terminal.

**To test on a real iPhone (FREE, no developer account needed):**
1. Connect your iPhone via USB
2. In Xcode, select your iPhone from the device list
3. Click Play - Xcode will install the app
4. Make sure your iPhone is on the same WiFi as your Mac
