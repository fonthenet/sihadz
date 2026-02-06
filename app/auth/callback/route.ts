import { createServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getRequestOrigin } from '@/lib/request-origin'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  // Use public origin (handles proxy: x-forwarded-* so redirects go to sihadz.com, not localhost)
  const origin = getRequestOrigin(request)
  const code = requestUrl.searchParams.get('code')
  const type = requestUrl.searchParams.get('type')
  const intendedUserType = requestUrl.searchParams.get('user_type') || 'patient'
  const next = requestUrl.searchParams.get('next')

  if (code) {
    const supabase = await createServerClient()

    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    // After exchanging the code, check if this is a password recovery flow
    // Only redirect to reset-password if it's an actual password recovery (not OAuth)
    if (!error && type === 'recovery') {
      const { data: { user } } = await supabase.auth.getUser()
      
      // Check if user signed in via OAuth (providers like google, github, etc.)
      // OAuth users have app_metadata.provider or providers array
      const isOAuthUser = user?.app_metadata?.provider || 
                          (user?.app_metadata?.providers && user.app_metadata.providers.length > 0) ||
                          user?.identities?.some(identity => identity.provider !== 'email')
      
      // Only redirect to password reset if NOT an OAuth user
      if (!isOAuthUser) {
        return NextResponse.redirect(new URL(`/auth/reset-password?code=${code}`, origin))
      }
      // OAuth users skip password reset and continue to normal flow below
    }
    
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
          if (next && next.startsWith('/')) {
            return NextResponse.redirect(new URL(next, origin))
          }
          return NextResponse.redirect(new URL('/super-admin', origin))
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
            return NextResponse.redirect(new URL('/professional/auth/login?error=rejected', origin))
          }

          if (professional.status === 'suspended') {
            return NextResponse.redirect(new URL('/professional/auth/login?error=suspended', origin))
          }

          // Check if onboarding is complete
          if (!professional.onboarding_completed || !professional.profile_completed) {
            return NextResponse.redirect(new URL('/professional/onboarding', origin))
          }

          // Pro accounts cannot book – always professional dashboard (never patient paths)
          if (next && next.startsWith('/professional/')) {
            return NextResponse.redirect(new URL(next, origin))
          }
          return NextResponse.redirect(new URL('/professional/dashboard', origin))
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
          return NextResponse.redirect(new URL(next, origin))
        }

        // Default: patient dashboard
        return NextResponse.redirect(new URL('/dashboard', origin))
      }
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(new URL('/login?error=auth_callback_error', origin))
}
