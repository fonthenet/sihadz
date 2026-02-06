import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const type = requestUrl.searchParams.get('type')
  const intendedUserType = requestUrl.searchParams.get('user_type') || 'patient'
  const next = requestUrl.searchParams.get('next')

  if (code) {
    // If this is a password recovery flow, redirect to reset-password page
    if (type === 'recovery') {
      return NextResponse.redirect(new URL(`/auth/reset-password?code=${code}`, requestUrl.origin))
    }
    const cookieStore = await cookies()
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            } catch {
              // The `setAll` method was called from a Server Component.
              // This can be ignored if you have middleware refreshing sessions.
            }
          },
        },
      }
    )

    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        // Super admin emails list
        const SUPER_ADMIN_EMAILS = [
          'f.onthenet@gmail.com',
          'info@sihadz.com',
          // Add more admin emails as needed
        ]
        
        const isSuperAdmin = SUPER_ADMIN_EMAILS.includes(user.email || '')
        
        // Check if profile exists - use maybeSingle to avoid 406 errors
        const { data: profile } = await supabase
          .from('profiles')
          .select('user_type, full_name, email, phone')
          .eq('id', user.id)
          .maybeSingle()

        // CRITICAL: Check if this user is a PROFESSIONAL first
        // This is the single source of truth for professional users
        // Use maybeSingle() to gracefully handle non-professionals
        const { data: professional } = await supabase
          .from('professionals')
          .select('id, type, status, onboarding_completed, profile_completed, is_verified')
          .eq('auth_user_id', user.id)
          .maybeSingle()

        // If super admin, always set user_type to super_admin
        if (isSuperAdmin) {
          await supabase
            .from('profiles')
            .update({
              user_type: 'super_admin',
              full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Admin',
            })
            .eq('id', user.id)
          return NextResponse.redirect(new URL('/super-admin', requestUrl.origin))
        }

        // If user is a professional, route them appropriately
        if (professional) {
          // Update profile to mark as professional (for reference)
          await supabase
            .from('profiles')
            .update({
              user_type: 'professional',
              full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Professional',
            })
            .eq('id', user.id)

          // Check professional status
          if (professional.status === 'rejected') {
            return NextResponse.redirect(new URL('/professional/auth/login?error=rejected', requestUrl.origin))
          }

          if (professional.status === 'suspended') {
            return NextResponse.redirect(new URL('/professional/auth/login?error=suspended', requestUrl.origin))
          }

          // Check if onboarding is complete
          if (!professional.onboarding_completed || !professional.profile_completed) {
            return NextResponse.redirect(new URL('/professional/onboarding', requestUrl.origin))
          }

          // All good - go to professional dashboard
          return NextResponse.redirect(new URL('/professional/dashboard', requestUrl.origin))
        }

        // Not a professional - this is a patient
        if (!profile?.user_type || profile.user_type === 'patient') {
          await supabase
            .from('profiles')
            .update({
              user_type: 'patient',
              full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
            })
            .eq('id', user.id)
        }
        
        // Link guest bookings to the newly authenticated user
        const userEmail = user.email || profile?.email
        const userPhone = profile?.phone
        
        if (userEmail || userPhone) {
          if (userEmail) {
            await supabase
              .from('appointments')
              .update({ 
                patient_id: user.id,
                guest_linked_to_user_id: user.id 
              })
              .eq('is_guest_booking', true)
              .eq('guest_email', userEmail)
              .is('patient_id', null)
          }
          
          if (userPhone) {
            await supabase
              .from('appointments')
              .update({ 
                patient_id: user.id,
                guest_linked_to_user_id: user.id 
              })
              .eq('is_guest_booking', true)
              .eq('guest_phone', userPhone)
              .is('patient_id', null)
          }
        }

        // If next param is provided, use it for patients
        if (next) {
          return NextResponse.redirect(new URL(next, requestUrl.origin))
        }

        // Default: patient dashboard
        return NextResponse.redirect(new URL('/dashboard', requestUrl.origin))
      }
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(new URL('/login?error=auth_callback_error', requestUrl.origin))
}
