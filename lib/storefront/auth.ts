/**
 * Storefront authentication utilities
 * Works for any professional type (pharmacy, doctor, clinic, lab, etc.)
 */
import { NextRequest } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { validateEmployeeSession, EMPLOYEE_SESSION_COOKIE } from '@/lib/employee-auth'

export interface ProfessionalAuthResult {
  professionalId: string
  professionalType: string
  isEmployee: boolean
  /** User ID (owner) or employee ID (staff) for audit fields */
  actorId: string
}

/**
 * Get professional_id from the current request.
 * Checks employee session first, then Supabase auth.
 * Works for any professional type.
 */
export async function getProfessionalFromRequest(
  request: NextRequest
): Promise<ProfessionalAuthResult | null> {
  // 1. Check employee session first
  const empToken = request.cookies.get(EMPLOYEE_SESSION_COOKIE)?.value
  if (empToken) {
    const session = await validateEmployeeSession(empToken)
    if (session?.professional?.id) {
      return {
        professionalId: session.professional.id,
        professionalType: session.professional.type || 'unknown',
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
    .select('id, type')
    .eq('auth_user_id', user.id)
    .single()

  if (!professional) return null

  return {
    professionalId: professional.id,
    professionalType: professional.type,
    isEmployee: false,
    actorId: user.id,
  }
}
