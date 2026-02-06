'use client'

/**
 * Backup Settings Component
 * Main backup configuration panel for professionals
 */

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/hooks/use-toast'
import { 
  Database, 
  Cloud, 
  Download, 
  RefreshCw, 
  Trash2, 
  Check, 
  X, 
  HardDrive,
  ExternalLink,
  AlertCircle,
  Clock,
  Shield
} from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/page-loading'
import { BackupHistory } from './backup-history'
import { LocalPCBackup } from './local-pc-backup'
import { SCHEDULE_OPTIONS, RETENTION_OPTIONS, BackupFile, BackupSchedule } from '@/lib/backup/types'
import { formatBytes } from '@/lib/backup/encryption'
import { isLocalPCBackupSupported, saveBackupToLocalFolder } from '@/lib/backup/local-pc-storage'

interface BackupSettingsProps {
  professionalId?: string
}

interface BackupSettingsData {
  schedule: BackupSchedule | null
  google_connected: boolean
  google_email?: string
  google_drive_available: boolean
  storage_used_bytes: number
  backup_count: number
}

export function BackupSettings({ professionalId }: BackupSettingsProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [backingUp, setBackingUp] = useState(false)
  const [connectingGoogle, setConnectingGoogle] = useState(false)
  
  const [settings, setSettings] = useState<BackupSettingsData | null>(null)
  const [backups, setBackups] = useState<BackupFile[]>([])
  
  // Form state
  const [scheduleEnabled, setScheduleEnabled] = useState(true)
  const [selectedSchedule, setSelectedSchedule] = useState('0 2 * * *')
  const [retentionDays, setRetentionDays] = useState(30)
  const [autoSyncGoogle, setAutoSyncGoogle] = useState(false)
  const [autoSaveLocalPC, setAutoSaveLocalPC] = useState(false)
  const [manualLocalSaveLoading, setManualLocalSaveLoading] = useState(false)
  
  // Handle OAuth callback params (success/error from Google redirect)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const success = params.get('backup_success')
    const error = params.get('backup_error')
    if (success === 'google_connected') {
      toast({ title: 'Google Drive connected', description: 'Your backups can now sync to Google Drive.' })
      window.history.replaceState({}, '', window.location.pathname)
    }
    if (error) {
      toast({ title: 'Google Drive connection failed', description: decodeURIComponent(error), variant: 'destructive' })
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [toast])
  
  // Load settings
  const loadSettings = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (professionalId) params.set('professional_id', professionalId)
      
      const res = await fetch(`/api/backup/settings?${params}`)
      if (!res.ok) throw new Error('Failed to load settings')
      
      const data: BackupSettingsData = await res.json()
      setSettings(data)
      
      // Update form state
      if (data.schedule) {
        setScheduleEnabled(data.schedule.is_enabled)
        setSelectedSchedule(data.schedule.schedule)
        setRetentionDays(data.schedule.retention_days)
        setAutoSyncGoogle(data.schedule.auto_sync_google)
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }, [professionalId, toast])
  
  // Load backups
  const loadBackups = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (professionalId) params.set('professional_id', professionalId)
      params.set('limit', '10')
      
      const res = await fetch(`/api/backup/list?${params}`)
      if (!res.ok) throw new Error('Failed to load backups')
      
      const data = await res.json()
      setBackups(data.backups)
    } catch (error) {
      console.error('Failed to load backups:', error)
    }
  }, [professionalId])
  
  useEffect(() => {
    loadSettings()
    loadBackups()
  }, [loadSettings, loadBackups])
  
  // Save settings
  const saveSettings = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/backup/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          professional_id: professionalId,
          is_enabled: scheduleEnabled,
          schedule: selectedSchedule,
          retention_days: retentionDays,
          auto_sync_google: autoSyncGoogle
        })
      })
      
      if (!res.ok) throw new Error('Failed to save settings')
      
      toast({
        title: 'Settings saved',
        description: 'Backup settings have been updated.'
      })
      
      await loadSettings()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      })
    } finally {
      setSaving(false)
    }
  }
  
  // Create backup now
  const createBackup = async () => {
    setBackingUp(true)
    try {
      const res = await fetch('/api/backup/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          backup_type: 'full',
          professional_id: professionalId,
          sync_to_google: autoSyncGoogle && settings?.google_connected,
          return_backup_data: autoSaveLocalPC // Request backup data for local save
        })
      })
      
      if (!res.ok) throw new Error('Failed to create backup')
      
      const result = await res.json()
      
      // Also save to local PC if enabled
      if (autoSaveLocalPC && isLocalPCBackupSupported() && result.encrypted_backup) {
        const localResult = await saveBackupToLocalFolder(
          result.encrypted_backup,
          result.backup?.filename || `backup-${Date.now()}.dzdbackup`
        )
        
        if (localResult.success) {
          toast({
            title: 'Backup complete',
            description: `Saved to server and local folder: ${localResult.path}`
          })
        } else {
          toast({
            title: 'Backup complete (server only)',
            description: `Server backup succeeded. Local save failed: ${localResult.error}`
          })
        }
      } else {
        toast({
          title: 'Backup complete',
          description: 'Your data has been backed up successfully.'
        })
      }
      
      await loadBackups()
      await loadSettings()
    } catch (error: any) {
      toast({
        title: 'Backup failed',
        description: error.message,
        variant: 'destructive'
      })
    } finally {
      setBackingUp(false)
    }
  }
  
  // Manual save to local folder (called from LocalPCBackup with permission already requested)
  const handleManualSaveToFolder = async () => {
    setManualLocalSaveLoading(true)
    try {
      const res = await fetch('/api/backup/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          backup_type: 'full',
          professional_id: professionalId,
          sync_to_google: false,
          return_backup_data: true
        })
      })
      if (!res.ok) throw new Error('Failed to create backup')
      const result = await res.json()
      
      if (!result.encrypted_backup) throw new Error('No backup data received')
      
      const localResult = await saveBackupToLocalFolder(
        result.encrypted_backup,
        result.backup?.filename || `backup-${Date.now()}.dzdbackup`
      )
      
      if (localResult.success) {
        toast({
          title: 'Saved to folder',
          description: `Backup saved to ${localResult.path}`
        })
        await loadBackups()
      } else {
        toast({
          title: 'Save failed',
          description: localResult.error,
          variant: 'destructive'
        })
      }
    } catch (error: any) {
      toast({
        title: 'Backup failed',
        description: error.message,
        variant: 'destructive'
      })
    } finally {
      setManualLocalSaveLoading(false)
    }
  }
  
  // Connect Google Drive
  const connectGoogle = async () => {
    setConnectingGoogle(true)
    try {
      const res = await fetch('/api/backup/connect-google')
      if (!res.ok) throw new Error('Failed to start Google connection')
      
      const data = await res.json()
      
      // Open OAuth popup or redirect
      window.location.href = data.auth_url
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      })
      setConnectingGoogle(false)
    }
  }
  
  // Disconnect Google Drive
  const disconnectGoogle = async () => {
    if (!confirm('Are you sure you want to disconnect Google Drive?')) return
    
    try {
      const res = await fetch('/api/backup/disconnect-google', { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to disconnect')
      
      toast({
        title: 'Disconnected',
        description: 'Google Drive has been disconnected.'
      })
      
      await loadSettings()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      })
    }
  }
  
  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <LoadingSpinner size="lg" className="text-muted-foreground" />
      </div>
    )
  }
  
  return (
    <div className="space-y-6">
      {/* Server Backups (Primary) */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <HardDrive className="h-5 w-5 text-primary" />
            <CardTitle>Server Backups</CardTitle>
            <Badge variant="secondary">Primary</Badge>
          </div>
          <CardDescription>
            Your data is automatically backed up to our secure servers with AES-256 encryption.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold">{settings?.backup_count || 0}</div>
              <div className="text-xs text-muted-foreground">Total Backups</div>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold">{formatBytes(settings?.storage_used_bytes || 0)}</div>
              <div className="text-xs text-muted-foreground">Storage Used</div>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold">{retentionDays}d</div>
              <div className="text-xs text-muted-foreground">Retention</div>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-center gap-1">
                <Shield className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium text-green-600">Encrypted</span>
              </div>
              <div className="text-xs text-muted-foreground">AES-256-GCM</div>
            </div>
          </div>
          
          <Separator />
          
          {/* Schedule Settings */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Automatic Backups</Label>
                <p className="text-sm text-muted-foreground">
                  Schedule automatic backups of your data
                </p>
              </div>
              <Switch
                checked={scheduleEnabled}
                onCheckedChange={setScheduleEnabled}
              />
            </div>
            
            {scheduleEnabled && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-4 border-l-2 border-primary/20">
                <div className="space-y-2">
                  <Label>Schedule</Label>
                  <Select value={selectedSchedule} onValueChange={setSelectedSchedule}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SCHEDULE_OPTIONS.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Keep backups for</Label>
                  <Select 
                    value={retentionDays.toString()} 
                    onValueChange={(v) => setRetentionDays(parseInt(v))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {RETENTION_OPTIONS.map(option => (
                        <SelectItem key={option.value} value={option.value.toString()}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>
          
          <Separator />
          
          {/* Actions */}
          <div className="flex flex-wrap gap-3">
            <Button onClick={createBackup} disabled={backingUp}>
              {backingUp ? (
                <LoadingSpinner size="sm" className="mr-2" />
              ) : (
                <Database className="h-4 w-4 mr-2" />
              )}
              Backup Now
            </Button>
            <Button variant="outline" onClick={saveSettings} disabled={saving}>
              {saving ? (
                <LoadingSpinner size="sm" className="mr-2" />
              ) : (
                <Check className="h-4 w-4 mr-2" />
              )}
              Save Settings
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {/* Google Drive Sync (Optional) */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Cloud className="h-5 w-5 text-blue-500" />
            <CardTitle>Google Drive Sync</CardTitle>
            <Badge variant="outline">Optional</Badge>
          </div>
          <CardDescription>
            Sync backups to your Google Drive for additional redundancy.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!settings?.google_drive_available ? (
            <div className="space-y-2 p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg">
              <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span className="text-sm font-medium">Google Drive is not configured</span>
              </div>
              <p className="text-sm text-amber-600 dark:text-amber-500 pl-6">
                Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to enable. See docs/BACKUP_SETUP.md for setup.
              </p>
            </div>
          ) : settings?.google_connected ? (
            <>
              <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium text-green-700 dark:text-green-400">
                    Connected to {settings.google_email}
                  </span>
                </div>
                <Button variant="ghost" size="sm" onClick={disconnectGoogle}>
                  <X className="h-4 w-4 mr-1" />
                  Disconnect
                </Button>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Auto-sync to Google Drive</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically copy backups to Google Drive
                  </p>
                </div>
                <Switch
                  checked={autoSyncGoogle}
                  onCheckedChange={setAutoSyncGoogle}
                />
              </div>
            </>
          ) : (
            <div className="text-center py-4">
              <Cloud className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground mb-4">
                Connect your Google Drive for offsite backup redundancy
              </p>
              <Button onClick={connectGoogle} disabled={connectingGoogle}>
                {connectingGoogle ? (
                  <LoadingSpinner size="sm" className="mr-2" />
                ) : (
                  <ExternalLink className="h-4 w-4 mr-2" />
                )}
                Connect Google Drive
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Local PC / Network Drive (Optional) */}
      <LocalPCBackup 
        autoSaveEnabled={autoSaveLocalPC}
        onAutoSaveChange={setAutoSaveLocalPC}
        onManualSaveToFolder={handleManualSaveToFolder}
        manualSaveLoading={manualLocalSaveLoading}
      />
      
      {/* Backup History */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <CardTitle>Backup History</CardTitle>
            </div>
            <Button variant="ghost" size="sm" onClick={loadBackups}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <BackupHistory 
            backups={backups} 
            onRefresh={loadBackups}
            googleConnected={settings?.google_connected || false}
          />
        </CardContent>
      </Card>
    </div>
  )
}
