# iOS App Setup - Step by Step

## The Problem
Your local code on your Mac is outdated. I've made fixes in v0 but your Mac doesn't have them yet.

## Solution: Download Fresh Code

### Step 1: Get Updated Code
1. In v0 (this website), click the **3 dots menu** (top right)
2. Click **"Download ZIP"**
3. Extract the ZIP file to your Documents folder
4. Open Terminal and navigate to it:
   \`\`\`bash
   cd ~/Documents/DZDoc
   \`\`\`

### Step 2: Install Everything
\`\`\`bash
npm install
\`\`\`
**What this does:** Installs all packages including Capacitor 6 (works with Node 20)

### Step 3: Add iOS Platform
\`\`\`bash
npx cap add ios
\`\`\`
**What this does:** Creates the iOS project folder with Xcode files

### Step 4: Start Development Server
**Open a NEW terminal tab** (Command + T) and run:
\`\`\`bash
npm run dev
\`\`\`
**What this does:** Starts Next.js on http://localhost:3000
**Leave this running!**

### Step 5: Open iOS Project in Xcode
**In your FIRST terminal tab**, run:
\`\`\`bash
npx cap open ios
\`\`\`
**What this does:** Opens Xcode with your iOS project

### Step 6: Run the App
In Xcode:
1. At the top, select a simulator (e.g., "iPhone 15 Pro")
2. Click the **Play button** (▶️)
3. Wait 1-2 minutes for the build
4. The app will open in the simulator!

---

## If You Get Errors

### Error: "Capacitor requires Node 22"
Your local package.json is outdated. **Re-download the ZIP from v0.**

### Error: "Cannot find module typescript"
Run: `npm install`

### Error: "webDir not found"
The iOS app will load from your dev server at localhost:3000, not a static build.

### Error in Xcode: "Signing requires a development team"
1. In Xcode, click the project name at the top left
2. Under "Signing & Capabilities"
3. Select your Apple ID in the "Team" dropdown
4. If you don't have one, click "Add Account" and sign in

---

## Testing Checklist

Once the app runs:
- [ ] Can you see the DZDoc homepage?
- [ ] Can you click around and navigate?
- [ ] Does it look good on the simulator?

---

## Important Notes

- **Keep `npm run dev` running** while testing - the app loads from there
- Changes you make in code will reload automatically
- To test on a real iPhone, you'll need to connect it via USB and select it in Xcode
- You can test for free on your own device (no $99 Apple Developer fee needed for testing)

---

## What's Different from Web?

The app runs your existing Next.js code. The only difference:
- It's in a native iOS container
- You can add native features later (camera, GPS, etc.)
- It will be installable from the App Store

---

## Next Steps After It Works

1. Test all features (login, appointments, prescriptions)
2. Fix any mobile-specific issues
3. Add app icons
4. Configure for App Store submission

Need help? Let me know which step gives you trouble.
