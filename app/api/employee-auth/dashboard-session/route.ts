import { NextRequest, NextResponse } from 'next/server'
import { validateEmployeeSession, EMPLOYEE_SESSION_COOKIE } from '@/lib/employee-auth'
import { createAdminClient } from '@/lib/supabase/server'

/**
 * Returns dashboard data for authenticated employees.
 * Used when employee lands on /professional/dashboard after PIN login.
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get(EMPLOYEE_SESSION_COOKIE)?.value

    if (!token) {
      return NextResponse.json(
        { valid: false, error: 'No session token' },
        { status: 401 }
      )
    }

    const session = await validateEmployeeSession(token)

    if (!session) {
      const response = NextResponse.json(
        { valid: false, error: 'Invalid or expired session' },
        { status: 401 }
      )
      response.cookies.delete(EMPLOYEE_SESSION_COOKIE)
      return response
    }

    // Fetch full professional record for dashboard
    const supabase = createAdminClient()
    const { data: professional, error: profError } = await supabase
      .from('professionals')
      .select('*')
      .eq('id', session.professional.id)
      .single()

    if (profError || !professional) {
      return NextResponse.json(
        { valid: false, error: 'Professional not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      valid: true,
      employee: {
        id: session.employee.id,
        displayName: session.employee.display_name,
        username: session.employee.username,
        role: session.employee.role?.name,
        avatarUrl: session.employee.avatar_url,
      },
      professional,
      permissions: session.permissions,
      expiresAt: session.session.expires_at,
    })
  } catch (error) {
    console.error('Dashboard session error:', error)
    return NextResponse.json(
      { valid: false, error: 'Session validation failed' },
      { status: 500 }
    )
  }
}
