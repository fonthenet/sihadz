'use client'

/**
 * Backup History Component
 * List of backups with actions
 */

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { 
  Download, 
  Cloud, 
  Trash2, 
  FileArchive,
  Check,
  X,
  Pin,
  MoreVertical
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { BackupFile } from '@/lib/backup/types'
import { formatBytes } from '@/lib/backup/encryption'
import { LoadingSpinner } from '@/components/ui/page-loading'

interface BackupHistoryProps {
  backups: BackupFile[]
  onRefresh: () => void
  googleConnected: boolean
}

export function BackupHistory({ backups, onRefresh, googleConnected }: BackupHistoryProps) {
  const { toast } = useToast()
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [actionType, setActionType] = useState<'download' | 'sync' | 'delete' | null>(null)
  
  // Download backup
  const downloadBackup = async (backup: BackupFile) => {
    setLoadingId(backup.id)
    setActionType('download')
    try {
      const res = await fetch(`/api/backup/${backup.id}`)
      if (!res.ok) throw new Error('Failed to get download URL')
      
      const data = await res.json()
      
      // Open download URL
      window.open(data.download_url, '_blank')
      
      toast({
        title: 'Download started',
        description: 'Your backup file is being downloaded.'
      })
    } catch (error: any) {
      toast({
        title: 'Download failed',
        description: error.message,
        variant: 'destructive'
      })
    } finally {
      setLoadingId(null)
      setActionType(null)
    }
  }
  
  // Sync to Google Drive
  const syncToGoogle = async (backup: BackupFile) => {
    if (!googleConnected) {
      toast({
        title: 'Google Drive not connected',
        description: 'Please connect Google Drive first.',
        variant: 'destructive'
      })
      return
    }
    
    if (backup.google_file_id) {
      toast({
        title: 'Already synced',
        description: 'This backup is already synced to Google Drive.'
      })
      return
    }
    
    setLoadingId(backup.id)
    setActionType('sync')
    try {
      const res = await fetch(`/api/backup/sync-google/${backup.id}`, {
        method: 'POST'
      })
      if (!res.ok) throw new Error('Failed to sync to Google Drive')
      
      toast({
        title: 'Synced to Google Drive',
        description: 'Backup has been copied to your Google Drive.'
      })
      
      onRefresh()
    } catch (error: any) {
      toast({
        title: 'Sync failed',
        description: error.message,
        variant: 'destructive'
      })
    } finally {
      setLoadingId(null)
      setActionType(null)
    }
  }
  
  // Delete backup
  const deleteBackup = async (backup: BackupFile) => {
    if (!confirm('Are you sure you want to delete this backup? This cannot be undone.')) {
      return
    }
    
    setLoadingId(backup.id)
    setActionType('delete')
    try {
      const res = await fetch(`/api/backup/${backup.id}`, {
        method: 'DELETE'
      })
      if (!res.ok) throw new Error('Failed to delete backup')
      
      toast({
        title: 'Backup deleted',
        description: 'The backup has been permanently deleted.'
      })
      
      onRefresh()
    } catch (error: any) {
      toast({
        title: 'Delete failed',
        description: error.message,
        variant: 'destructive'
      })
    } finally {
      setLoadingId(null)
      setActionType(null)
    }
  }
  
  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-DZ', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }
  
  if (backups.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <FileArchive className="h-12 w-12 mx-auto mb-3 opacity-50" />
        <p>No backups yet</p>
        <p className="text-sm">Create your first backup to get started</p>
      </div>
    )
  }
  
  return (
    <div className="space-y-2">
      {backups.map(backup => {
        const isLoading = loadingId === backup.id
        
        return (
          <div 
            key={backup.id}
            className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <FileArchive className="h-8 w-8 text-primary/70" />
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{backup.filename}</span>
                  {backup.is_pinned && (
                    <Pin className="h-3 w-3 text-amber-500" />
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{formatDate(backup.created_at)}</span>
                  <span>•</span>
                  <span>{formatBytes(backup.file_size_bytes || 0)}</span>
                </div>
                <div className="flex items-center gap-1 mt-1">
                  <Badge variant="outline" className="text-xs px-1.5 py-0">
                    <Check className="h-2.5 w-2.5 mr-0.5 text-green-500" />
                    Server
                  </Badge>
                  {backup.google_file_id ? (
                    <Badge variant="outline" className="text-xs px-1.5 py-0">
                      <Check className="h-2.5 w-2.5 mr-0.5 text-blue-500" />
                      Google
                    </Badge>
                  ) : googleConnected ? (
                    <Badge variant="outline" className="text-xs px-1.5 py-0 text-muted-foreground">
                      <X className="h-2.5 w-2.5 mr-0.5" />
                      Google
                    </Badge>
                  ) : null}
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-1">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => downloadBackup(backup)}
                disabled={isLoading}
                title="Download"
              >
                {isLoading && actionType === 'download' ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
              </Button>
              
              {googleConnected && !backup.google_file_id && (
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => syncToGoogle(backup)}
                  disabled={isLoading}
                  title="Sync to Google Drive"
                >
                  {isLoading && actionType === 'sync' ? (
                    <LoadingSpinner size="sm" />
                  ) : (
                    <Cloud className="h-4 w-4" />
                  )}
                </Button>
              )}
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => downloadBackup(backup)}>
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </DropdownMenuItem>
                  {googleConnected && !backup.google_file_id && (
                    <DropdownMenuItem onClick={() => syncToGoogle(backup)}>
                      <Cloud className="h-4 w-4 mr-2" />
                      Sync to Google Drive
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={() => deleteBackup(backup)}
                    className="text-red-600"
                    disabled={backup.is_pinned}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        )
      })}
    </div>
  )
}
