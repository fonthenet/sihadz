'use server'

// Chargily Pay integration for SihaDZ
// Supports: CIB, EDAHABIA (Baridi Mob), and mobile credit (Flexy, Mobilis, Ooredoo)
// Last updated: 2026-01-19

export type PaymentMethod = 'edahabia' | 'cib' | 'flexy' | 'mobilis' | 'ooredoo' | 'cash'
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'canceled' | 'expired'

// Map our payment methods to Chargily's API payment method codes
const CHARGILY_PAYMENT_METHOD_MAP: Record<string, string> = {
  'edahabia': 'edahabia',
  'cib': 'cib',
  'flexy': 'djezzy',      // Djezzy's Flexy mobile credit
  'mobilis': 'mobilis',    // Mobilis mobile credit
  'ooredoo': 'ooredoo',    // Ooredoo mobile credit
}

export interface CheckoutItem {
  price: string // Price ID from Chargily
  quantity: number
}

export interface CreateCheckoutParams {
  amount: number // Amount in DZD (centimes)
  description?: string
  successUrl: string
  failureUrl?: string
  webhookEndpoint?: string
  paymentMethod?: PaymentMethod
  customerName?: string
  customerEmail?: string
  customerPhone?: string
  metadata?: Record<string, string>
  locale?: 'ar' | 'en' | 'fr'
  passFees?: boolean
}

export interface CheckoutResponse {
  id: string
  entity: string
  livemode: boolean
  amount: number
  currency: string
  fees: number
  status: PaymentStatus
  locale: string
  description: string | null
  metadata: Record<string, string> | null
  success_url: string
  failure_url: string | null
  checkout_url: string
  payment_method: PaymentMethod | null
  created_at: number
  updated_at: number
}

export interface PaymentRecord {
  id: string
  appointmentId?: string
  prescriptionId?: string
  amount: number
  currency: string
  paymentMethod: PaymentMethod | 'cash'
  status: PaymentStatus
  chargilyCheckoutId?: string
  chargilyCheckoutUrl?: string
  customerName?: string
  customerPhone?: string
  metadata?: Record<string, string>
  createdAt: Date
  paidAt?: Date
}

const CHARGILY_API_URL = process.env.NODE_ENV === 'production' 
  ? 'https://api.chargily.io/api/v2'
  : 'https://api.chargily.io/test/api/v2'

const getApiKey = () => {
  const key = process.env.CHARGILY_SECRET_KEY
  if (!key) {
    console.error('[v0] CHARGILY_SECRET_KEY is not set in environment')
    throw new Error('CHARGILY_SECRET_KEY is not set')
  }
  console.log('[v0] Using Chargily key:', key.substring(0, 10) + '...')
  return key
}

// Create a checkout session for online payment
export async function createCheckout(params: CreateCheckoutParams): Promise<CheckoutResponse> {
  const apiKey = getApiKey()
  
  const body: Record<string, any> = {
    amount: params.amount,
    currency: 'dzd',
    success_url: params.successUrl,
    locale: params.locale || 'ar',
  }

  if (params.failureUrl) {
    body.failure_url = params.failureUrl
  }

  if (params.webhookEndpoint) {
    body.webhook_endpoint = params.webhookEndpoint
  }

  // Map our payment method names to Chargily's API format
  if (params.paymentMethod && params.paymentMethod !== 'cash') {
    const chargilyMethod = CHARGILY_PAYMENT_METHOD_MAP[params.paymentMethod]
    if (chargilyMethod) {
      body.payment_method = chargilyMethod
      console.log(`[v0] Mapped payment method: ${params.paymentMethod} -> ${chargilyMethod}`)
    }
  }

  if (params.description) {
    body.description = params.description
  }

  if (params.metadata) {
    body.metadata = params.metadata
  }

  if (params.passFees) {
    body.pass_fees_to_customer = true
  }

  // Customer info
  if (params.customerName || params.customerEmail || params.customerPhone) {
    body.customer = {
      name: params.customerName,
      email: params.customerEmail,
      phone: params.customerPhone,
    }
  }

  console.log('[v0] Creating Chargily checkout at:', `${CHARGILY_API_URL}/checkouts`)
  console.log('[v0] Checkout body:', JSON.stringify(body, null, 2))
  console.log('[v0] Using API key:', apiKey.substring(0, 10) + '...')

  let response
  try {
    response = await fetch(`${CHARGILY_API_URL}/checkouts`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(body),
    })
  } catch (fetchError) {
    console.error('[v0] Fetch error - unable to reach Chargily API:', {
      error: fetchError instanceof Error ? fetchError.message : String(fetchError),
      apiUrl: CHARGILY_API_URL,
      stack: fetchError instanceof Error ? fetchError.stack : undefined,
    })
    throw new Error(`Unable to connect to payment service: ${fetchError instanceof Error ? fetchError.message : 'Unknown error'}`)
  }

  console.log('[v0] Chargily response status:', response.status)

  if (!response.ok) {
    let error
    try {
      error = await response.json()
    } catch {
      error = { message: `HTTP ${response.status}`, body: await response.text() }
    }
    console.error('[v0] Chargily API error response:', {
      status: response.status,
      error: error,
    })
    throw new Error(`Chargily API error (${response.status}): ${JSON.stringify(error)}`)
  }

  const data = await response.json()
  console.log('[v0] Chargily checkout created:', data.id)
  return data
}

// Get checkout details
export async function getCheckout(checkoutId: string): Promise<CheckoutResponse> {
  const apiKey = getApiKey()

  const response = await fetch(`${CHARGILY_API_URL}/checkouts/${checkoutId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(`Chargily API error: ${JSON.stringify(error)}`)
  }

  return response.json()
}

// Verify webhook signature (async for server action compatibility)
export async function verifyWebhookSignature(
  payload: string | Buffer,
  signature: string,
  secretKey: string
): Promise<boolean> {
  const crypto = require('crypto')
  const computedSignature = crypto
    .createHmac('sha256', secretKey)
    .update(payload)
    .digest('hex')
  
  return computedSignature === signature
}

// Format amount for display (DZD uses centimes internally)
export async function formatAmount(amount: number): Promise<string> {
  return `${(amount / 100).toFixed(2)} DZD`
}

// Parse amount from DZD to centimes
export async function parseAmount(dzd: number): Promise<number> {
  return Math.round(dzd * 100)
}

// Calculate consultation fee with Chifa discount
export async function calculateConsultationFee(
  baseFee: number, // in DZD
  hasChifaCard: boolean,
  chifaCoverage: number = 80 // percentage
): Promise<{ total: number; discount: number; patientPays: number }> {
  if (!hasChifaCard) {
    return {
      total: baseFee,
      discount: 0,
      patientPays: baseFee,
    }
  }
  
  const discount = Math.round(baseFee * (chifaCoverage / 100))
  const patientPays = baseFee - discount
  
  return {
    total: baseFee,
    discount,
    patientPays,
  }
}
