import { createServerClient } from '@/lib/supabase/server'

/**
 * Verifies the request is from a super admin or admin.
 * Returns { user, profile } or throws/returns error.
 */
export async function requireSuperAdmin() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { user: null, profile: null, error: 'Unauthorized' as const }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('user_type')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile?.user_type || !['admin', 'super_admin'].includes(profile.user_type)) {
    return { user: null, profile: null, error: 'Admin access required' as const }
  }

  return { user, profile, error: null }
}
