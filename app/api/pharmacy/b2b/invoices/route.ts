import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getPharmacyIdFromRequest } from '@/lib/pharmacy/auth'

// ============================================================================
// GET /api/pharmacy/b2b/invoices - List B2B invoices
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
    const customerId = searchParams.get('customer_id')
    const status = searchParams.get('status')
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')
    
    let query = admin
      .from('b2b_invoices')
      .select('*, customer:b2b_customers(id, company_name, nif)')
      .eq('pharmacy_id', pharmacyId)
      .order('invoice_date', { ascending: false })
    
    if (customerId) query = query.eq('customer_id', customerId)
    if (status) query = query.eq('status', status)
    if (startDate) query = query.gte('invoice_date', startDate)
    if (endDate) query = query.lte('invoice_date', endDate)
    
    const { data, error } = await query
    
    if (error) {
      console.error('Error fetching B2B invoices:', error)
      return NextResponse.json({ error: 'Failed to fetch invoices' }, { status: 500 })
    }
    
    return NextResponse.json({ invoices: data || [] })
    
  } catch (error: any) {
    console.error('B2B invoices GET error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// ============================================================================
// POST /api/pharmacy/b2b/invoices - Create B2B invoice
// ============================================================================
export async function POST(request: NextRequest) {
  try {
    const auth = await getPharmacyIdFromRequest(request)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const pharmacyId = auth.pharmacyId
    const admin = createAdminClient()
    
    const body = await request.json()
    const { customer_id, items, notes, sale_ids } = body
    
    if (!customer_id) {
      return NextResponse.json({ error: 'Customer ID required' }, { status: 400 })
    }
    
    if (!items || items.length === 0) {
      return NextResponse.json({ error: 'At least one item required' }, { status: 400 })
    }
    
    // Get customer for payment terms
    const { data: customer } = await admin
      .from('b2b_customers')
      .select('payment_terms')
      .eq('id', customer_id)
      .eq('pharmacy_id', pharmacyId)
      .single()
    
    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }
    
    // Calculate totals
    let subtotalHt = 0
    let tva0Base = 0
    let tva9Base = 0
    let tva9Amount = 0
    let tva19Base = 0
    let tva19Amount = 0
    
    const processedItems = items.map((item: any) => {
      const lineTotalHt = item.quantity * item.unit_price_ht
      const tvaRate = item.tva_rate || 0
      const tvaAmount = lineTotalHt * (tvaRate / 100)
      const lineTotalTtc = lineTotalHt + tvaAmount
      
      subtotalHt += lineTotalHt
      
      if (tvaRate === 0) {
        tva0Base += lineTotalHt
      } else if (tvaRate === 9) {
        tva9Base += lineTotalHt
        tva9Amount += tvaAmount
      } else if (tvaRate === 19) {
        tva19Base += lineTotalHt
        tva19Amount += tvaAmount
      }
      
      return {
        product_id: item.product_id,
        product_name: item.product_name,
        product_barcode: item.product_barcode,
        quantity: item.quantity,
        unit_price_ht: item.unit_price_ht,
        tva_rate: tvaRate,
        tva_amount: tvaAmount,
        line_total_ht: lineTotalHt,
        line_total_ttc: lineTotalTtc
      }
    })
    
    const totalTva = tva9Amount + tva19Amount
    const totalTtc = subtotalHt + totalTva
    
    // Get next invoice number (atomic)
    const { data: invoiceNumber } = await admin.rpc('get_next_invoice_number', {
      p_pharmacy_id: pharmacyId,
      p_sequence_type: 'facture'
    })
    
    // Fallback if function doesn't exist yet
    const finalInvoiceNumber = invoiceNumber || `FAC-${new Date().getFullYear()}-${Date.now().toString().slice(-5)}`
    
    // Calculate due date
    const invoiceDate = new Date()
    const dueDate = new Date(invoiceDate)
    dueDate.setDate(dueDate.getDate() + (customer.payment_terms || 30))
    
    // Create invoice
    const { data: invoice, error: invoiceError } = await admin
      .from('b2b_invoices')
      .insert({
        pharmacy_id: pharmacyId,
        customer_id,
        invoice_number: finalInvoiceNumber,
        invoice_date: invoiceDate.toISOString().split('T')[0],
        due_date: dueDate.toISOString().split('T')[0],
        sale_ids: sale_ids || [],
        subtotal_ht: subtotalHt,
        tva_0_base: tva0Base,
        tva_9_base: tva9Base,
        tva_9_amount: tva9Amount,
        tva_19_base: tva19Base,
        tva_19_amount: tva19Amount,
        total_tva: totalTva,
        total_ttc: totalTtc,
        amount_paid: 0,
        status: 'pending',
        notes,
        created_by: auth.actorId
      })
      .select()
      .single()
    
    if (invoiceError) {
      console.error('Error creating B2B invoice:', invoiceError)
      return NextResponse.json({ error: 'Failed to create invoice' }, { status: 500 })
    }
    
    // Create invoice items
    const itemsToInsert = processedItems.map((item: any) => ({
      invoice_id: invoice.id,
      ...item
    }))
    
    const { error: itemsError } = await admin
      .from('b2b_invoice_items')
      .insert(itemsToInsert)
    
    if (itemsError) {
      console.error('Error creating invoice items:', itemsError)
      // Don't fail the whole request, invoice is already created
    }
    
    // Update customer balance
    await admin
      .from('b2b_customers')
      .update({ 
        current_balance: admin.sql`current_balance + ${totalTtc}`,
        updated_at: new Date().toISOString()
      })
      .eq('id', customer_id)
    
    return NextResponse.json({ invoice })
    
  } catch (error: any) {
    console.error('B2B invoices POST error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// ============================================================================
// PATCH /api/pharmacy/b2b/invoices - Update invoice or record payment
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
    const { action, invoice_id } = body
    
    if (!invoice_id) {
      return NextResponse.json({ error: 'Invoice ID required' }, { status: 400 })
    }
    
    // Record payment
    if (action === 'record_payment') {
      const { amount, payment_method, reference, payment_date, notes } = body
      
      if (!amount || amount <= 0) {
        return NextResponse.json({ error: 'Valid payment amount required' }, { status: 400 })
      }
      
      // Get invoice
      const { data: invoice } = await admin
        .from('b2b_invoices')
        .select('*, customer:b2b_customers(id)')
        .eq('id', invoice_id)
        .eq('pharmacy_id', pharmacyId)
        .single()
      
      if (!invoice) {
        return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
      }
      
      const newAmountPaid = (invoice.amount_paid || 0) + amount
      const remaining = invoice.total_ttc - newAmountPaid
      let newStatus = invoice.status
      
      if (remaining <= 0) {
        newStatus = 'paid'
      } else if (newAmountPaid > 0) {
        newStatus = 'partial'
      }
      
      // Create payment record
      await admin
        .from('b2b_payments')
        .insert({
          pharmacy_id: pharmacyId,
          customer_id: invoice.customer.id,
          invoice_id,
          payment_date: payment_date || new Date().toISOString().split('T')[0],
          amount,
          payment_method: payment_method || 'cash',
          reference,
          notes,
          created_by: auth.actorId
        })
      
      // Update invoice
      const { data: updatedInvoice, error } = await admin
        .from('b2b_invoices')
        .update({
          amount_paid: newAmountPaid,
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', invoice_id)
        .select()
        .single()
      
      if (error) {
        console.error('Error updating invoice:', error)
        return NextResponse.json({ error: 'Failed to record payment' }, { status: 500 })
      }
      
      // Update customer balance
      await admin
        .from('b2b_customers')
        .update({ 
          current_balance: admin.sql`current_balance - ${amount}`,
          updated_at: new Date().toISOString()
        })
        .eq('id', invoice.customer.id)
      
      return NextResponse.json({ invoice: updatedInvoice })
    }
    
    // Cancel invoice
    if (action === 'cancel') {
      const { data: invoice } = await admin
        .from('b2b_invoices')
        .select('total_ttc, amount_paid, customer_id')
        .eq('id', invoice_id)
        .eq('pharmacy_id', pharmacyId)
        .single()
      
      if (!invoice) {
        return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
      }
      
      const { data: updatedInvoice, error } = await admin
        .from('b2b_invoices')
        .update({
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('id', invoice_id)
        .select()
        .single()
      
      if (error) {
        console.error('Error cancelling invoice:', error)
        return NextResponse.json({ error: 'Failed to cancel invoice' }, { status: 500 })
      }
      
      // Adjust customer balance (remove unpaid portion)
      const unpaidAmount = invoice.total_ttc - invoice.amount_paid
      if (unpaidAmount > 0) {
        await admin
          .from('b2b_customers')
          .update({ 
            current_balance: admin.sql`current_balance - ${unpaidAmount}`,
            updated_at: new Date().toISOString()
          })
          .eq('id', invoice.customer_id)
      }
      
      return NextResponse.json({ invoice: updatedInvoice })
    }
    
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    
  } catch (error: any) {
    console.error('B2B invoices PATCH error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
