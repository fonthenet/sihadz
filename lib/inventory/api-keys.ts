/**
 * Pharmacy Inventory API Keys
 * Generation, validation, and management of API keys for external integrations
 */

import { createHash, randomBytes } from 'crypto'

// ============================================================================
// TYPES
// ============================================================================

export interface ApiKeyData {
  id: string
  pharmacy_id: string
  key_prefix: string
  name: string
  scopes: string[]
  rate_limit_per_minute: number
  is_active: boolean
  expires_at?: string
  last_used_at?: string
  usage_count: number
  created_at: string
}

export type ApiKeyScope = 
  | 'products:read'
  | 'products:write'
  | 'stock:read'
  | 'stock:write'
  | 'transactions:read'
  | 'suppliers:read'
  | 'suppliers:write'
  | 'all'

export interface CreateApiKeyInput {
  name: string
  scopes?: ApiKeyScope[]
  expires_in_days?: number
  rate_limit_per_minute?: number
}

export interface ApiKeyValidationResult {
  valid: boolean
  pharmacy_id?: string
  api_key_id?: string
  scopes?: string[]
  error?: string
}

// ============================================================================
// KEY GENERATION
// ============================================================================

/**
 * Generate a new API key
 * Returns both the raw key (to show user once) and the hash (to store)
 */
export function generateApiKey(): { key: string; prefix: string; hash: string } {
  // Generate 32 random bytes = 256 bits of entropy
  const keyBytes = randomBytes(32)
  const key = `pk_${keyBytes.toString('base64url')}`
  
  // Prefix for display (first 12 chars after pk_)
  const prefix = key.substring(0, 15) // "pk_" + first 12 chars
  
  // Hash for storage
  const hash = hashApiKey(key)
  
  return { key, prefix, hash }
}

/**
 * Hash an API key for storage
 */
export function hashApiKey(key: string): string {
  return createHash('sha256').update(key).digest('hex')
}

/**
 * Validate API key format
 */
export function isValidApiKeyFormat(key: string): boolean {
  // Must start with pk_ and be at least 40 chars
  return typeof key === 'string' && key.startsWith('pk_') && key.length >= 40
}

// ============================================================================
// SCOPE VALIDATION
// ============================================================================

const VALID_SCOPES: ApiKeyScope[] = [
  'products:read',
  'products:write',
  'stock:read',
  'stock:write',
  'transactions:read',
  'suppliers:read',
  'suppliers:write',
  'all'
]

/**
 * Check if a scope is valid
 */
export function isValidScope(scope: string): scope is ApiKeyScope {
  return VALID_SCOPES.includes(scope as ApiKeyScope)
}

/**
 * Check if API key has required scope
 */
export function hasScope(keyScopes: string[], requiredScope: ApiKeyScope): boolean {
  if (keyScopes.includes('all')) return true
  if (keyScopes.includes(requiredScope)) return true
  
  // Check for write implies read
  if (requiredScope.endsWith(':read')) {
    const writeScope = requiredScope.replace(':read', ':write')
    if (keyScopes.includes(writeScope)) return true
  }
  
  return false
}

/**
 * Get default scopes for new API key
 */
export function getDefaultScopes(): ApiKeyScope[] {
  return ['products:read', 'stock:read', 'transactions:read']
}

// ============================================================================
// RATE LIMITING
// ============================================================================

// In-memory rate limit tracking (for serverless, consider Redis)
const rateLimitCache = new Map<string, { count: number; resetAt: number }>()

/**
 * Check and update rate limit for an API key
 */
export function checkRateLimit(
  apiKeyId: string, 
  limit: number = 60
): { allowed: boolean; remaining: number; resetIn: number } {
  const now = Date.now()
  const windowMs = 60 * 1000 // 1 minute window
  
  const entry = rateLimitCache.get(apiKeyId)
  
  if (!entry || now >= entry.resetAt) {
    // New window
    rateLimitCache.set(apiKeyId, { count: 1, resetAt: now + windowMs })
    return { allowed: true, remaining: limit - 1, resetIn: windowMs }
  }
  
  if (entry.count >= limit) {
    // Rate limited
    return { allowed: false, remaining: 0, resetIn: entry.resetAt - now }
  }
  
  // Increment count
  entry.count++
  return { allowed: true, remaining: limit - entry.count, resetIn: entry.resetAt - now }
}

// ============================================================================
// VALIDATION HELPER (for API routes)
// ============================================================================

import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Validate API key from request and return pharmacy context
 * Use this in API routes that support API key auth
 */
export async function validateApiKeyFromRequest(
  apiKey: string
): Promise<ApiKeyValidationResult> {
  // Check format
  if (!isValidApiKeyFormat(apiKey)) {
    return { valid: false, error: 'Invalid API key format' }
  }
  
  // Hash and lookup
  const keyHash = hashApiKey(apiKey)
  
  const supabase = createAdminClient()
  
  const { data: keyData, error } = await supabase
    .from('pharmacy_api_keys')
    .select('id, pharmacy_id, scopes, rate_limit_per_minute, is_active, expires_at')
    .eq('key_hash', keyHash)
    .single()
  
  if (error || !keyData) {
    return { valid: false, error: 'API key not found' }
  }
  
  // Check if active
  if (!keyData.is_active) {
    return { valid: false, error: 'API key is revoked' }
  }
  
  // Check expiry
  if (keyData.expires_at && new Date(keyData.expires_at) < new Date()) {
    return { valid: false, error: 'API key has expired' }
  }
  
  // Check rate limit
  const rateCheck = checkRateLimit(keyData.id, keyData.rate_limit_per_minute)
  if (!rateCheck.allowed) {
    return { valid: false, error: `Rate limit exceeded. Try again in ${Math.ceil(rateCheck.resetIn / 1000)}s` }
  }
  
  // Update last used
  await supabase
    .from('pharmacy_api_keys')
    .update({ 
      last_used_at: new Date().toISOString(),
      usage_count: (keyData as any).usage_count + 1 || 1
    })
    .eq('id', keyData.id)
  
  return {
    valid: true,
    pharmacy_id: keyData.pharmacy_id,
    api_key_id: keyData.id,
    scopes: keyData.scopes || []
  }
}

/**
 * Extract API key from request headers or query params
 */
export function extractApiKey(request: Request): string | null {
  const url = new URL(request.url)
  
  // Check query param first
  const queryKey = url.searchParams.get('api_key')
  if (queryKey) return queryKey
  
  // Check Authorization header
  const authHeader = request.headers.get('Authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7)
    if (token.startsWith('pk_')) return token
  }
  
  // Check X-API-Key header
  const apiKeyHeader = request.headers.get('X-API-Key')
  if (apiKeyHeader) return apiKeyHeader
  
  return null
}
