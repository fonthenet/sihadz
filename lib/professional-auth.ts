/**
 * Resolve professional_id from request - supports both Supabase auth (owner) and employee session.
 * Works for ANY professional type: pharmacy, doctor, laboratory, clinic, ambulance, nurse.
 */
import { NextRequest } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { validateEmployeeSession, EMPLOYEE_SESSION_COOKIE } from '@/lib/employee-auth'

export interface ProfessionalAuthResult {
  professionalId: string
  isEmployee: boolean
  /** User ID (owner) or employee ID (staff) for audit fields like resolved_by, created_by */
  actorId: string
}

/**
 * Get professional_id from the current request. Checks employee session first, then Supabase auth.
 * Returns null if neither is valid.
 * Works for all professional types (pharmacy, doctor, lab, clinic, ambulance, nurse).
 */
export async function getProfessionalIdFromRequest(
  request: NextRequest
): Promise<ProfessionalAuthResult | null> {
  // 1. Check employee session first
  const empToken = request.cookies.get(EMPLOYEE_SESSION_COOKIE)?.value
  if (empToken) {
    const session = await validateEmployeeSession(empToken)
    if (session?.professional?.id) {
      return {
        professionalId: session.professional.id,
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
    .single()

  if (!professional) return null

  return {
    professionalId: professional.id,
    isEmployee: false,
    actorId: user.id,
  }
}
