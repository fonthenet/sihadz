/**
 * Local PC Storage Service
 * Auto-save backups to user-selected local or network folder
 * Uses File System Access API (Chrome/Edge)
 * 
 * Note: This API requires user gesture to pick folder
 * Folder handle is stored in IndexedDB for persistence across sessions
 */

import { EncryptedBackup } from './types'

// =====================================================
// FEATURE DETECTION
// =====================================================

/**
 * Check if File System Access API is supported
 */
export function isLocalPCBackupSupported(): boolean {
  if (typeof window === 'undefined') return false
  return 'showDirectoryPicker' in window
}

/**
 * Get browser compatibility info
 */
export function getLocalPCBackupCompatibility(): {
  supported: boolean
  browser: string
  message: string
} {
  if (typeof window === 'undefined') {
    return {
      supported: false,
      browser: 'unknown',
      message: 'Server-side rendering'
    }
  }
  
  const ua = navigator.userAgent
  
  if ('showDirectoryPicker' in window) {
    return {
      supported: true,
      browser: ua.includes('Chrome') ? 'Chrome' : ua.includes('Edge') ? 'Edge' : 'Chromium',
      message: 'Local folder backup is fully supported'
    }
  }
  
  if (ua.includes('Firefox')) {
    return {
      supported: false,
      browser: 'Firefox',
      message: 'Firefox does not support folder access. Use manual download instead.'
    }
  }
  
  if (ua.includes('Safari')) {
    return {
      supported: false,
      browser: 'Safari',
      message: 'Safari does not support folder access. Use manual download instead.'
    }
  }
  
  return {
    supported: false,
    browser: 'Unknown',
    message: 'Your browser may not support local folder backup. Use manual download instead.'
  }
}

// =====================================================
// INDEXEDDB HANDLE STORAGE
// =====================================================

const DB_NAME = 'dzd-backup-storage'
const STORE_NAME = 'folder-handles'
const HANDLE_KEY = 'backup-folder-handle'

/**
 * Open IndexedDB
 */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)
    
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME)
      }
    }
  })
}

/**
 * Store folder handle in IndexedDB
 */
async function storeFolderHandle(handle: FileSystemDirectoryHandle): Promise<void> {
  const db = await openDB()
  
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const request = store.put(handle, HANDLE_KEY)
    
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve()
    
    tx.oncomplete = () => db.close()
  })
}

/**
 * Retrieve folder handle from IndexedDB
 */
async function retrieveFolderHandle(): Promise<FileSystemDirectoryHandle | null> {
  try {
    const db = await openDB()
    
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const store = tx.objectStore(STORE_NAME)
      const request = store.get(HANDLE_KEY)
      
      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result || null)
      
      tx.oncomplete = () => db.close()
    })
  } catch (e) {
    console.warn('Failed to retrieve folder handle:', e)
    return null
  }
}

/**
 * Clear stored folder handle
 */
async function clearFolderHandle(): Promise<void> {
  const db = await openDB()
  
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const request = store.delete(HANDLE_KEY)
    
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve()
    
    tx.oncomplete = () => db.close()
  })
}

// =====================================================
// FOLDER SELECTION
// =====================================================

/**
 * Prompt user to select a folder for backups
 * Returns the folder name for display
 */
export async function selectBackupFolder(): Promise<{
  success: boolean
  folderName?: string
  error?: string
}> {
  if (!isLocalPCBackupSupported()) {
    return {
      success: false,
      error: 'File System Access API not supported in this browser'
    }
  }
  
  try {
    // Show folder picker
    const handle = await (window as any).showDirectoryPicker({
      id: 'dzd-backup-folder',
      mode: 'readwrite',
      startIn: 'documents'
    })
    
    // Store handle for later use
    await storeFolderHandle(handle)
    
    return {
      success: true,
      folderName: handle.name
    }
  } catch (e: any) {
    if (e.name === 'AbortError') {
      return {
        success: false,
        error: 'Folder selection cancelled'
      }
    }
    return {
      success: false,
      error: e.message || 'Failed to select folder'
    }
  }
}

/**
 * Get currently configured backup folder
 */
export async function getConfiguredFolder(): Promise<{
  configured: boolean
  folderName?: string
  hasPermission?: boolean
}> {
  if (!isLocalPCBackupSupported()) {
    return { configured: false }
  }
  
  const handle = await retrieveFolderHandle()
  if (!handle) {
    return { configured: false }
  }
  
  // Check if we still have permission
  try {
    const permission = await handle.queryPermission({ mode: 'readwrite' })
    return {
      configured: true,
      folderName: handle.name,
      hasPermission: permission === 'granted'
    }
  } catch (e) {
    return {
      configured: true,
      folderName: handle.name,
      hasPermission: false
    }
  }
}

/**
 * Request permission for previously selected folder
 */
export async function requestFolderPermission(): Promise<boolean> {
  const handle = await retrieveFolderHandle()
  if (!handle) return false
  
  try {
    const permission = await handle.requestPermission({ mode: 'readwrite' })
    return permission === 'granted'
  } catch (e) {
    return false
  }
}

/**
 * Disconnect/remove configured folder
 */
export async function disconnectLocalFolder(): Promise<void> {
  await clearFolderHandle()
}

// =====================================================
// FILE OPERATIONS
// =====================================================

/**
 * Save backup to local folder
 */
export async function saveBackupToLocalFolder(
  backup: EncryptedBackup,
  filename: string
): Promise<{
  success: boolean
  path?: string
  error?: string
}> {
  if (!isLocalPCBackupSupported()) {
    return {
      success: false,
      error: 'File System Access API not supported'
    }
  }
  
  const handle = await retrieveFolderHandle()
  if (!handle) {
    return {
      success: false,
      error: 'No backup folder configured. Please select a folder first.'
    }
  }
  
  // Check permission
  const permission = await handle.queryPermission({ mode: 'readwrite' })
  if (permission !== 'granted') {
    // Try to request permission
    const requested = await handle.requestPermission({ mode: 'readwrite' })
    if (requested !== 'granted') {
      return {
        success: false,
        error: 'Permission to write to folder was denied'
      }
    }
  }
  
  try {
    // Create file
    const fileHandle = await handle.getFileHandle(filename, { create: true })
    const writable = await fileHandle.createWritable()
    
    // Write backup JSON
    const backupJson = JSON.stringify(backup, null, 2)
    await writable.write(backupJson)
    await writable.close()
    
    return {
      success: true,
      path: `${handle.name}/${filename}`
    }
  } catch (e: any) {
    return {
      success: false,
      error: e.message || 'Failed to save backup to folder'
    }
  }
}

/**
 * List backup files in local folder
 */
export async function listLocalBackups(): Promise<{
  files: Array<{ name: string; size: number; lastModified: Date }>
  error?: string
}> {
  if (!isLocalPCBackupSupported()) {
    return { files: [], error: 'Not supported' }
  }
  
  const handle = await retrieveFolderHandle()
  if (!handle) {
    return { files: [], error: 'No folder configured' }
  }
  
  // Check permission
  const permission = await handle.queryPermission({ mode: 'read' })
  if (permission !== 'granted') {
    return { files: [], error: 'Permission denied' }
  }
  
  try {
    const files: Array<{ name: string; size: number; lastModified: Date }> = []
    
    for await (const entry of handle.values()) {
      if (entry.kind === 'file' && entry.name.endsWith('.dzdbackup')) {
        const file = await entry.getFile()
        files.push({
          name: entry.name,
          size: file.size,
          lastModified: new Date(file.lastModified)
        })
      }
    }
    
    // Sort by date, newest first
    files.sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime())
    
    return { files }
  } catch (e: any) {
    return { files: [], error: e.message }
  }
}

/**
 * Read backup from local folder
 */
export async function readBackupFromLocalFolder(filename: string): Promise<{
  backup?: EncryptedBackup
  error?: string
}> {
  if (!isLocalPCBackupSupported()) {
    return { error: 'Not supported' }
  }
  
  const handle = await retrieveFolderHandle()
  if (!handle) {
    return { error: 'No folder configured' }
  }
  
  try {
    const fileHandle = await handle.getFileHandle(filename)
    const file = await fileHandle.getFile()
    const text = await file.text()
    const backup = JSON.parse(text) as EncryptedBackup
    
    return { backup }
  } catch (e: any) {
    return { error: e.message || 'Failed to read backup' }
  }
}

/**
 * Delete backup from local folder
 */
export async function deleteBackupFromLocalFolder(filename: string): Promise<{
  success: boolean
  error?: string
}> {
  if (!isLocalPCBackupSupported()) {
    return { success: false, error: 'Not supported' }
  }
  
  const handle = await retrieveFolderHandle()
  if (!handle) {
    return { success: false, error: 'No folder configured' }
  }
  
  try {
    await handle.removeEntry(filename)
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

// =====================================================
// MANUAL DOWNLOAD FALLBACK
// =====================================================

/**
 * Trigger browser download of backup file
 * Works in all browsers as fallback
 */
export function downloadBackupFile(
  backup: EncryptedBackup,
  filename: string
): void {
  const backupJson = JSON.stringify(backup, null, 2)
  const blob = new Blob([backupJson], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  
  URL.revokeObjectURL(url)
}

/**
 * Import backup from file input
 */
export async function importBackupFromFile(file: File): Promise<{
  backup?: EncryptedBackup
  error?: string
}> {
  try {
    const text = await file.text()
    const backup = JSON.parse(text) as EncryptedBackup
    
    // Validate it's a valid backup
    if (backup.platform !== 'dzd-healthcare' || !backup.encrypted_data) {
      return { error: 'Invalid backup file format' }
    }
    
    return { backup }
  } catch (e: any) {
    return { error: e.message || 'Failed to read backup file' }
  }
}
