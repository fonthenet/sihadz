/**
 * RATE LIMITING
 * 
 * Prevents brute force attacks, DoS, and API abuse.
 * Uses in-memory store with sliding window algorithm.
 */

// =============================================================================
// TYPES
// =============================================================================

interface RateLimitEntry {
  count: number
  windowStart: number
  blocked: boolean
  blockedUntil?: number
}

interface RateLimitConfig {
  windowMs: number      // Time window in milliseconds
  maxRequests: number   // Max requests per window
  blockDurationMs: number // How long to block after limit exceeded
}

interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: number
  blockedUntil?: number
}

// =============================================================================
// RATE LIMIT STORE (In-Memory)
// =============================================================================

// In production, use Redis or similar for distributed rate limiting
const rateLimitStore = new Map<string, RateLimitEntry>()

// Cleanup old entries every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of rateLimitStore.entries()) {
      // Remove entries older than 1 hour
      if (now - entry.windowStart > 3600000) {
        rateLimitStore.delete(key)
      }
    }
  }, 300000)
}

// =============================================================================
// PRESET CONFIGURATIONS
// =============================================================================

export const RATE_LIMITS = {
  // Authentication endpoints - strict limits
  AUTH_LOGIN: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5,           // 5 attempts
    blockDurationMs: 30 * 60 * 1000, // Block for 30 minutes
  },
  
  AUTH_SIGNUP: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 3,           // 3 signups per IP
    blockDurationMs: 24 * 60 * 60 * 1000, // Block for 24 hours
  },
  
  AUTH_PASSWORD_RESET: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 3,           // 3 reset requests
    blockDurationMs: 60 * 60 * 1000, // Block for 1 hour
  },
  
  // API endpoints - moderate limits
  API_READ: {
    windowMs: 60 * 1000,      // 1 minute
    maxRequests: 100,         // 100 requests per minute
    blockDurationMs: 60 * 1000, // Block for 1 minute
  },
  
  API_WRITE: {
    windowMs: 60 * 1000,      // 1 minute
    maxRequests: 30,          // 30 writes per minute
    blockDurationMs: 60 * 1000, // Block for 1 minute
  },
  
  // Sensitive operations - strict limits
  PRESCRIPTION_CREATE: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 50,          // 50 prescriptions per hour
    blockDurationMs: 30 * 60 * 1000, // Block for 30 minutes
  },
  
  FILE_UPLOAD: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 20,          // 20 uploads per hour
    blockDurationMs: 60 * 60 * 1000, // Block for 1 hour
  },
  
  // Chat/messaging - anti-spam
  CHAT_MESSAGE: {
    windowMs: 60 * 1000,      // 1 minute
    maxRequests: 30,          // 30 messages per minute
    blockDurationMs: 5 * 60 * 1000, // Block for 5 minutes
  },
  
  // Search - prevent scraping
  SEARCH: {
    windowMs: 60 * 1000,      // 1 minute
    maxRequests: 20,          // 20 searches per minute
    blockDurationMs: 5 * 60 * 1000, // Block for 5 minutes
  },
} as const

// =============================================================================
// RATE LIMIT FUNCTIONS
// =============================================================================

/**
 * Check if a request should be rate limited.
 * 
 * @param identifier - Unique identifier (IP address, user ID, or combination)
 * @param config - Rate limit configuration
 * @returns Whether the request is allowed and remaining quota
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now()
  const key = identifier
  
  let entry = rateLimitStore.get(key)
  
  // Check if currently blocked
  if (entry?.blocked && entry.blockedUntil && entry.blockedUntil > now) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.blockedUntil,
      blockedUntil: entry.blockedUntil,
    }
  }
  
  // Start new window if none exists or window expired
  if (!entry || now - entry.windowStart > config.windowMs) {
    entry = {
      count: 1,
      windowStart: now,
      blocked: false,
    }
    rateLimitStore.set(key, entry)
    
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetAt: now + config.windowMs,
    }
  }
  
  // Increment counter
  entry.count++
  
  // Check if limit exceeded
  if (entry.count > config.maxRequests) {
    entry.blocked = true
    entry.blockedUntil = now + config.blockDurationMs
    rateLimitStore.set(key, entry)
    
    console.warn(`[RATE_LIMIT] Blocked: ${identifier}, requests: ${entry.count}`)
    
    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.blockedUntil,
      blockedUntil: entry.blockedUntil,
    }
  }
  
  return {
    allowed: true,
    remaining: config.maxRequests - entry.count,
    resetAt: entry.windowStart + config.windowMs,
  }
}

/**
 * Create a rate limiter for a specific endpoint.
 */
export function createRateLimiter(config: RateLimitConfig) {
  return (identifier: string) => checkRateLimit(identifier, config)
}

/**
 * Get rate limit headers for HTTP response.
 */
export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(Math.ceil(result.resetAt / 1000)),
    ...(result.blockedUntil && {
      'Retry-After': String(Math.ceil((result.blockedUntil - Date.now()) / 1000)),
    }),
  }
}

/**
 * Extract identifier from request for rate limiting.
 * Uses combination of IP and user ID for more accurate limiting.
 */
export function getRateLimitIdentifier(
  request: Request,
  userId?: string | null
): string {
  // Get IP from various headers (handles proxies)
  const forwardedFor = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  const ip = forwardedFor?.split(',')[0]?.trim() || realIp || 'unknown'
  
  // Combine IP and user ID for more accurate limiting
  if (userId) {
    return `${ip}:${userId}`
  }
  
  return ip
}

/**
 * Reset rate limit for an identifier (e.g., after successful login).
 */
export function resetRateLimit(identifier: string): void {
  rateLimitStore.delete(identifier)
}

/**
 * Manually block an identifier (e.g., detected attack).
 */
export function blockIdentifier(
  identifier: string,
  durationMs: number = 24 * 60 * 60 * 1000
): void {
  const now = Date.now()
  rateLimitStore.set(identifier, {
    count: Infinity,
    windowStart: now,
    blocked: true,
    blockedUntil: now + durationMs,
  })
  console.warn(`[RATE_LIMIT] Manually blocked: ${identifier} until ${new Date(now + durationMs).toISOString()}`)
}
