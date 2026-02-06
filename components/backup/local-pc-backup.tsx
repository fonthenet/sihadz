'use client'

/**
 * Local PC Backup Component
 * Auto-save to user-selected local or network folder
 */

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { 
  HardDrive, 
  FolderOpen, 
  Check, 
  X, 
  AlertCircle,
  RefreshCw,
  Download,
  Trash2,
  FileArchive,
  Network
} from 'lucide-react'
import {
  isLocalPCBackupSupported,
  getLocalPCBackupCompatibility,
  selectBackupFolder,
  getConfiguredFolder,
  requestFolderPermission,
  disconnectLocalFolder,
  listLocalBackups,
  deleteBackupFromLocalFolder,
  downloadBackupFile
} from '@/lib/backup/local-pc-storage'
import { formatBytes } from '@/lib/backup/encryption'
import { LoadingSpinner } from '@/components/ui/page-loading'

interface LocalPCBackupProps {
  autoSaveEnabled: boolean
  onAutoSaveChange: (enabled: boolean) => void
  onManualSaveToFolder?: () => Promise<void>
  manualSaveLoading?: boolean
}

export function LocalPCBackup({ 
  autoSaveEnabled, 
  onAutoSaveChange, 
  onManualSaveToFolder,
  manualSaveLoading = false 
}: LocalPCBackupProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [selecting, setSelecting] = useState(false)
  
  const [isSupported, setIsSupported] = useState(false)
  const [compatibility, setCompatibility] = useState<ReturnType<typeof getLocalPCBackupCompatibility> | null>(null)
  const [folderConfig, setFolderConfig] = useState<{
    configured: boolean
    folderName?: string
    hasPermission?: boolean
  }>({ configured: false })
  const [localFiles, setLocalFiles] = useState<Array<{ name: string; size: number; lastModified: Date }>>([])
  
  // Load configuration
  const loadConfig = useCallback(async () => {
    setIsSupported(isLocalPCBackupSupported())
    setCompatibility(getLocalPCBackupCompatibility())
    
    if (isLocalPCBackupSupported()) {
      const config = await getConfiguredFolder()
      setFolderConfig(config)
      
      if (config.configured && config.hasPermission) {
        const { files } = await listLocalBackups()
        setLocalFiles(files)
      }
    }
    
    setLoading(false)
  }, [])
  
  useEffect(() => {
    loadConfig()
  }, [loadConfig])
  
  // Select folder
  const handleSelectFolder = async () => {
    setSelecting(true)
    try {
      const result = await selectBackupFolder()
      
      if (result.success) {
        toast({
          title: 'Folder selected',
          description: `Backups will be saved to "${result.folderName}"`
        })
        await loadConfig()
      } else if (result.error !== 'Folder selection cancelled') {
        toast({
          title: 'Error',
          description: result.error,
          variant: 'destructive'
        })
      }
    } finally {
      setSelecting(false)
    }
  }
  
  // Request permission (must be called from user gesture - e.g. button click)
  const handleRequestPermission = async () => {
    const granted = await requestFolderPermission()
    if (granted) {
      toast({
        title: 'Permission granted',
        description: 'You can now save backups to this folder.'
      })
      await loadConfig()
    } else {
      toast({
        title: 'Permission denied',
        description: 'Please grant permission to save backups.',
        variant: 'destructive'
      })
    }
  }
  
  // Manual save - request permission first (while we have user gesture), then trigger backup
  const handleManualSave = async () => {
    if (!folderConfig.configured) {
      toast({
        title: 'Select a folder first',
        description: 'Choose a folder to save backups to.',
        variant: 'destructive'
      })
      return
    }
    // Request permission immediately (user gesture required by browser)
    if (!folderConfig.hasPermission) {
      const granted = await requestFolderPermission()
      if (!granted) {
        toast({
          title: 'Permission required',
          description: 'Grant access to save backups to this folder.',
          variant: 'destructive'
        })
        return
      }
      await loadConfig()
    }
    await onManualSaveToFolder?.()
  }
  
  // Disconnect folder
  const handleDisconnect = async () => {
    if (!confirm('Stop saving backups to this folder?')) return
    
    await disconnectLocalFolder()
    onAutoSaveChange(false)
    toast({
      title: 'Folder disconnected',
      description: 'Backups will no longer be saved locally.'
    })
    await loadConfig()
  }
  
  // Delete local file
  const handleDeleteFile = async (filename: string) => {
    if (!confirm('Delete this backup from your computer?')) return
    
    const result = await deleteBackupFromLocalFolder(filename)
    if (result.success) {
      toast({ title: 'Deleted', description: 'Backup removed from folder.' })
      await loadConfig()
    } else {
      toast({
        title: 'Error',
        description: result.error,
        variant: 'destructive'
      })
    }
  }
  
  // Format date
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('fr-DZ', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }
  
  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center justify-center">
          <LoadingSpinner size="lg" className="text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }
  
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2 flex-wrap">
          <HardDrive className="h-5 w-5 text-orange-500" />
          <CardTitle>Local PC / Network Drive</CardTitle>
          <Badge variant="outline">Auto-save</Badge>
          <Badge variant="secondary">Manual</Badge>
        </div>
        <CardDescription>
          Save encrypted backups to a folder on your computer or network drive. Use auto-save or manual backup.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isSupported ? (
          // Browser not supported
          <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-950/20 rounded-lg">
            <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
            <div>
              <p className="font-medium text-amber-700 dark:text-amber-400">
                {compatibility?.browser} - Limited Support
              </p>
              <p className="text-sm text-amber-600 dark:text-amber-500 mt-1">
                {compatibility?.message}
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                You can still manually download backups using the download button in backup history.
              </p>
            </div>
          </div>
        ) : !folderConfig.configured ? (
          // No folder configured
          <div className="text-center py-6">
            <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground mb-4">
              Select a folder on your PC or network drive to auto-save backups
            </p>
            <Button onClick={handleSelectFolder} disabled={selecting}>
              {selecting ? (
                <LoadingSpinner size="sm" className="mr-2" />
              ) : (
                <FolderOpen className="h-4 w-4 mr-2" />
              )}
              Select Folder
            </Button>
          </div>
        ) : (
          // Folder configured
          <>
            {/* Folder status */}
            <div className={`flex items-center justify-between p-3 rounded-lg ${
              folderConfig.hasPermission 
                ? 'bg-green-50 dark:bg-green-950/20' 
                : 'bg-amber-50 dark:bg-amber-950/20'
            }`}>
              <div className="flex items-center gap-2">
                {folderConfig.hasPermission ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                )}
                <div>
                  <span className={`text-sm font-medium ${
                    folderConfig.hasPermission 
                      ? 'text-green-700 dark:text-green-400' 
                      : 'text-amber-700 dark:text-amber-400'
                  }`}>
                    {folderConfig.folderName}
                  </span>
                  {!folderConfig.hasPermission && (
                    <p className="text-xs text-amber-600">
                      Permission required — browsers may revoke access after closing the tab. Click Grant Access when needed.
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {!folderConfig.hasPermission && (
                  <Button variant="outline" size="sm" onClick={handleRequestPermission}>
                    Grant Access
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={handleSelectFolder} disabled={selecting}>
                  Change
                </Button>
                <Button variant="ghost" size="sm" onClick={handleDisconnect}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            {/* Auto-save and Manual backup */}
            <div className="space-y-4">
              {folderConfig.hasPermission && (
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Auto-save to this folder</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically save a copy when you click Backup Now
                    </p>
                  </div>
                  <Switch
                    checked={autoSaveEnabled}
                    onCheckedChange={onAutoSaveChange}
                  />
                </div>
              )}
              <div className={`flex items-center justify-between ${folderConfig.hasPermission ? 'border-t pt-4' : ''}`}>
                <div className="space-y-0.5">
                  <Label>Manual backup</Label>
                  <p className="text-sm text-muted-foreground">
                    {folderConfig.hasPermission
                      ? 'Save a backup to this folder right now'
                      : 'Request permission and save a backup now (grants access)'}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleManualSave}
                  disabled={manualSaveLoading || !onManualSaveToFolder}
                >
                  {manualSaveLoading ? (
                    <LoadingSpinner size="sm" />
                  ) : (
                    <Download className="h-4 w-4 mr-2" />
                  )}
                  Save to folder now
                </Button>
              </div>
            </div>
            
            {/* Local files */}
            {folderConfig.hasPermission && localFiles.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm text-muted-foreground">
                    Files in folder ({localFiles.length})
                  </Label>
                  <Button variant="ghost" size="sm" onClick={loadConfig}>
                    <RefreshCw className="h-3 w-3" />
                  </Button>
                </div>
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {localFiles.map(file => (
                    <div 
                      key={file.name}
                      className="flex items-center justify-between p-2 border rounded text-sm"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <FileArchive className="h-4 w-4 text-primary/70 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="truncate text-xs font-medium">{file.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(file.lastModified)} • {formatBytes(file.size)}
                          </p>
                        </div>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-7 w-7 text-red-500"
                        onClick={() => handleDeleteFile(file.name)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
        
        {/* Network drive tip */}
        <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg text-xs text-muted-foreground">
          <Network className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <div>
            <span className="font-medium">Tip:</span> To backup to a network drive, 
            select a mapped network folder (like Z:\Backups) or navigate to a shared folder.
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
