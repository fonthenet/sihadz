import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET - Get warehouse stock levels
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
    const warehouse_id = searchParams.get('warehouse_id')
    const product_id = searchParams.get('product_id')
    const expiring_soon = searchParams.get('expiring_soon') === 'true' // Within 30 days

    // Fetch warehouse IDs for this supplier (Supabase .in() requires array, not subquery)
    const { data: warehouses } = await supabase
      .from('supplier_warehouses')
      .select('id')
      .eq('supplier_id', professional.id)
    const warehouseIds = (warehouses || []).map((w: { id: string }) => w.id)
    if (warehouseIds.length === 0) {
      return NextResponse.json({ data: [] })
    }

    let query = supabase
      .from('supplier_warehouse_stock')
      .select(`
        *,
        warehouse:supplier_warehouses(id, name, code),
        product:supplier_product_catalog(id, name, sku, barcode)
      `)
      .in('warehouse_id', warehouseIds)

    if (warehouse_id) {
      if (!warehouseIds.includes(warehouse_id)) {
        return NextResponse.json({ error: 'Warehouse not found' }, { status: 404 })
      }
      query = query.eq('warehouse_id', warehouse_id)
    }

    if (product_id) {
      query = query.eq('product_id', product_id)
    }

    if (expiring_soon) {
      const thirtyDaysFromNow = new Date()
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)
      query = query
        .not('expiry_date', 'is', null)
        .lte('expiry_date', thirtyDaysFromNow.toISOString().split('T')[0])
    }

    const { data: stock, error } = await query.order('expiry_date', { ascending: true, nullsLast: true })

    if (error) {
      console.error('Error fetching warehouse stock:', error)
      return NextResponse.json({ error: 'Failed to fetch warehouse stock' }, { status: 500 })
    }

    return NextResponse.json({ data: stock || [] })
  } catch (error: any) {
    console.error('Error in warehouse stock GET:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Update warehouse stock (add/remove/adjust)
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
    const { warehouse_id, product_id, quantity, batch_number, lot_number, expiry_date, location_code, action = 'set' } = body

    if (!warehouse_id || !product_id || quantity === undefined) {
      return NextResponse.json({ error: 'warehouse_id, product_id, and quantity are required' }, { status: 400 })
    }

    // Verify warehouse belongs to supplier
    const { data: warehouse } = await supabase
      .from('supplier_warehouses')
      .select('id')
      .eq('id', warehouse_id)
      .eq('supplier_id', professional.id)
      .single()

    if (!warehouse) {
      return NextResponse.json({ error: 'Warehouse not found' }, { status: 404 })
    }

    // Get current stock - use .is() for NULL (eq doesn't match NULL in SQL)
    let stockQuery = supabase
      .from('supplier_warehouse_stock')
      .select('*')
      .eq('warehouse_id', warehouse_id)
      .eq('product_id', product_id)

    if (batch_number != null && batch_number !== '') {
      stockQuery = stockQuery.eq('batch_number', batch_number)
    } else {
      stockQuery = stockQuery.is('batch_number', null)
    }
    if (lot_number != null && lot_number !== '') {
      stockQuery = stockQuery.eq('lot_number', lot_number)
    } else {
      stockQuery = stockQuery.is('lot_number', null)
    }

    const { data: stockRows, error: stockError } = await stockQuery.limit(1)
    if (stockError) throw stockError
    const currentStock = stockRows?.[0] ?? null

    let newQuantity = quantity
    if (currentStock) {
      if (action === 'add') {
        newQuantity = currentStock.quantity + quantity
      } else if (action === 'subtract') {
        newQuantity = Math.max(0, currentStock.quantity - quantity)
      } else if (action === 'set') {
        newQuantity = quantity
      }
    } else if (action === 'subtract') {
      return NextResponse.json({ error: 'Cannot subtract from non-existent stock' }, { status: 400 })
    }

    if (newQuantity < 0) {
      return NextResponse.json({ error: 'Quantity cannot be negative' }, { status: 400 })
    }

    if (currentStock) {
      // Update existing stock
      const { data: updated, error } = await supabase
        .from('supplier_warehouse_stock')
        .update({
          quantity: newQuantity,
          expiry_date: expiry_date || currentStock.expiry_date,
          location_code: location_code || currentStock.location_code,
        })
        .eq('id', currentStock.id)
        .select()
        .single()

      if (error) throw error
      return NextResponse.json(updated)
    } else {
      // Create new stock entry
      const { data: created, error } = await supabase
        .from('supplier_warehouse_stock')
        .insert({
          warehouse_id,
          product_id,
          quantity: newQuantity,
          batch_number: batch_number || null,
          lot_number: lot_number || null,
          expiry_date: expiry_date || null,
          location_code: location_code || null,
        })
        .select()
        .single()

      if (error) throw error
      return NextResponse.json(created, { status: 201 })
    }
  } catch (error: any) {
    console.error('Error updating warehouse stock:', error)
    return NextResponse.json({ error: error.message || 'Failed to update warehouse stock' }, { status: 500 })
  }
}
