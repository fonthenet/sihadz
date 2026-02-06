/**
 * Handlers for each queued action type - maps to API calls
 */

import type { QueuedAction, QueuedActionType } from './offline-sync'

export interface SyncHandler {
  url: string
  method: string
  buildBody: (payload: Record<string, unknown>) => Record<string, unknown>
}

const HANDLERS: Partial<Record<QueuedActionType, SyncHandler>> = {
  order_action: {
    url: '/api/supplier/orders',
    method: 'PATCH',
    buildBody: (p) => ({ order_id: p.order_id, action: p.action, ...p }),
  },
  stock_update: {
    url: '/api/supplier/warehouses/stock',
    method: 'POST',
    buildBody: (p) => p,
  },
  appointment_create: {
    url: '/api/appointments/create',
    method: 'POST',
    buildBody: (p) => p,
  },
  appointment_create_with_wallet: {
    url: '/api/appointments/create-with-wallet',
    method: 'POST',
    buildBody: (p) => p,
  },
  prescription_action: {
    url: '/api/prescriptions',
    method: 'PATCH',
    buildBody: (p) => p,
  },
  prescription_send: {
    url: '/api/prescriptions/__ID__/send',
    method: 'POST',
    buildBody: (p) => ({ pharmacyId: p.pharmacyId }),
  },
  lab_request: {
    url: '/api/lab-requests',
    method: 'POST',
    buildBody: (p) => p,
  },
  lab_request_send: {
    url: '/api/lab-requests/__ID__/send',
    method: 'POST',
    buildBody: (p) => ({ laboratoryId: p.laboratoryId }),
  },
  sale: {
    url: '/api/pharmacy/pos/sales',
    method: 'POST',
    buildBody: (p) => p,
  },
  professional_pos_sale: {
    url: '/api/professional/pos/sales',
    method: 'POST',
    buildBody: (p) => p,
  },
  inventory_adjust: {
    url: '/api/pharmacy/inventory/adjustments',
    method: 'POST',
    buildBody: (p) => p,
  },
  generic_api: {
    url: '',
    method: 'POST',
    buildBody: (p) => p,
  },
}

export function getHandler(type: QueuedActionType): SyncHandler | null {
  const h = HANDLERS[type]
  if (h) return h
  if (type === 'generic_api') {
    return {
      url: '/api/ping',
      method: 'POST',
      buildBody: (p) => {
        const { url, method, ...rest } = p as Record<string, unknown>
        return rest
      },
    }
  }
  return null
}

export async function executeSync(item: QueuedAction): Promise<{ ok: boolean; error?: string }> {
  let handler = getHandler(item.type as QueuedActionType)
  const p = item.payload as Record<string, unknown>
  if (item.type === 'generic_api' && p?.url) {
    handler = { url: String(p.url), method: String(p.method || 'POST'), buildBody: (x) => x }
  }
  if (!handler) return { ok: false, error: `No handler for ${item.type}` }
  let url = handler.url
  if (url.includes('__ID__') && p?.id) {
    url = url.replace('__ID__', String(p.id))
  }
  if (!url) return { ok: false, error: `No URL for ${item.type}` }
  try {
    const body = handler.buildBody(p)
    const res = await fetch(url, {
      method: handler.method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      credentials: 'include',
    })
    if (res.ok) return { ok: true }
    const err = await res.json().catch(() => ({}))
    return { ok: false, error: (err as any).error || res.statusText }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Unknown error' }
  }
}
