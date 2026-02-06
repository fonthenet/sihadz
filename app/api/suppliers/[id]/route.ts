import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET - Get supplier details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: buyer } = await supabase
      .from('professionals')
      .select('id, type')
      .eq('auth_user_id', user.id)
      .maybeSingle()

    if (!buyer) {
      return NextResponse.json({ error: 'Professional profile not found' }, { status: 404 })
    }

    const { data: supplier, error } = await supabase
      .from('professionals')
      .select('id, business_name, type, email, phone, wilaya, commune, address_line1, status')
      .eq('id', id)
      .in('type', ['pharma_supplier', 'equipment_supplier'])
      .eq('status', 'verified')
      .single()

    if (error || !supplier) {
      return NextResponse.json({ error: 'Supplier not found' }, { status: 404 })
    }

    const { data: link } = await supabase
      .from('supplier_buyer_links')
      .select('*')
      .eq('supplier_id', id)
      .eq('buyer_id', buyer.id)
      .single()

    const { count: productCount } = await supabase
      .from('supplier_product_catalog')
      .select('id', { count: 'exact', head: true })
      .eq('supplier_id', id)
      .eq('is_active', true)

    const { data: settings } = await supabase
      .from('supplier_settings')
      .select('min_order_value, free_shipping_threshold, default_shipping_cost, default_lead_time_days')
      .eq('supplier_id', id)
      .single()

    return NextResponse.json({
      ...supplier,
      product_count: productCount || 0,
      is_linked: !!link,
      link_status: link?.status || null,
      link: link || null,
      settings: settings || null,
    })
  } catch (error) {
    console.error('Error in supplier GET:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
