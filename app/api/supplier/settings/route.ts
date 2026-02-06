import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { SupplierSettingsInput } from '@/lib/supplier/types'

// GET - Get supplier settings
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: professional } = await supabase
      .from('professionals')
      .select('id, type')
      .eq('auth_user_id', user.id)
      .in('type', ['pharma_supplier', 'equipment_supplier'])
      .maybeSingle()

    if (!professional) {
      return NextResponse.json({ error: 'Supplier profile not found' }, { status: 404 })
    }

    // Get or create settings
    let { data: settings } = await supabase
      .from('supplier_settings')
      .select('*')
      .eq('supplier_id', professional.id)
      .single()

    if (!settings) {
      // Create default settings
      const { data: newSettings, error } = await supabase
        .from('supplier_settings')
        .insert({
          supplier_id: professional.id,
          default_shipping_cost: 0,
          default_payment_terms: 'cash',
          default_lead_time_days: 3,
          auto_accept_orders: false,
          accept_orders_from_anyone: true,
          notify_new_orders: true,
          notify_new_link_requests: true,
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating settings:', error)
        return NextResponse.json({ error: 'Failed to create settings' }, { status: 500 })
      }

      settings = newSettings
    }

    return NextResponse.json(settings)
  } catch (error) {
    console.error('Error in supplier settings GET:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH - Update supplier settings
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: professional } = await supabase
      .from('professionals')
      .select('id, type')
      .eq('auth_user_id', user.id)
      .in('type', ['pharma_supplier', 'equipment_supplier'])
      .maybeSingle()

    if (!professional) {
      return NextResponse.json({ error: 'Supplier profile not found' }, { status: 404 })
    }

    const body: SupplierSettingsInput = await request.json()

    // Only update allowed fields (ignore id, created_at, etc.)
    const allowedKeys: (keyof SupplierSettingsInput)[] = [
      'min_order_value', 'free_shipping_threshold', 'default_shipping_cost',
      'default_payment_terms', 'default_lead_time_days',
      'auto_accept_orders', 'accept_orders_from_anyone',
      'business_hours', 'notify_new_orders', 'notify_new_link_requests',
    ]
    const payload: Record<string, unknown> = { supplier_id: professional.id }
    for (const key of allowedKeys) {
      if (body[key] !== undefined) payload[key] = body[key]
    }

    // Upsert settings
    const { data: settings, error } = await supabase
      .from('supplier_settings')
      .upsert(payload, { onConflict: 'supplier_id' })
      .select()
      .single()

    if (error) {
      console.error('Error updating settings:', error)
      return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 })
    }

    return NextResponse.json(settings)
  } catch (error) {
    console.error('Error in supplier settings PATCH:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
