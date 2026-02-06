/**
 * Backup Module - Main Export
 * Server-first encrypted backups with optional cloud sync
 */

// Types
export * from './types'

// Encryption
export { 
  encryptBackup, 
  decryptBackup, 
  createEncryptedBackup,
  encryptToken,
  decryptToken,
  generateMasterKey,
  validateBackupFormat,
  estimateBackupSize as estimateEncryptedSize,
  formatBytes
} from './encryption'

// Storage (Primary)
export {
  saveBackupToStorage,
  downloadBackupFromStorage,
  deleteBackupFromStorage,
  getBackupDownloadUrl,
  listStorageBackups,
  getStorageUsage,
  createBackupRecord,
  updateBackupRecord,
  getBackupById,
  listBackups,
  deleteBackup,
  getBackupCount,
  getBackupSchedule,
  upsertBackupSchedule,
  getGoogleConnection,
  saveGoogleConnection,
  deleteGoogleConnection,
  generateBackupFilename,
  calculateExpiryDate,
  ensureStorageBucket
} from './storage'

// Exporter
export {
  exportBackupData,
  importBackupData,
  estimateBackupSize,
  getBackupDataSummary
} from './exporter'

// Google Drive (Optional)
export {
  isGoogleDriveConfigured,
  getGoogleAuthUrl,
  exchangeCodeForTokens,
  getGoogleUserEmail,
  connectGoogleDrive,
  disconnectGoogleDrive,
  uploadToGoogleDrive,
  syncBackupToGoogleDrive,
  downloadFromGoogleDrive,
  listGoogleDriveBackups,
  deleteFromGoogleDrive,
  getGoogleDriveUsage
} from './google-drive'

// Scheduler
export {
  getDueSchedules,
  updateScheduleAfterRun,
  calculateNextRun,
  createBackupJob,
  getPendingJobs,
  startJob,
  completeJob,
  failJob,
  cancelJob,
  cleanupOldJobs,
  processScheduledBackups
} from './scheduler'

// Mobile Storage (Capacitor)
export {
  isMobileApp,
  getPlatform,
  saveBackupToDevice,
  readBackupFromDevice,
  deleteBackupFromDevice,
  listDeviceBackups,
  getDeviceStorageUsed,
  cleanupOldBackups,
  getMobileBackupSettings,
  saveMobileBackupSettings,
  getBackupShareUri,
  importBackupFromUri,
  getDeviceId,
  getAvailableStorage
} from './mobile-storage'

// Mobile Sync
export {
  isOnline,
  isOnWifi,
  shouldSync,
  getSyncQueue,
  addToSyncQueue,
  removeFromSyncQueue,
  updateSyncQueueItem,
  getPendingSyncCount,
  processSyncQueue,
  startBackgroundSync,
  stopBackgroundSync,
  setupNetworkListener,
  getSyncStatus
} from './mobile-sync'

// Local PC Storage (File System Access API)
export {
  isLocalPCBackupSupported,
  getLocalPCBackupCompatibility,
  selectBackupFolder,
  getConfiguredFolder,
  requestFolderPermission,
  disconnectLocalFolder,
  saveBackupToLocalFolder,
  listLocalBackups,
  readBackupFromLocalFolder,
  deleteBackupFromLocalFolder,
  downloadBackupFile,
  importBackupFromFile
} from './local-pc-storage'
