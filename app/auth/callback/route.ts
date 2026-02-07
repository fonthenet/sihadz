import { createServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getRequestOrigin } from '@/lib/request-origin'

/** Auth-related paths we must never redirect to after successful OAuth/login */
const AUTH_PATHS = ['/auth/reset-password', '/auth/callback', '/auth/signup', '/login', '/register', '/forgot-password']

function sanitizeNext(next: string | null): string | null {
  if (!next || !next.startsWith('/') || next.startsWith('//')) return null
  const path = next.split('?')[0].split('#')[0]
  if (AUTH_PATHS.some((p) => path === p || path.startsWith(p + '/'))) return null
  return next
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  // Use public origin (handles proxy: x-forwarded-* so redirects go to sihadz.com, not localhost)
  const origin = getRequestOrigin(request)
  const code = requestUrl.searchParams.get('code')
  const type = requestUrl.searchParams.get('type')
  const errorParam = requestUrl.searchParams.get('error')
  const errorDescription = requestUrl.searchParams.get('error_description')
  const intendedUserType = requestUrl.searchParams.get('user_type') || 'patient'
  const rawNext = requestUrl.searchParams.get('next')
  const next = sanitizeNext(rawNext)

  // Supabase sends error/error_description in URL when OAuth fails (e.g. redirect URL not allowed)
  if (errorParam) {
    console.error('[auth/callback] OAuth error from Supabase:', errorParam, errorDescription)
    const msg = errorDescription || errorParam
    return NextResponse.redirect(new URL(`/login?error=auth_callback_error&details=${encodeURIComponent(msg)}`, origin))
  }

  if (code) {
    const supabase = await createServerClient()

    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (error) {
      console.error('[auth/callback] exchangeCodeForSession failed:', error.message, error.status)
      return NextResponse.redirect(new URL(`/login?error=auth_callback_error&details=${encodeURIComponent(error.message)}`, origin))
    }
    
    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
        // Only redirect to reset-password when type=recovery AND user signed in via email (not OAuth)
        // Supabase may incorrectly send type=recovery for OAuth - check provider to be sure
        const isOAuthUser = (user.app_metadata?.provider && user.app_metadata.provider !== 'email') ||
          user.identities?.some((i: { provider?: string }) => i.provider && i.provider !== 'email')
        if (type === 'recovery' && !isOAuthUser) {
          return NextResponse.redirect(new URL('/auth/reset-password', origin))
        }

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

        // Not a professional - this is a patient (ALWAYS redirect to /dashboard, never to professional)
        // intendedUserType=patient from URL when they used patient login/register - ensures we never send to pro signup
        // OAuth users (Google, etc.) are auto-approved: is_verified=true since provider verified their email
        if (!profile?.user_type || profile.user_type === 'patient' || intendedUserType === 'patient') {
          const updatePayload: Record<string, unknown> = {
            user_type: 'patient',
            full_name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'User',
          }
          if (isOAuthUser) {
            updatePayload.is_verified = true
          }
          await supabase
            .from('profiles')
            .update(updatePayload)
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

  // Fallback: no code, or code exchange failed, or no user after exchange
  return NextResponse.redirect(new URL('/login?error=auth_callback_error', origin))
}
