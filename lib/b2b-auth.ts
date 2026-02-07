import { createServerClient } from '@/lib/supabase/server'
import { validateEmployeeSession, EMPLOYEE_SESSION_COOKIE } from '@/lib/employee-auth'
import type { NextRequest } from 'next/server'

export interface B2BProfessional {
  id: string
  type: string
}

/**
 * Get the current professional for B2B APIs.
 * Supports both Supabase auth (owner) and employee session (staff PIN).
 */
export async function getB2BProfessional(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  request: NextRequest
): Promise<{ user: { id: string } | null; professional: B2BProfessional | null; isEmployee: boolean }> {
  const empToken = request.cookies.get(EMPLOYEE_SESSION_COOKIE)?.value
  if (empToken) {
    const session = await validateEmployeeSession(empToken)
    if (session?.professional) {
      const pro = session.professional as { id: string; type: string }
      return { user: { id: '' }, professional: { id: pro.id, type: pro.type }, isEmployee: true }
    }
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { user: null, professional: null, isEmployee: false }
  const { data: professional } = await supabase
    .from('professionals')
    .select('id, type')
    .eq('auth_user_id', user.id)
    .single()
  return { user, professional, isEmployee: false }
}
