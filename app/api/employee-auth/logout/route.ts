import { NextRequest, NextResponse } from 'next/server'
import { invalidateEmployeeSession, EMPLOYEE_SESSION_COOKIE } from '@/lib/employee-auth'

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get(EMPLOYEE_SESSION_COOKIE)?.value

    if (token) {
      await invalidateEmployeeSession(token)
    }

    // Clear cookie
    const response = NextResponse.json({ success: true })
    response.cookies.delete(EMPLOYEE_SESSION_COOKIE)

    return response
  } catch (error) {
    console.error('Employee logout error:', error)
    return NextResponse.json(
      { error: 'An error occurred during logout' },
      { status: 500 }
    )
  }
}
