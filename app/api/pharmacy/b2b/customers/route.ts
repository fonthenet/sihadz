import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getPharmacyIdFromRequest } from '@/lib/pharmacy/auth'
import type { B2BCustomerInput } from '@/lib/pharmacy/ordonnancier-types'

// ============================================================================
// GET /api/pharmacy/b2b/customers - List B2B customers
// ============================================================================
export async function GET(request: NextRequest) {
  try {
    const auth = await getPharmacyIdFromRequest(request)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const pharmacyId = auth.pharmacyId
    const admin = createAdminClient()
    
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const activeOnly = searchParams.get('active_only') !== 'false'
    
    let query = admin
      .from('b2b_customers')
      .select('*')
      .eq('pharmacy_id', pharmacyId)
      .order('company_name')
    
    if (activeOnly) {
      query = query.eq('is_active', true)
    }
    
    if (search) {
      query = query.or(`company_name.ilike.%${search}%,nif.ilike.%${search}%,contact_name.ilike.%${search}%`)
    }
    
    const { data, error } = await query
    
    if (error) {
      console.error('Error fetching B2B customers:', error)
      return NextResponse.json({ error: 'Failed to fetch customers' }, { status: 500 })
    }
    
    return NextResponse.json({ customers: data || [] })
    
  } catch (error: any) {
    console.error('B2B customers GET error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// ============================================================================
// POST /api/pharmacy/b2b/customers - Create B2B customer
// ============================================================================
export async function POST(request: NextRequest) {
  try {
    const auth = await getPharmacyIdFromRequest(request)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const pharmacyId = auth.pharmacyId
    const admin = createAdminClient()
    
    const body = await request.json() as B2BCustomerInput
    
    if (!body.company_name) {
      return NextResponse.json({ error: 'Company name required' }, { status: 400 })
    }
    
    const { data: customer, error } = await admin
      .from('b2b_customers')
      .insert({
        pharmacy_id: pharmacyId,
        company_name: body.company_name,
        company_name_ar: body.company_name_ar,
        legal_form: body.legal_form,
        nif: body.nif,
        nis: body.nis,
        rc: body.rc,
        article_imposition: body.article_imposition,
        contact_name: body.contact_name,
        contact_phone: body.contact_phone,
        contact_email: body.contact_email,
        address: body.address,
        wilaya: body.wilaya,
        commune: body.commune,
        payment_terms: body.payment_terms || 30,
        credit_limit: body.credit_limit || 0,
        is_active: true,
        current_balance: 0,
        created_by: auth.actorId
      })
      .select()
      .single()
    
    if (error) {
      console.error('Error creating B2B customer:', error)
      return NextResponse.json({ error: 'Failed to create customer' }, { status: 500 })
    }
    
    return NextResponse.json({ customer })
    
  } catch (error: any) {
    console.error('B2B customers POST error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// ============================================================================
// PATCH /api/pharmacy/b2b/customers - Update B2B customer
// ============================================================================
export async function PATCH(request: NextRequest) {
  try {
    const auth = await getPharmacyIdFromRequest(request)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const pharmacyId = auth.pharmacyId
    const admin = createAdminClient()
    
    const body = await request.json()
    const { id, ...updates } = body
    
    if (!id) {
      return NextResponse.json({ error: 'Customer ID required' }, { status: 400 })
    }
    
    const { data: customer, error } = await admin
      .from('b2b_customers')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('pharmacy_id', pharmacyId)
      .select()
      .single()
    
    if (error) {
      console.error('Error updating B2B customer:', error)
      return NextResponse.json({ error: 'Failed to update customer' }, { status: 500 })
    }
    
    return NextResponse.json({ customer })
    
  } catch (error: any) {
    console.error('B2B customers PATCH error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// ============================================================================
// DELETE /api/pharmacy/b2b/customers - Deactivate B2B customer
// ============================================================================
export async function DELETE(request: NextRequest) {
  try {
    const auth = await getPharmacyIdFromRequest(request)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const pharmacyId = auth.pharmacyId
    const admin = createAdminClient()
    
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    
    if (!id) {
      return NextResponse.json({ error: 'Customer ID required' }, { status: 400 })
    }
    
    // Soft delete
    const { error } = await admin
      .from('b2b_customers')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('pharmacy_id', pharmacyId)
    
    if (error) {
      console.error('Error deactivating B2B customer:', error)
      return NextResponse.json({ error: 'Failed to deactivate customer' }, { status: 500 })
    }
    
    return NextResponse.json({ success: true })
    
  } catch (error: any) {
    console.error('B2B customers DELETE error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
