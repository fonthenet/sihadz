/**
 * API SECURITY
 * 
 * Security headers, CORS, CSRF protection, and request validation.
 * Based on OWASP API Security Top 10.
 */

import { NextRequest, NextResponse } from 'next/server'
import { detectMaliciousInput } from './input-validation'
import { checkRateLimit, RATE_LIMITS, getRateLimitIdentifier, getRateLimitHeaders } from './rate-limiting'

// =============================================================================
// SECURITY HEADERS
// =============================================================================

/**
 * Get security headers for API responses.
 * Based on OWASP recommendations.
 */
export function getSecurityHeaders(): Record<string, string> {
  return {
    // Prevent clickjacking
    'X-Frame-Options': 'DENY',
    
    // Prevent MIME type sniffing
    'X-Content-Type-Options': 'nosniff',
    
    // Enable XSS filter
    'X-XSS-Protection': '1; mode=block',
    
    // Control referrer information
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    
    // Permissions policy (restrict browser features)
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(self)',
    
    // Content Security Policy
    'Content-Security-Policy': [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self' data:",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
      "frame-ancestors 'none'",
    ].join('; '),
    
    // HSTS (only in production)
    ...(process.env.NODE_ENV === 'production' && {
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
    }),
  }
}

/**
 * Apply security headers to a NextResponse.
 */
export function applySecurityHeaders(response: NextResponse): NextResponse {
  const headers = getSecurityHeaders()
  for (const [key, value] of Object.entries(headers)) {
    response.headers.set(key, value)
  }
  return response
}

// =============================================================================
// API REQUEST VALIDATION
// =============================================================================

export interface ApiSecurityCheck {
  allowed: boolean
  reason?: string
  statusCode?: number
  headers?: Record<string, string>
}

/**
 * Comprehensive API security check.
 * Run this at the start of every API route.
 */
export async function validateApiRequest(
  request: NextRequest,
  options: {
    requireAuth?: boolean
    userId?: string | null
    rateLimit?: keyof typeof RATE_LIMITS
    allowedMethods?: string[]
    checkMaliciousInput?: boolean
  } = {}
): Promise<ApiSecurityCheck> {
  const { 
    requireAuth = false, 
    userId = null,
    rateLimit,
    allowedMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    checkMaliciousInput = true,
  } = options
  
  // 1. Check HTTP method
  if (!allowedMethods.includes(request.method)) {
    return {
      allowed: false,
      reason: `Method ${request.method} not allowed`,
      statusCode: 405,
    }
  }
  
  // 2. Check authentication if required
  if (requireAuth && !userId) {
    return {
      allowed: false,
      reason: 'Authentication required',
      statusCode: 401,
    }
  }
  
  // 3. Rate limiting
  if (rateLimit) {
    const identifier = getRateLimitIdentifier(request, userId)
    const result = checkRateLimit(identifier, RATE_LIMITS[rateLimit])
    
    if (!result.allowed) {
      return {
        allowed: false,
        reason: 'Rate limit exceeded',
        statusCode: 429,
        headers: getRateLimitHeaders(result),
      }
    }
  }
  
  // 4. Check for malicious input in query params
  if (checkMaliciousInput) {
    const url = new URL(request.url)
    for (const [key, value] of url.searchParams.entries()) {
      const check = detectMaliciousInput(value)
      if (check.isMalicious) {
        console.warn(`[API_SECURITY] Malicious input detected in param ${key}:`, check.threats)
        return {
          allowed: false,
          reason: 'Invalid request',
          statusCode: 400,
        }
      }
    }
  }
  
  return { allowed: true }
}

/**
 * Validate request body for malicious content.
 */
export async function validateRequestBody(
  request: NextRequest
): Promise<{ valid: boolean; body: any; error?: string }> {
  try {
    const contentType = request.headers.get('content-type') || ''
    
    if (!contentType.includes('application/json')) {
      return { valid: false, body: null, error: 'Content-Type must be application/json' }
    }
    
    const body = await request.json()
    
    // Check for malicious input in body values
    const checkValue = (value: unknown, path: string): string | null => {
      if (typeof value === 'string') {
        const check = detectMaliciousInput(value)
        if (check.isMalicious) {
          console.warn(`[API_SECURITY] Malicious input at ${path}:`, check.threats)
          return `Invalid value at ${path}`
        }
      } else if (Array.isArray(value)) {
        for (let i = 0; i < value.length; i++) {
          const error = checkValue(value[i], `${path}[${i}]`)
          if (error) return error
        }
      } else if (typeof value === 'object' && value !== null) {
        for (const [k, v] of Object.entries(value)) {
          const error = checkValue(v, `${path}.${k}`)
          if (error) return error
        }
      }
      return null
    }
    
    const error = checkValue(body, 'body')
    if (error) {
      return { valid: false, body: null, error }
    }
    
    return { valid: true, body }
  } catch (e) {
    return { valid: false, body: null, error: 'Invalid JSON body' }
  }
}

// =============================================================================
// ERROR RESPONSES (Don't leak internal details)
// =============================================================================

/**
 * Create a safe error response that doesn't leak internal details.
 */
export function createErrorResponse(
  error: unknown,
  options: {
    statusCode?: number
    publicMessage?: string
    includeDebug?: boolean
  } = {}
): NextResponse {
  const { 
    statusCode = 500, 
    publicMessage = 'An error occurred',
    includeDebug = process.env.NODE_ENV === 'development',
  } = options
  
  // Log the full error internally
  console.error('[API_ERROR]', error)
  
  // Only include debug info in development
  const responseBody: Record<string, any> = {
    error: publicMessage,
  }
  
  if (includeDebug && error instanceof Error) {
    responseBody.debug = {
      message: error.message,
      name: error.name,
    }
  }
  
  const response = NextResponse.json(responseBody, { status: statusCode })
  return applySecurityHeaders(response)
}

/**
 * Create a success response with security headers.
 */
export function createSuccessResponse(
  data: unknown,
  statusCode: number = 200
): NextResponse {
  const response = NextResponse.json(data, { status: statusCode })
  return applySecurityHeaders(response)
}

// =============================================================================
// REQUEST LOGGING
// =============================================================================

/**
 * Log API request for monitoring (without sensitive data).
 */
export function logApiRequest(
  request: NextRequest,
  options: {
    userId?: string | null
    action?: string
    resourceType?: string
    resourceId?: string
  } = {}
): void {
  const { userId, action, resourceType, resourceId } = options
  
  // Never log sensitive headers or body content
  console.log('[API_REQUEST]', {
    method: request.method,
    path: new URL(request.url).pathname,
    userId: userId || 'anonymous',
    action,
    resourceType,
    resourceId,
    timestamp: new Date().toISOString(),
  })
}

// =============================================================================
// CORS CONFIGURATION
// =============================================================================

/**
 * Get CORS headers for API responses.
 */
export function getCorsHeaders(origin?: string | null): Record<string, string> {
  const allowedOrigins = [
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.NEXT_PUBLIC_SITE_URL,
    'http://sihadz.com',
    'https://sihadz.com',
    'http://localhost:3000',
  ].filter(Boolean)
  
  const isAllowed = origin && allowedOrigins.includes(origin)
  
  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : allowedOrigins[0] || '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400', // 24 hours
  }
}

/**
 * Handle CORS preflight request.
 */
export function handleCorsPreflightRequest(request: NextRequest): NextResponse {
  const origin = request.headers.get('origin')
  const response = new NextResponse(null, { status: 204 })
  
  const corsHeaders = getCorsHeaders(origin)
  for (const [key, value] of Object.entries(corsHeaders)) {
    response.headers.set(key, value)
  }
  
  return response
}
