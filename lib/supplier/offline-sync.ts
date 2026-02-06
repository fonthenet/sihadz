/**
 * Offline-capable order and stock sync for suppliers
 * Uses IndexedDB to queue actions when offline and sync when online
 */

import { openDB, type IDBPDatabase } from 'idb'

const DB_NAME = 'dzd-supplier-offline'
const DB_VERSION = 1
const STORE_QUEUE = 'sync-queue'
const STORE_CACHE = 'cache'

export type QueuedActionType = 'order_action' | 'stock_update' | 'order_create'

export interface QueuedAction {
  id: string
  type: QueuedActionType
  payload: Record<string, unknown>
  createdAt: string
  retries: number
  lastError?: string
}

export interface CachedData {
  key: string
  data: unknown
  updatedAt: string
}

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
      },
    })
  }
  return dbPromise
}

export async function addToSyncQueue(action: Omit<QueuedAction, 'id' | 'createdAt' | 'retries'>): Promise<string> {
  const db = await getDB()
  const id = `q-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
  const item: QueuedAction = {
    ...action,
    id,
    createdAt: new Date().toISOString(),
    retries: 0,
  }
  await db.put(STORE_QUEUE, item)
  return id
}

export async function getSyncQueue(): Promise<QueuedAction[]> {
  const db = await getDB()
  const items = await db.getAll(STORE_QUEUE)
  return items.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
}

export async function removeFromSyncQueue(id: string): Promise<void> {
  const db = await getDB()
  await db.delete(STORE_QUEUE, id)
}

const MAX_RETRIES = 5

export async function updateQueueItem(id: string, updates: Partial<QueuedAction>): Promise<void> {
  const db = await getDB()
  const item = await db.get(STORE_QUEUE, id)
  if (item) {
    await db.put(STORE_QUEUE, { ...item, ...updates })
  }
}

export function getMaxRetries(): number {
  return MAX_RETRIES
}

export async function getQueueWithDetails(): Promise<QueuedAction[]> {
  return getSyncQueue()
}

export async function getFailedCount(): Promise<number> {
  const queue = await getSyncQueue()
  return queue.filter((q) => q.retries >= MAX_RETRIES).length
}

export async function getPendingSyncCount(): Promise<number> {
  const queue = await getSyncQueue()
  return queue.length
}

export async function cacheProducts(supplierId: string, products: unknown[]): Promise<void> {
  const db = await getDB()
  await db.put(STORE_CACHE, {
    key: `products-${supplierId}`,
    data: products,
    updatedAt: new Date().toISOString(),
  })
}

export async function getCachedProducts(supplierId: string): Promise<unknown[] | null> {
  const db = await getDB()
  const cached = await db.get(STORE_CACHE, `products-${supplierId}`)
  return cached ? (cached.data as unknown[]) : null
}

export async function cacheOrders(supplierId: string, orders: unknown[]): Promise<void> {
  const db = await getDB()
  await db.put(STORE_CACHE, {
    key: `orders-${supplierId}`,
    data: orders,
    updatedAt: new Date().toISOString(),
  })
}

export async function getCachedOrders(supplierId: string): Promise<unknown[] | null> {
  const db = await getDB()
  const cached = await db.get(STORE_CACHE, `orders-${supplierId}`)
  return cached ? (cached.data as unknown[]) : null
}

export async function cacheWarehouseStock(supplierId: string, stock: unknown[]): Promise<void> {
  const db = await getDB()
  await db.put(STORE_CACHE, {
    key: `warehouse-stock-${supplierId}`,
    data: stock,
    updatedAt: new Date().toISOString(),
  })
}

export async function getCachedWarehouseStock(supplierId: string): Promise<unknown[] | null> {
  const db = await getDB()
  const cached = await db.get(STORE_CACHE, `warehouse-stock-${supplierId}`)
  return cached ? (cached.data as unknown[]) : null
}

export async function cacheStats(supplierId: string, stats: unknown): Promise<void> {
  const db = await getDB()
  await db.put(STORE_CACHE, {
    key: `stats-${supplierId}`,
    data: stats,
    updatedAt: new Date().toISOString(),
  })
}

export async function getCachedStats(supplierId: string): Promise<unknown | null> {
  const db = await getDB()
  const cached = await db.get(STORE_CACHE, `stats-${supplierId}`)
  return cached ? cached.data : null
}

/** Fast check using browser API (can be wrong: captive portals, flaky WiFi) */
export function isOnline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine
}

/** Real connectivity check via fetch. Use before syncing queue. */
export async function checkConnectivity(timeoutMs = 4000): Promise<boolean> {
  if (typeof window === 'undefined') return false
  if (!navigator.onLine) return false
  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), timeoutMs)
    const res = await fetch('/api/ping', {
      method: 'GET',
      cache: 'no-store',
      signal: ctrl.signal,
    })
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
