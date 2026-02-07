'use client'

import { useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase/client'
import { FullPageLoading } from '@/components/ui/page-loading'

const AUTH_PATHS = ['/auth/reset-password', '/auth/callback', '/auth/signup', '/login', '/register', '/forgot-password']
const SUPER_ADMIN_EMAILS = ['f.onthenet@gmail.com', 'info@sihadz.com']

function sanitizeNext(next: string | null): string | null {
  if (!next || !next.startsWith('/') || next.startsWith('//')) return null
  const path = next.split('?')[0].split('#')[0]
  if (AUTH_PATHS.some((p) => path === p || path.startsWith(p + '/'))) return null
  return next
}

function AuthCallbackHandler() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const processedRef = useRef(false)

  useEffect(() => {
    if (processedRef.current) return
    processedRef.current = true

    const errorParam = searchParams.get('error')
    const errorDescription = searchParams.get('error_description')
    const code = searchParams.get('code')
    const type = searchParams.get('type')
    const intendedUserType = searchParams.get('user_type') || 'patient'
    const rawNext = searchParams.get('next')
    const next = sanitizeNext(rawNext)

    const supabase = createBrowserClient()

    async function redirectToMainIfSignedIn(): Promise<boolean> {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        router.replace('/')
        return true
      }
      return false
    }

    // OAuth error from Supabase (e.g. redirect URL not allowed)
    if (errorParam) {
      const msg = errorDescription || errorParam
      ;(async () => {
        if (await redirectToMainIfSignedIn()) return
        router.replace(`/login?error=auth_callback_error&details=${encodeURIComponent(msg)}`)
      })()
      return
    }

    if (!code) {
      ;(async () => {
        if (await redirectToMainIfSignedIn()) return
        router.replace('/login?error=auth_callback_error')
      })()
      return
    }

    ;(async () => {
      // Client-side exchange: PKCE code_verifier is in browser cookies, so this succeeds
      // where server-side exchange fails with "invalid flow state"
      const { error } = await supabase.auth.exchangeCodeForSession(code)

      if (error) {
        if (await redirectToMainIfSignedIn()) return
        router.replace(`/login?error=auth_callback_error&details=${encodeURIComponent(error.message)}`)
        return
      }

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        if (await redirectToMainIfSignedIn()) return
        router.replace('/login?error=auth_callback_error')
        return
      }

      const isOAuthUser =
        (user.app_metadata?.provider && user.app_metadata.provider !== 'email') ||
        user.identities?.some((i: { provider?: string }) => i.provider && i.provider !== 'email')

      if (type === 'recovery' && !isOAuthUser) {
        router.replace('/auth/reset-password')
        return
      }

      const isSuperAdmin = SUPER_ADMIN_EMAILS.includes(user.email || '')

      const { data: profile } = await supabase
        .from('profiles')
        .select('user_type, full_name, email, phone')
        .eq('id', user.id)
        .maybeSingle()

      const { data: professional } = await supabase
        .from('professionals')
        .select('id, type, status, onboarding_completed, profile_completed, is_verified')
        .eq('auth_user_id', user.id)
        .maybeSingle()

      // Super admin
      if (isSuperAdmin) {
        await supabase
          .from('profiles')
          .update({
            user_type: 'super_admin',
            full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Admin',
          })
          .eq('id', user.id)
        router.replace(next && next.startsWith('/') ? next : '/super-admin')
        return
      }

      // Professional
      if (professional) {
        await supabase
          .from('profiles')
          .update({
            user_type: 'professional',
            full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Professional',
          })
          .eq('id', user.id)

        if (professional.status === 'rejected') {
          router.replace('/professional/auth/login?error=rejected')
          return
        }
        if (professional.status === 'suspended') {
          router.replace('/professional/auth/login?error=suspended')
          return
        }
        if (!professional.onboarding_completed || !professional.profile_completed) {
          router.replace('/professional/onboarding')
          return
        }
        router.replace(next?.startsWith('/professional/') ? next : '/professional/dashboard')
        return
      }

      // Patient: update profile, link guest bookings, redirect
      if (!profile?.user_type || profile.user_type === 'patient' || intendedUserType === 'patient') {
        const updatePayload: Record<string, unknown> = {
          user_type: 'patient',
          full_name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'User',
        }
        if (isOAuthUser) {
          updatePayload.is_verified = true
        }
        await supabase.from('profiles').update(updatePayload).eq('id', user.id)
      }

      const userEmail = user.email || profile?.email
      const userPhone = profile?.phone
      if (userEmail) {
        await supabase
          .from('appointments')
          .update({ patient_id: user.id, guest_linked_to_user_id: user.id })
          .eq('is_guest_booking', true)
          .eq('guest_email', userEmail)
          .is('patient_id', null)
      }
      if (userPhone) {
        await supabase
          .from('appointments')
          .update({ patient_id: user.id, guest_linked_to_user_id: user.id })
          .eq('is_guest_booking', true)
          .eq('guest_phone', userPhone)
          .is('patient_id', null)
      }

      router.replace(next && next.startsWith('/') ? next : '/dashboard')
    })()
  }, [router, searchParams])

  return <FullPageLoading />
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<FullPageLoading />}>
      <AuthCallbackHandler />
    </Suspense>
  )
}
