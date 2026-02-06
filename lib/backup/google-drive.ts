/**
 * Google Drive Service (OPTIONAL)
 * Sync backups to user's Google Drive for offsite redundancy
 */

import { encryptToken, decryptToken } from './encryption'
import { 
  getGoogleConnection, 
  saveGoogleConnection, 
  deleteGoogleConnection,
  getBackupById,
  updateBackupRecord,
  downloadBackupFromStorage
} from './storage'
import { GoogleOAuthTokens, GoogleDriveFile, BackupGoogleConnection } from './types'

// =====================================================
// CONFIGURATION
// =====================================================

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET

/** Build redirect URI. Pass request origin to use current site (sihadz.com, localhost, etc.) - overrides env. */
function getRedirectUri(origin?: string): string {
  if (origin) return `${origin.replace(/\/$/, '')}/api/backup/oauth/callback`
  return process.env.GOOGLE_REDIRECT_URI ||
    (process.env.NEXT_PUBLIC_SITE_URL
      ? `${process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '')}/api/backup/oauth/callback`
      : 'http://localhost:3000/api/backup/oauth/callback')
}

const SCOPES = [
  'https://www.googleapis.com/auth/drive.file', // Only files created by app
  'https://www.googleapis.com/auth/userinfo.email'
]

const FOLDER_NAME = 'DZD-Healthcare-Backups'

// =====================================================
// OAUTH FLOW
// =====================================================

/**
 * Check if Google Drive integration is configured
 */
export function isGoogleDriveConfigured(): boolean {
  return !!(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET)
}

/**
 * Generate OAuth authorization URL
 * @param state - CSRF state token
 * @param origin - Request origin (e.g. https://sihadz.com) - uses current site so redirect goes there, not localhost
 */
export function getGoogleAuthUrl(state: string, origin?: string): string {
  if (!isGoogleDriveConfigured()) {
    throw new Error('Google Drive integration is not configured')
  }
  
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID!,
    redirect_uri: getRedirectUri(origin),
    response_type: 'code',
    scope: SCOPES.join(' '),
    access_type: 'offline',
    prompt: 'consent', // Force consent to get refresh token
    state
  })
  
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
}

/**
 * Exchange authorization code for tokens
 * @param code - Authorization code from Google
 * @param origin - Request origin - MUST match the redirect_uri used in getGoogleAuthUrl
 */
export async function exchangeCodeForTokens(code: string, origin?: string): Promise<GoogleOAuthTokens> {
  if (!isGoogleDriveConfigured()) {
    throw new Error('Google Drive integration is not configured')
  }
  
  const redirectUri = getRedirectUri(origin)
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID!,
      client_secret: GOOGLE_CLIENT_SECRET!,
      code,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri
    })
  })
  
  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to exchange code: ${error}`)
  }
  
  const data = await response.json()
  
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: Date.now() + (data.expires_in * 1000),
    scope: data.scope
  }
}

/**
 * Refresh access token
 */
async function refreshAccessToken(refreshToken: string): Promise<GoogleOAuthTokens> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID!,
      client_secret: GOOGLE_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: 'refresh_token'
    })
  })
  
  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to refresh token: ${error}`)
  }
  
  const data = await response.json()
  
  return {
    access_token: data.access_token,
    refresh_token: refreshToken, // Keep original refresh token
    expires_at: Date.now() + (data.expires_in * 1000),
    scope: data.scope
  }
}

/**
 * Get valid access token (refresh if needed)
 */
async function getValidAccessToken(userId: string): Promise<string> {
  const connection = await getGoogleConnection(userId)
  if (!connection) {
    throw new Error('Google Drive not connected')
  }
  
  // Decrypt tokens
  const refreshToken = await decryptToken(connection.refresh_token_encrypted)
  
  // Check if token is expired (with 5 minute buffer)
  const expiresAt = new Date(connection.token_expires_at).getTime()
  if (Date.now() > expiresAt - 5 * 60 * 1000) {
    // Refresh token
    const newTokens = await refreshAccessToken(refreshToken)
    
    // Update stored tokens
    await saveGoogleConnection(userId, {
      access_token_encrypted: await encryptToken(newTokens.access_token),
      token_expires_at: new Date(newTokens.expires_at).toISOString()
    })
    
    return newTokens.access_token
  }
  
  return await decryptToken(connection.access_token_encrypted)
}

/**
 * Get user's Google email
 */
export async function getGoogleUserEmail(accessToken: string): Promise<string> {
  const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` }
  })
  
  if (!response.ok) {
    throw new Error('Failed to get user info')
  }
  
  const data = await response.json()
  return data.email
}

// =====================================================
// CONNECTION MANAGEMENT
// =====================================================

/**
 * Complete Google Drive connection after OAuth
 */
export async function connectGoogleDrive(
  userId: string,
  tokens: GoogleOAuthTokens
): Promise<BackupGoogleConnection> {
  // Encrypt tokens before storing
  const accessTokenEncrypted = await encryptToken(tokens.access_token)
  const refreshTokenEncrypted = await encryptToken(tokens.refresh_token)
  
  // Get user email
  const email = await getGoogleUserEmail(tokens.access_token)
  
  // Create/update connection
  const connection = await saveGoogleConnection(userId, {
    access_token_encrypted: accessTokenEncrypted,
    refresh_token_encrypted: refreshTokenEncrypted,
    token_expires_at: new Date(tokens.expires_at).toISOString(),
    email,
    is_active: true,
    folder_name: FOLDER_NAME
  })
  
  // Create backup folder in Drive
  try {
    const folderId = await createBackupFolder(tokens.access_token)
    await saveGoogleConnection(userId, { folder_id: folderId })
  } catch (e) {
    console.warn('Failed to create backup folder:', e)
  }
  
  return connection
}

/**
 * Disconnect Google Drive
 */
export async function disconnectGoogleDrive(userId: string): Promise<void> {
  const connection = await getGoogleConnection(userId)
  if (!connection) return
  
  // Revoke access token
  try {
    const accessToken = await decryptToken(connection.access_token_encrypted)
    await fetch(`https://oauth2.googleapis.com/revoke?token=${accessToken}`, {
      method: 'POST'
    })
  } catch (e) {
    console.warn('Failed to revoke token:', e)
  }
  
  // Delete connection
  await deleteGoogleConnection(userId)
}

// =====================================================
// FILE OPERATIONS
// =====================================================

/**
 * Create backup folder in Google Drive
 */
async function createBackupFolder(accessToken: string): Promise<string> {
  // Check if folder already exists
  const searchResponse = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=name='${FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )
  
  if (searchResponse.ok) {
    const searchData = await searchResponse.json()
    if (searchData.files && searchData.files.length > 0) {
      return searchData.files[0].id
    }
  }
  
  // Create new folder
  const createResponse = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: FOLDER_NAME,
      mimeType: 'application/vnd.google-apps.folder'
    })
  })
  
  if (!createResponse.ok) {
    throw new Error('Failed to create backup folder')
  }
  
  const folderData = await createResponse.json()
  return folderData.id
}

/**
 * Upload backup file to Google Drive
 */
export async function uploadToGoogleDrive(
  userId: string,
  backupContent: string,
  filename: string
): Promise<string> {
  const accessToken = await getValidAccessToken(userId)
  const connection = await getGoogleConnection(userId)
  
  if (!connection?.folder_id) {
    throw new Error('Backup folder not found')
  }
  
  // Prepare multipart upload
  const metadata = {
    name: filename,
    parents: [connection.folder_id],
    mimeType: 'application/json'
  }
  
  const boundary = '-------backup-boundary'
  const body = `--${boundary}\r\n` +
    `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
    `${JSON.stringify(metadata)}\r\n` +
    `--${boundary}\r\n` +
    `Content-Type: application/json\r\n\r\n` +
    `${backupContent}\r\n` +
    `--${boundary}--`
  
  const response = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`
      },
      body
    }
  )
  
  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to upload to Google Drive: ${error}`)
  }
  
  const fileData = await response.json()
  
  // Update last sync time
  await saveGoogleConnection(userId, {
    last_sync_at: new Date().toISOString(),
    last_error: null
  })
  
  return fileData.id
}

/**
 * Sync existing backup to Google Drive
 */
export async function syncBackupToGoogleDrive(
  userId: string,
  backupId: string
): Promise<string> {
  // Get backup record
  const backup = await getBackupById(backupId)
  if (!backup) {
    throw new Error('Backup not found')
  }
  
  // Download from server storage
  const encryptedBackup = await downloadBackupFromStorage(backup.storage_path)
  const backupContent = JSON.stringify(encryptedBackup)
  
  // Upload to Google Drive
  const googleFileId = await uploadToGoogleDrive(userId, backupContent, backup.filename)
  
  // Update backup record
  await updateBackupRecord(backupId, {
    google_file_id: googleFileId,
    google_synced_at: new Date().toISOString()
  })
  
  return googleFileId
}

/**
 * Download backup from Google Drive
 */
export async function downloadFromGoogleDrive(
  userId: string,
  fileId: string
): Promise<string> {
  const accessToken = await getValidAccessToken(userId)
  
  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )
  
  if (!response.ok) {
    throw new Error('Failed to download from Google Drive')
  }
  
  return await response.text()
}

/**
 * List backups in Google Drive
 */
export async function listGoogleDriveBackups(userId: string): Promise<GoogleDriveFile[]> {
  const accessToken = await getValidAccessToken(userId)
  const connection = await getGoogleConnection(userId)
  
  if (!connection?.folder_id) {
    return []
  }
  
  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files?q='${connection.folder_id}' in parents and trashed=false&fields=files(id,name,size,createdTime,modifiedTime,webViewLink)&orderBy=createdTime desc`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )
  
  if (!response.ok) {
    throw new Error('Failed to list Google Drive files')
  }
  
  const data = await response.json()
  return data.files || []
}

/**
 * Delete backup from Google Drive
 */
export async function deleteFromGoogleDrive(
  userId: string,
  fileId: string
): Promise<void> {
  const accessToken = await getValidAccessToken(userId)
  
  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}`,
    {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` }
    }
  )
  
  if (!response.ok && response.status !== 404) {
    throw new Error('Failed to delete from Google Drive')
  }
}

/**
 * Get Google Drive storage usage
 */
export async function getGoogleDriveUsage(userId: string): Promise<{
  used: number
  limit: number
}> {
  const accessToken = await getValidAccessToken(userId)
  
  const response = await fetch(
    'https://www.googleapis.com/drive/v3/about?fields=storageQuota',
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )
  
  if (!response.ok) {
    throw new Error('Failed to get storage quota')
  }
  
  const data = await response.json()
  return {
    used: parseInt(data.storageQuota.usage) || 0,
    limit: parseInt(data.storageQuota.limit) || 0
  }
}
