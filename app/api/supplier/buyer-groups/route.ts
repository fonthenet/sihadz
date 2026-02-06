import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET - List buyer groups
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

    const { data: groups, error } = await supabase
      .from('supplier_buyer_groups')
      .select(`
        *,
        buyer_count:supplier_buyer_links(count)
      `)
      .eq('supplier_id', professional.id)
      .order('name', { ascending: true })

    if (error) {
      console.error('Error fetching buyer groups:', error)
      return NextResponse.json({ error: 'Failed to fetch buyer groups' }, { status: 500 })
    }

    return NextResponse.json({ data: groups || [] })
  } catch (error: any) {
    console.error('Error in buyer groups GET:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Create buyer group
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
    const { name, description, default_payment_terms, default_discount_percent, default_credit_limit } = body

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    const { data: group, error } = await supabase
      .from('supplier_buyer_groups')
      .insert({
        supplier_id: professional.id,
        name,
        description: description || null,
        default_payment_terms: default_payment_terms || 'cash',
        default_discount_percent: default_discount_percent || 0,
        default_credit_limit: default_credit_limit || null,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating buyer group:', error)
      return NextResponse.json({ error: 'Failed to create buyer group' }, { status: 500 })
    }

    return NextResponse.json(group, { status: 201 })
  } catch (error: any) {
    console.error('Error in buyer groups POST:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH - Update buyer group
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
    const { group_id, ...updates } = body

    if (!group_id) {
      return NextResponse.json({ error: 'group_id is required' }, { status: 400 })
    }

    const { data: group, error } = await supabase
      .from('supplier_buyer_groups')
      .update(updates)
      .eq('id', group_id)
      .eq('supplier_id', professional.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating buyer group:', error)
      return NextResponse.json({ error: 'Failed to update buyer group' }, { status: 500 })
    }

    return NextResponse.json(group)
  } catch (error: any) {
    console.error('Error in buyer groups PATCH:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Delete buyer group
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
    const group_id = searchParams.get('group_id')

    if (!group_id) {
      return NextResponse.json({ error: 'group_id is required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('supplier_buyer_groups')
      .delete()
      .eq('id', group_id)
      .eq('supplier_id', professional.id)

    if (error) {
      console.error('Error deleting buyer group:', error)
      return NextResponse.json({ error: 'Failed to delete buyer group' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error in buyer groups DELETE:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
