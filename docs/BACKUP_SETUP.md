# Backup System Setup Guide

## Server Backup (Required)

The backup system stores encrypted backups in Supabase Storage. No additional configuration is needed beyond the standard Supabase setup.

**First-time setup:** Run the bucket creation script if backups fail:
```bash
node scripts/create-backup-bucket.js
```

## Google Drive Integration (Optional)

To allow users to sync backups to their Google Drive:

### 1. Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable **Google Drive API** and **Google+ API** (for userinfo.email)

### 2. Configure OAuth Consent Screen

1. Go to APIs & Services → OAuth consent screen
2. Choose External (or Internal for workspace)
3. Add app name, support email
4. Add scopes: `drive.file`, `userinfo.email`
5. Add test users if in testing mode

### 3. Create OAuth Credentials

1. Go to APIs & Services → Credentials
2. Create Credentials → OAuth client ID
3. Application type: **Web application**
4. Add Authorized redirect URIs:
   - Local: `http://localhost:3000/api/backup/oauth/callback`
   - Production: `https://yourdomain.com/api/backup/oauth/callback`

### 4. Add to Environment

Add to `.env.local` (and production env):

```env
# Google Drive OAuth
GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/backup/oauth/callback
```

For production, use your actual domain:
```env
GOOGLE_REDIRECT_URI=https://yourdomain.com/api/backup/oauth/callback
```

### 5. Restart Server

After adding the variables, restart the Next.js dev server.
