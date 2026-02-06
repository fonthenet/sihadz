'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  isOnline,
  checkConnectivity,
  setupNetworkListener,
  getPendingSyncCount,
  getSyncQueue,
  getMaxRetries,
  removeFromSyncQueue,
  updateQueueItem,
  type QueuedAction,
} from '@/lib/supplier/offline-sync'

export function useSupplierOfflineSync(supplierId: string | null, onSyncComplete?: () => void) {
  const [online, setOnline] = useState(true)
  const [pendingCount, setPendingCount] = useState(0)
  const [syncing, setSyncing] = useState(false)
  const maxRetries = getMaxRetries()

  useEffect(() => {
    setOnline(isOnline())
    getPendingSyncCount().then(setPendingCount)
  }, [])

  useEffect(() => {
    const unsubscribe = setupNetworkListener((onLine) => {
      setOnline(onLine)
      getPendingSyncCount().then(setPendingCount)
    })
    return unsubscribe
  }, [])

  const refreshPendingCount = useCallback(() => {
    getPendingSyncCount().then(setPendingCount)
  }, [])

  const processQueue = useCallback(async () => {
    if (!supplierId || !online || syncing) return
    const reallyOnline = await checkConnectivity(4000)
    if (!reallyOnline) return
    setSyncing(true)
    try {
      const queue = await getSyncQueue()
      let anySucceeded = false
      for (const item of queue) {
        if (item.retries >= maxRetries) continue
        try {
          if (item.type === 'order_action') {
            const { order_id, action, ...data } = item.payload as { order_id: string; action: string; [k: string]: unknown }
            const res = await fetch('/api/supplier/orders', {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ order_id, action, ...data }),
            })
            if (res.ok) {
              await removeFromSyncQueue(item.id)
              anySucceeded = true
            } else {
              const err = await res.json().catch(() => ({}))
              await updateQueueItem(item.id, {
                retries: item.retries + 1,
                lastError: err.error || res.statusText,
              })
            }
          } else if (item.type === 'stock_update') {
            const res = await fetch('/api/supplier/warehouses/stock', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(item.payload),
            })
            if (res.ok) {
              await removeFromSyncQueue(item.id)
              anySucceeded = true
            } else {
              const err = await res.json().catch(() => ({}))
              await updateQueueItem(item.id, {
                retries: item.retries + 1,
                lastError: err.error || res.statusText,
              })
            }
          }
        } catch (err) {
          await updateQueueItem(item.id, {
            retries: item.retries + 1,
            lastError: err instanceof Error ? err.message : 'Unknown error',
          })
        }
      }
      await getPendingSyncCount().then(setPendingCount)
      if (anySucceeded) onSyncComplete?.()
    } finally {
      setSyncing(false)
    }
  }, [supplierId, online, syncing, maxRetries, onSyncComplete])

  useEffect(() => {
    if (online && pendingCount > 0 && supplierId) {
      processQueue()
    }
  }, [online, pendingCount, supplierId, processQueue])

  return { online, pendingCount, syncing, refreshPendingCount, processQueue }
}
