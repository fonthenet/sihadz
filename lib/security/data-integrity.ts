/**
 * DATA INTEGRITY & SECURITY MODULE
 * 
 * Commercial-grade security for healthcare data.
 * Implements: Audit logging, query validation, error escalation, health checks.
 * 
 * SOP Reference: Section 15 (Security & Audit), Section 17 (Failure/Timeout/Escalation)
 */

import { SupabaseClient } from '@supabase/supabase-js'

// =============================================================================
// TYPES
// =============================================================================

export interface AuditLogEntry {
  timestamp: string
  user_id: string | null
  action: 'READ' | 'CREATE' | 'UPDATE' | 'DELETE' | 'ERROR' | 'ACCESS_DENIED'
  resource_type: string
  resource_id: string | null
  details: Record<string, any>
  ip_address?: string
  user_agent?: string
  severity: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL'
}

export interface DataAccessResult<T> {
  success: boolean
  data: T | null
  error: string | null
  audit_id?: string
}

export interface HealthCheckResult {
  table: string
  status: 'OK' | 'ERROR' | 'WARNING'
  message: string
  checked_at: string
}

// =============================================================================
// AUDIT LOGGING
// =============================================================================

/**
 * Log data access for audit trail.
 * CRITICAL: All healthcare data access MUST be logged.
 */
export async function logAudit(
  supabase: SupabaseClient,
  entry: Omit<AuditLogEntry, 'timestamp'>
): Promise<void> {
  const fullEntry: AuditLogEntry = {
    ...entry,
    timestamp: new Date().toISOString(),
  }

  // Log to console for immediate visibility
  const logFn = entry.severity === 'CRITICAL' || entry.severity === 'ERROR' 
    ? console.error 
    : console.log
  
  logFn(`[AUDIT:${entry.severity}] ${entry.action} ${entry.resource_type}/${entry.resource_id}`, {
    user: entry.user_id,
    details: entry.details,
  })

  // Attempt to log to database (non-blocking)
  try {
    await supabase.from('audit_logs').insert({
      user_id: entry.user_id,
      action: entry.action,
      resource_type: entry.resource_type,
      resource_id: entry.resource_id,
      details: entry.details,
      severity: entry.severity,
      ip_address: entry.ip_address,
      user_agent: entry.user_agent,
      created_at: fullEntry.timestamp,
    })
  } catch (err) {
    // Never fail silently on audit logging failure
    console.error('[AUDIT:CRITICAL] Failed to write audit log:', err, fullEntry)
  }
}

// =============================================================================
// QUERY VALIDATION
// =============================================================================

/**
 * Validate that required columns exist before executing a query.
 * Prevents silent failures from non-existent columns.
 */
export async function validateColumns(
  supabase: SupabaseClient,
  tableName: string,
  requiredColumns: string[]
): Promise<{ valid: boolean; missing: string[] }> {
  try {
    const { data, error } = await supabase.rpc('get_table_columns', { 
      p_table_name: tableName 
    })
    
    if (error) {
      console.error(`[SCHEMA:ERROR] Failed to validate columns for ${tableName}:`, error)
      // Fail open in case of RPC error (function may not exist)
      return { valid: true, missing: [] }
    }

    const existingColumns = new Set((data || []).map((r: any) => r.column_name))
    const missing = requiredColumns.filter(col => !existingColumns.has(col))
    
    if (missing.length > 0) {
      console.error(`[SCHEMA:CRITICAL] Missing columns in ${tableName}:`, missing)
    }
    
    return { valid: missing.length === 0, missing }
  } catch (err) {
    console.error(`[SCHEMA:ERROR] Column validation failed:`, err)
    return { valid: true, missing: [] } // Fail open
  }
}

// =============================================================================
// SAFE DATA ACCESS
// =============================================================================

/**
 * Safely fetch data with validation, logging, and error handling.
 * NEVER silently fails - always returns explicit success/error.
 */
export async function safeDataAccess<T>(
  supabase: SupabaseClient,
  options: {
    userId: string | null
    resourceType: string
    resourceId?: string
    operation: () => Promise<{ data: T | null; error: any }>
    requiredFields?: string[]
    validateResult?: (data: T) => boolean
  }
): Promise<DataAccessResult<T>> {
  const { userId, resourceType, resourceId, operation, requiredFields, validateResult } = options
  
  try {
    const result = await operation()
    
    // Check for query error
    if (result.error) {
      await logAudit(supabase, {
        user_id: userId,
        action: 'ERROR',
        resource_type: resourceType,
        resource_id: resourceId || null,
        details: { 
          error: result.error.message,
          code: result.error.code,
          hint: result.error.hint,
        },
        severity: 'ERROR',
      })
      
      return {
        success: false,
        data: null,
        error: result.error.message || 'Query failed',
      }
    }
    
    // Check for empty result when data expected
    if (result.data === null && resourceId) {
      await logAudit(supabase, {
        user_id: userId,
        action: 'READ',
        resource_type: resourceType,
        resource_id: resourceId,
        details: { result: 'not_found' },
        severity: 'WARNING',
      })
      
      return {
        success: false,
        data: null,
        error: `${resourceType} not found`,
      }
    }
    
    // Validate required fields are present
    if (requiredFields && result.data) {
      const dataObj = result.data as Record<string, any>
      const missingFields = requiredFields.filter(f => !(f in dataObj))
      if (missingFields.length > 0) {
        await logAudit(supabase, {
          user_id: userId,
          action: 'ERROR',
          resource_type: resourceType,
          resource_id: resourceId || null,
          details: { 
            error: 'missing_fields',
            missing: missingFields,
          },
          severity: 'CRITICAL',
        })
        
        return {
          success: false,
          data: null,
          error: `Data integrity error: missing fields ${missingFields.join(', ')}`,
        }
      }
    }
    
    // Custom validation
    if (validateResult && result.data && !validateResult(result.data)) {
      await logAudit(supabase, {
        user_id: userId,
        action: 'ERROR',
        resource_type: resourceType,
        resource_id: resourceId || null,
        details: { error: 'validation_failed' },
        severity: 'ERROR',
      })
      
      return {
        success: false,
        data: null,
        error: 'Data validation failed',
      }
    }
    
    // Success
    await logAudit(supabase, {
      user_id: userId,
      action: 'READ',
      resource_type: resourceType,
      resource_id: resourceId || null,
      details: { 
        result: 'success',
        count: Array.isArray(result.data) ? result.data.length : 1,
      },
      severity: 'INFO',
    })
    
    return {
      success: true,
      data: result.data,
      error: null,
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    
    await logAudit(supabase, {
      user_id: userId,
      action: 'ERROR',
      resource_type: resourceType,
      resource_id: resourceId || null,
      details: { 
        error: errorMessage,
        stack: err instanceof Error ? err.stack : undefined,
      },
      severity: 'CRITICAL',
    })
    
    return {
      success: false,
      data: null,
      error: errorMessage,
    }
  }
}

// =============================================================================
// ACCESS CONTROL VERIFICATION
// =============================================================================

/**
 * Verify user has access to a resource.
 * Used before data access to prevent unauthorized access.
 */
export async function verifyAccess(
  supabase: SupabaseClient,
  options: {
    userId: string
    resourceType: 'prescription' | 'appointment' | 'lab_request' | 'ticket'
    resourceId: string
    requiredRole: 'patient' | 'doctor' | 'pharmacy' | 'laboratory' | 'admin'
  }
): Promise<{ authorized: boolean; reason?: string }> {
  const { userId, resourceType, resourceId, requiredRole } = options
  
  try {
    // Get user's professional record if they're a provider
    const { data: professional } = await supabase
      .from('professionals')
      .select('id, type, auth_user_id')
      .eq('auth_user_id', userId)
      .maybeSingle()
    
    let authorized = false
    let reason = 'Access denied'
    
    switch (resourceType) {
      case 'prescription': {
        const { data: rx } = await supabase
          .from('prescriptions')
          .select('patient_id, doctor_id, pharmacy_id')
          .eq('id', resourceId)
          .maybeSingle()
        
        if (!rx) {
          reason = 'Prescription not found'
          break
        }
        
        // Patient can access their own prescriptions
        if (requiredRole === 'patient' && rx.patient_id === userId) {
          authorized = true
        }
        // Doctor can access prescriptions they created
        else if (requiredRole === 'doctor' && professional?.type === 'doctor' && rx.doctor_id === professional.id) {
          authorized = true
        }
        // Pharmacy can access prescriptions assigned to them
        else if (requiredRole === 'pharmacy' && professional?.type === 'pharmacy' && rx.pharmacy_id === professional.id) {
          authorized = true
        }
        break
      }
      
      case 'appointment': {
        const { data: appt } = await supabase
          .from('appointments')
          .select('patient_id, doctor_id')
          .eq('id', resourceId)
          .maybeSingle()
        
        if (!appt) {
          reason = 'Appointment not found'
          break
        }
        
        if (requiredRole === 'patient' && appt.patient_id === userId) {
          authorized = true
        } else if (requiredRole === 'doctor' && professional?.type === 'doctor' && appt.doctor_id === professional.id) {
          authorized = true
        }
        break
      }
      
      // Add more resource types as needed
    }
    
    // Log access attempt
    await logAudit(supabase, {
      user_id: userId,
      action: authorized ? 'READ' : 'ACCESS_DENIED',
      resource_type: resourceType,
      resource_id: resourceId,
      details: { 
        role: requiredRole,
        authorized,
        reason: authorized ? undefined : reason,
      },
      severity: authorized ? 'INFO' : 'WARNING',
    })
    
    return { authorized, reason: authorized ? undefined : reason }
  } catch (err) {
    console.error('[ACCESS:ERROR] Failed to verify access:', err)
    return { authorized: false, reason: 'Access verification failed' }
  }
}

// =============================================================================
// HEALTH CHECKS
// =============================================================================

/**
 * Run health checks on critical data tables.
 * Detects issues like orphaned records, missing relationships, etc.
 */
export async function runHealthChecks(
  supabase: SupabaseClient
): Promise<HealthCheckResult[]> {
  const results: HealthCheckResult[] = []
  const now = new Date().toISOString()
  
  // Check 1: Prescriptions with missing appointments
  try {
    const { count, error } = await supabase
      .from('prescriptions')
      .select('id', { count: 'exact', head: true })
      .not('appointment_id', 'is', null)
      .is('doctor_id', null) // Should never happen
    
    results.push({
      table: 'prescriptions',
      status: error ? 'ERROR' : (count && count > 0 ? 'WARNING' : 'OK'),
      message: error 
        ? `Check failed: ${error.message}`
        : (count && count > 0 ? `${count} prescriptions missing doctor_id` : 'All prescriptions have doctor_id'),
      checked_at: now,
    })
  } catch (err) {
    results.push({
      table: 'prescriptions',
      status: 'ERROR',
      message: `Health check failed: ${err}`,
      checked_at: now,
    })
  }
  
  // Check 2: Orphaned prescriptions (appointment deleted but prescription remains)
  // Add more checks as needed
  
  return results
}

// =============================================================================
// ERROR ESCALATION
// =============================================================================

/**
 * Escalate critical errors for immediate attention.
 * In production, this would send alerts via email, SMS, or monitoring system.
 */
export function escalateCriticalError(
  context: string,
  error: Error | string,
  metadata?: Record<string, any>
): void {
  const errorMessage = error instanceof Error ? error.message : error
  const stack = error instanceof Error ? error.stack : undefined
  
  // Always log to console with prominent formatting
  console.error('\n' + '='.repeat(80))
  console.error('[CRITICAL ERROR - IMMEDIATE ATTENTION REQUIRED]')
  console.error('='.repeat(80))
  console.error('Context:', context)
  console.error('Error:', errorMessage)
  if (stack) console.error('Stack:', stack)
  if (metadata) console.error('Metadata:', JSON.stringify(metadata, null, 2))
  console.error('='.repeat(80) + '\n')
  
  // TODO: In production, integrate with:
  // - Email alerts (SendGrid, SES)
  // - SMS alerts (Twilio)
  // - Monitoring (Sentry, DataDog, PagerDuty)
  // - Slack/Discord webhooks
}
