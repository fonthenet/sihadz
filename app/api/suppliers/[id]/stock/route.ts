import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAvailableQuantities } from '@/lib/supplier/stock-validation'

/**
 * GET - Get available stock for products from a supplier (for buyers).
 * Query: product_ids=id1,id2,id3 (comma-separated)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: supplierId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: buyer } = await supabase
      .from('professionals')
      .select('id')
      .eq('auth_user_id', user.id)
      .maybeSingle()

    if (!buyer) {
      return NextResponse.json({ error: 'Professional profile not found' }, { status: 404 })
    }

    const { data: link } = await supabase
      .from('supplier_buyer_links')
      .select('id')
      .eq('supplier_id', supplierId)
      .eq('buyer_id', buyer.id)
      .eq('status', 'active')
      .single()

    const { data: settings } = await supabase
      .from('supplier_settings')
      .select('accept_orders_from_anyone')
      .eq('supplier_id', supplierId)
      .single()

    if (!link && !settings?.accept_orders_from_anyone) {
      return NextResponse.json({ error: 'Not authorized to view this supplier\'s stock' }, { status: 403 })
    }

    const productIdsParam = request.nextUrl.searchParams.get('product_ids')
    if (!productIdsParam) {
      return NextResponse.json({ error: 'product_ids query parameter is required' }, { status: 400 })
    }
    const productIds = productIdsParam.split(',').map(s => s.trim()).filter(Boolean)
    if (productIds.length === 0) {
      return NextResponse.json({ error: 'At least one product_id is required' }, { status: 400 })
    }
    if (productIds.length > 100) {
      return NextResponse.json({ error: 'Maximum 100 product_ids per request' }, { status: 400 })
    }

    const stock = await getAvailableQuantities(supabase, supplierId, productIds)
    return NextResponse.json({ data: stock })
  } catch (error) {
    console.error('Error in supplier stock GET:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
