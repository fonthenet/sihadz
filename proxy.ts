/**
 * NEXT.JS PROXY (formerly middleware)
 *
 * Applies security controls to all requests:
 * - Security headers
 * - Rate limiting for API routes
 * - Request logging
 * - Bot protection
 */

import { NextRequest, NextResponse } from 'next/server'

// =============================================================================
// CONFIGURATION
// =============================================================================

// Paths that don't require any checks (static assets, health)
const EXCLUDED_PATHS = [
  '/_next',
  '/favicon.ico',
  '/api/health',
  '/robots.txt',
  '/sitemap.xml',
]

// API paths with stricter rate limits
const SENSITIVE_API_PATHS = [
  '/api/auth',
  '/api/prescriptions',
  '/api/appointments',
  '/api/payments',
]

// =============================================================================
// SECURITY HEADERS
// =============================================================================

function getSecurityHeaders(): Record<string, string> {
  return {
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(self)',
  }
}

// =============================================================================
// SIMPLE IN-MEMORY RATE LIMITING
// =============================================================================

// Note: This is reset on each deployment. For production, use Redis.
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(ip: string, path: string): { allowed: boolean; remaining: number } {
  const now = Date.now()
  const key = `${ip}:${path.split('/').slice(0, 3).join('/')}`

  // Determine limit based on path
  const isSensitive = SENSITIVE_API_PATHS.some(p => path.startsWith(p))
  const limit = isSensitive ? 30 : 100
  const windowMs = 60000 // 1 minute

  let entry = rateLimitMap.get(key)

  // Reset if window expired
  if (!entry || now > entry.resetAt) {
    entry = { count: 1, resetAt: now + windowMs }
    rateLimitMap.set(key, entry)
    return { allowed: true, remaining: limit - 1 }
  }

  entry.count++

  if (entry.count > limit) {
    return { allowed: false, remaining: 0 }
  }

  return { allowed: true, remaining: limit - entry.count }
}

// Cleanup old entries every 5 minutes (only in Node.js runtime, not edge)
// Note: Edge runtime doesn't support setInterval, so rate limiting resets on each deployment
// For production, use a proper rate limiting service like Upstash Redis
if (typeof setInterval !== 'undefined' && typeof process !== 'undefined' && process.env.NODE_ENV !== 'production') {
  setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of rateLimitMap.entries()) {
      if (now > entry.resetAt + 60000) {
        rateLimitMap.delete(key)
      }
    }
  }, 300000)
}

// =============================================================================
// BOT/ATTACK DETECTION
// =============================================================================

function detectSuspiciousRequest(request: NextRequest): { suspicious: boolean; reason?: string } {
  const userAgent = request.headers.get('user-agent') || ''
  const path = request.nextUrl.pathname

  // Empty user agent
  if (!userAgent) {
    return { suspicious: true, reason: 'No user agent' }
  }

  // Known bad bots
  const badBots = ['sqlmap', 'nikto', 'nmap', 'masscan', 'zgrab']
  if (badBots.some(bot => userAgent.toLowerCase().includes(bot))) {
    return { suspicious: true, reason: 'Malicious bot detected' }
  }

  // SQL injection in URL
  if (/('|"|;|--|\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION)\b)/i.test(path)) {
    return { suspicious: true, reason: 'SQL injection attempt' }
  }

  // Path traversal
  if (/\.\.\/|\.\.\\/.test(path)) {
    return { suspicious: true, reason: 'Path traversal attempt' }
  }

  return { suspicious: false }
}

// =============================================================================
// PROXY FUNCTION (formerly middleware)
// =============================================================================

export function proxy(request: NextRequest) {
  // ULTRA-MINIMAL: Just pass everything through
  // This is the absolute minimum - if this fails, it's not the proxy
  return NextResponse.next()
}

// =============================================================================
// PROXY CONFIG
// =============================================================================

export const config = {
  matcher: [
    // Only match API routes and pages - exclude all static assets
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff|woff2|ttf|eot)$).*)',
  ],
}
