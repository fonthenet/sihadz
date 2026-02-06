'use server'

import { createClient } from '@supabase/supabase-js'

// Create a Supabase client with service role key to bypass RLS
function createServiceRoleClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error('Missing Supabase environment variables')
  }
  
  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

/** Check if email is already registered (patient or professional). Blocks signup from the beginning. */
export async function checkEmailRegistered(email: string): Promise<boolean> {
  try {
    const supabase = createServiceRoleClient()
    const { data, error } = await supabase.rpc('check_email_registered', {
      p_email: email?.trim() || ''
    })
    if (error) {
      console.error('[signup] check_email_registered error:', error)
      return false // On error, allow signup attempt (identities check will catch it)
    }
    return !!data
  } catch (err) {
    console.error('[signup] checkEmailRegistered exception:', err)
    return false
  }
}

export async function createProfessionalRecord(data: {
  authUserId: string
  email: string
  phone: string
  businessName: string
  professionalType: string
  specialty: string
}) {
  try {
    const supabase = createServiceRoleClient()
    
    const { error: profError } = await supabase
      .from('professionals')
      .insert({
        auth_user_id: data.authUserId,
        email: data.email,
        phone: data.phone,
        business_name: data.businessName,
        type: data.professionalType,
        specialty: data.specialty || null,
        status: 'verified',
        is_verified: true,
        is_active: true,
        profile_completed: false,
        onboarding_completed: false,
        wilaya: 'Alger',
        commune: 'Alger Centre',
        license_number: `TEMP-${Date.now()}`,
      })
    
    if (profError) {
      console.error('[v0] Server action error creating professional:', profError)
      return { success: false, error: profError.message }
    }

    // Sync profiles so full_name/user_type match professional (auth trigger often sets
    // full_name = email prefix when full_name is missing). user_type must be one of
    // patient|doctor|pharmacy|laboratory|clinic|ambulance|nurse|pharma_supplier|equipment_supplier|admin|super_admin.
    const profileUserType = ['doctor', 'pharmacy', 'laboratory', 'clinic', 'ambulance', 'nurse', 'pharma_supplier', 'equipment_supplier'].includes(data.professionalType)
      ? data.professionalType
      : 'doctor'
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        full_name: data.businessName,
        user_type: profileUserType,
      })
      .eq('id', data.authUserId)

    if (profileError) {
      console.warn('[v0] Could not sync profiles for professional:', profileError.message)
      // Non-fatal: professional record exists; name may show as email prefix in profile-based UI
    }

    return { success: true, error: null }
  } catch (err) {
    console.error('[v0] Server action exception:', err)
    return { success: false, error: 'Failed to create professional record' }
  }
}
