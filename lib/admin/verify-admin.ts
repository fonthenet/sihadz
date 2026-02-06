/**
 * Admin Verification Helper
 * Centralized admin access verification
 */

import { SupabaseClient } from '@supabase/supabase-js'

// Super admin emails that bypass database check
export const SUPER_ADMIN_EMAILS = [
  'f.onthenet@gmail.com',
  'info@sihadz.com',
]

export interface AdminVerifyResult {
  isAdmin: boolean
  isSuperAdmin: boolean
  userId: string | null
  email: string | null
  error?: string
}

/**
 * Verify if the current user has admin access
 * Uses dual verification: email whitelist + database user_type
 */
export async function verifyAdminAccess(
  supabase: SupabaseClient
): Promise<AdminVerifyResult> {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return {
        isAdmin: false,
        isSuperAdmin: false,
        userId: null,
        email: null,
        error: 'Not authenticated'
      }
    }
    
    // Get profile with user_type
    const { data: profile } = await supabase
      .from('profiles')
      .select('user_type, email')
      .eq('id', user.id)
      .single()
    
    const userEmail = profile?.email || user.email || ''
    
    // Check email whitelist first (super admin only)
    const isEmailSuperAdmin = SUPER_ADMIN_EMAILS.includes(userEmail)
    
    // Check database user_type
    const isDbSuperAdmin = profile?.user_type === 'super_admin'
    const isDbAdmin = profile?.user_type === 'admin'
    
    const isSuperAdmin = isEmailSuperAdmin || isDbSuperAdmin
    const isAdmin = isSuperAdmin || isDbAdmin
    
    return {
      isAdmin,
      isSuperAdmin,
      userId: user.id,
      email: userEmail
    }
  } catch (error: any) {
    return {
      isAdmin: false,
      isSuperAdmin: false,
      userId: null,
      email: null,
      error: error.message
    }
  }
}

/**
 * Quick check if email is a super admin
 */
export function isSuperAdminEmail(email: string): boolean {
  return SUPER_ADMIN_EMAILS.includes(email)
}
