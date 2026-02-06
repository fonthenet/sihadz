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

export async function createProfessionalRecord(data: {
  authUserId: string
  email: string
  phone: string
  businessName: string
  professionalType: string
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
    
    return { success: true, error: null }
  } catch (err) {
    console.error('[v0] Server action exception:', err)
    return { success: false, error: 'Failed to create professional record' }
  }
}
