/**
 * Employee Authentication Utilities
 * 
 * PIN-based authentication system for professional employees.
 * Uses bcrypt for PIN hashing and cryptographically secure tokens for sessions.
 */

import { createAdminClient } from '@/lib/supabase/server'
import bcrypt from 'bcryptjs'
import { randomBytes } from 'crypto'

// ============================================================================
// Types
// ============================================================================

export interface EmployeePermissions {
  dashboard: {
    overview: boolean
    patients: boolean
    appointments: boolean
    messages: boolean
    finances: boolean
    analytics: boolean
    settings: boolean
    requests: boolean
    samples: boolean
    results: boolean
    equipment: boolean
    prescriptions: boolean
    orders: boolean
    inventory: boolean
    delivery: boolean
    documents: boolean
    lab_requests: boolean
    /** Point of Sale (pharmacy only) */
    pos: boolean
    /** Chifa / CNAS (pharmacy only) */
    chifa: boolean
  }
  actions: {
    create_appointments: boolean
    cancel_appointments: boolean
    view_patient_details: boolean
    create_prescriptions: boolean
    process_orders: boolean
    manage_inventory: boolean
    view_reports: boolean
    manage_employees: boolean
    manage_settings: boolean
  }
  data: {
    view_all_patients: boolean
    view_financial_data: boolean
    export_data: boolean
  }
}

export interface EmployeeRole {
  id: string
  professional_id: string
  name: string
  description: string | null
  permissions: EmployeePermissions
  is_system: boolean
  is_active: boolean
}

export interface Employee {
  id: string
  professional_id: string
  role_id: string | null
  username: string
  display_name: string
  phone: string | null
  email: string | null
  avatar_url: string | null
  is_active: boolean
  last_login: string | null
  login_count: number
  permissions_override: Partial<EmployeePermissions> | null
  notes: string | null
  created_at: string
  role?: EmployeeRole
}

export interface EmployeeSession {
  id: string
  employee_id: string
  session_token: string
  expires_at: string
  ip_address: string | null
  user_agent: string | null
  created_at: string
  last_activity: string
  employee?: Employee
}

export interface AuthenticatedEmployee {
  employee: Employee
  professional: {
    id: string
    business_name: string
    type: string
    practice_code: string
  }
  permissions: EmployeePermissions
  session: {
    id: string
    token: string
    expires_at: string
  }
}

// ============================================================================
// Constants
// ============================================================================

const BCRYPT_ROUNDS = 10
const SESSION_EXPIRY_HOURS = 24
const MAX_LOGIN_ATTEMPTS = 5
const LOCKOUT_MINUTES = 15
const SESSION_TOKEN_BYTES = 32

export const EMPLOYEE_SESSION_COOKIE = 'employee_session'

// ============================================================================
// PIN Hashing
// ============================================================================

/**
 * Hash a PIN using bcrypt
 */
export async function hashPin(pin: string): Promise<string> {
  return bcrypt.hash(pin, BCRYPT_ROUNDS)
}

/**
 * Verify a PIN against its hash
 */
export async function verifyPin(pin: string, hash: string): Promise<boolean> {
  return bcrypt.compare(pin, hash)
}

/**
 * Validate PIN format (4-6 digits)
 */
export function validatePinFormat(pin: string): boolean {
  return /^\d{4,6}$/.test(pin)
}

/**
 * Generate a random PIN (for initial setup or reset)
 */
export function generateRandomPin(length: number = 4): string {
  const digits = '0123456789'
  let pin = ''
  for (let i = 0; i < length; i++) {
    pin += digits.charAt(Math.floor(Math.random() * digits.length))
  }
  return pin
}

// ============================================================================
// Session Management
// ============================================================================

/**
 * Generate a cryptographically secure session token
 */
export function generateSessionToken(): string {
  return randomBytes(SESSION_TOKEN_BYTES).toString('hex')
}

/**
 * Calculate session expiry date
 */
export function getSessionExpiry(): Date {
  const expiry = new Date()
  expiry.setHours(expiry.getHours() + SESSION_EXPIRY_HOURS)
  return expiry
}

/**
 * Create a new employee session
 */
export async function createEmployeeSession(
  employeeId: string,
  ipAddress?: string,
  userAgent?: string
): Promise<{ token: string; expiresAt: string } | null> {
  const supabase = createAdminClient()
  
  const token = generateSessionToken()
  const expiresAt = getSessionExpiry().toISOString()
  
  const { error } = await supabase
    .from('employee_sessions')
    .insert({
      employee_id: employeeId,
      session_token: token,
      expires_at: expiresAt,
      ip_address: ipAddress,
      user_agent: userAgent,
    })
  
  if (error) {
    console.error('Failed to create employee session:', error)
    return null
  }
  
  // Update employee's last_login and login_count
  await supabase
    .from('professional_employees')
    .update({
      last_login: new Date().toISOString(),
      login_count: supabase.rpc('increment_login_count', { emp_id: employeeId }),
    })
    .eq('id', employeeId)
  
  return { token, expiresAt }
}

/**
 * Validate a session token and return the employee if valid
 */
export async function validateEmployeeSession(token: string): Promise<AuthenticatedEmployee | null> {
  if (!token) return null
  
  const supabase = createAdminClient()
  
  // Get session with employee and professional info
  const { data: session, error } = await supabase
    .from('employee_sessions')
    .select(`
      id,
      session_token,
      expires_at,
      employee:professional_employees!employee_id (
        id,
        professional_id,
        role_id,
        username,
        display_name,
        phone,
        email,
        avatar_url,
        is_active,
        permissions_override,
        role:employee_roles!role_id (
          id,
          name,
          description,
          permissions,
          is_system
        )
      )
    `)
    .eq('session_token', token)
    .gt('expires_at', new Date().toISOString())
    .single()
  
  if (error || !session) {
    return null
  }
  
  const employee = session.employee as any
  if (!employee || !employee.is_active) {
    return null
  }
  
  // Get professional info
  const { data: professional } = await supabase
    .from('professionals')
    .select('id, business_name, type, practice_code')
    .eq('id', employee.professional_id)
    .single()
  
  if (!professional) {
    return null
  }
  
  // Update last activity
  await supabase
    .from('employee_sessions')
    .update({ last_activity: new Date().toISOString() })
    .eq('id', session.id)
  
  // Merge permissions (role + overrides)
  const rolePermissions = employee.role?.permissions || getDefaultPermissions()
  const permissions = mergePermissions(rolePermissions, employee.permissions_override)
  
  return {
    employee: {
      id: employee.id,
      professional_id: employee.professional_id,
      role_id: employee.role_id,
      username: employee.username,
      display_name: employee.display_name,
      phone: employee.phone,
      email: employee.email,
      avatar_url: employee.avatar_url,
      is_active: employee.is_active,
      last_login: null,
      login_count: 0,
      permissions_override: employee.permissions_override,
      notes: null,
      created_at: '',
      role: employee.role,
    },
    professional: {
      id: professional.id,
      business_name: professional.business_name,
      type: professional.type,
      practice_code: professional.practice_code,
    },
    permissions,
    session: {
      id: session.id,
      token: session.session_token,
      expires_at: session.expires_at,
    },
  }
}

/**
 * Invalidate a session (logout)
 */
export async function invalidateEmployeeSession(token: string): Promise<boolean> {
  const supabase = createAdminClient()
  
  const { error } = await supabase
    .from('employee_sessions')
    .delete()
    .eq('session_token', token)
  
  return !error
}

/**
 * Invalidate all sessions for an employee
 */
export async function invalidateAllEmployeeSessions(employeeId: string): Promise<boolean> {
  const supabase = createAdminClient()
  
  const { error } = await supabase
    .from('employee_sessions')
    .delete()
    .eq('employee_id', employeeId)
  
  return !error
}

// ============================================================================
// Rate Limiting
// ============================================================================

/**
 * Check if login is rate limited
 */
export async function checkRateLimit(
  professionalId: string,
  username: string,
  ipAddress?: string
): Promise<{ allowed: boolean; remainingAttempts: number; lockoutEnds?: string }> {
  const supabase = createAdminClient()
  
  const cutoff = new Date()
  cutoff.setMinutes(cutoff.getMinutes() - LOCKOUT_MINUTES)
  
  // Count recent failed attempts
  const { count, error } = await supabase
    .from('employee_login_attempts')
    .select('*', { count: 'exact', head: true })
    .eq('professional_id', professionalId)
    .eq('username', username)
    .eq('success', false)
    .gte('attempted_at', cutoff.toISOString())
  
  if (error) {
    console.error('Rate limit check error:', error)
    return { allowed: true, remainingAttempts: MAX_LOGIN_ATTEMPTS }
  }
  
  const attempts = count || 0
  const remaining = Math.max(0, MAX_LOGIN_ATTEMPTS - attempts)
  
  if (attempts >= MAX_LOGIN_ATTEMPTS) {
    const lockoutEnd = new Date()
    lockoutEnd.setMinutes(lockoutEnd.getMinutes() + LOCKOUT_MINUTES)
    return {
      allowed: false,
      remainingAttempts: 0,
      lockoutEnds: lockoutEnd.toISOString(),
    }
  }
  
  return { allowed: true, remainingAttempts: remaining }
}

/**
 * Record a login attempt
 */
export async function recordLoginAttempt(
  professionalId: string,
  username: string,
  success: boolean,
  ipAddress?: string
): Promise<void> {
  const supabase = createAdminClient()
  
  await supabase
    .from('employee_login_attempts')
    .insert({
      professional_id: professionalId,
      username,
      success,
      ip_address: ipAddress,
    })
}

// ============================================================================
// Authentication
// ============================================================================

export interface LoginResult {
  success: boolean
  error?: string
  employee?: AuthenticatedEmployee
  token?: string
}

/**
 * Authenticate an employee with practice code, username, and PIN
 */
export async function authenticateEmployee(
  practiceCode: string,
  username: string,
  pin: string,
  ipAddress?: string,
  userAgent?: string
): Promise<LoginResult> {
  const supabase = createAdminClient()
  
  // Find professional by practice code
  const { data: professional, error: profError } = await supabase
    .from('professionals')
    .select('id, business_name, type, practice_code')
    .eq('practice_code', practiceCode.toUpperCase())
    .single()
  
  if (profError || !professional) {
    return { success: false, error: 'Invalid practice code' }
  }
  
  // Check rate limit
  const rateCheck = await checkRateLimit(professional.id, username, ipAddress)
  if (!rateCheck.allowed) {
    return {
      success: false,
      error: `Too many failed attempts. Try again after ${LOCKOUT_MINUTES} minutes.`,
    }
  }
  
  // Find employee
  const { data: employee, error: empError } = await supabase
    .from('professional_employees')
    .select(`
      *,
      role:employee_roles!role_id (
        id,
        name,
        description,
        permissions,
        is_system
      )
    `)
    .eq('professional_id', professional.id)
    .eq('username', username.toLowerCase())
    .eq('is_active', true)
    .single()
  
  if (empError || !employee) {
    await recordLoginAttempt(professional.id, username, false, ipAddress)
    return {
      success: false,
      error: `Invalid credentials. ${rateCheck.remainingAttempts - 1} attempts remaining.`,
    }
  }
  
  // Verify PIN
  const pinValid = await verifyPin(pin, employee.pin_hash)
  if (!pinValid) {
    await recordLoginAttempt(professional.id, username, false, ipAddress)
    return {
      success: false,
      error: `Invalid credentials. ${rateCheck.remainingAttempts - 1} attempts remaining.`,
    }
  }
  
  // Record successful attempt
  await recordLoginAttempt(professional.id, username, true, ipAddress)
  
  // Create session
  const session = await createEmployeeSession(employee.id, ipAddress, userAgent)
  if (!session) {
    return { success: false, error: 'Failed to create session' }
  }
  
  // Merge permissions
  const rolePermissions = employee.role?.permissions || getDefaultPermissions()
  const permissions = mergePermissions(rolePermissions, employee.permissions_override)
  
  return {
    success: true,
    token: session.token,
    employee: {
      employee: {
        id: employee.id,
        professional_id: employee.professional_id,
        role_id: employee.role_id,
        username: employee.username,
        display_name: employee.display_name,
        phone: employee.phone,
        email: employee.email,
        avatar_url: employee.avatar_url,
        is_active: employee.is_active,
        last_login: new Date().toISOString(),
        login_count: employee.login_count + 1,
        permissions_override: employee.permissions_override,
        notes: employee.notes,
        created_at: employee.created_at,
        role: employee.role,
      },
      professional,
      permissions,
      session: {
        id: '',
        token: session.token,
        expires_at: session.expiresAt,
      },
    },
  }
}

// ============================================================================
// Permission Helpers
// ============================================================================

/**
 * Get default (empty) permissions
 */
export function getDefaultPermissions(): EmployeePermissions {
  return {
    dashboard: {
      overview: false,
      patients: false,
      appointments: false,
      messages: false,
      finances: false,
      analytics: false,
      settings: false,
      requests: false,
      samples: false,
      results: false,
      equipment: false,
      prescriptions: false,
      orders: false,
      inventory: false,
      delivery: false,
      documents: false,
      lab_requests: false,
      pos: false,
      chifa: false,
    },
    actions: {
      create_appointments: false,
      cancel_appointments: false,
      view_patient_details: false,
      create_prescriptions: false,
      process_orders: false,
      manage_inventory: false,
      view_reports: false,
      manage_employees: false,
      manage_settings: false,
    },
    data: {
      view_all_patients: false,
      view_financial_data: false,
      export_data: false,
    },
  }
}

/**
 * Merge base permissions with overrides
 */
export function mergePermissions(
  base: EmployeePermissions,
  overrides?: Partial<EmployeePermissions> | null
): EmployeePermissions {
  if (!overrides) return base
  
  return {
    dashboard: { ...base.dashboard, ...overrides.dashboard },
    actions: { ...base.actions, ...overrides.actions },
    data: { ...base.data, ...overrides.data },
  }
}

/**
 * Check if employee has a specific permission
 */
export function hasPermission(
  permissions: EmployeePermissions,
  category: 'dashboard' | 'actions' | 'data',
  permission: string
): boolean {
  const categoryPerms = permissions[category] as Record<string, boolean>
  return categoryPerms?.[permission] === true
}

/**
 * Check multiple permissions (AND logic)
 */
export function hasAllPermissions(
  permissions: EmployeePermissions,
  checks: Array<{ category: 'dashboard' | 'actions' | 'data'; permission: string }>
): boolean {
  return checks.every(({ category, permission }) =>
    hasPermission(permissions, category, permission)
  )
}

/**
 * Check multiple permissions (OR logic)
 */
export function hasAnyPermission(
  permissions: EmployeePermissions,
  checks: Array<{ category: 'dashboard' | 'actions' | 'data'; permission: string }>
): boolean {
  return checks.some(({ category, permission }) =>
    hasPermission(permissions, category, permission)
  )
}
