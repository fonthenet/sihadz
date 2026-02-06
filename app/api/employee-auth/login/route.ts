import { NextRequest, NextResponse } from 'next/server'
import { authenticateEmployee, EMPLOYEE_SESSION_COOKIE } from '@/lib/employee-auth'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { practiceCode, username, pin } = body

    // Validate required fields
    if (!practiceCode || !username || !pin) {
      return NextResponse.json(
        { error: 'Practice code, username, and PIN are required' },
        { status: 400 }
      )
    }

    // Validate PIN format
    if (!/^\d{4,6}$/.test(pin)) {
      return NextResponse.json(
        { error: 'PIN must be 4-6 digits' },
        { status: 400 }
      )
    }

    // Get client info for session
    const ipAddress = request.headers.get('x-forwarded-for') || 
                      request.headers.get('x-real-ip') || 
                      'unknown'
    const userAgent = request.headers.get('user-agent') || undefined

    // Authenticate
    const result = await authenticateEmployee(
      practiceCode,
      username,
      pin,
      ipAddress,
      userAgent
    )

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 401 }
      )
    }

    // Create response with session cookie
    const response = NextResponse.json({
      success: true,
      employee: {
        id: result.employee!.employee.id,
        displayName: result.employee!.employee.display_name,
        username: result.employee!.employee.username,
        role: result.employee!.employee.role?.name,
        avatarUrl: result.employee!.employee.avatar_url,
      },
      professional: {
        id: result.employee!.professional.id,
        businessName: result.employee!.professional.business_name,
        type: result.employee!.professional.type,
      },
      permissions: result.employee!.permissions,
      expiresAt: result.employee!.session.expires_at,
    })

    // Set httpOnly cookie
    response.cookies.set(EMPLOYEE_SESSION_COOKIE, result.token!, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      expires: new Date(result.employee!.session.expires_at),
    })

    return response
  } catch (error) {
    console.error('Employee login error:', error)
    return NextResponse.json(
      { error: 'An error occurred during login' },
      { status: 500 }
    )
  }
}
