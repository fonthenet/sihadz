import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET - List order templates
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

    let query = supabase
      .from('supplier_order_templates')
      .select(`
        *,
        buyer:professionals!supplier_order_templates_buyer_id_fkey(id, business_name)
      `)
      .eq('supplier_id', professional.id)
      .eq('is_active', true)
      .order('usage_count', { ascending: false })
      .order('last_used_at', { ascending: false, nullsFirst: false })

    if (buyer_id) {
      query = query.or(`buyer_id.eq.${buyer_id},buyer_id.is.null`)
    }

    const { data: templates, error } = await query

    if (error) {
      console.error('Error fetching order templates:', error)
      return NextResponse.json({ error: 'Failed to fetch order templates' }, { status: 500 })
    }

    return NextResponse.json({ data: templates || [] })
  } catch (error: any) {
    console.error('Error in order templates GET:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Create order template
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
    const { name, description, buyer_id, items } = body

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Items array is required' }, { status: 400 })
    }

    // Validate items
    for (const item of items) {
      if (!item.product_id || !item.quantity) {
        return NextResponse.json({ error: 'Each item must have product_id and quantity' }, { status: 400 })
      }
    }

    const { data: template, error } = await supabase
      .from('supplier_order_templates')
      .insert({
        supplier_id: professional.id,
        buyer_id: buyer_id || null,
        name,
        description: description || null,
        items: items,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating order template:', error)
      return NextResponse.json({ error: 'Failed to create order template' }, { status: 500 })
    }

    return NextResponse.json(template, { status: 201 })
  } catch (error: any) {
    console.error('Error in order templates POST:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH - Update order template
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
    const { template_id, ...updates } = body

    if (!template_id) {
      return NextResponse.json({ error: 'template_id is required' }, { status: 400 })
    }

    const { data: template, error } = await supabase
      .from('supplier_order_templates')
      .update(updates)
      .eq('id', template_id)
      .eq('supplier_id', professional.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating order template:', error)
      return NextResponse.json({ error: 'Failed to update order template' }, { status: 500 })
    }

    return NextResponse.json(template)
  } catch (error: any) {
    console.error('Error in order templates PATCH:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Delete order template
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
    const template_id = searchParams.get('template_id')

    if (!template_id) {
      return NextResponse.json({ error: 'template_id is required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('supplier_order_templates')
      .delete()
      .eq('id', template_id)
      .eq('supplier_id', professional.id)

    if (error) {
      console.error('Error deleting order template:', error)
      return NextResponse.json({ error: 'Failed to delete order template' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error in order templates DELETE:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
