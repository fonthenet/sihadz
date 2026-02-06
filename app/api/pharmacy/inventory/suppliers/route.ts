import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { SupplierFormData } from '@/lib/inventory/types'
import { getPharmacyIdFromRequest } from '@/lib/pharmacy/auth'

/**
 * GET /api/pharmacy/inventory/suppliers
 * Get suppliers for the pharmacy (owner or employee).
 * Uses admin client so employees can read after auth check.
 */
export async function GET(request: NextRequest) {
  try {
    // Support both owner and employee auth
    const auth = await getPharmacyIdFromRequest(request)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = createAdminClient()
    const pharmacyId = auth.pharmacyId

    const { searchParams } = new URL(request.url)
    const activeOnly = searchParams.get('active_only') !== 'false'
    const search = searchParams.get('search')

    let query = admin
      .from('pharmacy_suppliers')
      .select('*')
      .eq('pharmacy_id', pharmacyId)
      .order('name', { ascending: true })

    if (activeOnly) {
      query = query.eq('is_active', true)
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,contact_person.ilike.%${search}%`)
    }

    const { data: suppliers, error } = await query

    if (error) {
      console.error('[Suppliers API] Error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ suppliers: suppliers || [] })
  } catch (error: any) {
    console.error('[Suppliers API] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * POST /api/pharmacy/inventory/suppliers
 * Create a new supplier (owner or employee).
 * Uses admin client so employees can write after auth check.
 */
export async function POST(request: NextRequest) {
  try {
    // Support both owner and employee auth
    const auth = await getPharmacyIdFromRequest(request)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = createAdminClient()
    const pharmacyId = auth.pharmacyId

    const body: SupplierFormData = await request.json()

    if (!body.name) {
      return NextResponse.json({ error: 'Supplier name is required' }, { status: 400 })
    }

    const { data: supplier, error } = await admin
      .from('pharmacy_suppliers')
      .insert({
        pharmacy_id: pharmacyId,
        name: body.name,
        contact_person: body.contact_person || null,
        phone: body.phone || null,
        phone_secondary: body.phone_secondary || null,
        email: body.email || null,
        fax: body.fax || null,
        address: body.address || null,
        wilaya: body.wilaya || null,
        commune: body.commune || null,
        payment_terms: body.payment_terms || 'cash',
        credit_limit: body.credit_limit || null,
        notes: body.notes || null,
        is_active: true
      })
      .select()
      .single()

    if (error) {
      console.error('[Suppliers API] Insert error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      supplier,
      message: 'Supplier created successfully' 
    })
  } catch (error: any) {
    console.error('[Suppliers API] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
