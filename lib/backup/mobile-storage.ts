/**
 * Mobile Storage Service
 * Local device backup using Capacitor Filesystem
 * 
 * Note: This module uses dynamic imports for Capacitor plugins
 * to avoid build errors when running on web
 */

import { EncryptedBackup, MobileBackupInfo, MobileBackupSettings } from './types'

// =====================================================
// CAPACITOR PLUGIN IMPORTS (Dynamic)
// =====================================================

let Filesystem: any = null
let Directory: any = null
let Preferences: any = null

async function loadCapacitorPlugins() {
  if (typeof window === 'undefined') return false
  
  try {
    const fsModule = await import('@capacitor/filesystem')
    Filesystem = fsModule.Filesystem
    Directory = fsModule.Directory
    
    const prefModule = await import('@capacitor/preferences')
    Preferences = prefModule.Preferences
    
    return true
  } catch (e) {
    console.warn('Capacitor plugins not available:', e)
    return false
  }
}

// =====================================================
// CONSTANTS
// =====================================================

const BACKUP_FOLDER = 'backups'
const SETTINGS_KEY = 'mobile_backup_settings'
const SYNC_QUEUE_KEY = 'backup_sync_queue'

// =====================================================
// MOBILE DETECTION
// =====================================================

/**
 * Check if running on mobile (Capacitor)
 */
export function isMobileApp(): boolean {
  if (typeof window === 'undefined') return false
  return !!(window as any).Capacitor?.isNativePlatform?.()
}

/**
 * Get platform name
 */
export function getPlatform(): 'ios' | 'android' | 'web' {
  if (typeof window === 'undefined') return 'web'
  const capacitor = (window as any).Capacitor
  if (!capacitor?.isNativePlatform?.()) return 'web'
  return capacitor.getPlatform?.() || 'web'
}

// =====================================================
// LOCAL STORAGE OPERATIONS
// =====================================================

/**
 * Save backup to device storage
 */
export async function saveBackupToDevice(
  backup: EncryptedBackup,
  filename: string
): Promise<string> {
  const loaded = await loadCapacitorPlugins()
  if (!loaded) throw new Error('Capacitor not available')
  
  const backupJson = JSON.stringify(backup)
  
  // Ensure backup folder exists
  try {
    await Filesystem.mkdir({
      path: BACKUP_FOLDER,
      directory: Directory.Documents,
      recursive: true
    })
  } catch (e) {
    // Folder might already exist
  }
  
  // Save backup file
  const path = `${BACKUP_FOLDER}/${filename}`
  await Filesystem.writeFile({
    path,
    data: backupJson,
    directory: Directory.Documents,
    encoding: 'utf8'
  })
  
  return path
}

/**
 * Read backup from device storage
 */
export async function readBackupFromDevice(path: string): Promise<EncryptedBackup> {
  const loaded = await loadCapacitorPlugins()
  if (!loaded) throw new Error('Capacitor not available')
  
  const result = await Filesystem.readFile({
    path,
    directory: Directory.Documents,
    encoding: 'utf8'
  })
  
  return JSON.parse(result.data) as EncryptedBackup
}

/**
 * Delete backup from device storage
 */
export async function deleteBackupFromDevice(path: string): Promise<void> {
  const loaded = await loadCapacitorPlugins()
  if (!loaded) throw new Error('Capacitor not available')
  
  await Filesystem.deleteFile({
    path,
    directory: Directory.Documents
  })
}

/**
 * List backups on device
 */
export async function listDeviceBackups(): Promise<MobileBackupInfo[]> {
  const loaded = await loadCapacitorPlugins()
  if (!loaded) return []
  
  try {
    const result = await Filesystem.readdir({
      path: BACKUP_FOLDER,
      directory: Directory.Documents
    })
    
    const backups: MobileBackupInfo[] = []
    
    for (const file of result.files) {
      if (file.name.endsWith('.dzdbackup')) {
        try {
          const stat = await Filesystem.stat({
            path: `${BACKUP_FOLDER}/${file.name}`,
            directory: Directory.Documents
          })
          
          // Parse backup type from filename
          const backupType = file.name.includes('-pharmacy-') ? 'pharmacy' :
                             file.name.includes('-professional-') ? 'professional' :
                             file.name.includes('-patient-') ? 'patient' : 'full'
          
          backups.push({
            id: file.name.replace('.dzdbackup', ''),
            filename: file.name,
            file_size_bytes: stat.size || 0,
            backup_type: backupType,
            created_at: stat.mtime ? new Date(stat.mtime).toISOString() : new Date().toISOString(),
            is_synced_server: false, // Will be updated from sync queue
            is_synced_google: false,
            is_synced_icloud: false,
            local_path: `${BACKUP_FOLDER}/${file.name}`
          })
        } catch (e) {
          console.warn('Failed to stat backup file:', e)
        }
      }
    }
    
    // Sort by date, newest first
    backups.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    
    return backups
  } catch (e) {
    // Folder might not exist yet
    return []
  }
}

/**
 * Get total storage used by backups
 */
export async function getDeviceStorageUsed(): Promise<number> {
  const backups = await listDeviceBackups()
  return backups.reduce((total, backup) => total + backup.file_size_bytes, 0)
}

/**
 * Clean up old backups to stay within storage limit
 */
export async function cleanupOldBackups(maxBackups: number = 7): Promise<number> {
  const backups = await listDeviceBackups()
  
  if (backups.length <= maxBackups) return 0
  
  // Delete oldest backups (keep newest maxBackups)
  const toDelete = backups.slice(maxBackups)
  let deleted = 0
  
  for (const backup of toDelete) {
    try {
      await deleteBackupFromDevice(backup.local_path)
      deleted++
    } catch (e) {
      console.warn('Failed to delete old backup:', e)
    }
  }
  
  return deleted
}

// =====================================================
// SETTINGS
// =====================================================

/**
 * Get mobile backup settings
 */
export async function getMobileBackupSettings(): Promise<MobileBackupSettings> {
  const loaded = await loadCapacitorPlugins()
  if (!loaded) {
    return {
      auto_backup_enabled: true,
      auto_backup_frequency: 'daily',
      wifi_only_sync: true,
      max_local_backups: 7,
      max_local_storage_mb: 500
    }
  }
  
  try {
    const result = await Preferences.get({ key: SETTINGS_KEY })
    if (result.value) {
      return JSON.parse(result.value)
    }
  } catch (e) {
    console.warn('Failed to get settings:', e)
  }
  
  // Default settings
  return {
    auto_backup_enabled: true,
    auto_backup_frequency: 'daily',
    wifi_only_sync: true,
    max_local_backups: 7,
    max_local_storage_mb: 500
  }
}

/**
 * Save mobile backup settings
 */
export async function saveMobileBackupSettings(settings: MobileBackupSettings): Promise<void> {
  const loaded = await loadCapacitorPlugins()
  if (!loaded) return
  
  await Preferences.set({
    key: SETTINGS_KEY,
    value: JSON.stringify(settings)
  })
}

// =====================================================
// EXPORT/SHARE
// =====================================================

/**
 * Export backup file for sharing
 * Returns a shareable URI
 */
export async function getBackupShareUri(path: string): Promise<string> {
  const loaded = await loadCapacitorPlugins()
  if (!loaded) throw new Error('Capacitor not available')
  
  const result = await Filesystem.getUri({
    path,
    directory: Directory.Documents
  })
  
  return result.uri
}

/**
 * Import backup from external file
 */
export async function importBackupFromUri(uri: string): Promise<EncryptedBackup> {
  const loaded = await loadCapacitorPlugins()
  if (!loaded) throw new Error('Capacitor not available')
  
  // Read file from URI
  const result = await Filesystem.readFile({
    path: uri
  })
  
  const backup = JSON.parse(result.data) as EncryptedBackup
  
  // Validate it's a valid backup
  if (backup.platform !== 'dzd-healthcare' || !backup.encrypted_data) {
    throw new Error('Invalid backup file format')
  }
  
  return backup
}

// =====================================================
// DEVICE INFO
// =====================================================

/**
 * Get unique device ID
 */
export async function getDeviceId(): Promise<string> {
  const loaded = await loadCapacitorPlugins()
  if (!loaded) return 'web-device'
  
  try {
    // Try to get stored device ID
    const result = await Preferences.get({ key: 'device_id' })
    if (result.value) {
      return result.value
    }
    
    // Generate new device ID
    const deviceId = `device-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    await Preferences.set({ key: 'device_id', value: deviceId })
    return deviceId
  } catch (e) {
    return 'unknown-device'
  }
}

/**
 * Check available storage space
 */
export async function getAvailableStorage(): Promise<{ used: number; available: number; total: number }> {
  // Note: Capacitor doesn't provide direct access to storage info
  // This would need a custom native plugin
  // For now, return estimates based on backup usage
  const used = await getDeviceStorageUsed()
  
  return {
    used,
    available: 500 * 1024 * 1024 - used, // Assume 500MB limit
    total: 500 * 1024 * 1024
  }
}
