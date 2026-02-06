/**
 * Resolve pharmacy_id from request - supports both Supabase auth (owner) and employee session.
 */
import { NextRequest } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { validateEmployeeSession, EMPLOYEE_SESSION_COOKIE } from '@/lib/employee-auth'

export interface PharmacyAuthResult {
  pharmacyId: string
  isEmployee: boolean
  /** User ID (owner) or employee ID (staff) for audit fields like resolved_by, created_by */
  actorId: string
}

/**
 * Get pharmacy_id from the current request. Checks employee session first, then Supabase auth.
 * Returns null if neither is valid.
 */
export async function getPharmacyIdFromRequest(
  request: NextRequest
): Promise<PharmacyAuthResult | null> {
  // 1. Check employee session first
  const empToken = request.cookies.get(EMPLOYEE_SESSION_COOKIE)?.value
  if (empToken) {
    const session = await validateEmployeeSession(empToken)
    if (session?.professional?.id) {
      return {
        pharmacyId: session.professional.id,
        isEmployee: true,
        actorId: session.employee.id,
      }
    }
  }

  // 2. Fall back to Supabase auth (owner)
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: professional } = await supabase
    .from('professionals')
    .select('id')
    .eq('auth_user_id', user.id)
    .eq('type', 'pharmacy')
    .single()

  if (!professional) return null

  return {
    pharmacyId: professional.id,
    isEmployee: false,
    actorId: user.id,
  }
}
