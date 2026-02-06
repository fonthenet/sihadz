/**
 * Backup Encryption Module
 * AES-256-GCM encryption with platform master key
 * 
 * SECURITY:
 * - Master key stored in BACKUP_MASTER_KEY environment variable
 * - Unique IV generated for each backup
 * - GCM provides authenticated encryption (integrity + confidentiality)
 * - SHA-256 checksum of plaintext for additional verification
 */

import { EncryptedBackup, EncryptionResult, DecryptionResult, BackupType, BackupData } from './types'

// =====================================================
// CONSTANTS
// =====================================================

const ALGORITHM = 'AES-GCM'
const KEY_LENGTH = 256
const IV_LENGTH = 12 // 96 bits recommended for GCM
const TAG_LENGTH = 128 // 128-bit auth tag

// =====================================================
// KEY MANAGEMENT
// =====================================================

/**
 * Get the master encryption key from environment
 * Server-side only - never expose to client
 */
export function getMasterKey(): string {
  const key = process.env.BACKUP_MASTER_KEY
  if (!key) {
    throw new Error('BACKUP_MASTER_KEY environment variable is not set')
  }
  return key
}

/**
 * Import the master key for use with Web Crypto API
 */
async function importKey(keyBase64: string): Promise<CryptoKey> {
  const keyBytes = base64ToArrayBuffer(keyBase64)
  
  if (keyBytes.byteLength !== 32) {
    throw new Error('Master key must be 256 bits (32 bytes)')
  }
  
  return await crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: ALGORITHM, length: KEY_LENGTH },
    false, // not extractable
    ['encrypt', 'decrypt']
  )
}

/**
 * Generate a new master key (one-time setup utility)
 * Run this once and store the result in BACKUP_MASTER_KEY
 */
export function generateMasterKey(): string {
  const key = crypto.getRandomValues(new Uint8Array(32))
  return arrayBufferToBase64(key)
}

// =====================================================
// ENCRYPTION
// =====================================================

/**
 * Encrypt backup data with AES-256-GCM
 */
export async function encryptBackup(data: BackupData): Promise<EncryptionResult> {
  const masterKey = getMasterKey()
  const cryptoKey = await importKey(masterKey)
  
  // Serialize data to JSON
  const plaintext = JSON.stringify(data)
  const plaintextBytes = new TextEncoder().encode(plaintext)
  
  // Generate unique IV for this backup
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH))
  
  // Calculate checksum of plaintext for additional verification
  const checksum = await calculateChecksum(plaintextBytes)
  
  // Encrypt with AES-GCM
  const encryptedBuffer = await crypto.subtle.encrypt(
    {
      name: ALGORITHM,
      iv: iv,
      tagLength: TAG_LENGTH
    },
    cryptoKey,
    plaintextBytes
  )
  
  // GCM appends auth tag to ciphertext
  // Extract auth tag (last 16 bytes)
  const encryptedBytes = new Uint8Array(encryptedBuffer)
  const ciphertext = encryptedBytes.slice(0, -16)
  const authTag = encryptedBytes.slice(-16)
  
  return {
    encrypted_data: arrayBufferToBase64(ciphertext),
    iv: arrayBufferToBase64(iv),
    auth_tag: arrayBufferToBase64(authTag),
    checksum
  }
}

/**
 * Create a complete encrypted backup file
 */
export async function createEncryptedBackup(
  data: BackupData,
  backupType: BackupType,
  entityId?: string,
  entityType?: 'user' | 'professional' | 'pharmacy'
): Promise<EncryptedBackup> {
  const encryptionResult = await encryptBackup(data)
  
  return {
    version: '1.0',
    platform: 'dzd-healthcare',
    created_at: new Date().toISOString(),
    backup_type: backupType,
    entity_id: entityId,
    entity_type: entityType,
    iv: encryptionResult.iv,
    auth_tag: encryptionResult.auth_tag,
    checksum: encryptionResult.checksum,
    encrypted_data: encryptionResult.encrypted_data
  }
}

// =====================================================
// DECRYPTION
// =====================================================

/**
 * Decrypt backup data with AES-256-GCM
 */
export async function decryptBackup(backup: EncryptedBackup): Promise<DecryptionResult> {
  const masterKey = getMasterKey()
  const cryptoKey = await importKey(masterKey)
  
  // Decode base64 values
  const iv = base64ToArrayBuffer(backup.iv)
  const authTag = base64ToArrayBuffer(backup.auth_tag)
  const ciphertext = base64ToArrayBuffer(backup.encrypted_data)
  
  // Reconstruct the encrypted buffer (ciphertext + auth tag)
  const encryptedBytes = new Uint8Array(ciphertext.byteLength + authTag.byteLength)
  encryptedBytes.set(new Uint8Array(ciphertext), 0)
  encryptedBytes.set(new Uint8Array(authTag), ciphertext.byteLength)
  
  try {
    // Decrypt with AES-GCM (also verifies auth tag)
    const decryptedBuffer = await crypto.subtle.decrypt(
      {
        name: ALGORITHM,
        iv: iv,
        tagLength: TAG_LENGTH
      },
      cryptoKey,
      encryptedBytes
    )
    
    const decryptedBytes = new Uint8Array(decryptedBuffer)
    
    // Verify checksum
    const calculatedChecksum = await calculateChecksum(decryptedBytes)
    const checksumValid = calculatedChecksum === backup.checksum
    
    if (!checksumValid) {
      console.warn('Backup checksum mismatch - data may be corrupted')
    }
    
    // Parse JSON
    const plaintext = new TextDecoder().decode(decryptedBytes)
    const data = JSON.parse(plaintext)
    
    return {
      data,
      verified: checksumValid
    }
  } catch (error) {
    // GCM will throw if auth tag verification fails
    throw new Error('Decryption failed - backup may be corrupted or tampered with')
  }
}

// =====================================================
// TOKEN ENCRYPTION (for OAuth tokens)
// =====================================================

/**
 * Encrypt OAuth tokens for storage in database
 * Uses same master key but different purpose
 */
export async function encryptToken(token: string): Promise<string> {
  const masterKey = getMasterKey()
  const cryptoKey = await importKey(masterKey)
  
  const plaintext = new TextEncoder().encode(token)
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH))
  
  const encryptedBuffer = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv: iv, tagLength: TAG_LENGTH },
    cryptoKey,
    plaintext
  )
  
  // Combine IV + ciphertext for storage
  const combined = new Uint8Array(IV_LENGTH + encryptedBuffer.byteLength)
  combined.set(iv, 0)
  combined.set(new Uint8Array(encryptedBuffer), IV_LENGTH)
  
  return arrayBufferToBase64(combined)
}

/**
 * Decrypt OAuth tokens from database
 */
export async function decryptToken(encryptedToken: string): Promise<string> {
  const masterKey = getMasterKey()
  const cryptoKey = await importKey(masterKey)
  
  const combined = base64ToArrayBuffer(encryptedToken)
  const combinedBytes = new Uint8Array(combined)
  
  // Extract IV and ciphertext
  const iv = combinedBytes.slice(0, IV_LENGTH)
  const ciphertext = combinedBytes.slice(IV_LENGTH)
  
  const decryptedBuffer = await crypto.subtle.decrypt(
    { name: ALGORITHM, iv: iv, tagLength: TAG_LENGTH },
    cryptoKey,
    ciphertext
  )
  
  return new TextDecoder().decode(decryptedBuffer)
}

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

/**
 * Calculate SHA-256 checksum
 */
async function calculateChecksum(data: Uint8Array): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = new Uint8Array(hashBuffer)
  return arrayBufferToBase64(hashArray)
}

/**
 * Convert ArrayBuffer to Base64 string
 */
function arrayBufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

/**
 * Convert Base64 string to ArrayBuffer
 */
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer
}

/**
 * Validate backup file format
 */
export function validateBackupFormat(backup: unknown): backup is EncryptedBackup {
  if (!backup || typeof backup !== 'object') return false
  
  const b = backup as Record<string, unknown>
  
  return (
    b.version === '1.0' &&
    b.platform === 'dzd-healthcare' &&
    typeof b.created_at === 'string' &&
    typeof b.backup_type === 'string' &&
    typeof b.iv === 'string' &&
    typeof b.auth_tag === 'string' &&
    typeof b.checksum === 'string' &&
    typeof b.encrypted_data === 'string'
  )
}

/**
 * Get backup file size estimate (for UI display)
 */
export function estimateBackupSize(data: BackupData): number {
  const json = JSON.stringify(data)
  // Encrypted size is roughly same as plaintext + overhead
  const overhead = 100 // IV, auth tag, metadata
  return json.length + overhead
}

/**
 * Format bytes to human readable string
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}
