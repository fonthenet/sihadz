'use server'

import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function requireProfessional() {
  const supabase = await createServerClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    redirect('/professional/auth/login')
  }

  // Check if user is a professional - use maybeSingle to avoid 406 errors
  const { data: professional, error: profError } = await supabase
    .from('professionals')
    .select('*')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (profError || !professional) {
    // Not a professional - sign them out and redirect
    await supabase.auth.signOut()
    redirect('/professional/auth/login?error=not_professional')
  }

  return { user, professional }
}

export async function requireCompletedProfile() {
  const { user, professional } = await requireProfessional()
  
  const supabase = await createServerClient()
  
  // Check if profile is complete - use maybeSingle to avoid 406 errors
  const { data: profile } = await supabase
    .from('professional_profiles')
    .select('*')
    .eq('professional_id', professional.id)
    .maybeSingle()

  if (!profile || !profile.is_complete) {
    redirect('/professional/onboarding')
  }

  return { user, professional, profile }
}

export async function requirePatient() {
  const supabase = await createServerClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    redirect('/login')
  }

  // Check that user is NOT a professional - use maybeSingle to avoid 406 errors
  const { data: professional } = await supabase
    .from('professionals')
    .select('id')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (professional) {
    // This is a professional account trying to access patient area
    redirect('/professional/dashboard')
  }

  return { user }
}
