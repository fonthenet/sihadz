'use client'

/**
 * Mobile Backup Settings Component
 * Device storage, sync status, and cloud options for mobile
 */

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/hooks/use-toast'
import { 
  Smartphone, 
  Cloud, 
  Download, 
  Upload,
  RefreshCw, 
  Trash2, 
  Check, 
  X, 
  HardDrive,
  Wifi,
  WifiOff,
  Share2,
  AlertCircle,
  Clock,
  Shield,
  FileArchive
} from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/page-loading'
import { 
  isMobileApp, 
  getPlatform,
  listDeviceBackups, 
  getDeviceStorageUsed,
  getMobileBackupSettings,
  saveMobileBackupSettings,
  deleteBackupFromDevice,
  getBackupShareUri
} from '@/lib/backup/mobile-storage'
import {
  getSyncStatus,
  getSyncQueue,
  processSyncQueue,
  addToSyncQueue
} from '@/lib/backup/mobile-sync'
import { MobileBackupInfo, MobileBackupSettings as MobileSettings } from '@/lib/backup/types'
import { formatBytes } from '@/lib/backup/encryption'

interface MobileBackupSettingsProps {
  professionalId?: string
}

export function MobileBackupSettings({ professionalId }: MobileBackupSettingsProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  
  const [isNative, setIsNative] = useState(false)
  const [platform, setPlatform] = useState<'ios' | 'android' | 'web'>('web')
  const [backups, setBackups] = useState<MobileBackupInfo[]>([])
  const [storageUsed, setStorageUsed] = useState(0)
  const [settings, setSettings] = useState<MobileSettings>({
    auto_backup_enabled: true,
    auto_backup_frequency: 'daily',
    wifi_only_sync: true,
    max_local_backups: 7,
    max_local_storage_mb: 500
  })
  const [syncStatus, setSyncStatus] = useState({
    isOnline: true,
    isOnWifi: true,
    pendingCount: 0,
    lastSyncError: undefined as string | undefined
  })
  
  // Load data
  const loadData = useCallback(async () => {
    setIsNative(isMobileApp())
    setPlatform(getPlatform())
    
    if (isMobileApp()) {
      try {
        const [localBackups, used, savedSettings, status] = await Promise.all([
          listDeviceBackups(),
          getDeviceStorageUsed(),
          getMobileBackupSettings(),
          getSyncStatus()
        ])
        
        setBackups(localBackups)
        setStorageUsed(used)
        setSettings(savedSettings)
        setSyncStatus(status)
      } catch (error) {
        console.error('Failed to load mobile backup data:', error)
      }
    }
    
    setLoading(false)
  }, [])
  
  useEffect(() => {
    loadData()
  }, [loadData])
  
  // Save settings
  const handleSaveSettings = async () => {
    try {
      await saveMobileBackupSettings(settings)
      toast({
        title: 'Settings saved',
        description: 'Mobile backup settings have been updated.'
      })
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      })
    }
  }
  
  // Manual sync
  const handleSync = async () => {
    setSyncing(true)
    try {
      const result = await processSyncQueue()
      toast({
        title: 'Sync complete',
        description: `${result.succeeded} backups synced, ${result.failed} failed.`
      })
      await loadData()
    } catch (error: any) {
      toast({
        title: 'Sync failed',
        description: error.message,
        variant: 'destructive'
      })
    } finally {
      setSyncing(false)
    }
  }
  
  // Share backup
  const handleShare = async (backup: MobileBackupInfo) => {
    try {
      const uri = await getBackupShareUri(backup.local_path)
      
      // Use native share if available
      if (navigator.share) {
        await navigator.share({
          title: 'Backup File',
          text: `DZD Healthcare Backup - ${backup.filename}`,
          url: uri
        })
      } else {
        // Fallback: copy URI
        await navigator.clipboard.writeText(uri)
        toast({
          title: 'Path copied',
          description: 'Backup file path copied to clipboard.'
        })
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        toast({
          title: 'Share failed',
          description: error.message,
          variant: 'destructive'
        })
      }
    }
  }
  
  // Delete backup
  const handleDelete = async (backup: MobileBackupInfo) => {
    if (!confirm('Delete this backup from device?')) return
    
    try {
      await deleteBackupFromDevice(backup.local_path)
      toast({
        title: 'Deleted',
        description: 'Backup removed from device.'
      })
      await loadData()
    } catch (error: any) {
      toast({
        title: 'Delete failed',
        description: error.message,
        variant: 'destructive'
      })
    }
  }
  
  // Queue for sync
  const handleQueueSync = async (backup: MobileBackupInfo) => {
    try {
      await addToSyncQueue(backup.id, 'server')
      toast({
        title: 'Added to sync queue',
        description: 'Backup will be synced when online.'
      })
      await loadData()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      })
    }
  }
  
  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-DZ', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }
  
  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <LoadingSpinner size="lg" className="text-muted-foreground" />
      </div>
    )
  }
  
  if (!isNative) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Smartphone className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
          <p className="text-muted-foreground">
            Mobile backup features are only available in the mobile app.
          </p>
        </CardContent>
      </Card>
    )
  }
  
  const storagePercentage = (storageUsed / (settings.max_local_storage_mb * 1024 * 1024)) * 100
  
  return (
    <div className="space-y-4">
      {/* Device Storage */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Device Storage</CardTitle>
            <Badge variant="secondary" className="text-xs">
              {platform === 'ios' ? 'iOS' : 'Android'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Storage usage */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>{formatBytes(storageUsed)} used</span>
              <span>{settings.max_local_storage_mb} MB limit</span>
            </div>
            <Progress value={storagePercentage} className="h-2" />
          </div>
          
          {/* Network status */}
          <div className="flex items-center gap-4 text-sm">
            {syncStatus.isOnline ? (
              <div className="flex items-center gap-1 text-green-600">
                {syncStatus.isOnWifi ? <Wifi className="h-4 w-4" /> : <Cloud className="h-4 w-4" />}
                <span>{syncStatus.isOnWifi ? 'WiFi' : 'Mobile'}</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 text-muted-foreground">
                <WifiOff className="h-4 w-4" />
                <span>Offline</span>
              </div>
            )}
            
            {syncStatus.pendingCount > 0 && (
              <Badge variant="outline" className="text-xs">
                {syncStatus.pendingCount} pending sync
              </Badge>
            )}
          </div>
          
          {syncStatus.lastSyncError && (
            <div className="flex items-center gap-2 p-2 bg-red-50 dark:bg-red-950/20 rounded text-xs text-red-600">
              <AlertCircle className="h-3 w-3" />
              <span>{syncStatus.lastSyncError}</span>
            </div>
          )}
          
          <Separator />
          
          {/* Settings */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Auto backup</Label>
              <Switch
                checked={settings.auto_backup_enabled}
                onCheckedChange={(v) => setSettings({ ...settings, auto_backup_enabled: v })}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label className="text-sm">WiFi only sync</Label>
              <Switch
                checked={settings.wifi_only_sync}
                onCheckedChange={(v) => setSettings({ ...settings, wifi_only_sync: v })}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label className="text-sm">Keep backups</Label>
              <Select
                value={settings.max_local_backups.toString()}
                onValueChange={(v) => setSettings({ ...settings, max_local_backups: parseInt(v) })}
              >
                <SelectTrigger className="w-24 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">3</SelectItem>
                  <SelectItem value="5">5</SelectItem>
                  <SelectItem value="7">7</SelectItem>
                  <SelectItem value="14">14</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button size="sm" className="flex-1" onClick={handleSaveSettings}>
              <Check className="h-4 w-4 mr-1" />
              Save
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={handleSync}
              disabled={syncing || !syncStatus.isOnline}
            >
              {syncing ? (
                <LoadingSpinner size="sm" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {/* Local Backups */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HardDrive className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-base">Local Backups</CardTitle>
            </div>
            <Button variant="ghost" size="sm" onClick={loadData}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {backups.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <FileArchive className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No local backups</p>
            </div>
          ) : (
            <div className="space-y-2">
              {backups.map(backup => (
                <div 
                  key={backup.id}
                  className="flex items-center justify-between p-2 border rounded-lg"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <FileArchive className="h-6 w-6 text-primary/70 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{formatDate(backup.created_at)}</p>
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-muted-foreground">
                          {formatBytes(backup.file_size_bytes)}
                        </span>
                        {backup.is_synced_server ? (
                          <Badge variant="outline" className="text-xs px-1 py-0">
                            <Check className="h-2 w-2 mr-0.5 text-green-500" />
                            Synced
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs px-1 py-0 text-amber-600">
                            <Clock className="h-2 w-2 mr-0.5" />
                            Local
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    {!backup.is_synced_server && (
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8"
                        onClick={() => handleQueueSync(backup)}
                      >
                        <Upload className="h-4 w-4" />
                      </Button>
                    )}
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8"
                      onClick={() => handleShare(backup)}
                    >
                      <Share2 className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-red-500"
                      onClick={() => handleDelete(backup)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
