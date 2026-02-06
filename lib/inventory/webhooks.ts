/**
 * Pharmacy Inventory Webhooks
 * Event emission and webhook delivery for external integrations
 */

import { createAdminClient } from '@/lib/supabase/admin'
import { createHmac } from 'crypto'

// ============================================================================
// TYPES
// ============================================================================

export type WebhookEventType = 
  | 'product.created'
  | 'product.updated'
  | 'product.deleted'
  | 'stock.received'
  | 'stock.adjusted'
  | 'stock.low'
  | 'stock.out'
  | 'stock.expiring'
  | 'stock.expired'
  | 'supplier.created'
  | 'supplier.updated'
  | 'import.completed'
  | 'import.failed'

export interface WebhookPayload {
  event: WebhookEventType
  pharmacy_id: string
  timestamp: string
  data: Record<string, any>
}

export interface WebhookIntegration {
  id: string
  pharmacy_id: string
  config: {
    url: string
    secret?: string
    events?: WebhookEventType[]
  }
  is_active: boolean
}

// ============================================================================
// EVENT EMISSION
// ============================================================================

/**
 * Emit a webhook event for a pharmacy
 * This queues the webhook for delivery to all matching integrations
 */
export async function emitWebhookEvent(
  pharmacyId: string,
  event: WebhookEventType,
  data: Record<string, any>
): Promise<void> {
  const supabase = createAdminClient()
  
  try {
    // Get all active webhook integrations for this pharmacy
    const { data: integrations, error } = await supabase
      .from('pharmacy_integrations')
      .select('id, config')
      .eq('pharmacy_id', pharmacyId)
      .eq('integration_type', 'webhook')
      .eq('is_active', true)
    
    if (error || !integrations?.length) {
      // No webhooks configured, silently skip
      return
    }
    
    const payload: WebhookPayload = {
      event,
      pharmacy_id: pharmacyId,
      timestamp: new Date().toISOString(),
      data
    }
    
    // Queue delivery for each matching integration
    for (const integration of integrations) {
      const config = integration.config as WebhookIntegration['config']
      
      // Check if this integration subscribes to this event
      if (config.events && config.events.length > 0 && !config.events.includes(event)) {
        continue
      }
      
      // Insert delivery record (will be processed by delivery worker)
      await supabase
        .from('webhook_deliveries')
        .insert({
          integration_id: integration.id,
          pharmacy_id: pharmacyId,
          event_type: event,
          payload,
          status: 'pending',
          next_retry_at: new Date().toISOString()
        })
    }
  } catch (err) {
    console.error('[Webhooks] Error emitting event:', err)
  }
}

// ============================================================================
// WEBHOOK DELIVERY
// ============================================================================

/**
 * Deliver a single webhook
 */
export async function deliverWebhook(
  deliveryId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient()
  
  // Get delivery record
  const { data: delivery, error: fetchError } = await supabase
    .from('webhook_deliveries')
    .select(`
      *,
      integration:pharmacy_integrations(id, config)
    `)
    .eq('id', deliveryId)
    .single()
  
  if (fetchError || !delivery) {
    return { success: false, error: 'Delivery not found' }
  }
  
  const config = delivery.integration?.config as WebhookIntegration['config']
  if (!config?.url) {
    await supabase
      .from('webhook_deliveries')
      .update({ status: 'failed', error_message: 'No webhook URL configured' })
      .eq('id', deliveryId)
    return { success: false, error: 'No webhook URL' }
  }
  
  // Prepare request
  const payload = JSON.stringify(delivery.payload)
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Webhook-Event': delivery.event_type,
    'X-Webhook-Delivery-Id': deliveryId
  }
  
  // Add signature if secret configured
  if (config.secret) {
    const signature = createHmac('sha256', config.secret)
      .update(payload)
      .digest('hex')
    headers['X-Webhook-Signature'] = `sha256=${signature}`
  }
  
  // Attempt delivery
  try {
    const response = await fetch(config.url, {
      method: 'POST',
      headers,
      body: payload,
      signal: AbortSignal.timeout(10000) // 10s timeout
    })
    
    const responseBody = await response.text().catch(() => '')
    
    if (response.ok) {
      // Success
      await supabase
        .from('webhook_deliveries')
        .update({
          status: 'success',
          attempts: delivery.attempts + 1,
          response_status: response.status,
          response_body: responseBody.substring(0, 1000),
          delivered_at: new Date().toISOString()
        })
        .eq('id', deliveryId)
      
      // Update integration last sync
      await supabase
        .from('pharmacy_integrations')
        .update({ 
          last_sync_at: new Date().toISOString(),
          last_sync_status: 'success'
        })
        .eq('id', delivery.integration_id)
      
      return { success: true }
    } else {
      throw new Error(`HTTP ${response.status}: ${responseBody.substring(0, 200)}`)
    }
  } catch (err: any) {
    const attempts = delivery.attempts + 1
    const maxAttempts = delivery.max_attempts || 3
    
    // Calculate next retry (exponential backoff: 1min, 5min, 30min)
    const retryDelays = [60, 300, 1800]
    const nextRetryDelay = retryDelays[Math.min(attempts - 1, retryDelays.length - 1)] * 1000
    const nextRetryAt = new Date(Date.now() + nextRetryDelay).toISOString()
    
    const status = attempts >= maxAttempts ? 'failed' : 'pending'
    
    await supabase
      .from('webhook_deliveries')
      .update({
        status,
        attempts,
        error_message: err.message,
        next_retry_at: status === 'pending' ? nextRetryAt : null
      })
      .eq('id', deliveryId)
    
    if (status === 'failed') {
      // Update integration last sync status
      await supabase
        .from('pharmacy_integrations')
        .update({ 
          last_sync_at: new Date().toISOString(),
          last_sync_status: 'failed',
          last_error: err.message
        })
        .eq('id', delivery.integration_id)
    }
    
    return { success: false, error: err.message }
  }
}

/**
 * Process pending webhook deliveries (call from cron or API)
 */
export async function processPendingWebhooks(limit: number = 10): Promise<number> {
  const supabase = createAdminClient()
  
  // Get pending deliveries that are due
  const { data: pending, error } = await supabase
    .from('webhook_deliveries')
    .select('id')
    .eq('status', 'pending')
    .lte('next_retry_at', new Date().toISOString())
    .order('next_retry_at', { ascending: true })
    .limit(limit)
  
  if (error || !pending?.length) {
    return 0
  }
  
  let processed = 0
  for (const delivery of pending) {
    await deliverWebhook(delivery.id)
    processed++
  }
  
  return processed
}

// ============================================================================
// SIGNATURE VERIFICATION (for incoming webhooks)
// ============================================================================

/**
 * Verify webhook signature
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  if (!signature.startsWith('sha256=')) return false
  
  const expectedSig = createHmac('sha256', secret)
    .update(payload)
    .digest('hex')
  
  return `sha256=${expectedSig}` === signature
}

// ============================================================================
// HELPER: Emit common events
// ============================================================================

export async function emitProductCreated(pharmacyId: string, product: any) {
  await emitWebhookEvent(pharmacyId, 'product.created', { product })
}

export async function emitProductUpdated(pharmacyId: string, product: any, changes: any) {
  await emitWebhookEvent(pharmacyId, 'product.updated', { product, changes })
}

export async function emitStockReceived(pharmacyId: string, data: {
  product_id: string
  product_name: string
  quantity: number
  batch_number?: string
  expiry_date?: string
}) {
  await emitWebhookEvent(pharmacyId, 'stock.received', data)
}

export async function emitStockAdjusted(pharmacyId: string, data: {
  product_id: string
  product_name: string
  quantity_change: number
  reason: string
  new_quantity: number
}) {
  await emitWebhookEvent(pharmacyId, 'stock.adjusted', data)
}

export async function emitStockAlert(pharmacyId: string, alertType: 'low' | 'out' | 'expiring' | 'expired', data: {
  product_id: string
  product_name: string
  current_quantity?: number
  min_level?: number
  batch_number?: string
  expiry_date?: string
}) {
  const eventMap = {
    low: 'stock.low',
    out: 'stock.out',
    expiring: 'stock.expiring',
    expired: 'stock.expired'
  } as const
  await emitWebhookEvent(pharmacyId, eventMap[alertType], data)
}
