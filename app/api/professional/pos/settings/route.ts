import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getProfessionalIdFromRequest, POS_PROFESSIONAL_TYPES } from '@/lib/professional/auth'

/**
 * GET /api/professional/pos/settings
 * Get POS settings (Chifa on/off, card on/off) for the professional
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await getProfessionalIdFromRequest(request, POS_PROFESSIONAL_TYPES)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = createAdminClient()
    const { data: settings, error } = await admin
      .from('professional_pos_settings')
      .select('*')
      .eq('professional_id', auth.professionalId)
      .single()

    if (error && error.code !== 'PGRST116') {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Default settings if none exist
    const defaults = {
      chifa_enabled: false,
      card_enabled: true,
    }

    return NextResponse.json({
      settings: settings || {
        id: null,
        professional_id: auth.professionalId,
        ...defaults,
      },
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * PUT /api/professional/pos/settings
 * Update POS settings (Chifa on/off, card on/off)
 */
export async function PUT(request: NextRequest) {
  try {
    const auth = await getProfessionalIdFromRequest(request, POS_PROFESSIONAL_TYPES)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = createAdminClient()
    const body = await request.json()
    const { chifa_enabled, card_enabled } = body

    const { data: settings, error } = await admin
      .from('professional_pos_settings')
      .upsert(
        {
          professional_id: auth.professionalId,
          chifa_enabled: chifa_enabled ?? false,
          card_enabled: card_enabled ?? true,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'professional_id',
          ignoreDuplicates: false,
        }
      )
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      settings,
      message: 'POS settings updated',
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
