# Website Not Loading - Troubleshooting Guide

## Quick Checks

### 1. **Environment Variables** (MOST COMMON ISSUE)
Your hosting platform MUST have these environment variables set:

```env
NEXT_PUBLIC_SUPABASE_URL=https://npgbjwqaltplatgodqfx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5wZ2Jqd3FhbHRwbGF0Z29kcWZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkxMDE3MzcsImV4cCI6MjA4NDY3NzczN30.V3AYUaMXi8KoaccZx5X3xqj70Si6byvnOHlGqbrui6s
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5wZ2Jqd3FhbHRwbGF0Z29kcWZ4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTEwMTczNywiZXhwIjoyMDg0Njc3NzM3fQ.deQofz4RpHYaV_NItS7_kLB2izLzK8VvLsQDETVSksY
NEXT_PUBLIC_SITE_URL=https://your-production-url.com
```

**Where to set (by platform):**
- **Vercel**: Project Settings → Environment Variables
- **Netlify**: Site Settings → Environment Variables
- **Railway/Render**: Environment tab

### 2. **Check Build Logs**
Look for:
- ❌ Build failures
- ❌ Missing environment variables warnings
- ❌ Runtime errors

### 3. **Check Server Logs**
Look for:
- ❌ "Missing Supabase environment variables"
- ❌ Database connection errors
- ❌ Middleware errors

### 4. **Test Health Endpoint**
Visit: `https://your-site.com/api/health`

Should return: `{"status":"ok","timestamp":"..."}`

If this fails, the server isn't running or there's a critical error.

### 5. **Check Browser Console**
Open browser DevTools (F12) and check:
- ❌ Network errors (500, 502, 503)
- ❌ JavaScript errors
- ❌ Failed API calls

## Common Issues & Fixes

### Issue: "Blank Page" or "Site Won't Load"
**Cause**: Missing environment variables
**Fix**: Add all environment variables to your hosting platform

### Issue: "500 Internal Server Error"
**Cause**: Runtime error in code
**Fix**: Check server logs for specific error message

### Issue: "Build Failed"
**Cause**: Code errors or missing dependencies
**Fix**: Run `npm run build` locally to see errors

### Issue: "Timeout" or "Connection Refused"
**Cause**: Server not running or wrong URL
**Fix**: Check deployment status on hosting platform

### Issue: "Orders/File Uploads Stay Pending" (sihadz.com)
**Cause**: Patient document uploads were client-only (never sent to API). Orders may fail if env vars or auth are wrong.
**Fix**:
1. **Documents**: Now upload to `/api/documents/upload` and persist to Supabase. Max file size 4MB (Vercel limit).
2. **Orders**: Ensure `SUPABASE_SERVICE_ROLE_KEY` and `NEXT_PUBLIC_SUPABASE_URL` are set in Vercel.
3. **Auth cookies**: Supabase Dashboard → Auth → URL Configuration: Site URL = `https://sihadz.com`, Redirect URLs include `https://sihadz.com/**`.
4. **Check Vercel logs**: Project → Logs to see API errors (401, 403, 500).

## Recent Changes Made

1. ✅ **Patient document uploads** - Now persist to Supabase via API (was client-only)
2. ✅ **File size limit** - 4MB to stay under Vercel 4.5MB body limit
3. ✅ **Middleware simplified** - No longer blocks requests
4. ✅ **Supabase clients made defensive** - Won't crash if env vars missing
5. ✅ **Auth provider made safe** - Handles missing Supabase gracefully

## Next Steps

1. **Verify environment variables** on your hosting platform
2. **Check deployment logs** for errors
3. **Test `/api/health` endpoint** to see if server is running
4. **Check browser console** for client-side errors

If still not working, share:
- The exact error message
- Browser console errors
- Server logs from hosting platform