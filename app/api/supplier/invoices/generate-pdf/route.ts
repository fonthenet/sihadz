import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/supplier/invoices/generate-pdf
 * Generate PDF invoice for download/email
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: professional } = await supabase
      .from('professionals')
      .select('id, type, business_name, email, phone, address_line1, wilaya, commune')
      .eq('auth_user_id', user.id)
      .in('type', ['pharma_supplier', 'equipment_supplier'])
      .maybeSingle()

    if (!professional) {
      return NextResponse.json({ error: 'Supplier profile not found' }, { status: 404 })
    }

    const searchParams = request.nextUrl.searchParams
    const invoice_id = searchParams.get('invoice_id')

    if (!invoice_id) {
      return NextResponse.json({ error: 'invoice_id is required' }, { status: 400 })
    }

    // Get invoice with all details
    const { data: invoice, error: invoiceError } = await supabase
      .from('supplier_invoices')
      .select(`
        *,
        buyer:professionals!supplier_invoices_buyer_id_fkey(id, business_name, email, phone, address_line1, wilaya, commune),
        items:supplier_invoice_items(*),
        payments:supplier_invoice_payments(*),
        order:supplier_purchase_orders(order_number)
      `)
      .eq('id', invoice_id)
      .eq('supplier_id', professional.id)
      .single()

    if (invoiceError || !invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    // Generate PDF HTML
    const html = generateInvoiceHTML(invoice, professional)

    // For now, return HTML (can be converted to PDF using a library like puppeteer or @react-pdf/renderer)
    // In production, you'd use a PDF generation library
    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html',
        'Content-Disposition': `inline; filename="invoice-${invoice.invoice_number}.html"`,
      },
    })
  } catch (error: any) {
    console.error('Error generating invoice PDF:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function generateInvoiceHTML(invoice: any, supplier: any) {
  const items = invoice.items || []
  const buyer = invoice.buyer || {}
  
  return `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <title>Invoice ${invoice.invoice_number}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 20px; direction: rtl; }
    .header { display: flex; justify-content: space-between; margin-bottom: 30px; }
    .supplier-info, .buyer-info { flex: 1; }
    .invoice-number { font-size: 24px; font-weight: bold; margin-bottom: 20px; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: right; }
    th { background-color: #f2f2f2; }
    .total-row { font-weight: bold; }
    .footer { margin-top: 40px; text-align: center; color: #666; }
  </style>
</head>
<body>
  <div class="header">
    <div class="supplier-info">
      <h2>${supplier.business_name}</h2>
      <p>${supplier.address_line1 || ''}</p>
      <p>${supplier.wilaya || ''}${supplier.commune ? ', ' + supplier.commune : ''}</p>
      <p>Tel: ${supplier.phone || ''}</p>
      <p>Email: ${supplier.email || ''}</p>
    </div>
    <div class="buyer-info">
      <h3>Bill To:</h3>
      <p>${buyer.business_name || ''}</p>
      <p>${buyer.address_line1 || ''}</p>
      <p>${buyer.wilaya || ''}${buyer.commune ? ', ' + buyer.commune : ''}</p>
    </div>
  </div>

  <div class="invoice-number">
    Invoice: ${invoice.invoice_number}
  </div>

  <div>
    <p><strong>Date:</strong> ${new Date(invoice.created_at).toLocaleDateString()}</p>
    ${invoice.due_date ? `<p><strong>Due Date:</strong> ${new Date(invoice.due_date).toLocaleDateString()}</p>` : ''}
    ${invoice.order?.order_number ? `<p><strong>Order:</strong> ${invoice.order.order_number}</p>` : ''}
  </div>

  <table>
    <thead>
      <tr>
        <th>Description</th>
        <th>Quantity</th>
        <th>Unit Price</th>
        <th>Total</th>
      </tr>
    </thead>
    <tbody>
      ${items.map((item: any) => `
        <tr>
          <td>${item.description || ''}</td>
          <td>${item.quantity || 0}</td>
          <td>${(item.unit_price || 0).toLocaleString()} DZD</td>
          <td>${(item.line_total || 0).toLocaleString()} DZD</td>
        </tr>
      `).join('')}
      <tr class="total-row">
        <td colspan="3" style="text-align: left;">Subtotal</td>
        <td>${(invoice.subtotal || 0).toLocaleString()} DZD</td>
      </tr>
      ${invoice.discount_amount ? `
      <tr>
        <td colspan="3" style="text-align: left;">Discount</td>
        <td>-${(invoice.discount_amount || 0).toLocaleString()} DZD</td>
      </tr>
      ` : ''}
      ${invoice.tax_amount ? `
      <tr>
        <td colspan="3" style="text-align: left;">Tax</td>
        <td>${(invoice.tax_amount || 0).toLocaleString()} DZD</td>
      </tr>
      ` : ''}
      <tr class="total-row">
        <td colspan="3" style="text-align: left;">Total</td>
        <td>${(invoice.total || 0).toLocaleString()} DZD</td>
      </tr>
      ${invoice.balance > 0 ? `
      <tr>
        <td colspan="3" style="text-align: left;">Paid</td>
        <td>${(invoice.amount_paid || 0).toLocaleString()} DZD</td>
      </tr>
      <tr class="total-row">
        <td colspan="3" style="text-align: left;">Balance</td>
        <td>${(invoice.balance || 0).toLocaleString()} DZD</td>
      </tr>
      ` : ''}
    </tbody>
  </table>

  ${invoice.payment_instructions ? `
  <div style="margin-top: 20px;">
    <h4>Payment Instructions:</h4>
    <p>${invoice.payment_instructions}</p>
  </div>
  ` : ''}

  ${invoice.notes ? `
  <div style="margin-top: 20px;">
    <h4>Notes:</h4>
    <p>${invoice.notes}</p>
  </div>
  ` : ''}

  <div class="footer">
    <p>Thank you for your business!</p>
  </div>
</body>
</html>
  `
}
