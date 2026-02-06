import { createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { getPharmacyIdFromRequest } from '@/lib/pharmacy/auth'

// GET /api/pharmacy/chifa/dashboard - Get Chifa dashboard stats
export async function GET(request: NextRequest) {
  try {
    const auth = await getPharmacyIdFromRequest(request)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const pharmacyId = auth.pharmacyId

    const supabase = createAdminClient()
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]

    // Pending invoices (not in bordereau)
    const { data: pendingInvoices, error: e1 } = await supabase
      .from('chifa_invoices')
      .select('id, total_chifa')
      .eq('pharmacy_id', pharmacyId)
      .eq('status', 'pending')
    
    const pending_invoices = pendingInvoices?.length || 0
    const pending_amount = pendingInvoices?.reduce((sum, inv) => sum + (inv.total_chifa || 0), 0) || 0

    // In bordereau (waiting to be submitted)
    const { data: inBordereauInvoices } = await supabase
      .from('chifa_invoices')
      .select('id, total_chifa')
      .eq('pharmacy_id', pharmacyId)
      .eq('status', 'in_bordereau')
    
    const in_bordereau_invoices = inBordereauInvoices?.length || 0
    const in_bordereau_amount = inBordereauInvoices?.reduce((sum, inv) => sum + (inv.total_chifa || 0), 0) || 0

    // Submitted (waiting for payment)
    const { data: submittedInvoices } = await supabase
      .from('chifa_invoices')
      .select('id, total_chifa')
      .eq('pharmacy_id', pharmacyId)
      .eq('status', 'submitted')
    
    const submitted_amount = submittedInvoices?.reduce((sum, inv) => sum + (inv.total_chifa || 0), 0) || 0

    // Pending bordereaux (draft or finalized)
    const { data: pendingBordereaux } = await supabase
      .from('chifa_bordereaux')
      .select('id')
      .eq('pharmacy_id', pharmacyId)
      .in('status', ['draft', 'finalized'])
    
    const pending_bordereaux = pendingBordereaux?.length || 0

    // Pending rejections
    const { data: pendingRejections } = await supabase
      .from('chifa_rejections')
      .select('id')
      .eq('pharmacy_id', pharmacyId)
      .eq('status', 'pending')
    
    const pending_rejections = pendingRejections?.length || 0

    // This month's claims
    const { data: monthInvoices } = await supabase
      .from('chifa_invoices')
      .select('id, total_chifa')
      .eq('pharmacy_id', pharmacyId)
      .gte('invoice_date', startOfMonth)
      .lte('invoice_date', endOfMonth)
    
    const this_month_claims = monthInvoices?.length || 0
    const this_month_amount = monthInvoices?.reduce((sum, inv) => sum + (inv.total_chifa || 0), 0) || 0

    // Paid this month
    const { data: paidBordereaux } = await supabase
      .from('chifa_bordereaux')
      .select('amount_paid')
      .eq('pharmacy_id', pharmacyId)
      .gte('payment_date', startOfMonth)
      .lte('payment_date', endOfMonth)
      .in('status', ['paid', 'partial'])
    
    const paid_this_month = paidBordereaux?.reduce((sum, b) => sum + (b.amount_paid || 0), 0) || 0

    // By insurance type breakdown
    const { data: byInsurance } = await supabase
      .from('chifa_invoices')
      .select('insurance_type, total_chifa')
      .eq('pharmacy_id', pharmacyId)
      .gte('invoice_date', startOfMonth)
      .lte('invoice_date', endOfMonth)

    const by_insurance = {
      CNAS: 0,
      CASNOS: 0,
      CVM: 0
    }
    byInsurance?.forEach(inv => {
      if (inv.insurance_type in by_insurance) {
        by_insurance[inv.insurance_type as keyof typeof by_insurance] += inv.total_chifa || 0
      }
    })

    return NextResponse.json({
      pending_invoices,
      pending_amount,
      in_bordereau_invoices,
      in_bordereau_amount,
      submitted_amount,
      pending_bordereaux,
      pending_rejections,
      this_month_claims,
      this_month_amount,
      paid_this_month,
      by_insurance
    })

  } catch (error: any) {
    console.error('Error fetching Chifa dashboard:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
