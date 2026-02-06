/**
 * Fetch the current user's profile on the server (before first paint).
 * This is why other sites don't flash "Account" - they get the name from the server.
 * The session cookie is read server-side, so we have the user before sending HTML.
 */
import { createClient } from '@/lib/supabase/server'

export type ServerProfile = {
  id: string
  email: string
  full_name: string
  full_name_ar: string | null
  phone: string | null
  user_type: 'patient' | 'doctor' | 'nurse' | 'pharmacy' | 'laboratory' | 'clinic' | 'admin' | 'professional' | 'super_admin'
  avatar_url: string | null
  is_verified: boolean
  business_name?: string | null
} | null

export async function getServerProfile(): Promise<ServerProfile> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data: professional } = await supabase
      .from('professionals')
      .select('type, business_name')
      .eq('auth_user_id', user.id)
      .maybeSingle()

    if (professional?.type) {
      const { data: profData } = await supabase
        .from('profiles')
        .select('id, email, full_name, full_name_ar, phone, avatar_url, is_verified')
        .eq('id', user.id)
        .maybeSingle()
      const base = profData
        ? { ...profData, user_type: professional.type, business_name: professional.business_name ?? null }
        : { id: user.id, email: user.email ?? '', full_name: '', full_name_ar: null, phone: null, avatar_url: null, is_verified: false, user_type: professional.type, business_name: professional.business_name ?? null }
      return base as ServerProfile
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, full_name, full_name_ar, phone, avatar_url, is_verified')
      .eq('id', user.id)
      .maybeSingle()

    if (data && !error) {
      return { ...data, user_type: 'patient', business_name: null } as ServerProfile
    }
    return null
  } catch {
    return null
  }
}
