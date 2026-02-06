import { createServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import type { CustomerFormData } from '@/lib/pos/types'
import { getPharmacyIdFromRequest } from '@/lib/pharmacy/auth'

/**
 * GET /api/pharmacy/customers
 * List customers with search and loyalty info (owner or employee)
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

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const page = parseInt(searchParams.get('page') || '1')
    const perPage = parseInt(searchParams.get('per_page') || '50')

    let query = supabase
      .from('pharmacy_customers')
      .select('*', { count: 'exact' })
      .eq('pharmacy_id', pharmacyId)
      .eq('is_active', true)
      .order('full_name')

    if (search) {
      query = query.or(`full_name.ilike.%${search}%,phone.ilike.%${search}%,chifa_number.ilike.%${search}%`)
    }

    const from = (page - 1) * perPage
    query = query.range(from, from + perPage - 1)

    const { data: customers, error, count } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      data: customers || [],
      total: count || 0,
      page,
      per_page: perPage
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * POST /api/pharmacy/customers
 * Create a new customer (owner or employee)
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

    const body: CustomerFormData = await request.json()

    if (!body.full_name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    // Generate customer code
    const { count } = await supabase
      .from('pharmacy_customers')
      .select('*', { count: 'exact', head: true })
      .eq('pharmacy_id', pharmacyId)

    const customerCode = `CUST-${String((count || 0) + 1).padStart(5, '0')}`

    const { data: customer, error } = await supabase
      .from('pharmacy_customers')
      .insert({
        pharmacy_id: pharmacyId,
        customer_code: customerCode,
        first_name: body.first_name,
        last_name: body.last_name,
        full_name: body.full_name,
        phone: body.phone,
        email: body.email,
        chifa_number: body.chifa_number,
        nss: body.nss,
        address: body.address,
        wilaya: body.wilaya,
        commune: body.commune,
        notes: body.notes,
        allergies: body.allergies,
        credit_limit: body.credit_limit || 0,
        loyalty_tier: 'bronze',
        loyalty_points: 0,
        is_active: true
      })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Customer with this phone already exists' }, { status: 400 })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      customer,
      message: `Customer ${body.full_name} created`
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * PATCH /api/pharmacy/customers
 * Update customer (owner or employee)
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
      return NextResponse.json({ error: 'Customer ID required' }, { status: 400 })
    }

    const body = await request.json()
    const updateData: Record<string, any> = { updated_at: new Date().toISOString() }

    if (body.full_name !== undefined) updateData.full_name = body.full_name
    if (body.first_name !== undefined) updateData.first_name = body.first_name
    if (body.last_name !== undefined) updateData.last_name = body.last_name
    if (body.phone !== undefined) updateData.phone = body.phone
    if (body.email !== undefined) updateData.email = body.email
    if (body.chifa_number !== undefined) updateData.chifa_number = body.chifa_number
    if (body.nss !== undefined) updateData.nss = body.nss
    if (body.address !== undefined) updateData.address = body.address
    if (body.wilaya !== undefined) updateData.wilaya = body.wilaya
    if (body.commune !== undefined) updateData.commune = body.commune
    if (body.notes !== undefined) updateData.notes = body.notes
    if (body.allergies !== undefined) updateData.allergies = body.allergies
    if (body.credit_limit !== undefined) updateData.credit_limit = body.credit_limit

    const { error } = await supabase
      .from('pharmacy_customers')
      .update(updateData)
      .eq('id', id)
      .eq('pharmacy_id', pharmacyId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'Customer updated' })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
