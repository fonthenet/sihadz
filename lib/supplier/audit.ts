/**
 * Supplier Audit Trail Helpers
 * 
 * Use these functions to log audit events manually when automatic triggers
 * are not available (e.g., complex multi-step operations, external API calls).
 */

export type AuditEntityType = 
  | 'order' 
  | 'order_item' 
  | 'payment' 
  | 'invoice' 
  | 'product' 
  | 'buyer_link' 
  | 'inventory' 
  | 'settings' 
  | 'warehouse' 
  | 'catalog'

export type AuditAction = 
  | 'create' 
  | 'update' 
  | 'delete' 
  | 'status_change' 
  | 'payment_received'
  | 'payment_marked' 
  | 'adjustment' 
  | 'substitution' 
  | 'approval' 
  | 'rejection'
  | 'shipment' 
  | 'delivery' 
  | 'cancellation' 
  | 'refund' 
  | 'import' 
  | 'export'

export interface AuditLogEntry {
  id: string
  actor_id: string | null
  actor_type: string | null
  actor_name: string | null
  entity_type: AuditEntityType
  entity_id: string
  entity_ref: string | null
  action: AuditAction
  action_label: string | null
  old_values: Record<string, unknown> | null
  new_values: Record<string, unknown> | null
  changed_fields: string[] | null
  supplier_id: string | null
  buyer_id: string | null
  order_id: string | null
  amount_before: number | null
  amount_after: number | null
  amount_change: number | null
  currency: string
  notes: string | null
  created_at: string
}

export interface AuditLogInput {
  entity_type: AuditEntityType
  entity_id: string
  entity_ref?: string
  action: AuditAction
  action_label?: string
  old_values?: Record<string, unknown>
  new_values?: Record<string, unknown>
  changed_fields?: string[]
  buyer_id?: string
  order_id?: string
  amount_before?: number
  amount_after?: number
  notes?: string
}

export interface AuditSummary {
  period: string
  date_range: {
    from: string
    to: string
  }
  total_events: number
  by_entity_type: Record<string, number>
  by_action: Record<string, number>
  financial: {
    total_credits: number
    total_debits: number
    net_change: number
  }
  timeline: Record<string, number>
  orders_created: number
  orders_completed: number
  payments_received: number
  products_updated: number
  invoices_created: number
}

/**
 * Log an audit event via API
 */
export async function logAuditEvent(input: AuditLogInput): Promise<AuditLogEntry | null> {
  try {
    const res = await fetch('/api/supplier/audit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(input),
    })
    
    if (!res.ok) {
      console.error('Failed to log audit event:', await res.text())
      return null
    }
    
    return await res.json()
  } catch (error) {
    console.error('Error logging audit event:', error)
    return null
  }
}

/**
 * Fetch audit logs with filtering
 */
export async function fetchAuditLogs(params: {
  page?: number
  limit?: number
  entity_type?: AuditEntityType | 'all'
  action?: AuditAction | 'all'
  date_from?: string
  date_to?: string
  order_id?: string
  search?: string
}): Promise<{ data: AuditLogEntry[]; total: number; hasMore: boolean }> {
  const searchParams = new URLSearchParams()
  
  if (params.page) searchParams.set('page', params.page.toString())
  if (params.limit) searchParams.set('limit', params.limit.toString())
  if (params.entity_type && params.entity_type !== 'all') searchParams.set('entity_type', params.entity_type)
  if (params.action && params.action !== 'all') searchParams.set('action', params.action)
  if (params.date_from) searchParams.set('date_from', params.date_from)
  if (params.date_to) searchParams.set('date_to', params.date_to)
  if (params.order_id) searchParams.set('order_id', params.order_id)
  if (params.search) searchParams.set('search', params.search)
  
  const res = await fetch(`/api/supplier/audit?${searchParams.toString()}`, {
    credentials: 'include',
  })
  
  if (!res.ok) {
    throw new Error('Failed to fetch audit logs')
  }
  
  return await res.json()
}

/**
 * Fetch audit summary for reports
 */
export async function fetchAuditSummary(params: {
  period?: 'day' | 'week' | 'month' | 'year'
  date_from?: string
  date_to?: string
}): Promise<AuditSummary> {
  const searchParams = new URLSearchParams()
  
  if (params.period) searchParams.set('period', params.period)
  if (params.date_from) searchParams.set('date_from', params.date_from)
  if (params.date_to) searchParams.set('date_to', params.date_to)
  
  const res = await fetch(`/api/supplier/audit/summary?${searchParams.toString()}`, {
    credentials: 'include',
  })
  
  if (!res.ok) {
    throw new Error('Failed to fetch audit summary')
  }
  
  return await res.json()
}

/**
 * Export audit logs as CSV
 */
export function exportAuditLogs(params: {
  format?: 'csv' | 'json'
  entity_type?: AuditEntityType | 'all'
  action?: AuditAction | 'all'
  date_from?: string
  date_to?: string
}): string {
  const searchParams = new URLSearchParams()
  
  searchParams.set('format', params.format || 'csv')
  if (params.entity_type && params.entity_type !== 'all') searchParams.set('entity_type', params.entity_type)
  if (params.action && params.action !== 'all') searchParams.set('action', params.action)
  if (params.date_from) searchParams.set('date_from', params.date_from)
  if (params.date_to) searchParams.set('date_to', params.date_to)
  
  return `/api/supplier/audit/export?${searchParams.toString()}`
}

/**
 * Format action for display
 */
export function formatAuditAction(action: AuditAction): string {
  const labels: Record<AuditAction, string> = {
    create: 'Created',
    update: 'Updated',
    delete: 'Deleted',
    status_change: 'Status Changed',
    payment_received: 'Payment Received',
    payment_marked: 'Marked as Paid',
    adjustment: 'Adjustment',
    substitution: 'Substitution',
    approval: 'Approved',
    rejection: 'Rejected',
    shipment: 'Shipped',
    delivery: 'Delivered',
    cancellation: 'Cancelled',
    refund: 'Refunded',
    import: 'Imported',
    export: 'Exported',
  }
  return labels[action] || action
}

/**
 * Format entity type for display
 */
export function formatEntityType(type: AuditEntityType): string {
  const labels: Record<AuditEntityType, string> = {
    order: 'Order',
    order_item: 'Order Item',
    payment: 'Payment',
    invoice: 'Invoice',
    product: 'Product',
    buyer_link: 'Buyer Link',
    inventory: 'Inventory',
    settings: 'Settings',
    warehouse: 'Warehouse',
    catalog: 'Catalog',
  }
  return labels[type] || type
}

/**
 * Get icon name for entity type (for use with lucide-react)
 */
export function getEntityTypeIcon(type: AuditEntityType): string {
  const icons: Record<AuditEntityType, string> = {
    order: 'ShoppingCart',
    order_item: 'Package',
    payment: 'CreditCard',
    invoice: 'FileText',
    product: 'Box',
    buyer_link: 'Link',
    inventory: 'Warehouse',
    settings: 'Settings',
    warehouse: 'Building2',
    catalog: 'List',
  }
  return icons[type] || 'FileText'
}

/**
 * Get color class for action type
 */
export function getActionColor(action: AuditAction): string {
  const colors: Record<AuditAction, string> = {
    create: 'text-green-600 bg-green-50 dark:bg-green-900/20',
    update: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20',
    delete: 'text-red-600 bg-red-50 dark:bg-red-900/20',
    status_change: 'text-purple-600 bg-purple-50 dark:bg-purple-900/20',
    payment_received: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20',
    payment_marked: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20',
    adjustment: 'text-amber-600 bg-amber-50 dark:bg-amber-900/20',
    substitution: 'text-orange-600 bg-orange-50 dark:bg-orange-900/20',
    approval: 'text-green-600 bg-green-50 dark:bg-green-900/20',
    rejection: 'text-red-600 bg-red-50 dark:bg-red-900/20',
    shipment: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20',
    delivery: 'text-teal-600 bg-teal-50 dark:bg-teal-900/20',
    cancellation: 'text-red-600 bg-red-50 dark:bg-red-900/20',
    refund: 'text-rose-600 bg-rose-50 dark:bg-rose-900/20',
    import: 'text-cyan-600 bg-cyan-50 dark:bg-cyan-900/20',
    export: 'text-cyan-600 bg-cyan-50 dark:bg-cyan-900/20',
  }
  return colors[action] || 'text-slate-600 bg-slate-50'
}
