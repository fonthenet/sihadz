# Supabase Authentication Setup - CRITICAL

## Problem
Users signing up get "account already exists" error and receive confirmation emails that shouldn't be sent. After confirming, they get "not registered as professional" error.

## Root Cause
Supabase has **Email Confirmation ENABLED by default**. This causes:
1. Users must confirm email before they can log in
2. Professional record gets created ONLY if email is confirmed
3. If user clicks confirm link before professional record is created → orphaned auth account

## REQUIRED FIXES (Must be done in Supabase Dashboard)

### 1. Disable Email Confirmation
**Go to:** Supabase Dashboard → Authentication → Providers → Email

**Change these settings:**
- ✅ **Enable email provider**: ON
- ❌ **Confirm email**: OFF ← TURN THIS OFF
- ❌ **Secure email change**: OFF (optional, recommended OFF for easier UX)

### 2. Configure Email Templates (Optional but Recommended)
**Go to:** Supabase Dashboard → Authentication → Email Templates

Update templates to NOT send confirmation emails.

### 3. Enable Manual Identity Linking (for Google account linking in Security)
**Go to:** Supabase Dashboard → Authentication → Providers → Configuration

Or set environment variable when self-hosting:
- `GOTRUE_SECURITY_MANUAL_LINKING_ENABLED: true`

This allows users to link a Google account to their existing email/password account in Settings → Security.

### 4. Enable Google (Gmail) Sign-In
**Go to:** Supabase Dashboard → Authentication → Providers → Google

**Steps:**
1. Toggle **Enable Sign in with Google** to ON
2. Create OAuth credentials in [Google Cloud Console](https://console.cloud.google.com/):
   - Create a project (or use existing)
   - Go to **APIs & Services** → **Credentials** → **Create Credentials** → **OAuth client ID**
   - Application type: **Web application**
   - Authorized JavaScript origins: Add your app URLs (e.g. `https://yourdomain.com`, `http://localhost:3000`)
   - Authorized redirect URIs: Add `https://<YOUR_SUPABASE_PROJECT_REF>.supabase.co/auth/v1/callback`
3. Copy **Client ID** and **Client Secret** from Google Console
4. Paste them into Supabase → Authentication → Providers → Google
5. Save

### 5. Verify Auth Settings
**Go to:** Supabase Dashboard → Authentication → URL Configuration

**Check:**
- **Site URL**: Your production URL (e.g. `https://yourdomain.com`)
- **Redirect URLs**: Add:
  - `https://yourdomain.com/**`
  - `http://localhost:3000/**` (for local dev)

## Testing After Fix

### Test Professional Signup:
1. Go to `/professional/auth/signup`
2. Fill form with new email (e.g., `testdoc@example.com`, password: `123456`)
3. Click "Create Account"
4. Should immediately redirect to `/professional/dashboard` WITHOUT email confirmation
5. Check database: `professionals` table should have the new record

### Test Professional Login:
1. Go to `/professional/auth/login`
2. Enter pharmacy1@algeriamed.test / 123456
3. Should login and see professional dashboard

### Test Patient Flow:
1. Go to `/booking/new` as guest
2. Book appointment
3. Should create appointment without requiring account

## Code Changes Made

### 1. Professional Signup (`/app/professional/auth/signup/page.tsx`)
- Added `user_type: 'professional'` to auth metadata
- Professional record created via server action (bypasses RLS)
- Added console.log for debugging

### 2. Professional Login (`/app/professional/auth/login/page.tsx`)
- Checks `professionals`, `doctors`, and `pharmacies` tables
- Server action bypasses RLS
- Better error messages

### 3. Middleware (`/middleware.ts`)
- Redirects professionals from `/dashboard` to `/professional/dashboard`
- Prevents role confusion

### 4. Patient Dashboard (`/app/dashboard/page.tsx`)
- Checks if user is professional on load
- Auto-redirects to professional dashboard if so

## Current Account Status

### Existing Test Pharmacies (Password: 123456)
- pharmacy1@algeriamed.test → Pharmacie El Moustakbel
- pharmacy2@algeriamed.test → Pharmacie Ibn Sina
- pharmacy3@algeriamed.test → Pharmacie Hydra Centrale
- pharmacy4@algeriamed.test → Pharmacie Kouba Moderne
- pharmacy5@algeriamed.test → Pharmacie Es-Salam

### Existing Doctor
- Dr. Rachid Benkhaled (check email in database)

## If You Still See Errors

### "Account already exists" but can't login:
1. Check Supabase Dashboard → Authentication → Users
2. Find the email, see if `email_confirmed_at` is NULL
3. If NULL: Click user → Click "Send magic link" or manually set `email_confirmed_at` to current timestamp

### "Not registered as professional":
1. Check database tables: `professionals`, `doctors`, `pharmacies`
2. Look for `auth_user_id` matching the user's ID
3. If missing: Run this SQL in Supabase SQL Editor:
\`\`\`sql
INSERT INTO professionals (auth_user_id, email, phone, business_name, type, status, profile_completed, wilaya, commune, license_number)
VALUES (
  'USER_AUTH_ID_HERE',
  'email@example.com',
  '+213555123456',
  'Test Clinic',
  'doctor',
  'approved',
  true,
  'Alger',
  'Alger Centre',
  'DOC-2025-001'
);
\`\`\`

## Next Steps
1. ✅ Go to Supabase Dashboard and disable email confirmation
2. ✅ Test professional signup with new email
3. ✅ Test pharmacy login with existing accounts
4. ✅ Verify role-based redirects work properly
