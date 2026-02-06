# Supabase Storage Setup Guide

## Fix for "Bucket not found" Error

Your platform is now configured to use **Supabase Storage** (not Vercel Blob) for all file uploads including:
- Documents (professional, visit, patient, lab documents)
- Avatars
- Professional service images
- Chat attachments

## Required Setup Steps

### 1. Create Storage Buckets in Supabase

Go to your Supabase project dashboard → Storage → Click "Create new bucket" or run the SQL script below in the SQL Editor.

**Run this SQL in Supabase SQL Editor:**

```sql
-- Copy the entire contents of scripts/setup-storage-buckets.sql
```

Or manually create these buckets in the Supabase Storage UI:

#### Bucket: `documents`
- **Public**: Yes
- **File size limit**: 5MB
- **Allowed MIME types**: image/jpeg, image/png, image/webp, application/pdf

#### Bucket: `avatars`
- **Public**: Yes
- **File size limit**: 2MB
- **Allowed MIME types**: image/jpeg, image/png, image/webp, image/gif

#### Bucket: `professional-services`
- **Public**: Yes
- **File size limit**: 5MB
- **Allowed MIME types**: image/jpeg, image/png, image/webp, image/gif

#### Bucket: `chat-attachments`
- **Public**: Yes
- **File size limit**: 10MB
- **Allowed MIME types**: image/jpeg, image/png, image/webp, image/gif, application/pdf, audio/mpeg, audio/wav, audio/webm, video/mp4, video/webm

### 2. Storage Policies (RLS)

The SQL script (`scripts/setup-storage-buckets.sql`) includes all necessary RLS policies. If you created buckets manually, you must add these policies:

**For all buckets:**
- Allow authenticated users to upload files
- Allow public/authenticated users to read files
- Allow users to delete their own files

### 3. Verify Environment Variables

Ensure these are set in your Vercel project (should be auto-configured by Supabase integration):

```
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## How File Uploads Work Now

### Upload Flow
1. User selects a file in the UI
2. File is sent to API route (e.g., `/api/documents/upload`)
3. API validates file (size, type, permissions)
4. File is uploaded to appropriate Supabase Storage bucket
5. Public URL is generated and saved to database
6. URL is returned to client for display

### File Access
- **Images/PDFs**: Direct public URLs from Supabase Storage
- **Documents**: Proxied through `/api/documents/proxy` for access control
- **Chat attachments**: Proxied through `/api/chat/attachment` for audio playback

## Troubleshooting

### Still getting "Bucket not found"?
1. Verify buckets exist in Supabase Dashboard → Storage
2. Check bucket names match exactly: `documents`, `avatars`, `professional-services`, `chat-attachments`
3. Ensure buckets are set to **Public**
4. Verify RLS policies are enabled

### Upload fails with 413 error?
- File exceeds size limit (4-10MB depending on type)
- Reduce file size or increase limits in bucket settings

### Upload fails with CORS error?
- Check that SUPABASE_URL and keys are correct
- Verify bucket is set to public
- Check browser console for specific CORS errors

### Can't view uploaded files?
- Check that file_url or storage_path is saved in database
- Verify bucket RLS policies allow SELECT operations
- For chat attachments, ensure signed URLs are generated correctly

## Better UX Recommendations

To improve the upload experience, consider:

### 1. **Client-Side Image Compression**
Add `browser-image-compression` package to reduce file sizes before upload:

```bash
npm install browser-image-compression
```

### 2. **Upload Progress Indicators**
The platform already has basic progress tracking. Enhance with visual progress bars.

### 3. **Drag & Drop Improvements**
Current components support drag & drop. Consider adding:
- Visual drop zones
- Multi-file upload queues
- Preview thumbnails before upload

### 4. **Image Optimization**
- Resize images to max width/height before upload
- Convert to WebP for better compression
- Generate thumbnails for faster loading

### 5. **File Type Icons**
Show appropriate icons for PDFs, images, audio files, etc.

## API Routes Reference

- `POST /api/documents/upload` - Upload documents (professional, visit, patient, lab)
- `POST /api/avatar/upload` - Upload user avatars
- `POST /api/professional-services/upload` - Upload service images
- `GET /api/documents/proxy` - Access-controlled document download
- `GET /api/chat/attachment` - Chat attachment access with audio proxy

## Database Schema

All uploaded files store both `storage_path` and `file_url`:

- `professional_documents.storage_path` - Bucket path
- `professional_documents.file_url` - Public URL
- `visit_documents.*` - Same structure
- `patient_documents.*` - Same structure
- `lab_request_documents.*` - Same structure
- `chat_attachments.storage_path` - Bucket path

## Need Help?

If you're still experiencing issues:
1. Check Supabase logs for storage errors
2. Verify API route logs in Vercel deployment
3. Test uploads in Supabase Storage UI directly
4. Check that your Supabase project has storage enabled (Pro plan)
