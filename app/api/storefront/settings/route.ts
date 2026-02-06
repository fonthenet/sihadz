import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getProfessionalFromRequest } from '@/lib/storefront/auth'
import type { StorefrontSettings, StorefrontSettingsFormData } from '@/lib/storefront/types'

/**
 * GET /api/storefront/settings
 * Get storefront settings for the authenticated professional
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await getProfessionalFromRequest(request)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = createAdminClient()

    // Get settings or return defaults
    const { data: settings, error } = await admin
      .from('storefront_settings')
      .select('*')
      .eq('professional_id', auth.professionalId)
      .maybeSingle()

    if (error) {
      console.error('[Storefront Settings] Error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // If no settings exist, return defaults
    if (!settings) {
      const defaults: Partial<StorefrontSettings> = {
        professional_id: auth.professionalId,
        is_enabled: false,
        storefront_name: null,
        storefront_name_ar: null,
        storefront_description: null,
        storefront_description_ar: null,
        banner_image_url: null,
        pickup_enabled: true,
        delivery_enabled: false,
        delivery_fee: 0,
        delivery_radius_km: null,
        delivery_notes: null,
        accept_cash_on_pickup: true,
        accept_online_payment: false,
        min_order_amount: 0,
        preparation_time_minutes: 30,
        order_hours: null,
      }
      return NextResponse.json({ settings: defaults, isNew: true })
    }

    return NextResponse.json({ settings, isNew: false })
  } catch (error: any) {
    console.error('[Storefront Settings] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * PATCH /api/storefront/settings
 * Update storefront settings for the authenticated professional
 */
export async function PATCH(request: NextRequest) {
  try {
    const auth = await getProfessionalFromRequest(request)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: StorefrontSettingsFormData = await request.json()
    const admin = createAdminClient()

    // Check if settings exist
    const { data: existing } = await admin
      .from('storefront_settings')
      .select('id')
      .eq('professional_id', auth.professionalId)
      .maybeSingle()

    let settings: StorefrontSettings

    if (existing) {
      // Update existing
      const { data, error } = await admin
        .from('storefront_settings')
        .update({
          ...body,
          updated_at: new Date().toISOString(),
        })
        .eq('professional_id', auth.professionalId)
        .select()
        .single()

      if (error) {
        console.error('[Storefront Settings] Update error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
      settings = data
    } else {
      // Create new
      const { data, error } = await admin
        .from('storefront_settings')
        .insert({
          professional_id: auth.professionalId,
          ...body,
        })
        .select()
        .single()

      if (error) {
        console.error('[Storefront Settings] Insert error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
      settings = data
    }

    return NextResponse.json({ settings })
  } catch (error: any) {
    console.error('[Storefront Settings] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
