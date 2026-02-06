'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  isOnline,
  checkConnectivity,
  setupNetworkListener,
  getSyncQueue,
  getRecentSynced,
  getMaxRetries,
  removeFromSyncQueue,
  updateQueueItem,
  addToRecentSynced,
  type QueuedAction,
} from '@/lib/offline-sync'
import { executeSync } from '@/lib/offline-sync-handlers'

const POLL_MS = 2000

export function useOfflineSync(userId: string | null, onSyncComplete?: () => void) {
  const [online, setOnline] = useState(true)
  const [queue, setQueue] = useState<QueuedAction[]>([])
  const [recent, setRecent] = useState<Awaited<ReturnType<typeof getRecentSynced>>>([])
  const [syncing, setSyncing] = useState(false)
  const maxRetries = getMaxRetries()

  const refresh = useCallback(async () => {
    if (!userId) return
    const [q, r] = await Promise.all([getSyncQueue(userId), getRecentSynced(userId, 15)])
    setQueue(q)
    setRecent(r)
  }, [userId])

  useEffect(() => {
    setOnline(isOnline())
    refresh()
  }, [refresh])

  useEffect(() => {
    const unsub = setupNetworkListener(() => {
      setOnline(isOnline())
      refresh()
    })
    return unsub
  }, [refresh])

  useEffect(() => {
    const onQueued = () => refresh()
    window.addEventListener('offline-sync-queued', onQueued)
    return () => window.removeEventListener('offline-sync-queued', onQueued)
  }, [refresh])

  useEffect(() => {
    if (!userId) return
    const t = setInterval(refresh, POLL_MS)
    return () => clearInterval(t)
  }, [userId, refresh])

  const processQueue = useCallback(async () => {
    if (!userId || !online || syncing) return
    const reallyOnline = await checkConnectivity(4000)
    if (!reallyOnline) return
    setSyncing(true)
    try {
      const items = await getSyncQueue(userId)
      let anySucceeded = false
      for (const item of items) {
        if (item.retries >= maxRetries) continue
        if (item.status === 'succeeded') continue
        await updateQueueItem(item.id, { status: 'syncing' })
        await refresh()
        const result = await executeSync(item)
        if (result.ok) {
          await addToRecentSynced(userId, item)
          await removeFromSyncQueue(item.id)
          anySucceeded = true
        } else {
          await updateQueueItem(item.id, {
            status: 'failed',
            retries: item.retries + 1,
            lastError: result.error,
          })
        }
        await refresh()
      }
      if (anySucceeded) onSyncComplete?.()
    } finally {
      setSyncing(false)
      await refresh()
    }
  }, [userId, online, syncing, maxRetries, onSyncComplete, refresh])

  useEffect(() => {
    if (online && queue.some((q) => q.status === 'pending' || q.status === 'failed') && userId) {
      processQueue()
    }
  }, [online, queue, userId, processQueue])

  return { online, queue, recent, syncing, refresh, processQueue }
}
