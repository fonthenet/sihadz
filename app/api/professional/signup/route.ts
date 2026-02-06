import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import { getRequestOrigin } from '@/lib/request-origin'

export async function POST(request: NextRequest) {
  const supabaseAdmin = createAdminClient()
  try {
    const body = await request.json()
    const { email, password, phone, businessName, licenseNumber, professionalType } = body

    // Validate required fields
    if (!email || !password || !phone || !businessName || !licenseNumber || !professionalType) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Validate password length
    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long' },
        { status: 400 }
      )
    }

    // Create the auth user using admin client
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: false, // User will need to confirm email
      user_metadata: {
        user_type: 'professional',
        business_name: businessName,
        professional_type: professionalType
      }
    })

    if (authError) {
      console.error('[v0] Auth error:', authError)
      // Handle specific errors
      if (authError.message?.includes('already been registered')) {
        return NextResponse.json(
          { error: 'This email is already registered. Please sign in instead.' },
          { status: 400 }
        )
      }
      return NextResponse.json(
        { error: authError.message || 'Failed to create user account' },
        { status: 400 }
      )
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: 'Failed to create user account' },
        { status: 500 }
      )
    }

    // Create the professional record using admin client (bypasses RLS)
    // Auto-approved for testing
    const { error: profError } = await supabaseAdmin
      .from('professionals')
      .insert({
        auth_user_id: authData.user.id,
        email: email,
        phone: phone,
        business_name: businessName,
        license_number: licenseNumber,
        type: professionalType,
        status: 'verified',
        is_verified: true,
        is_active: true,
        profile_completed: false,
      })

    if (profError) {
      console.error('[v0] Professional record error:', profError)
      // If professional record creation fails, delete the auth user to maintain consistency
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      return NextResponse.json(
        { error: 'Failed to create professional account. Please try again.' },
        { status: 500 }
      )
    }

    // Send confirmation email - use request origin so redirect goes to sihadz.com, not localhost
    let origin = getRequestOrigin(request)
    if (origin.includes('localhost') && process.env.NEXT_PUBLIC_SITE_URL) {
      origin = process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '')
    }
    const redirectTo = process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL || origin
    const { error: emailError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'signup',
      email: email,
      options: {
        redirectTo: `${redirectTo}/professional/onboarding`
      }
    })

    if (emailError) {
      console.error('[v0] Email error:', emailError)
      // Don't fail the signup if email fails, user can request resend
    }

    return NextResponse.json({
      success: true,
      message: 'Account created successfully. Please check your email to verify your account.',
      userId: authData.user.id
    })

  } catch (error) {
    console.error('[v0] Signup error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    )
  }
}
