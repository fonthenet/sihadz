/**
 * HEALTH CHECK ENDPOINT
 * 
 * Returns system health status including:
 * - Database connectivity
 * - Circuit breaker states
 * - Data integrity checks
 * 
 * Used by monitoring systems, load balancers, and incident response.
 */

import { NextRequest, NextResponse } from 'next/server'

// Helper to safely import modules
async function safeImport(modulePath: string, exportName: string) {
  try {
    const module = await import(modulePath)
    return module[exportName] || null
  } catch (e) {
    return null
  }
}

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  version: string
  checks: {
    database: { status: string; latency_ms?: number; error?: string }
    circuitBreakers: Record<string, any>
    dataIntegrity?: { status: string; issues?: any[] }
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now()
  
  // Load optional modules
  const createAdminClient = await safeImport('@/lib/supabase/admin', 'createAdminClient')
  const getCircuitBreakerHealth = await safeImport('@/lib/security/circuit-breaker', 'getCircuitBreakerHealth')
  const getSecurityHeaders = await safeImport('@/lib/security/api-security', 'getSecurityHeaders')
  
  const result: HealthCheckResult = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    checks: {
      database: { status: 'unknown' },
      circuitBreakers: {},
    },
  }
  
  // Check 1: Database connectivity
  if (createAdminClient) {
    try {
      const dbStart = Date.now()
      const supabase = createAdminClient()
      const { error } = await supabase.from('professionals').select('id').limit(1)
      const dbLatency = Date.now() - dbStart
      
      if (error) {
        result.checks.database = { 
          status: 'error', 
          latency_ms: dbLatency,
          error: error.message 
        }
        result.status = 'unhealthy'
      } else {
        result.checks.database = { 
          status: 'ok', 
          latency_ms: dbLatency 
        }
        
        // Warn if database is slow
        if (dbLatency > 1000) {
          result.checks.database.status = 'slow'
          if (result.status === 'healthy') result.status = 'degraded'
        }
      }
    } catch (e) {
      result.checks.database = { 
        status: 'error', 
        error: e instanceof Error ? e.message : 'Unknown error' 
      }
      result.status = 'unhealthy'
    }
  } else {
    result.checks.database = { status: 'skipped', error: 'Admin client not available' }
  }
  
  // Check 2: Circuit breaker states
  if (getCircuitBreakerHealth) {
    try {
      result.checks.circuitBreakers = getCircuitBreakerHealth()
      const openCircuits = Object.values(result.checks.circuitBreakers)
        .filter((cb: any) => cb.state === 'OPEN')
      
      if (openCircuits.length > 0) {
        if (result.status === 'healthy') result.status = 'degraded'
      }
    } catch (e) {
      result.checks.circuitBreakers = { error: e instanceof Error ? e.message : 'Unknown error' }
    }
  } else {
    result.checks.circuitBreakers = { status: 'skipped' }
  }
  
  // Check 3: Data integrity (only if explicitly requested - expensive)
  const includeIntegrity = request.nextUrl.searchParams.get('integrity') === 'true'
  if (includeIntegrity && createAdminClient) {
    try {
      const supabase = createAdminClient()
      const { data: integrityResults, error } = await supabase.rpc('check_data_integrity')
      
      if (error) {
        result.checks.dataIntegrity = { 
          status: 'error',
          issues: [{ error: error.message }]
        }
      } else {
        const criticalIssues = (integrityResults || [])
          .filter((r: any) => r.status === 'CRITICAL' && r.issue_count > 0)
        
        result.checks.dataIntegrity = {
          status: criticalIssues.length > 0 ? 'issues_found' : 'ok',
          issues: integrityResults,
        }
        
        if (criticalIssues.length > 0) {
          result.status = 'unhealthy'
        }
      }
    } catch (e) {
      result.checks.dataIntegrity = {
        status: 'error',
        issues: [{ error: e instanceof Error ? e.message : 'Unknown error' }]
      }
    }
  }
  
  // Determine HTTP status code
  const statusCode = result.status === 'healthy' ? 200 
    : result.status === 'degraded' ? 200 
    : 503
  
  const response = NextResponse.json(result, { status: statusCode })
  
  // Add security headers if available
  if (getSecurityHeaders) {
    try {
      const securityHeaders = getSecurityHeaders()
      for (const [key, value] of Object.entries(securityHeaders)) {
        response.headers.set(key, value as string)
      }
    } catch (e) {
      // If security headers fail, continue anyway
    }
  }
  
  // Add caching headers (don't cache health checks)
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate')
  response.headers.set('X-Response-Time', `${Date.now() - startTime}ms`)
  
  return response
}
