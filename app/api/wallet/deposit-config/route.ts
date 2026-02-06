import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// ============================================================================
// GET /api/wallet/deposit-config - Get deposit configuration
// ============================================================================
export async function GET(request: NextRequest) {
  try {
    const admin = createAdminClient()
    
    const { searchParams } = new URL(request.url)
    const providerType = searchParams.get('provider_type')
    const professionalId = searchParams.get('professional_id')
    
    // Build query - get most specific config
    let query = admin
      .from('deposit_configuration')
      .select('*')
      .eq('is_active', true)
      .order('professional_id', { ascending: false, nullsFirst: false })
      .order('provider_type', { ascending: false, nullsFirst: false })
    
    // Try to get provider-specific config first
    if (professionalId) {
      const { data: profConfig } = await admin
        .from('deposit_configuration')
        .select('*')
        .eq('professional_id', professionalId)
        .eq('is_active', true)
        .single()
      
      if (profConfig) {
        return NextResponse.json({ config: profConfig })
      }
    }
    
    // Try provider type config
    if (providerType) {
      const { data: typeConfig } = await admin
        .from('deposit_configuration')
        .select('*')
        .eq('provider_type', providerType)
        .is('professional_id', null)
        .eq('is_active', true)
        .single()
      
      if (typeConfig) {
        return NextResponse.json({ config: typeConfig })
      }
    }
    
    // Fall back to global config
    const { data: globalConfig, error } = await admin
      .from('deposit_configuration')
      .select('*')
      .is('provider_type', null)
      .is('professional_id', null)
      .eq('is_active', true)
      .single()
    
    if (error || !globalConfig) {
      // Return default if no config found
      return NextResponse.json({
        config: {
          min_amount: 300,
          max_amount: 500,
          default_amount: 400
        }
      })
    }
    
    return NextResponse.json({ config: globalConfig })
    
  } catch (error: any) {
    console.error('Deposit config error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
