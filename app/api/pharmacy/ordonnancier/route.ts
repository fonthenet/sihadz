import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getPharmacyIdFromRequest } from '@/lib/pharmacy/auth'
import type { OrdonnancierEntryInput, ControlledTableau } from '@/lib/pharmacy/ordonnancier-types'

// ============================================================================
// GET /api/pharmacy/ordonnancier - List registers and entries
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
    const view = searchParams.get('view') // 'registers', 'entries', 'reconciliations'
    const registerId = searchParams.get('register_id')
    const tableau = searchParams.get('tableau') as ControlledTableau | null
    const year = searchParams.get('year')
    const productId = searchParams.get('product_id')
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')
    const page = parseInt(searchParams.get('page') || '1')
    const perPage = parseInt(searchParams.get('per_page') || '50')
    
    // Default: list registers
    if (view === 'registers' || !view) {
      let query = admin
        .from('ordonnancier_registers')
        .select('*')
        .eq('pharmacy_id', pharmacyId)
        .order('year', { ascending: false })
        .order('tableau')
      
      if (tableau) query = query.eq('tableau', tableau)
      if (year) query = query.eq('year', parseInt(year))
      
      const { data, error } = await query
      
      if (error) {
        console.error('Error fetching registers:', error)
        return NextResponse.json({ error: 'Failed to fetch registers' }, { status: 500 })
      }
      
      return NextResponse.json({ registers: data || [] })
    }
    
    // List entries
    if (view === 'entries') {
      let query = admin
        .from('ordonnancier_entries')
        .select('*, product:pharmacy_products(name, barcode)')
        .eq('pharmacy_id', pharmacyId)
        .order('entry_date', { ascending: false })
        .order('entry_number', { ascending: false })
      
      if (registerId) query = query.eq('register_id', registerId)
      if (tableau) query = query.eq('tableau', tableau)
      if (productId) query = query.eq('product_id', productId)
      if (startDate) query = query.gte('entry_date', startDate)
      if (endDate) query = query.lte('entry_date', endDate)
      
      // Pagination
      const offset = (page - 1) * perPage
      query = query.range(offset, offset + perPage - 1)
      
      const { data, error, count } = await query
      
      if (error) {
        console.error('Error fetching entries:', error)
        return NextResponse.json({ error: 'Failed to fetch entries' }, { status: 500 })
      }
      
      return NextResponse.json({ 
        entries: data || [], 
        page, 
        per_page: perPage,
        total: count || 0
      })
    }
    
    // List reconciliations
    if (view === 'reconciliations') {
      let query = admin
        .from('ordonnancier_reconciliations')
        .select('*, product:pharmacy_products(name, barcode)')
        .eq('pharmacy_id', pharmacyId)
        .order('reconciliation_date', { ascending: false })
      
      if (registerId) query = query.eq('register_id', registerId)
      if (productId) query = query.eq('product_id', productId)
      
      const { data, error } = await query
      
      if (error) {
        console.error('Error fetching reconciliations:', error)
        return NextResponse.json({ error: 'Failed to fetch reconciliations' }, { status: 500 })
      }
      
      return NextResponse.json({ reconciliations: data || [] })
    }
    
    return NextResponse.json({ error: 'Invalid view parameter' }, { status: 400 })
    
  } catch (error: any) {
    console.error('Ordonnancier GET error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// ============================================================================
// POST /api/pharmacy/ordonnancier - Create register or entry
// ============================================================================
export async function POST(request: NextRequest) {
  try {
    const auth = await getPharmacyIdFromRequest(request)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const pharmacyId = auth.pharmacyId
    const actorId = auth.actorId
    const admin = createAdminClient()
    
    const body = await request.json()
    const { action } = body // 'create_register', 'create_entry', 'create_reconciliation'
    
    // Create a new register
    if (action === 'create_register') {
      const { tableau, year } = body as { tableau: ControlledTableau; year?: number }
      
      if (!tableau || !['A', 'B', 'C'].includes(tableau)) {
        return NextResponse.json({ error: 'Valid tableau (A, B, C) required' }, { status: 400 })
      }
      
      const registerYear = year || new Date().getFullYear()
      
      // Check if register already exists
      const { data: existing } = await admin
        .from('ordonnancier_registers')
        .select('id')
        .eq('pharmacy_id', pharmacyId)
        .eq('year', registerYear)
        .eq('tableau', tableau)
        .maybeSingle()
      
      if (existing) {
        return NextResponse.json({ error: 'Register already exists for this year and tableau' }, { status: 400 })
      }
      
      // Generate register number
      const registerNumber = `ORD-${registerYear}-${tableau}`
      
      const { data: register, error } = await admin
        .from('ordonnancier_registers')
        .insert({
          pharmacy_id: pharmacyId,
          register_number: registerNumber,
          year: registerYear,
          tableau,
          is_active: true,
          created_by: actorId
        })
        .select()
        .single()
      
      if (error) {
        console.error('Error creating register:', error)
        return NextResponse.json({ error: 'Failed to create register' }, { status: 500 })
      }
      
      return NextResponse.json({ register })
    }
    
    // Create a new entry
    if (action === 'create_entry') {
      const entry = body.entry as OrdonnancierEntryInput
      
      if (!entry.product_name || !entry.tableau || !entry.patient_name || 
          !entry.prescriber_name || !entry.prescription_number || !entry.prescription_date) {
        return NextResponse.json({ 
          error: 'Missing required fields: product_name, tableau, patient_name, prescriber_name, prescription_number, prescription_date' 
        }, { status: 400 })
      }
      
      // Get or create register for this year/tableau
      const currentYear = new Date().getFullYear()
      let { data: register } = await admin
        .from('ordonnancier_registers')
        .select('id')
        .eq('pharmacy_id', pharmacyId)
        .eq('year', currentYear)
        .eq('tableau', entry.tableau)
        .eq('is_active', true)
        .maybeSingle()
      
      if (!register) {
        // Auto-create register
        const { data: newRegister, error: regError } = await admin
          .from('ordonnancier_registers')
          .insert({
            pharmacy_id: pharmacyId,
            register_number: `ORD-${currentYear}-${entry.tableau}`,
            year: currentYear,
            tableau: entry.tableau,
            is_active: true,
            created_by: actorId
          })
          .select('id')
          .single()
        
        if (regError) {
          console.error('Error creating register:', regError)
          return NextResponse.json({ error: 'Failed to create register' }, { status: 500 })
        }
        register = newRegister
      }
      
      // Get next entry number
      const { data: lastEntry } = await admin
        .from('ordonnancier_entries')
        .select('entry_number')
        .eq('register_id', register.id)
        .order('entry_number', { ascending: false })
        .limit(1)
        .maybeSingle()
      
      const nextEntryNumber = (lastEntry?.entry_number || 0) + 1
      
      // Get current stock for this product
      let stockBefore = 0
      if (entry.product_id) {
        const { data: stock } = await admin
          .from('pharmacy_inventory')
          .select('quantity')
          .eq('product_id', entry.product_id)
          .eq('pharmacy_id', pharmacyId)
        
        stockBefore = (stock || []).reduce((sum: number, s: { quantity: number }) => sum + s.quantity, 0)
      }
      
      const stockAfter = stockBefore - entry.quantity_dispensed
      
      // Get actor name
      let dispensedByName = 'Unknown'
      const { data: profile } = await admin
        .from('profiles')
        .select('full_name')
        .eq('id', actorId)
        .maybeSingle()
      if (profile) dispensedByName = profile.full_name
      
      // Create entry
      const { data: newEntry, error: entryError } = await admin
        .from('ordonnancier_entries')
        .insert({
          pharmacy_id: pharmacyId,
          register_id: register.id,
          entry_number: nextEntryNumber,
          entry_date: new Date().toISOString().split('T')[0],
          product_id: entry.product_id,
          product_name: entry.product_name,
          product_dci: entry.product_dci,
          dosage: entry.dosage,
          tableau: entry.tableau,
          inventory_id: entry.inventory_id,
          batch_number: entry.batch_number,
          quantity_dispensed: entry.quantity_dispensed,
          unit: entry.unit || 'unités',
          stock_before: stockBefore,
          stock_after: stockAfter,
          patient_name: entry.patient_name,
          patient_id_type: entry.patient_id_type,
          patient_id_number: entry.patient_id_number,
          patient_id_verified: entry.patient_id_verified || false,
          patient_address: entry.patient_address,
          patient_phone: entry.patient_phone,
          prescriber_name: entry.prescriber_name,
          prescriber_specialty: entry.prescriber_specialty,
          prescriber_order_number: entry.prescriber_order_number,
          prescriber_address: entry.prescriber_address,
          prescription_number: entry.prescription_number,
          prescription_date: entry.prescription_date,
          treatment_duration_days: entry.treatment_duration_days,
          sale_id: entry.sale_id,
          sale_item_index: entry.sale_item_index,
          dispensed_by: actorId,
          dispensed_by_name: dispensedByName,
          notes: entry.notes
        })
        .select()
        .single()
      
      if (entryError) {
        console.error('Error creating entry:', entryError)
        return NextResponse.json({ error: 'Failed to create entry' }, { status: 500 })
      }
      
      return NextResponse.json({ entry: newEntry })
    }
    
    // Create reconciliation
    if (action === 'create_reconciliation') {
      const { register_id, product_id, product_name, system_quantity, physical_count, variance_explanation } = body
      
      if (!register_id || !product_id || system_quantity === undefined || physical_count === undefined) {
        return NextResponse.json({ 
          error: 'Missing required fields: register_id, product_id, system_quantity, physical_count' 
        }, { status: 400 })
      }
      
      const variance = physical_count - system_quantity
      const status = variance === 0 ? 'approved' : 'pending'
      
      // Generate reconciliation number
      const recDate = new Date().toISOString().split('T')[0].replace(/-/g, '')
      const { count } = await admin
        .from('ordonnancier_reconciliations')
        .select('id', { count: 'exact', head: true })
        .eq('pharmacy_id', pharmacyId)
      const recNumber = `REC-${recDate}-${String((count || 0) + 1).padStart(3, '0')}`
      
      // Get actor name
      let createdByName = 'Unknown'
      const { data: profile } = await admin
        .from('profiles')
        .select('full_name')
        .eq('id', auth.actorId)
        .maybeSingle()
      if (profile) createdByName = profile.full_name
      
      const { data: reconciliation, error } = await admin
        .from('ordonnancier_reconciliations')
        .insert({
          pharmacy_id: pharmacyId,
          register_id,
          reconciliation_date: new Date().toISOString().split('T')[0],
          reconciliation_number: recNumber,
          product_id,
          product_name: product_name || 'Unknown',
          system_quantity,
          physical_count,
          variance,
          status,
          variance_explanation,
          created_by: auth.actorId,
          created_by_name: createdByName
        })
        .select()
        .single()
      
      if (error) {
        console.error('Error creating reconciliation:', error)
        return NextResponse.json({ error: 'Failed to create reconciliation' }, { status: 500 })
      }
      
      return NextResponse.json({ reconciliation })
    }
    
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    
  } catch (error: any) {
    console.error('Ordonnancier POST error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// ============================================================================
// PATCH /api/pharmacy/ordonnancier - Update reconciliation status
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
    const { action, reconciliation_id, status, variance_explanation } = body
    
    if (action === 'approve_reconciliation') {
      if (!reconciliation_id) {
        return NextResponse.json({ error: 'reconciliation_id required' }, { status: 400 })
      }
      
      // Get actor name
      let approvedByName = 'Unknown'
      const { data: profile } = await admin
        .from('profiles')
        .select('full_name')
        .eq('id', auth.actorId)
        .maybeSingle()
      if (profile) approvedByName = profile.full_name
      
      const { data: reconciliation, error } = await admin
        .from('ordonnancier_reconciliations')
        .update({
          status: status || 'approved',
          variance_explanation,
          approved_by: auth.actorId,
          approved_by_name: approvedByName,
          approved_at: new Date().toISOString()
        })
        .eq('id', reconciliation_id)
        .eq('pharmacy_id', pharmacyId)
        .select()
        .single()
      
      if (error) {
        console.error('Error updating reconciliation:', error)
        return NextResponse.json({ error: 'Failed to update reconciliation' }, { status: 500 })
      }
      
      return NextResponse.json({ reconciliation })
    }
    
    if (action === 'close_register') {
      const { register_id } = body
      
      if (!register_id) {
        return NextResponse.json({ error: 'register_id required' }, { status: 400 })
      }
      
      const { data: register, error } = await admin
        .from('ordonnancier_registers')
        .update({
          is_active: false,
          closed_at: new Date().toISOString(),
          closed_by: auth.actorId
        })
        .eq('id', register_id)
        .eq('pharmacy_id', pharmacyId)
        .select()
        .single()
      
      if (error) {
        console.error('Error closing register:', error)
        return NextResponse.json({ error: 'Failed to close register' }, { status: 500 })
      }
      
      return NextResponse.json({ register })
    }
    
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    
  } catch (error: any) {
    console.error('Ordonnancier PATCH error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
