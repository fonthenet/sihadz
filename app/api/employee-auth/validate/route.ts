import { NextRequest, NextResponse } from 'next/server'
import { validateEmployeeSession, EMPLOYEE_SESSION_COOKIE } from '@/lib/employee-auth'

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

    return NextResponse.json({
      valid: true,
      employee: {
        id: session.employee.id,
        displayName: session.employee.display_name,
        username: session.employee.username,
        role: session.employee.role?.name,
        avatarUrl: session.employee.avatar_url,
      },
      professional: {
        id: session.professional.id,
        businessName: session.professional.business_name,
        type: session.professional.type,
      },
      permissions: session.permissions,
      expiresAt: session.session.expires_at,
    })
  } catch (error) {
    console.error('Session validation error:', error)
    return NextResponse.json(
      { valid: false, error: 'Validation error' },
      { status: 500 }
    )
  }
}
