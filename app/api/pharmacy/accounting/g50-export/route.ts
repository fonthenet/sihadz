import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getPharmacyIdFromRequest } from '@/lib/pharmacy/auth'
import type { G50ExportData } from '@/lib/pharmacy/ordonnancier-types'

// ============================================================================
// GET /api/pharmacy/accounting/g50-export - Generate G50 declaration data
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
    const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()))
    const month = parseInt(searchParams.get('month') || String(new Date().getMonth() + 1))
    const format = searchParams.get('format') || 'json' // 'json', 'csv', 'pdf'
    
    // Get pharmacy info
    const { data: pharmacy } = await admin
      .from('professionals')
      .select('business_name, address, city, wilaya')
      .eq('id', pharmacyId)
      .single()
    
    // Get pharmacy fiscal info from professional_profiles or settings
    const { data: profile } = await admin
      .from('professional_profiles')
      .select('settings')
      .eq('professional_id', pharmacyId)
      .maybeSingle()
    
    const fiscalInfo = profile?.settings?.fiscal || {}
    
    // Get TVA entries for the period
    const { data: tvaEntries } = await admin
      .from('accounting_tva_entries')
      .select('*')
      .eq('pharmacy_id', pharmacyId)
      .eq('period_year', year)
      .eq('period_month', month)
    
    const collectee = tvaEntries?.find((t: any) => t.tva_type === 'collectee')
    const deductible = tvaEntries?.find((t: any) => t.tva_type === 'deductible')
    
    // Calculate TVA amounts
    const tvaCollectee19Base = collectee?.tva_19_base || 0
    const tvaCollectee19Amount = collectee?.tva_19_amount || 0
    const tvaCollectee9Base = collectee?.tva_9_base || 0
    const tvaCollectee9Amount = collectee?.tva_9_amount || 0
    const tvaCollectee0Base = collectee?.tva_0_base || 0
    const totalTvaCollectee = tvaCollectee19Amount + tvaCollectee9Amount
    
    const tvaDeductible19Base = deductible?.tva_19_base || 0
    const tvaDeductible19Amount = deductible?.tva_19_amount || 0
    const tvaDeductible9Base = deductible?.tva_9_base || 0
    const tvaDeductible9Amount = deductible?.tva_9_amount || 0
    const totalTvaDeductible = tvaDeductible19Amount + tvaDeductible9Amount
    
    const net = totalTvaCollectee - totalTvaDeductible
    
    const monthNames = ['', 'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 
                        'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']
    
    const g50Data: G50ExportData = {
      pharmacy_id: pharmacyId,
      pharmacy_name: pharmacy?.business_name || '',
      pharmacy_nif: fiscalInfo.nif,
      pharmacy_nis: fiscalInfo.nis,
      pharmacy_rc: fiscalInfo.rc,
      pharmacy_article: fiscalInfo.article_imposition,
      pharmacy_address: [pharmacy?.address, pharmacy?.city, pharmacy?.wilaya].filter(Boolean).join(', '),
      period_year: year,
      period_month: month,
      period_label: `${monthNames[month]} ${year}`,
      
      // TVA Collectée
      tva_collectee_19_base: tvaCollectee19Base,
      tva_collectee_19_amount: tvaCollectee19Amount,
      tva_collectee_9_base: tvaCollectee9Base,
      tva_collectee_9_amount: tvaCollectee9Amount,
      tva_collectee_0_base: tvaCollectee0Base,
      total_tva_collectee: totalTvaCollectee,
      
      // TVA Déductible
      tva_deductible_19_base: tvaDeductible19Base,
      tva_deductible_19_amount: tvaDeductible19Amount,
      tva_deductible_9_base: tvaDeductible9Base,
      tva_deductible_9_amount: tvaDeductible9Amount,
      total_tva_deductible: totalTvaDeductible,
      
      // Net
      tva_a_decaisser: net > 0 ? net : 0,
      credit_tva: net < 0 ? Math.abs(net) : 0,
      
      status: collectee?.status || 'draft',
      g50_reference: collectee?.g50_reference,
      generated_at: new Date().toISOString()
    }
    
    // Return based on format
    if (format === 'csv') {
      const csv = generateG50CSV(g50Data)
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="G50-${year}-${String(month).padStart(2, '0')}.csv"`
        }
      })
    }
    
    return NextResponse.json(g50Data)
    
  } catch (error: any) {
    console.error('G50 export error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// Generate CSV for G50
function generateG50CSV(data: G50ExportData): string {
  const lines = [
    '# DÉCLARATION G50 - TVA',
    `# Période: ${data.period_label}`,
    `# Pharmacie: ${data.pharmacy_name}`,
    `# NIF: ${data.pharmacy_nif || 'Non renseigné'}`,
    `# NIS: ${data.pharmacy_nis || 'Non renseigné'}`,
    `# RC: ${data.pharmacy_rc || 'Non renseigné'}`,
    `# Article: ${data.pharmacy_article || 'Non renseigné'}`,
    `# Adresse: ${data.pharmacy_address}`,
    '',
    'Section,Taux,Base HT (DZD),TVA (DZD)',
    '',
    '# TVA COLLECTÉE (sur ventes)',
    `TVA Collectée,19%,${data.tva_collectee_19_base.toFixed(2)},${data.tva_collectee_19_amount.toFixed(2)}`,
    `TVA Collectée,9%,${data.tva_collectee_9_base.toFixed(2)},${data.tva_collectee_9_amount.toFixed(2)}`,
    `TVA Collectée,0%,${data.tva_collectee_0_base.toFixed(2)},0.00`,
    `TOTAL COLLECTÉE,,${(data.tva_collectee_19_base + data.tva_collectee_9_base + data.tva_collectee_0_base).toFixed(2)},${data.total_tva_collectee.toFixed(2)}`,
    '',
    '# TVA DÉDUCTIBLE (sur achats)',
    `TVA Déductible,19%,${data.tva_deductible_19_base.toFixed(2)},${data.tva_deductible_19_amount.toFixed(2)}`,
    `TVA Déductible,9%,${data.tva_deductible_9_base.toFixed(2)},${data.tva_deductible_9_amount.toFixed(2)}`,
    `TOTAL DÉDUCTIBLE,,${(data.tva_deductible_19_base + data.tva_deductible_9_base).toFixed(2)},${data.total_tva_deductible.toFixed(2)}`,
    '',
    '# SOLDE',
    `TVA À DÉCAISSER,,,${data.tva_a_decaisser.toFixed(2)}`,
    `CRÉDIT TVA (report),,,${data.credit_tva.toFixed(2)}`,
    '',
    `# Généré le: ${new Date(data.generated_at).toLocaleString('fr-DZ')}`
  ]
  
  return lines.join('\n')
}

// ============================================================================
// POST /api/pharmacy/accounting/g50-export - Mark G50 as filed
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
    const { year, month, g50_reference } = body
    
    if (!year || !month) {
      return NextResponse.json({ error: 'Year and month required' }, { status: 400 })
    }
    
    // Update TVA entries to mark as filed
    const { error } = await admin
      .from('accounting_tva_entries')
      .update({
        status: 'declared',
        g50_reference: g50_reference || null,
        declared_at: new Date().toISOString()
      })
      .eq('pharmacy_id', pharmacyId)
      .eq('period_year', year)
      .eq('period_month', month)
    
    if (error) {
      console.error('Error marking G50 as filed:', error)
      return NextResponse.json({ error: 'Failed to update status' }, { status: 500 })
    }
    
    return NextResponse.json({ success: true, message: 'G50 marked as filed' })
    
  } catch (error: any) {
    console.error('G50 export POST error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
