# Create Avatars Storage Bucket

The profile picture upload feature requires a Supabase Storage bucket named `avatars`.

## Quick: Run the script

```bash
npm run storage:create-avatars
```

Requires `.env.local` with `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.

## Manual: Create via Supabase Dashboard

1. Go to your Supabase project → **Storage**
2. Click **New bucket**
3. Name: `avatars`
4. Enable **Public bucket** (so avatar URLs work without signed URLs)
5. Click **Create bucket**

## Note

The avatar upload API uses the admin (service role) client, which bypasses RLS. You only need the bucket to exist and be **public** so the uploaded URLs are accessible.
