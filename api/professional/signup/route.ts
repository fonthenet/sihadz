import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

// Create a Supabase client with the service role key for admin operations
// This bypasses RLS policies
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

export async function POST(request: NextRequest) {
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

    // Send confirmation email
    const { error: emailError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'signup',
      email: email,
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL || request.headers.get('origin')}/professional/onboarding`
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
