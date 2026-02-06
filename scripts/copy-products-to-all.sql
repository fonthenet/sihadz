-- Copy products from T PHARMACY to all other pharmacies
DO $$
DECLARE
  v_source_pharmacy_id UUID := '0b994c27-5439-4ae9-b8c7-88ac38ee5610';
  v_target_pharmacy RECORD;
  v_product RECORD;
  v_new_product_id UUID;
  v_warehouse_id UUID;
BEGIN
  -- For each pharmacy that is NOT the source
  FOR v_target_pharmacy IN 
    SELECT id, business_name FROM professionals 
    WHERE type = 'pharmacy' AND id != v_source_pharmacy_id
  LOOP
    RAISE NOTICE 'Copying to: %', v_target_pharmacy.business_name;
    
    -- Create default warehouse for target if not exists
    INSERT INTO pharmacy_warehouses (pharmacy_id, code, name, warehouse_type, is_default, is_sales_enabled)
    VALUES (v_target_pharmacy.id, 'MAIN', 'Main Storage', 'storage', true, true)
    ON CONFLICT (pharmacy_id, code) DO NOTHING;
    
    SELECT id INTO v_warehouse_id FROM pharmacy_warehouses 
    WHERE pharmacy_id = v_target_pharmacy.id AND code = 'MAIN';
    
    -- Create cash drawer
    INSERT INTO pharmacy_cash_drawers (pharmacy_id, code, name, warehouse_id)
    VALUES (v_target_pharmacy.id, 'MAIN', 'Main Register', v_warehouse_id)
    ON CONFLICT (pharmacy_id, code) DO NOTHING;
    
    -- Copy suppliers
    INSERT INTO pharmacy_suppliers (pharmacy_id, name, contact_person, phone, email, address, wilaya, payment_terms, is_active)
    SELECT v_target_pharmacy.id, name, contact_person, phone, email, address, wilaya, payment_terms, is_active
    FROM pharmacy_suppliers WHERE pharmacy_id = v_source_pharmacy_id
    ON CONFLICT DO NOTHING;
    
    -- Copy products (with new UUIDs)
    FOR v_product IN 
      SELECT * FROM pharmacy_products WHERE pharmacy_id = v_source_pharmacy_id
    LOOP
      -- Check if product already exists (by barcode)
      IF NOT EXISTS (
        SELECT 1 FROM pharmacy_products 
        WHERE pharmacy_id = v_target_pharmacy.id AND barcode = v_product.barcode
      ) THEN
        INSERT INTO pharmacy_products (
          pharmacy_id, barcode, sku, name, name_ar, generic_name, dci_code,
          category_id, form, dosage, packaging, manufacturer, country_of_origin,
          purchase_price, selling_price, margin_percent,
          is_chifa_listed, reimbursement_rate, tarif_reference,
          requires_prescription, is_controlled, controlled_tableau, storage_conditions,
          min_stock_level, reorder_quantity, tva_rate, source, is_active
        ) VALUES (
          v_target_pharmacy.id, v_product.barcode, v_product.sku, v_product.name, v_product.name_ar, 
          v_product.generic_name, v_product.dci_code,
          v_product.category_id, v_product.form, v_product.dosage, v_product.packaging, 
          v_product.manufacturer, v_product.country_of_origin,
          v_product.purchase_price, v_product.selling_price, v_product.margin_percent,
          v_product.is_chifa_listed, v_product.reimbursement_rate, v_product.tarif_reference,
          v_product.requires_prescription, v_product.is_controlled, v_product.controlled_tableau, 
          v_product.storage_conditions,
          v_product.min_stock_level, v_product.reorder_quantity, v_product.tva_rate, 
          'import', true
        )
        RETURNING id INTO v_new_product_id;
        
        -- Add inventory for this product
        INSERT INTO pharmacy_inventory (
          pharmacy_id, product_id, warehouse_id, quantity, reserved_quantity,
          purchase_price_unit, batch_number, expiry_date, received_date, is_active
        ) VALUES (
          v_target_pharmacy.id, v_new_product_id, v_warehouse_id,
          floor(random() * 80 + 10)::int,
          0,
          v_product.purchase_price,
          'LOT-' || to_char(now(), 'YYYYMM') || '-' || floor(random() * 9999 + 1000)::text,
          current_date + interval '12 months',
          current_date - interval '7 days',
          true
        );
      END IF;
    END LOOP;
    
    -- Copy customers
    INSERT INTO pharmacy_customers (pharmacy_id, customer_code, full_name, first_name, last_name, phone, chifa_number, nss, wilaya, loyalty_tier, loyalty_points, is_active)
    SELECT v_target_pharmacy.id, 
           'CUST-' || floor(random() * 99999)::text, 
           full_name, first_name, last_name, 
           phone || floor(random() * 9)::text,  -- slightly different phone
           chifa_number, nss, wilaya, loyalty_tier, loyalty_points, is_active
    FROM pharmacy_customers WHERE pharmacy_id = v_source_pharmacy_id
    ON CONFLICT DO NOTHING;
    
  END LOOP;
  
  RAISE NOTICE 'Done copying products to all pharmacies';
END $$;

-- Verify
SELECT p.business_name, 
       (SELECT COUNT(*) FROM pharmacy_products pp WHERE pp.pharmacy_id = p.id) as products,
       (SELECT COUNT(*) FROM pharmacy_inventory pi WHERE pi.pharmacy_id = p.id) as inventory
FROM professionals p
WHERE p.type = 'pharmacy'
ORDER BY p.business_name;
