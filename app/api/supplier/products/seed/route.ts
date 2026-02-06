import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * POST /api/supplier/products/seed
 * Seed 50 sample products for the logged-in supplier (for testing)
 */
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

    const names = [
      'Paracétamol 500mg', 'Doliprane 1000mg', 'Aspirine 100mg', 'Ibuprofène 400mg',
      'Amoxicilline 500mg', 'Metformine 850mg', 'Oméprazole 20mg', 'Lansoprazole 30mg',
      'Amlodipine 5mg', 'Atenolol 50mg', 'Losartan 50mg', 'Ramipril 5mg',
      'Metformin 500mg', 'Glibenclamide 5mg', 'Insuline NPH', 'Insuline Rapide',
      'Salbutamol Spray', 'Budesonide Inhaler', 'Prednisolone 5mg', 'Dexaméthasone 4mg',
      'Chloroquine 250mg', 'Artemether 20mg', 'Ciprofloxacine 500mg', 'Azithromycine 500mg',
      'Amoxicilline + Acide Clavulanique', 'Céfixime 400mg', 'Doxycycline 100mg',
      'Fluconazole 150mg', 'Métronidazole 500mg', 'Albendazole 400mg',
      'Ranitidine 150mg', 'Dompéridone 10mg', 'Métoclopramide 10mg',
      'Diazepam 5mg', 'Clonazépam 0.5mg', 'Sertraline 50mg', 'Amitriptyline 25mg',
      'Carbamazépine 200mg', 'Valproate 500mg', 'Levetiracetam 500mg',
      'Tramadol 50mg', 'Codéine 30mg', 'Morphine 10mg',
      'Vitamine C 500mg', 'Vitamine D3 1000 UI', 'Fer 100mg', 'Acide Folique 5mg',
      'Calcium 500mg', 'Magnésium 300mg', 'Oméga 3', 'Multivitamines',
    ]
    const prices = [
      120, 180, 95, 150, 450, 380, 220, 250, 280, 200, 320, 240,
      350, 180, 850, 920, 420, 680, 95, 110, 320, 450, 380, 520,
      580, 420, 280, 350, 180, 95, 120, 150, 85, 180, 120, 250,
      95, 180, 320, 220, 180, 450, 95, 120, 180, 95, 220, 350, 280, 420,
    ]
    const catIds = [
      '10000000-0000-0000-0001-000000000001', '10000000-0000-0000-0001-000000000002',
      '10000000-0000-0000-0001-000000000004', '10000000-0000-0000-0001-000000000007',
    ]

    let created = 0
    for (let i = 0; i < 50; i++) {
      const sku = `SKU-${String(i + 1).padStart(4, '0')}`
      const { data: existing } = await supabase
        .from('supplier_product_catalog')
        .select('id')
        .eq('supplier_id', professional.id)
        .eq('sku', sku)
        .single()

      if (existing) continue

      const { error } = await supabase.from('supplier_product_catalog').insert({
        supplier_id: professional.id,
        name: names[i],
        sku,
        barcode: `329${String((i + 1) * 12345).padStart(9, '0')}`,
        name_fr: names[i],
        category_id: catIds[Math.min(Math.floor(i / 13), 3)],
        unit_price: prices[i],
        min_order_qty: 1,
        pack_size: i % 3 === 0 ? 10 : 20,
        form: i % 5 === 0 ? 'capsule' : 'tablet',
        dosage: '500mg',
        packaging: 'Box of 20',
        manufacturer: 'Laboratoire Algérien',
        in_stock: true,
        stock_quantity: 50 + (i * 3) % 200,
        reorder_point: 20,
        lead_time_days: 1,
        is_chifa_listed: i % 3 === 0,
        reimbursement_rate: i % 3 === 0 ? 80 : 0,
        requires_prescription: i % 5 === 0,
        is_controlled: [33, 34, 39, 40, 41].includes(i + 1),
        is_active: true,
        is_featured: i % 7 === 0,
      })

      if (!error) created++
    }

    return NextResponse.json({ success: true, created, total: 50 })
  } catch (error: any) {
    console.error('Error seeding products:', error)
    return NextResponse.json({ error: error.message || 'Failed to seed' }, { status: 500 })
  }
}
