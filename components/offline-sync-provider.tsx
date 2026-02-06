'use client'

import { useAuth } from '@/components/auth-provider'
import { useOfflineSyncUserId } from '@/contexts/offline-sync-user-context'
import { useOfflineSync } from '@/hooks/use-offline-sync'
import { OfflineQueuePanel } from '@/components/offline-queue-panel'

/**
 * Renders the offline queue panel for authenticated users.
 * Shows pending transactions, sync status, and recently synced items.
 * Data persists in IndexedDB across restarts and power outages.
 */
export function OfflineSyncProvider() {
  const { user } = useAuth()
  const layoutUserId = useOfflineSyncUserId()
  const userId = layoutUserId ?? user?.id ?? null
  const { online, queue, recent, syncing, refresh, processQueue } = useOfflineSync(userId, () => {
    window.dispatchEvent(new CustomEvent('offline-sync-complete'))
  })

  if (!userId) return null

  return (
    <div className="fixed end-4 z-50 w-full max-w-sm offline-panel-anchor">
      <OfflineQueuePanel
        userId={userId}
        online={online}
        queue={queue}
        recent={recent}
        syncing={syncing}
        onRefresh={refresh}
        onSyncNow={processQueue}
      />
    </div>
  )
}
