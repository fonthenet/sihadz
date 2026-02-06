import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET - List recurring orders
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
    const buyer_id = searchParams.get('buyer_id')
    const is_active = searchParams.get('is_active')

    let query = supabase
      .from('supplier_recurring_orders')
      .select(`
        *,
        buyer:professionals!supplier_recurring_orders_buyer_id_fkey(id, business_name),
        template:supplier_order_templates(id, name)
      `)
      .eq('supplier_id', professional.id)
      .order('next_order_date', { ascending: true })

    if (buyer_id) {
      query = query.eq('buyer_id', buyer_id)
    }

    if (is_active !== null) {
      query = query.eq('is_active', is_active === 'true')
    }

    const { data: recurringOrders, error } = await query

    if (error) {
      console.error('Error fetching recurring orders:', error)
      return NextResponse.json({ error: 'Failed to fetch recurring orders' }, { status: 500 })
    }

    return NextResponse.json({ data: recurringOrders || [] })
  } catch (error: any) {
    console.error('Error in recurring orders GET:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Create recurring order
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
    const {
      buyer_id,
      template_id,
      name,
      description,
      frequency,
      day_of_week,
      day_of_month,
      custom_schedule,
      items,
      next_order_date,
      auto_confirm,
      auto_ship,
    } = body

    if (!buyer_id || !name || !frequency || !next_order_date) {
      return NextResponse.json({ error: 'buyer_id, name, frequency, and next_order_date are required' }, { status: 400 })
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'items array is required' }, { status: 400 })
    }

    const { data: recurringOrder, error } = await supabase
      .from('supplier_recurring_orders')
      .insert({
        supplier_id: professional.id,
        buyer_id,
        template_id: template_id || null,
        name,
        description: description || null,
        frequency,
        day_of_week: day_of_week || null,
        day_of_month: day_of_month || null,
        custom_schedule: custom_schedule || null,
        items,
        next_order_date,
        auto_confirm: auto_confirm || false,
        auto_ship: auto_ship || false,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating recurring order:', error)
      return NextResponse.json({ error: 'Failed to create recurring order' }, { status: 500 })
    }

    return NextResponse.json(recurringOrder, { status: 201 })
  } catch (error: any) {
    console.error('Error in recurring orders POST:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH - Update recurring order
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
    const { recurring_order_id, ...updates } = body

    if (!recurring_order_id) {
      return NextResponse.json({ error: 'recurring_order_id is required' }, { status: 400 })
    }

    const { data: recurringOrder, error } = await supabase
      .from('supplier_recurring_orders')
      .update(updates)
      .eq('id', recurring_order_id)
      .eq('supplier_id', professional.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating recurring order:', error)
      return NextResponse.json({ error: 'Failed to update recurring order' }, { status: 500 })
    }

    return NextResponse.json(recurringOrder)
  } catch (error: any) {
    console.error('Error in recurring orders PATCH:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Delete recurring order
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
    const recurring_order_id = searchParams.get('recurring_order_id')

    if (!recurring_order_id) {
      return NextResponse.json({ error: 'recurring_order_id is required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('supplier_recurring_orders')
      .delete()
      .eq('id', recurring_order_id)
      .eq('supplier_id', professional.id)

    if (error) {
      console.error('Error deleting recurring order:', error)
      return NextResponse.json({ error: 'Failed to delete recurring order' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error in recurring orders DELETE:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
