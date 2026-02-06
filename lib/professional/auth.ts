/**
 * Resolve professional_id from request - supports any professional type.
 * Used by professional POS (doctor, nurse, lab, clinic, ambulance).
 * Supports both Supabase auth (owner) and employee session.
 */
import { NextRequest } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { validateEmployeeSession, EMPLOYEE_SESSION_COOKIE } from '@/lib/employee-auth'

export interface ProfessionalAuthResult {
  professionalId: string
  isEmployee: boolean
  /** User ID (owner) or employee ID (staff) for audit fields */
  actorId: string
}

/** Professional types that have POS (excludes pharmacy - uses pharmacy-specific POS) */
export const POS_PROFESSIONAL_TYPES = ['doctor', 'nurse', 'laboratory', 'clinic', 'ambulance'] as const

/**
 * Get professional_id from the current request for any professional type.
 * Checks employee session first, then Supabase auth.
 * Returns null if neither is valid.
 */
export async function getProfessionalIdFromRequest(
  request: NextRequest,
  /** If set, only allow these professional types (e.g. for POS: doctor, lab, clinic, etc.) */
  allowedTypes?: readonly string[]
): Promise<ProfessionalAuthResult | null> {
  // 1. Check employee session first
  const empToken = request.cookies.get(EMPLOYEE_SESSION_COOKIE)?.value
  if (empToken) {
    const session = await validateEmployeeSession(empToken)
    if (session?.professional?.id) {
      if (allowedTypes && !allowedTypes.includes(session.professional.type)) {
        return null
      }
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

  let query = supabase
    .from('professionals')
    .select('id, type')
    .eq('auth_user_id', user.id)

  if (allowedTypes && allowedTypes.length > 0) {
    query = query.in('type', allowedTypes as string[])
  }

  const { data: professional } = await query.single()

  if (!professional) return null

  return {
    professionalId: professional.id,
    isEmployee: false,
    actorId: user.id,
  }
}
