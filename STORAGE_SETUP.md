# Storage Setup - Fix File Upload Issues

## Quick Fix (Recommended)

Run this one command to create all required storage buckets:

```bash
npm run storage:setup-all
```

This will create:
- ✅ `avatars` - Profile pictures
- ✅ `documents` - Medical documents and PDFs  
- ✅ `chat-attachments` - Chat file uploads
- ✅ `professional-services` - Service images
- ✅ `backup-files` - Database backups

## Requirements

Make sure your `.env.local` file has these variables:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

Get them from: **Supabase Dashboard** → **Project Settings** → **API**

## What This Fixes

After running the setup script, these features will work:
- 📸 Profile photo uploads
- 📄 Document uploads
- 💬 Chat file attachments
- 🏥 Professional service images
- 💾 Database backups

## Manual Setup (Alternative)

If you prefer to create buckets manually in the Supabase Dashboard:

1. Go to **Storage** in your Supabase Dashboard
2. Click **New bucket**
3. Create these buckets (all **PUBLIC** except backup-files):

| Bucket Name | Public | Size Limit | Allowed Types |
|-------------|--------|------------|---------------|
| avatars | ✅ Yes | 5 MB | JPEG, PNG, WebP, GIF |
| documents | ✅ Yes | 10 MB | JPEG, PNG, WebP, PDF |
| chat-attachments | ✅ Yes | 10 MB | Images, PDF, Audio |
| professional-services | ✅ Yes | 5 MB | JPEG, PNG, WebP, GIF |
| backup-files | ❌ No | 100 MB | Any |

## Troubleshooting

**Error: "Missing environment variables"**
- Add `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to `.env.local`

**Error: "Bucket already exists"**
- This is fine - the bucket is already set up. The script will skip it.

**Uploads still not working?**
- Check browser console for errors
- Verify buckets are **Public** (except backup-files)
- Check Supabase Dashboard → Storage → Policies
- Make sure your Vercel deployment has the environment variables set

## Need Help?

Check the main setup guide: `scripts/README.md`
