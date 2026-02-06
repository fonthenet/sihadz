/**
 * Mobile Sync Service
 * Background sync queue for uploading local backups when online
 */

import { MobileSyncQueueItem } from './types'
import { 
  isMobileApp, 
  readBackupFromDevice, 
  listDeviceBackups,
  getMobileBackupSettings 
} from './mobile-storage'

// =====================================================
// CAPACITOR PLUGIN IMPORTS (Dynamic)
// =====================================================

let Preferences: any = null
let Network: any = null

async function loadCapacitorPlugins() {
  if (typeof window === 'undefined') return false
  
  try {
    const prefModule = await import('@capacitor/preferences')
    Preferences = prefModule.Preferences
    
    const networkModule = await import('@capacitor/network')
    Network = networkModule.Network
    
    return true
  } catch (e) {
    console.warn('Capacitor plugins not available:', e)
    return false
  }
}

// =====================================================
// CONSTANTS
// =====================================================

const SYNC_QUEUE_KEY = 'backup_sync_queue'
const MAX_RETRY_ATTEMPTS = 5

// =====================================================
// NETWORK STATUS
// =====================================================

/**
 * Check if device is online
 */
export async function isOnline(): Promise<boolean> {
  if (!isMobileApp()) {
    return typeof navigator !== 'undefined' ? navigator.onLine : true
  }
  
  const loaded = await loadCapacitorPlugins()
  if (!loaded) return true
  
  try {
    const status = await Network.getStatus()
    return status.connected
  } catch (e) {
    return true
  }
}

/**
 * Check if on WiFi
 */
export async function isOnWifi(): Promise<boolean> {
  if (!isMobileApp()) return true
  
  const loaded = await loadCapacitorPlugins()
  if (!loaded) return true
  
  try {
    const status = await Network.getStatus()
    return status.connectionType === 'wifi'
  } catch (e) {
    return true
  }
}

/**
 * Check if sync should proceed based on settings
 */
export async function shouldSync(): Promise<boolean> {
  const online = await isOnline()
  if (!online) return false
  
  const settings = await getMobileBackupSettings()
  if (settings.wifi_only_sync) {
    return await isOnWifi()
  }
  
  return true
}

// =====================================================
// SYNC QUEUE MANAGEMENT
// =====================================================

/**
 * Get sync queue
 */
export async function getSyncQueue(): Promise<MobileSyncQueueItem[]> {
  const loaded = await loadCapacitorPlugins()
  if (!loaded) return []
  
  try {
    const result = await Preferences.get({ key: SYNC_QUEUE_KEY })
    if (result.value) {
      return JSON.parse(result.value)
    }
  } catch (e) {
    console.warn('Failed to get sync queue:', e)
  }
  
  return []
}

/**
 * Save sync queue
 */
async function saveSyncQueue(queue: MobileSyncQueueItem[]): Promise<void> {
  const loaded = await loadCapacitorPlugins()
  if (!loaded) return
  
  await Preferences.set({
    key: SYNC_QUEUE_KEY,
    value: JSON.stringify(queue)
  })
}

/**
 * Add item to sync queue
 */
export async function addToSyncQueue(
  backupId: string,
  target: 'server' | 'google' | 'icloud'
): Promise<void> {
  const queue = await getSyncQueue()
  
  // Check if already in queue
  const exists = queue.some(
    item => item.backup_id === backupId && item.target === target
  )
  if (exists) return
  
  queue.push({
    id: `${backupId}-${target}-${Date.now()}`,
    backup_id: backupId,
    target,
    status: 'pending',
    attempts: 0,
    created_at: new Date().toISOString()
  })
  
  await saveSyncQueue(queue)
}

/**
 * Remove item from sync queue
 */
export async function removeFromSyncQueue(itemId: string): Promise<void> {
  const queue = await getSyncQueue()
  const filtered = queue.filter(item => item.id !== itemId)
  await saveSyncQueue(filtered)
}

/**
 * Update sync queue item
 */
export async function updateSyncQueueItem(
  itemId: string,
  updates: Partial<MobileSyncQueueItem>
): Promise<void> {
  const queue = await getSyncQueue()
  const index = queue.findIndex(item => item.id === itemId)
  
  if (index !== -1) {
    queue[index] = { ...queue[index], ...updates }
    await saveSyncQueue(queue)
  }
}

/**
 * Get pending sync count
 */
export async function getPendingSyncCount(): Promise<number> {
  const queue = await getSyncQueue()
  return queue.filter(item => item.status === 'pending').length
}

// =====================================================
// SYNC OPERATIONS
// =====================================================

/**
 * Sync backup to server
 */
async function syncToServer(backupId: string, localPath: string): Promise<void> {
  // Read backup from device
  const backup = await readBackupFromDevice(localPath)
  
  // Upload to server
  const response = await fetch('/api/backup/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      backup_type: backup.backup_type,
      // Send the raw encrypted backup data
      encrypted_backup: backup
    })
  })
  
  if (!response.ok) {
    throw new Error('Failed to upload to server')
  }
}

/**
 * Process single sync queue item
 */
async function processQueueItem(item: MobileSyncQueueItem): Promise<boolean> {
  await updateSyncQueueItem(item.id, { status: 'syncing' })
  
  try {
    // Get local backup info
    const backups = await listDeviceBackups()
    const backup = backups.find(b => b.id === item.backup_id)
    
    if (!backup) {
      // Backup no longer exists, remove from queue
      await removeFromSyncQueue(item.id)
      return true
    }
    
    switch (item.target) {
      case 'server':
        await syncToServer(item.backup_id, backup.local_path)
        break
      
      case 'google':
        // Google sync handled by server after upload
        // For direct mobile-to-Google, we'd need Google Drive SDK
        throw new Error('Direct Google sync not implemented - sync to server first')
      
      case 'icloud':
        // iCloud sync requires native iOS implementation
        throw new Error('iCloud sync requires native implementation')
    }
    
    // Success - mark as completed
    await updateSyncQueueItem(item.id, { 
      status: 'completed',
      attempts: item.attempts + 1
    })
    
    // Remove completed items after a delay
    setTimeout(() => removeFromSyncQueue(item.id), 60000)
    
    return true
  } catch (error: any) {
    const attempts = item.attempts + 1
    
    if (attempts >= MAX_RETRY_ATTEMPTS) {
      // Max retries reached, mark as failed
      await updateSyncQueueItem(item.id, {
        status: 'failed',
        attempts,
        last_error: error.message
      })
    } else {
      // Schedule retry
      await updateSyncQueueItem(item.id, {
        status: 'pending',
        attempts,
        last_error: error.message
      })
    }
    
    return false
  }
}

/**
 * Process all pending items in sync queue
 */
export async function processSyncQueue(): Promise<{
  processed: number
  succeeded: number
  failed: number
}> {
  const stats = { processed: 0, succeeded: 0, failed: 0 }
  
  // Check if we should sync
  const canSync = await shouldSync()
  if (!canSync) {
    return stats
  }
  
  const queue = await getSyncQueue()
  const pending = queue.filter(item => item.status === 'pending')
  
  for (const item of pending) {
    stats.processed++
    
    const success = await processQueueItem(item)
    if (success) {
      stats.succeeded++
    } else {
      stats.failed++
    }
    
    // Small delay between items
    await new Promise(resolve => setTimeout(resolve, 1000))
  }
  
  return stats
}

// =====================================================
// BACKGROUND SYNC
// =====================================================

let syncInterval: NodeJS.Timeout | null = null

/**
 * Start background sync (call on app startup)
 */
export function startBackgroundSync(intervalMs: number = 60000): void {
  if (syncInterval) return
  
  // Initial sync
  processSyncQueue().catch(console.error)
  
  // Periodic sync
  syncInterval = setInterval(() => {
    processSyncQueue().catch(console.error)
  }, intervalMs)
}

/**
 * Stop background sync
 */
export function stopBackgroundSync(): void {
  if (syncInterval) {
    clearInterval(syncInterval)
    syncInterval = null
  }
}

/**
 * Listen for network changes
 */
export async function setupNetworkListener(): Promise<void> {
  if (!isMobileApp()) return
  
  const loaded = await loadCapacitorPlugins()
  if (!loaded) return
  
  Network.addListener('networkStatusChange', async (status: any) => {
    if (status.connected) {
      // Network became available, process queue
      const canSync = await shouldSync()
      if (canSync) {
        processSyncQueue().catch(console.error)
      }
    }
  })
}

// =====================================================
// SYNC STATUS
// =====================================================

/**
 * Get overall sync status
 */
export async function getSyncStatus(): Promise<{
  isOnline: boolean
  isOnWifi: boolean
  pendingCount: number
  lastSyncError?: string
}> {
  const online = await isOnline()
  const wifi = await isOnWifi()
  const queue = await getSyncQueue()
  
  const pending = queue.filter(item => item.status === 'pending')
  const failed = queue.filter(item => item.status === 'failed')
  
  return {
    isOnline: online,
    isOnWifi: wifi,
    pendingCount: pending.length,
    lastSyncError: failed[0]?.last_error
  }
}
