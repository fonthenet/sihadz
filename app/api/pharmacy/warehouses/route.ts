import { createServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import type { WarehouseFormData } from '@/lib/pos/types'
import { getPharmacyIdFromRequest } from '@/lib/pharmacy/auth'

/**
 * GET /api/pharmacy/warehouses
 * List warehouses for the pharmacy (owner or employee)
 */
export async function GET(request: NextRequest) {
  try {
    // Support both owner and employee auth
    const auth = await getPharmacyIdFromRequest(request)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createServerClient()
    const pharmacyId = auth.pharmacyId

    const { data: warehouses, error } = await supabase
      .from('pharmacy_warehouses')
      .select('*')
      .eq('pharmacy_id', pharmacyId)
      .eq('is_active', true)
      .order('is_default', { ascending: false })
      .order('name')

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Get stock counts per warehouse
    const warehouseIds = warehouses?.map(w => w.id) || []
    const { data: stockCounts } = await supabase
      .from('pharmacy_inventory')
      .select('warehouse_id, quantity')
      .in('warehouse_id', warehouseIds)
      .eq('is_active', true)

    const countByWarehouse = new Map<string, { items: number; quantity: number }>()
    for (const s of stockCounts || []) {
      if (!s.warehouse_id) continue
      const current = countByWarehouse.get(s.warehouse_id) || { items: 0, quantity: 0 }
      current.items++
      current.quantity += s.quantity
      countByWarehouse.set(s.warehouse_id, current)
    }

    const enrichedWarehouses = warehouses?.map(w => ({
      ...w,
      stock_batches: countByWarehouse.get(w.id)?.items || 0,
      total_quantity: countByWarehouse.get(w.id)?.quantity || 0
    }))

    return NextResponse.json({ warehouses: enrichedWarehouses || [] })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * POST /api/pharmacy/warehouses
 * Create a new warehouse (owner or employee with manage_inventory)
 */
export async function POST(request: NextRequest) {
  try {
    // Support both owner and employee auth
    const auth = await getPharmacyIdFromRequest(request)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createServerClient()
    const pharmacyId = auth.pharmacyId

    const body: WarehouseFormData = await request.json()

    if (!body.code || !body.name) {
      return NextResponse.json({ error: 'Code and name are required' }, { status: 400 })
    }

    // If setting as default, unset other defaults
    if (body.is_default) {
      await supabase
        .from('pharmacy_warehouses')
        .update({ is_default: false })
        .eq('pharmacy_id', pharmacyId)
    }

    const { data: warehouse, error } = await supabase
      .from('pharmacy_warehouses')
      .insert({
        pharmacy_id: pharmacyId,
        code: body.code.toUpperCase(),
        name: body.name,
        name_ar: body.name_ar,
        warehouse_type: body.warehouse_type || 'storage',
        description: body.description,
        is_default: body.is_default || false,
        is_sales_enabled: body.is_sales_enabled ?? true,
        temperature_controlled: body.temperature_controlled || false,
        is_active: true
      })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'A warehouse with this code already exists' }, { status: 400 })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      warehouse,
      message: `Warehouse "${body.name}" created`
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * PATCH /api/pharmacy/warehouses
 * Update a warehouse (owner or employee with manage_inventory)
 */
export async function PATCH(request: NextRequest) {
  try {
    // Support both owner and employee auth
    const auth = await getPharmacyIdFromRequest(request)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createServerClient()
    const pharmacyId = auth.pharmacyId

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Warehouse ID is required' }, { status: 400 })
    }

    const body = await request.json()

    // If setting as default, unset other defaults
    if (body.is_default) {
      await supabase
        .from('pharmacy_warehouses')
        .update({ is_default: false })
        .eq('pharmacy_id', pharmacyId)
    }

    const updateData: Record<string, any> = { updated_at: new Date().toISOString() }
    if (body.name !== undefined) updateData.name = body.name
    if (body.name_ar !== undefined) updateData.name_ar = body.name_ar
    if (body.warehouse_type !== undefined) updateData.warehouse_type = body.warehouse_type
    if (body.description !== undefined) updateData.description = body.description
    if (body.is_default !== undefined) updateData.is_default = body.is_default
    if (body.is_sales_enabled !== undefined) updateData.is_sales_enabled = body.is_sales_enabled
    if (body.temperature_controlled !== undefined) updateData.temperature_controlled = body.temperature_controlled

    const { error } = await supabase
      .from('pharmacy_warehouses')
      .update(updateData)
      .eq('id', id)
      .eq('pharmacy_id', pharmacyId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'Warehouse updated' })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
