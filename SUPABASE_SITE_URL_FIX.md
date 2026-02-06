# Fix Supabase Password Reset Links

## Problem
Password reset links (and OAuth callbacks) redirect to `http://localhost:3000` instead of your production URL (e.g. `https://sihadz.com`).

**Code fix applied:** Auth callback and related routes now use `getRequestOrigin()` which reads `x-forwarded-proto` + `x-forwarded-host` when behind a proxy, so redirects go to the public domain.

## Solution

### Step 1: Update Supabase Site URL
1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/wfzpcwxawqzbctvfsxgb
2. Navigate to **Authentication** → **URL Configuration**
3. Update the **Site URL** from `http://localhost:3000` to your production URL, e.g.:
   \`\`\`
   https://sihadz.com
   \`\`\`
4. Click **Save**

### Step 2: Update Redirect URLs (if needed)
In the same section, add these to **Redirect URLs**:
\`\`\`
https://sihadz.com/auth/callback
https://sihadz.com/auth/reset-password
https://sihadz.com/**
\`\`\`

### Step 3: Set production env
In your production environment, set:
\`\`\`
NEXT_PUBLIC_SITE_URL=https://sihadz.com
\`\`\`

### Step 4: Using Existing Reset Links
If you already received a reset link with `localhost:3000`, you can manually fix it:

**Original link:**
\`\`\`
http://localhost:3000/?code=c5bfdd5e-3c6b-4095-9cfd-d3228a36550c
\`\`\`

**Fixed link (use this):**
\`\`\`
https://sihadz.com/auth/callback?code=c5bfdd5e-3c6b-4095-9cfd-d3228a36550c&type=recovery&next=/auth/reset-password
\`\`\`

### Step 5: Test
After updating the Site URL:
1. Go to `/forgot-password` on your live site
2. Enter your admin email: `f.onthenet@gmail.com`
3. Check your email - the link should now point to the correct URL
4. Click the link to reset your password to `Rapgame@1987`

## Why This Happens
Supabase uses the Site URL setting to generate all auth-related redirect links (password reset, email confirmation, magic links, etc.). It was likely set to localhost during development and never updated for production.
