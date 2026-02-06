import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET - List pricing tiers
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

    const searchParams = request.nextUrl.searchParams
    const product_id = searchParams.get('product_id')
    const buyer_group_id = searchParams.get('buyer_group_id')
    const buyer_id = searchParams.get('buyer_id')

    let query = supabase
      .from('supplier_pricing_tiers')
      .select(`
        *,
        product:supplier_product_catalog(id, name, unit_price),
        buyer_group:supplier_buyer_groups(id, name),
        buyer:professionals!supplier_pricing_tiers_buyer_id_fkey(id, business_name)
      `)
      .eq('supplier_id', professional.id)
      .order('priority', { ascending: true })
      .order('min_quantity', { ascending: true })

    if (product_id) {
      query = query.eq('product_id', product_id)
    }
    if (buyer_group_id) {
      query = query.eq('buyer_group_id', buyer_group_id)
    }
    if (buyer_id) {
      query = query.eq('buyer_id', buyer_id)
    }

    const { data: tiers, error } = await query

    if (error) {
      console.error('Error fetching pricing tiers:', error)
      return NextResponse.json({ error: 'Failed to fetch pricing tiers' }, { status: 500 })
    }

    return NextResponse.json({ data: tiers || [] })
  } catch (error: any) {
    console.error('Error in pricing tiers GET:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Create pricing tier
export async function POST(request: NextRequest) {
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

    const body = await request.json()
    const { product_id, buyer_group_id, buyer_id, min_quantity, max_quantity, discount_percent, fixed_price, priority } = body

    // Validate: Must have exactly one target
    const targetCount = [product_id, buyer_group_id, buyer_id].filter(Boolean).length
    if (targetCount !== 1) {
      return NextResponse.json({ error: 'Must specify exactly one: product_id, buyer_group_id, or buyer_id' }, { status: 400 })
    }

    if (!min_quantity || min_quantity < 1) {
      return NextResponse.json({ error: 'min_quantity is required and must be >= 1' }, { status: 400 })
    }

    if (!discount_percent && !fixed_price) {
      return NextResponse.json({ error: 'Either discount_percent or fixed_price is required' }, { status: 400 })
    }

    const { data: tier, error } = await supabase
      .from('supplier_pricing_tiers')
      .insert({
        supplier_id: professional.id,
        product_id: product_id || null,
        buyer_group_id: buyer_group_id || null,
        buyer_id: buyer_id || null,
        min_quantity,
        max_quantity: max_quantity || null,
        discount_percent: discount_percent || 0,
        fixed_price: fixed_price || null,
        priority: priority || 0,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating pricing tier:', error)
      return NextResponse.json({ error: 'Failed to create pricing tier' }, { status: 500 })
    }

    return NextResponse.json(tier, { status: 201 })
  } catch (error: any) {
    console.error('Error in pricing tiers POST:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH - Update pricing tier
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

    const body = await request.json()
    const { tier_id, ...updates } = body

    if (!tier_id) {
      return NextResponse.json({ error: 'tier_id is required' }, { status: 400 })
    }

    const { data: tier, error } = await supabase
      .from('supplier_pricing_tiers')
      .update(updates)
      .eq('id', tier_id)
      .eq('supplier_id', professional.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating pricing tier:', error)
      return NextResponse.json({ error: 'Failed to update pricing tier' }, { status: 500 })
    }

    return NextResponse.json(tier)
  } catch (error: any) {
    console.error('Error in pricing tiers PATCH:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Delete pricing tier
export async function DELETE(request: NextRequest) {
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

    const searchParams = request.nextUrl.searchParams
    const tier_id = searchParams.get('tier_id')

    if (!tier_id) {
      return NextResponse.json({ error: 'tier_id is required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('supplier_pricing_tiers')
      .delete()
      .eq('id', tier_id)
      .eq('supplier_id', professional.id)

    if (error) {
      console.error('Error deleting pricing tier:', error)
      return NextResponse.json({ error: 'Failed to delete pricing tier' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error in pricing tiers DELETE:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
