/**
 * GET /api/documents/professional - List professional's documents (by category)
 * Supports both owner (Supabase auth) and employee (PIN session) logins.
 */

import { createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { validateEmployeeSession, EMPLOYEE_SESSION_COOKIE } from '@/lib/employee-auth'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    let professionalId: string | null = null

    // 1. Check employee session first (PIN-based staff login)
    const empToken = request.cookies.get(EMPLOYEE_SESSION_COOKIE)?.value
    if (empToken) {
      const session = await validateEmployeeSession(empToken)
      if (session?.professional?.id) {
        professionalId = session.professional.id
      }
    }

    // 2. Fall back to Supabase auth (owner login)
    if (!professionalId) {
      const supabase = await createServerClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

      const { data: prof } = await supabase.from('professionals').select('id').eq('auth_user_id', user.id).maybeSingle()
      professionalId = prof?.id ?? null
    }

    if (!professionalId) return NextResponse.json({ error: 'Not a professional' }, { status: 403 })

    // Use admin client when from employee session (no Supabase auth), else RLS applies
    const client = empToken ? createAdminClient() : await createServerClient()
    const { data, error } = await client
      .from('professional_documents')
      .select('*')
      .eq('professional_id', professionalId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[documents/professional]', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ documents: data ?? [] })
  } catch (e) {
    console.error('[documents/professional]', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
