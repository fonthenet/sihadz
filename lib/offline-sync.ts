/**
 * Universal offline sync for all users (patients, doctors, pharmacy, lab, clinic, supplier)
 * Uses IndexedDB - persists across browser restart, power outage, device reboot
 */

import { openDB, type IDBPDatabase } from 'idb'

const DB_NAME = 'dzd-offline'
const DB_VERSION = 2
const STORE_QUEUE = 'sync-queue'
const STORE_CACHE = 'cache'
const STORE_RECENT = 'recent-synced'

export type QueuedActionType =
  | 'order_action'
  | 'stock_update'
  | 'order_create'
  | 'appointment_create'
  | 'appointment_create_with_wallet'
  | 'prescription_action'
  | 'prescription_send'
  | 'lab_request'
  | 'lab_request_send'
  | 'sale'
  | 'professional_pos_sale'
  | 'inventory_adjust'
  | 'message_send'
  | 'generic_api'

export type QueueItemStatus = 'pending' | 'syncing' | 'succeeded' | 'failed'

export interface QueuedAction {
  id: string
  userId: string
  type: QueuedActionType
  payload: Record<string, unknown>
  createdAt: string
  retries: number
  lastError?: string
  status: QueueItemStatus
  syncedAt?: string
  label?: string
}

export interface RecentSyncedItem {
  id: string
  userId: string
  type: string
  label: string
  syncedAt: string
}

const MAX_RETRIES = 5

let dbPromise: Promise<IDBPDatabase> | null = null

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_QUEUE)) {
          db.createObjectStore(STORE_QUEUE, { keyPath: 'id' })
        }
        if (!db.objectStoreNames.contains(STORE_CACHE)) {
          db.createObjectStore(STORE_CACHE, { keyPath: 'key' })
        }
        if (!db.objectStoreNames.contains(STORE_RECENT)) {
          db.createObjectStore(STORE_RECENT, { keyPath: 'id' })
        }
      },
    })
  }
  return dbPromise
}

function getLabel(item: QueuedAction): string {
  if (item.label) return item.label
  const type = item.type
  const p = item.payload as Record<string, unknown>
  if (type === 'order_action') return `Order ${p.order_id ? String(p.order_id).slice(0, 8) : ''} - ${p.action || 'update'}`
  if (type === 'stock_update') return `Stock update - ${p.product_id ? String(p.product_id).slice(0, 8) : 'warehouse'}`
  if (type === 'appointment_create') return `Appointment booking`
  if (type === 'appointment_create_with_wallet') return `Appointment (wallet)`
  if (type === 'prescription_action') return `Prescription - ${p.action || 'update'}`
  if (type === 'prescription_send') return `Prescription send`
  if (type === 'lab_request') return `Lab request`
  if (type === 'lab_request_send') return `Lab request send`
  if (type === 'sale') return `Sale`
  if (type === 'professional_pos_sale') return `Professional sale`
  if (type === 'inventory_adjust') return `Inventory adjustment`
  if (type === 'message_send') return `Message`
  return `${type}`
}

export async function addToSyncQueue(
  userId: string,
  action: Omit<QueuedAction, 'id' | 'createdAt' | 'retries' | 'status' | 'userId'>,
  label?: string
): Promise<string> {
  const db = await getDB()
  const id = `q-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
  const item: QueuedAction = {
    ...action,
    userId,
    id,
    label: label || getLabel({ ...action, id, userId, status: 'pending', createdAt: '' }),
    createdAt: new Date().toISOString(),
    retries: 0,
    status: 'pending',
  }
  await db.put(STORE_QUEUE, item)
  return id
}

export async function getSyncQueue(userId: string): Promise<QueuedAction[]> {
  const db = await getDB()
  const items = await db.getAll(STORE_QUEUE)
  const filtered = items.filter((i) => i.userId === userId)
  return filtered.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
}

export async function removeFromSyncQueue(id: string): Promise<void> {
  const db = await getDB()
  await db.delete(STORE_QUEUE, id)
}

export async function updateQueueItem(id: string, updates: Partial<QueuedAction>): Promise<void> {
  const db = await getDB()
  const item = await db.get(STORE_QUEUE, id)
  if (item) {
    await db.put(STORE_QUEUE, { ...item, ...updates })
  }
}

export async function addToRecentSynced(userId: string, item: QueuedAction): Promise<void> {
  const db = await getDB()
  const recent: RecentSyncedItem = {
    id: `r-${item.id}-${Date.now()}`,
    userId,
    type: item.type,
    label: item.label || getLabel(item),
    syncedAt: new Date().toISOString(),
  }
  await db.put(STORE_RECENT, recent)
  const all = (await db.getAll(STORE_RECENT)).filter((r) => r.userId === userId)
  if (all.length > 50) {
    const toDelete = all.sort((a, b) => new Date(a.syncedAt).getTime() - new Date(b.syncedAt).getTime()).slice(0, all.length - 50)
    for (const r of toDelete) await db.delete(STORE_RECENT, r.id)
  }
}

export async function getRecentSynced(userId: string, limit = 10): Promise<RecentSyncedItem[]> {
  const db = await getDB()
  const items = await db.getAll(STORE_RECENT)
  return items
    .filter((i) => i.userId === userId)
    .sort((a, b) => new Date(b.syncedAt).getTime() - new Date(a.syncedAt).getTime())
    .slice(0, limit)
}

export function getMaxRetries(): number {
  return MAX_RETRIES
}

export async function getPendingSyncCount(userId: string): Promise<number> {
  const queue = await getSyncQueue(userId)
  return queue.filter((q) => q.status === 'pending' || q.status === 'failed').length
}

export async function cacheSet(userId: string, key: string, data: unknown): Promise<void> {
  const db = await getDB()
  await db.put(STORE_CACHE, {
    key: `${userId}:${key}`,
    data,
    updatedAt: new Date().toISOString(),
  })
}

export async function cacheGet<T = unknown>(userId: string, key: string): Promise<T | null> {
  const db = await getDB()
  const cached = await db.get(STORE_CACHE, `${userId}:${key}`)
  return cached ? (cached.data as T) : null
}

/** Fast check using browser API */
export function isOnline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine
}

/** Real connectivity check via fetch */
export async function checkConnectivity(timeoutMs = 4000): Promise<boolean> {
  if (typeof window === 'undefined') return false
  if (!navigator.onLine) return false
  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), timeoutMs)
    const res = await fetch('/api/ping', { method: 'GET', cache: 'no-store', signal: ctrl.signal })
    clearTimeout(t)
    return res.ok
  } catch {
    return false
  }
}

export function setupNetworkListener(callback: (online: boolean) => void): () => void {
  if (typeof window === 'undefined') return () => {}
  const handler = () => callback(navigator.onLine)
  window.addEventListener('online', handler)
  window.addEventListener('offline', handler)
  return () => {
    window.removeEventListener('online', handler)
    window.removeEventListener('offline', handler)
  }
}
