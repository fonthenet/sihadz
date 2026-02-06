import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { InvoiceInput, PaymentInput } from '@/lib/supplier/types'

// GET - List supplier's invoices
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
    const status = searchParams.get('status')
    const search = searchParams.get('search')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = (page - 1) * limit

    let query = supabase
      .from('supplier_invoices')
      .select(`
        *,
        buyer:professionals!supplier_invoices_buyer_id_fkey(id, business_name, email, phone),
        order:supplier_purchase_orders(id, order_number),
        items:supplier_invoice_items(*),
        payments:supplier_invoice_payments(*)
      `, { count: 'exact' })
      .eq('supplier_id', professional.id)
      .order('created_at', { ascending: false })

    if (status) {
      const statuses = status.split(',')
      query = query.in('status', statuses)
    }

    if (search) {
      query = query.or(`invoice_number.ilike.%${search}%`)
    }

    const { data: invoices, count, error } = await query.range(offset, offset + limit - 1)

    if (error) {
      console.error('Error fetching invoices:', error)
      return NextResponse.json({ error: 'Failed to fetch invoices' }, { status: 500 })
    }

    return NextResponse.json({
      data: invoices || [],
      total: count || 0,
      page,
      limit,
      hasMore: (count || 0) > offset + limit,
    })
  } catch (error) {
    console.error('Error in supplier invoices GET:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Create invoice or record payment
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
    const { action } = body

    if (action === 'create_from_order') {
      // Create invoice from delivered order
      const { order_id } = body

      if (!order_id) {
        return NextResponse.json({ error: 'order_id is required' }, { status: 400 })
      }

      const { data: invoiceId, error } = await supabase
        .rpc('create_invoice_from_order', { p_order_id: order_id })

      if (error) {
        console.error('Error creating invoice from order:', error)
        return NextResponse.json({ error: 'Failed to create invoice' }, { status: 500 })
      }

      // Fetch the created invoice
      const { data: invoice } = await supabase
        .from('supplier_invoices')
        .select(`
          *,
          buyer:professionals!supplier_invoices_buyer_id_fkey(id, business_name, email, phone),
          items:supplier_invoice_items(*),
          payments:supplier_invoice_payments(*)
        `)
        .eq('id', invoiceId)
        .single()

      return NextResponse.json(invoice, { status: 201 })
    }

    if (action === 'record_payment') {
      // Record payment on invoice
      const { invoice_id, ...paymentData }: { invoice_id: string } & PaymentInput = body

      if (!invoice_id || !paymentData.amount || !paymentData.payment_method) {
        return NextResponse.json({ error: 'invoice_id, amount, and payment_method are required' }, { status: 400 })
      }

      // Get invoice
      const { data: invoice } = await supabase
        .from('supplier_invoices')
        .select('*')
        .eq('id', invoice_id)
        .eq('supplier_id', professional.id)
        .single()

      if (!invoice) {
        return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
      }

      // Create payment record
      const { error: paymentError } = await supabase
        .from('supplier_invoice_payments')
        .insert({
          invoice_id,
          amount: paymentData.amount,
          payment_method: paymentData.payment_method,
          payment_date: paymentData.payment_date || new Date().toISOString().split('T')[0],
          reference: paymentData.reference,
          notes: paymentData.notes,
          recorded_by: user.id,
        })

      if (paymentError) {
        console.error('Error recording payment:', paymentError)
        return NextResponse.json({ error: 'Failed to record payment' }, { status: 500 })
      }

      // Update invoice amount_paid and status
      const newAmountPaid = (invoice.amount_paid || 0) + paymentData.amount
      const newStatus = newAmountPaid >= invoice.total ? 'paid' : 'partial'

      const { error: updateError } = await supabase
        .from('supplier_invoices')
        .update({
          amount_paid: newAmountPaid,
          status: newStatus,
          paid_at: newStatus === 'paid' ? new Date().toISOString() : null,
        })
        .eq('id', invoice_id)

      if (updateError) {
        console.error('Error updating invoice:', updateError)
      }

      // Fetch updated invoice
      const { data: updatedInvoice } = await supabase
        .from('supplier_invoices')
        .select(`
          *,
          buyer:professionals!supplier_invoices_buyer_id_fkey(id, business_name, email, phone),
          items:supplier_invoice_items(*),
          payments:supplier_invoice_payments(*)
        `)
        .eq('id', invoice_id)
        .single()

      return NextResponse.json(updatedInvoice)
    }

    // Create manual invoice
    const invoiceData: InvoiceInput = body

    if (!invoiceData.buyer_id || !invoiceData.items || invoiceData.items.length === 0) {
      return NextResponse.json({ error: 'buyer_id and items are required' }, { status: 400 })
    }

    // Calculate totals
    const subtotal = invoiceData.items.reduce((sum, item) => {
      const lineTotal = item.quantity * item.unit_price * (1 - (item.discount_percent || 0) / 100)
      return sum + lineTotal
    }, 0)

    const taxAmount = invoiceData.tax_amount || 0
    const discountAmount = invoiceData.discount_amount || 0
    const total = subtotal + taxAmount - discountAmount

    // Create invoice
    const { data: invoice, error: invoiceError } = await supabase
      .from('supplier_invoices')
      .insert({
        supplier_id: professional.id,
        buyer_id: invoiceData.buyer_id,
        order_id: invoiceData.order_id,
        subtotal,
        tax_amount: taxAmount,
        discount_amount: discountAmount,
        total,
        payment_terms: invoiceData.payment_terms || 'cash',
        due_date: invoiceData.due_date,
        notes: invoiceData.notes,
        payment_instructions: invoiceData.payment_instructions,
        status: 'draft',
      })
      .select()
      .single()

    if (invoiceError) {
      console.error('Error creating invoice:', invoiceError)
      return NextResponse.json({ error: 'Failed to create invoice' }, { status: 500 })
    }

    // Create invoice items
    const items = invoiceData.items.map((item) => ({
      invoice_id: invoice.id,
      order_item_id: item.order_item_id,
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unit_price,
      discount_percent: item.discount_percent || 0,
      tax_rate: item.tax_rate || 0,
      line_total: item.quantity * item.unit_price * (1 - (item.discount_percent || 0) / 100),
    }))

    await supabase.from('supplier_invoice_items').insert(items)

    // Fetch complete invoice
    const { data: completeInvoice } = await supabase
      .from('supplier_invoices')
      .select(`
        *,
        buyer:professionals!supplier_invoices_buyer_id_fkey(id, business_name, email, phone),
        items:supplier_invoice_items(*),
        payments:supplier_invoice_payments(*)
      `)
      .eq('id', invoice.id)
      .single()

    return NextResponse.json(completeInvoice, { status: 201 })
  } catch (error) {
    console.error('Error in supplier invoices POST:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH - Update invoice status
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
    const { invoice_id, action } = body

    if (!invoice_id || !action) {
      return NextResponse.json({ error: 'invoice_id and action are required' }, { status: 400 })
    }

    const updates: Record<string, unknown> = {}

    switch (action) {
      case 'send':
        updates.status = 'sent'
        updates.sent_at = new Date().toISOString()
        break

      case 'cancel':
        updates.status = 'cancelled'
        break

      case 'dispute':
        updates.status = 'disputed'
        break

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    const { data: invoice, error } = await supabase
      .from('supplier_invoices')
      .update(updates)
      .eq('id', invoice_id)
      .eq('supplier_id', professional.id)
      .select(`
        *,
        buyer:professionals!supplier_invoices_buyer_id_fkey(id, business_name, email, phone, auth_user_id),
        items:supplier_invoice_items(*),
        payments:supplier_invoice_payments(*)
      `)
      .single()

    if (error) {
      console.error('Error updating invoice:', error)
      return NextResponse.json({ error: 'Failed to update invoice' }, { status: 500 })
    }

    // Notify buyer when invoice is sent
    if (action === 'send' && invoice?.buyer?.auth_user_id) {
      const { data: supplierInfo } = await supabase
        .from('professionals')
        .select('business_name')
        .eq('id', professional.id)
        .single()
      
      await supabase.from('notifications').insert({
        user_id: invoice.buyer.auth_user_id,
        type: 'supplier_invoice',
        title: 'New Invoice',
        title_ar: 'فاتورة جديدة',
        title_fr: 'Nouvelle facture',
        message: `Invoice ${invoice.invoice_number} from ${supplierInfo?.business_name || 'supplier'} - ${invoice.total.toLocaleString()} DZD`,
        message_ar: `فاتورة ${invoice.invoice_number} من ${supplierInfo?.business_name || 'المورد'} - ${invoice.total.toLocaleString()} دج`,
        message_fr: `Facture ${invoice.invoice_number} de ${supplierInfo?.business_name || 'fournisseur'} - ${invoice.total.toLocaleString()} DZD`,
        metadata: { invoice_id: invoice.id, invoice_number: invoice.invoice_number, total: invoice.total },
        action_url: '/professional/dashboard?section=suppliers',
        is_read: false,
      })
    }

    return NextResponse.json(invoice)
  } catch (error) {
    console.error('Error in supplier invoices PATCH:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
