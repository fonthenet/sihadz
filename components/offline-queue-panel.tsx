'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  CloudOff,
  Cloud,
  RefreshCw,
  CheckCircle2,
  Clock,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  HardDrive,
} from 'lucide-react'
import type { QueuedAction, QueueItemStatus, RecentSyncedItem } from '@/lib/offline-sync'

interface OfflineQueuePanelProps {
  userId: string | null
  online: boolean
  queue: QueuedAction[]
  recent: RecentSyncedItem[]
  syncing: boolean
  onRefresh: () => void
  onSyncNow: () => void
  className?: string
}

function StatusBadge({ status }: { status: QueueItemStatus }) {
  const config = {
    pending: { icon: Clock, label: 'Pending', className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200' },
    syncing: { icon: RefreshCw, label: 'Syncing', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200' },
    succeeded: { icon: CheckCircle2, label: 'Synced', className: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200' },
    failed: { icon: AlertCircle, label: 'Failed', className: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200' },
  }
  const c = config[status] || config.pending
  const Icon = c.icon
  return (
    <Badge variant="secondary" className={cn('gap-1 text-xs', c.className)}>
      <Icon className={cn('h-3 w-3', status === 'syncing' && 'animate-spin')} />
      {c.label}
    </Badge>
  )
}

function formatTime(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  if (diff < 60000) return 'Just now'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
  return d.toLocaleDateString()
}

export function OfflineQueuePanel({
  userId,
  online,
  queue,
  recent,
  syncing,
  onRefresh,
  onSyncNow,
  className,
}: OfflineQueuePanelProps) {
  const [open, setOpen] = useState(true)
  const pending = queue.filter((q) => q.status === 'pending' || q.status === 'failed')
  const hasActivity = pending.length > 0 || recent.length > 0 || !online

  if (!userId) return null
  if (!hasActivity && online) return null

  return (
    <Card className={cn('border-slate-200 dark:border-slate-800', className)}>
      <Collapsible open={open} onOpenChange={setOpen}>
        <CardHeader className="py-3 pe-4">
          <CollapsibleTrigger asChild>
            <div className="flex cursor-pointer items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {online ? (
                  <Cloud className="h-5 w-5 text-green-600 dark:text-green-400" />
                ) : (
                  <CloudOff className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                )}
                <CardTitle className="text-base font-medium">
                  {online ? 'Online' : 'Offline'} · Offline Sync
                </CardTitle>
                <Badge variant="outline" className="gap-1 text-xs">
                  <HardDrive className="h-3 w-3" />
                  Data saved locally
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                {pending.length > 0 && (
                  <Badge variant="secondary">{pending.length} pending</Badge>
                )}
                {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </div>
            </div>
          </CollapsibleTrigger>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="pt-0">
            <div className="space-y-4">
              {!online && (
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  You are offline. All changes are saved locally and will sync automatically when you reconnect. Data persists across restarts and power outages.
                </p>
              )}

              {pending.length > 0 && (
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <h4 className="text-sm font-medium">Pending transactions</h4>
                    {online && !syncing && (
                      <Button variant="outline" size="sm" onClick={onSyncNow}>
                        <RefreshCw className="h-4 w-4 me-1" />
                        Sync now
                      </Button>
                    )}
                    {syncing && (
                      <span className="flex items-center gap-1 text-sm text-muted-foreground">
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        Syncing...
                      </span>
                    )}
                  </div>
                  <ScrollArea className="h-[140px] rounded-md border">
                    <div className="p-2 space-y-2">
                      {pending.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 dark:bg-slate-900/50 px-3 py-2 text-sm"
                        >
                          <span className="truncate flex-1 min-w-0">
                            {item.label || item.type}
                          </span>
                          <StatusBadge status={item.status} />
                          <span className="text-xs text-muted-foreground shrink-0">
                            {formatTime(item.createdAt)}
                          </span>
                          {item.lastError && (
                            <span className="text-xs text-red-600 dark:text-red-400 truncate max-w-[120px]" title={item.lastError}>
                              {item.lastError}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}

              {recent.length > 0 && (
                <div>
                  <h4 className="mb-2 text-sm font-medium">Recently synced</h4>
                  <ScrollArea className="h-[100px] rounded-md border">
                    <div className="p-2 space-y-1">
                      {recent.slice(0, 8).map((r) => (
                        <div
                          key={r.id}
                          className="flex items-center justify-between gap-2 rounded px-2 py-1.5 text-sm text-muted-foreground"
                        >
                          <span className="truncate flex-1">{r.label}</span>
                          <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                          <span className="text-xs shrink-0">{formatTime(r.syncedAt)}</span>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}

              {hasActivity && (
                <Button variant="ghost" size="sm" onClick={onRefresh} className="w-full">
                  <RefreshCw className="h-4 w-4 me-2" />
                  Refresh
                </Button>
              )}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  )
}
