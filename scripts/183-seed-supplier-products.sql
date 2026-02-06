-- Seed 50 sample products for supplier testing
-- Uses the first pharma_supplier or equipment_supplier found

DO $$
DECLARE
  v_supplier_id UUID;
  v_cat_med UUID := '10000000-0000-0000-0001-000000000001';
  v_cat_generic UUID := '10000000-0000-0000-0001-000000000002';
  v_cat_otc UUID := '10000000-0000-0000-0001-000000000004';
  v_cat_consumables UUID := '10000000-0000-0000-0001-000000000007';
  i INT;
  names TEXT[] := ARRAY[
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
    'Calcium 500mg', 'Magnésium 300mg', 'Oméga 3', 'Multivitamines'
  ];
  prices INT[] := ARRAY[
    120, 180, 95, 150, 450, 380, 220, 250, 280, 200, 320, 240,
    350, 180, 850, 920, 420, 680, 95, 110, 320, 450, 380, 520,
    580, 420, 280, 350, 180, 95, 120, 150, 85, 180, 120, 250,
    95, 180, 320, 220, 180, 450, 95, 120, 180, 95, 220, 350, 280, 420
  ];
  skus TEXT[];
  forms TEXT[] := ARRAY['tablet', 'tablet', 'tablet', 'tablet', 'capsule', 'tablet', 'capsule', 'capsule',
    'tablet', 'tablet', 'tablet', 'tablet', 'tablet', 'tablet', 'injection', 'injection',
    'inhaler', 'inhaler', 'tablet', 'tablet', 'tablet', 'tablet', 'tablet', 'tablet',
    'tablet', 'capsule', 'capsule', 'capsule', 'tablet', 'tablet', 'tablet', 'tablet', 'tablet',
    'tablet', 'tablet', 'tablet', 'tablet', 'tablet', 'tablet', 'tablet', 'tablet', 'tablet',
    'tablet', 'capsule', 'tablet', 'tablet', 'tablet', 'capsule', 'capsule', 'tablet', 'tablet'];
BEGIN
  SELECT id INTO v_supplier_id FROM professionals
  WHERE type IN ('pharma_supplier', 'equipment_supplier')
  LIMIT 1;

  IF v_supplier_id IS NULL THEN
    RAISE NOTICE 'No supplier found. Skipping seed.';
    RETURN;
  END IF;

  FOR i IN 1..50 LOOP
    INSERT INTO supplier_product_catalog (
      supplier_id, name, sku, barcode, name_fr,
      category_id, unit_price, min_order_qty, pack_size,
      form, dosage, packaging, manufacturer,
      in_stock, stock_quantity, reorder_point, lead_time_days,
      is_chifa_listed, reimbursement_rate, requires_prescription, is_controlled,
      is_active, is_featured
    ) VALUES (
      v_supplier_id,
      names[i],
      'SKU-' || LPAD(i::TEXT, 4, '0'),
      '329' || LPAD((i * 12345)::TEXT, 9, '0'),
      names[i],
      CASE WHEN i <= 12 THEN v_cat_med WHEN i <= 24 THEN v_cat_generic WHEN i <= 36 THEN v_cat_otc ELSE v_cat_consumables END,
      prices[i],
      1,
      CASE WHEN forms[i] = 'tablet' THEN 20 WHEN forms[i] = 'capsule' THEN 10 ELSE 1 END,
      forms[i],
      CASE WHEN i IN (1,2,3,4) THEN '500mg' WHEN i IN (5,6) THEN '500mg' WHEN i IN (7,8) THEN '20mg' ELSE '50mg' END,
      'Box of 20',
      'Laboratoire Algérien',
      true,
      50 + (i * 3) % 200,
      20,
      1,
      (i % 3 = 0),
      CASE WHEN i % 3 = 0 THEN 80 ELSE 0 END,
      (i % 5 = 0),
      (i IN (33,34,39,40,41)),
      true,
      (i % 7 = 0)
    )
    ON CONFLICT (supplier_id, sku) DO NOTHING;
  END LOOP;

  RAISE NOTICE 'Seeded 50 products for supplier %', v_supplier_id;
END $$;
