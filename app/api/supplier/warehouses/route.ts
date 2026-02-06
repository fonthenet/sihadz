import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET - List warehouses
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

    const { data: warehouses, error } = await supabase
      .from('supplier_warehouses')
      .select('*')
      .eq('supplier_id', professional.id)
      .order('is_default', { ascending: false })
      .order('name', { ascending: true })

    if (error) {
      console.error('Error fetching warehouses:', error)
      return NextResponse.json({ error: 'Failed to fetch warehouses' }, { status: 500 })
    }

    return NextResponse.json({ data: warehouses || [] })
  } catch (error: any) {
    console.error('Error in warehouses GET:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Create warehouse
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
    const { name, code, address_line1, address_line2, wilaya, commune, phone, email, manager_name, is_default } = body

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    // If setting as default, unset other defaults
    if (is_default) {
      await supabase
        .from('supplier_warehouses')
        .update({ is_default: false })
        .eq('supplier_id', professional.id)
        .eq('is_default', true)
    }

    const { data: warehouse, error } = await supabase
      .from('supplier_warehouses')
      .insert({
        supplier_id: professional.id,
        name,
        code: code || null,
        address_line1: address_line1 || null,
        address_line2: address_line2 || null,
        wilaya: wilaya || null,
        commune: commune || null,
        phone: phone || null,
        email: email || null,
        manager_name: manager_name || null,
        is_default: is_default || false,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating warehouse:', error)
      return NextResponse.json({ error: 'Failed to create warehouse' }, { status: 500 })
    }

    return NextResponse.json(warehouse, { status: 201 })
  } catch (error: any) {
    console.error('Error in warehouses POST:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH - Update warehouse
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
    const { warehouse_id, is_default, ...updates } = body

    if (!warehouse_id) {
      return NextResponse.json({ error: 'warehouse_id is required' }, { status: 400 })
    }

    // If setting as default, unset other defaults
    if (is_default) {
      await supabase
        .from('supplier_warehouses')
        .update({ is_default: false })
        .eq('supplier_id', professional.id)
        .eq('is_default', true)
        .neq('id', warehouse_id)
    }

    const { data: warehouse, error } = await supabase
      .from('supplier_warehouses')
      .update({ ...updates, is_default })
      .eq('id', warehouse_id)
      .eq('supplier_id', professional.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating warehouse:', error)
      return NextResponse.json({ error: 'Failed to update warehouse' }, { status: 500 })
    }

    return NextResponse.json(warehouse)
  } catch (error: any) {
    console.error('Error in warehouses PATCH:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Delete warehouse
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
    const warehouse_id = searchParams.get('warehouse_id')

    if (!warehouse_id) {
      return NextResponse.json({ error: 'warehouse_id is required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('supplier_warehouses')
      .delete()
      .eq('id', warehouse_id)
      .eq('supplier_id', professional.id)

    if (error) {
      console.error('Error deleting warehouse:', error)
      return NextResponse.json({ error: 'Failed to delete warehouse' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error in warehouses DELETE:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
