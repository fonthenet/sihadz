-- ============================================================================
-- PHARMACY COMPLETE TEST DATA - ALL DASHBOARD TABS
-- Seeds data for: POS, Chifa, Accounting, Purchase Orders, Warehouses, etc.
-- Uses SEED- prefix for easy deletion. Run for ALL pharmacies.
-- Realistic Algerian pharmacy amounts (DZD).
--
-- EASY DELETION: See 075-delete-pharmacy-seed-data.sql
-- ============================================================================

-- Ensure prescriptions has total_price for overview revenue
ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS total_price DECIMAL(12,2);

DO $$
DECLARE
  v_pharmacy RECORD;
  v_warehouse_id UUID;
  v_warehouse_fridge_id UUID;
  v_drawer_id UUID;
  v_session_id UUID;
  v_session_closed_id UUID;
  v_sale_id UUID;
  v_product_id UUID;
  v_product2_id UUID;
  v_customer_id UUID;
  v_supplier_id UUID;
  v_invoice_id UUID;
  v_bordereau_id UUID;
  v_journal_type_id UUID;
  v_fiscal_year_id UUID;
  v_account_531 UUID;
  v_account_512 UUID;
  v_account_700 UUID;
  v_account_4113 UUID;
  v_po_id UUID;
  v_transfer_id UUID;
  v_doctor_id UUID;
  v_patient_id UUID;
  v_auth_user_id UUID;
  v_i INT;
BEGIN
  -- Get first doctor and patient for prescriptions (optional)
  SELECT id INTO v_doctor_id FROM professionals WHERE type = 'doctor' AND is_active = true LIMIT 1;
  SELECT id INTO v_patient_id FROM profiles LIMIT 1;

  FOR v_pharmacy IN SELECT id FROM professionals WHERE type = 'pharmacy'
  LOOP
    BEGIN
      -- Ensure warehouse exists
      INSERT INTO pharmacy_warehouses (pharmacy_id, code, name, warehouse_type, is_default, is_sales_enabled)
      VALUES (v_pharmacy.id, 'MAIN', 'Main Storage', 'storage', true, true)
      ON CONFLICT (pharmacy_id, code) DO NOTHING;

      INSERT INTO pharmacy_warehouses (pharmacy_id, code, name, warehouse_type, is_default, is_sales_enabled, temperature_controlled)
      VALUES (v_pharmacy.id, 'FRIDGE', 'Cold Storage', 'refrigerated', false, true, true)
      ON CONFLICT (pharmacy_id, code) DO NOTHING;

      SELECT id INTO v_warehouse_id FROM pharmacy_warehouses WHERE pharmacy_id = v_pharmacy.id AND code = 'MAIN';
      SELECT id INTO v_warehouse_fridge_id FROM pharmacy_warehouses WHERE pharmacy_id = v_pharmacy.id AND code = 'FRIDGE';

      IF v_warehouse_id IS NULL OR v_warehouse_fridge_id IS NULL THEN
        RAISE NOTICE 'Skipping pharmacy % - no warehouse', v_pharmacy.id;
        CONTINUE;
      END IF;

      -- Ensure cash drawer exists
      INSERT INTO pharmacy_cash_drawers (pharmacy_id, code, name, warehouse_id)
      VALUES (v_pharmacy.id, 'MAIN', 'Main Register', v_warehouse_id)
      ON CONFLICT (pharmacy_id, code) DO NOTHING;

      SELECT id INTO v_drawer_id FROM pharmacy_cash_drawers WHERE pharmacy_id = v_pharmacy.id AND code = 'MAIN';
      IF v_drawer_id IS NULL THEN CONTINUE; END IF;

      -- Get first 2 products for this pharmacy
      SELECT id INTO v_product_id FROM pharmacy_products WHERE pharmacy_id = v_pharmacy.id AND is_active = true LIMIT 1;
      SELECT id INTO v_product2_id FROM pharmacy_products WHERE pharmacy_id = v_pharmacy.id AND is_active = true OFFSET 1 LIMIT 1;
      IF v_product2_id IS NULL THEN v_product2_id := v_product_id; END IF;

      -- Get customer, supplier
      SELECT id INTO v_customer_id FROM pharmacy_customers WHERE pharmacy_id = v_pharmacy.id AND is_active = true LIMIT 1;
      SELECT id INTO v_supplier_id FROM pharmacy_suppliers WHERE pharmacy_id = v_pharmacy.id AND is_active = true LIMIT 1;

      IF v_product_id IS NULL THEN
        RAISE NOTICE 'Skipping pharmacy % - no products. Run 071-seed-pharmacy-test-data.sql first.', v_pharmacy.id;
        CONTINUE;
      END IF;

      SELECT auth_user_id INTO v_auth_user_id FROM professionals WHERE id = v_pharmacy.id;
      IF v_auth_user_id IS NULL THEN
        SELECT id INTO v_auth_user_id FROM profiles LIMIT 1;
      END IF;

      -- ========== CASH SESSIONS (Cash Management tab) ==========
      INSERT INTO cash_drawer_sessions (pharmacy_id, drawer_id, session_number, opened_at, opened_by, opened_by_name, opening_balance, status)
      VALUES (v_pharmacy.id, v_drawer_id, 'SEED-SESSION-001', now() - interval '2 days', COALESCE(v_auth_user_id, '00000000-0000-0000-0000-000000000001'::uuid), 'Test User', 50000, 'open')
      ON CONFLICT (pharmacy_id, session_number) DO NOTHING
      RETURNING id INTO v_session_id;

      IF v_session_id IS NULL THEN
        SELECT id INTO v_session_id FROM cash_drawer_sessions WHERE pharmacy_id = v_pharmacy.id AND session_number = 'SEED-SESSION-001';
      END IF;

      INSERT INTO cash_drawer_sessions (pharmacy_id, drawer_id, session_number, opened_at, closed_at, opened_by, opened_by_name, opening_balance, counted_cash, status)
      VALUES (v_pharmacy.id, v_drawer_id, 'SEED-SESSION-CLOSED-001', now() - interval '3 days', now() - interval '2 days', COALESCE(v_auth_user_id, '00000000-0000-0000-0000-000000000001'::uuid), 'Test User', 100000, 485000, 'closed')
      ON CONFLICT (pharmacy_id, session_number) DO NOTHING
      RETURNING id INTO v_session_closed_id;

      IF v_session_closed_id IS NULL THEN
        SELECT id INTO v_session_closed_id FROM cash_drawer_sessions WHERE pharmacy_id = v_pharmacy.id AND session_number = 'SEED-SESSION-CLOSED-001';
      END IF;

      -- ========== POS SALES (POS tab) - Realistic Algerian pharmacy amounts (DZD) ==========
      -- Daily sales typically 50,000 - 300,000 DZD
      FOR v_i IN 1..5 LOOP
        INSERT INTO pos_sales (pharmacy_id, session_id, drawer_id, warehouse_id, sale_number, customer_id, subtotal, total_amount, paid_cash, status)
        VALUES (v_pharmacy.id, v_session_closed_id, v_drawer_id, v_warehouse_id,
                'SEED-TICKET-' || v_i, v_customer_id, 
                45000 + v_i * 18000, 45000 + v_i * 18000, 45000 + v_i * 18000, 'completed')
        ON CONFLICT (pharmacy_id, sale_number) DO NOTHING
        RETURNING id INTO v_sale_id;

        IF v_sale_id IS NOT NULL THEN
          INSERT INTO pos_sale_items (sale_id, product_id, product_name, quantity, unit_price, line_total)
          SELECT v_sale_id, v_product_id, p.name, 2 + (v_i % 3), p.selling_price, (2 + (v_i % 3)) * p.selling_price
          FROM pharmacy_products p WHERE p.id = v_product_id;
        END IF;
      END LOOP;

      -- Chifa sale - realistic split (CNAS 80%, patient 20%)
      INSERT INTO pos_sales (pharmacy_id, session_id, drawer_id, warehouse_id, sale_number, customer_id, subtotal, total_amount, paid_cash, chifa_total, patient_total, status)
      VALUES (v_pharmacy.id, v_session_closed_id, v_drawer_id, v_warehouse_id,
              'SEED-TICKET-CHIFA', v_customer_id, 85000, 85000, 17000, 68000, 17000, 'completed')
      ON CONFLICT (pharmacy_id, sale_number) DO NOTHING
      RETURNING id INTO v_sale_id;

      -- ========== CHIFA INVOICES (Chifa tab) - Realistic amounts (DZD) ==========
      INSERT INTO chifa_invoices (pharmacy_id, invoice_number, invoice_date, insured_number, insured_name, insurance_type, total_tarif_reference, total_chifa, total_patient, grand_total, status)
      VALUES (v_pharmacy.id, 'SEED-FAC-001', current_date - 5, '12345678901234', 'Patient Test SEED', 'CNAS', 45000, 36000, 9000, 45000, 'pending')
      ON CONFLICT (pharmacy_id, invoice_number) DO NOTHING;

      SELECT id INTO v_invoice_id FROM chifa_invoices WHERE pharmacy_id = v_pharmacy.id AND invoice_number = 'SEED-FAC-001';

      IF v_invoice_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM chifa_invoice_items WHERE invoice_id = v_invoice_id) THEN
        INSERT INTO chifa_invoice_items (invoice_id, product_id, product_name, quantity, unit_price, tarif_reference, reimbursement_rate, chifa_amount, patient_amount, line_total)
        SELECT v_invoice_id, v_product_id, p.name, 3, p.selling_price, p.selling_price * 0.9, 80, 
               (p.selling_price * 3 * 0.9 * 0.8)::numeric(10,2), (p.selling_price * 3 * 0.9 * 0.2)::numeric(10,2), (p.selling_price * 3)::numeric(10,2)
        FROM pharmacy_products p WHERE p.id = v_product_id;
      END IF;

      INSERT INTO chifa_invoices (pharmacy_id, invoice_number, invoice_date, insured_number, insured_name, insurance_type, total_tarif_reference, total_chifa, total_patient, grand_total, status)
      VALUES (v_pharmacy.id, 'SEED-FAC-002', current_date - 3, '23456789012345', 'Assuré SEED', 'CNAS', 28000, 22400, 5600, 28000, 'pending')
      ON CONFLICT (pharmacy_id, invoice_number) DO NOTHING;

      INSERT INTO chifa_invoices (pharmacy_id, invoice_number, invoice_date, insured_number, insured_name, insurance_type, total_tarif_reference, total_chifa, total_patient, grand_total, status)
      VALUES (v_pharmacy.id, 'SEED-FAC-003', current_date - 1, '34567890123456', 'Casnos Patient', 'CASNOS', 52000, 41600, 10400, 52000, 'pending')
      ON CONFLICT (pharmacy_id, invoice_number) DO NOTHING;

      -- Chifa bordereau
      INSERT INTO chifa_bordereaux (pharmacy_id, bordereau_number, insurance_type, period_start, period_end, invoice_count, total_chifa_amount, total_patient_amount, status)
      VALUES (v_pharmacy.id, 'SEED-BOR-CNAS-001', 'CNAS', current_date - 30, current_date - 1, 2, 58400, 14600, 'draft')
      ON CONFLICT (pharmacy_id, bordereau_number) DO NOTHING
      RETURNING id INTO v_bordereau_id;

      INSERT INTO chifa_bordereaux (pharmacy_id, bordereau_number, insurance_type, period_start, period_end, invoice_count, total_chifa_amount, total_patient_amount, status, payment_date, amount_paid)
      VALUES (v_pharmacy.id, 'SEED-BOR-PAID-001', 'CNAS', current_date - 60, current_date - 31, 3, 156000, 39000, 'paid', current_date - 10, 156000)
      ON CONFLICT (pharmacy_id, bordereau_number) DO NOTHING;

      -- Chifa rejection (need an invoice first)
      SELECT id INTO v_invoice_id FROM chifa_invoices WHERE pharmacy_id = v_pharmacy.id AND invoice_number = 'SEED-FAC-001';
      IF v_invoice_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM chifa_rejections WHERE pharmacy_id = v_pharmacy.id AND invoice_id = v_invoice_id) THEN
        INSERT INTO chifa_rejections (pharmacy_id, invoice_id, rejection_date, rejection_code, rejection_motif, rejected_amount, status)
        VALUES (v_pharmacy.id, v_invoice_id, current_date - 2, 'E01', 'SEED - Données incomplètes', 5000, 'pending');
      END IF;

      -- ========== ACCOUNTING (Accounting tab) ==========
      SELECT id INTO v_fiscal_year_id FROM accounting_fiscal_years WHERE pharmacy_id = v_pharmacy.id AND is_current = true LIMIT 1;
      SELECT id INTO v_journal_type_id FROM accounting_journal_types WHERE pharmacy_id = v_pharmacy.id AND code = 'VT' LIMIT 1;
      SELECT id INTO v_account_531 FROM accounting_accounts WHERE pharmacy_id = v_pharmacy.id AND code = '531' LIMIT 1;
      SELECT id INTO v_account_512 FROM accounting_accounts WHERE pharmacy_id = v_pharmacy.id AND code = '512' LIMIT 1;
      SELECT id INTO v_account_700 FROM accounting_accounts WHERE pharmacy_id = v_pharmacy.id AND code = '700' LIMIT 1;
      SELECT id INTO v_account_4113 FROM accounting_accounts WHERE pharmacy_id = v_pharmacy.id AND code = '4113' LIMIT 1;

      -- Accounting entries - realistic amounts, current month for dashboard visibility
      IF v_fiscal_year_id IS NOT NULL AND v_journal_type_id IS NOT NULL AND v_account_531 IS NOT NULL AND v_account_700 IS NOT NULL THEN
        INSERT INTO accounting_journal_entries (pharmacy_id, entry_number, journal_type_id, fiscal_year_id, entry_date, description, total_debit, total_credit, status, is_auto_generated)
        VALUES (v_pharmacy.id, 'SEED-VT-001', v_journal_type_id, v_fiscal_year_id, current_date, '[SEED] Ventes journée', 285000, 285000, 'posted', false)
        ON CONFLICT (pharmacy_id, entry_number) DO NOTHING
        RETURNING id INTO v_sale_id;

        IF v_sale_id IS NOT NULL THEN
          INSERT INTO accounting_journal_lines (entry_id, line_number, account_id, account_code, description, debit_amount, credit_amount)
          VALUES (v_sale_id, 1, v_account_531, '531', 'Caisse', 285000, 0),
                 (v_sale_id, 2, v_account_700, '700', 'Ventes', 0, 285000);
        END IF;

        INSERT INTO accounting_journal_entries (pharmacy_id, entry_number, journal_type_id, fiscal_year_id, entry_date, description, total_debit, total_credit, status, is_auto_generated)
        VALUES (v_pharmacy.id, 'SEED-VT-002', v_journal_type_id, v_fiscal_year_id, current_date - 1, '[SEED] Règlement CNAS', 156000, 156000, 'posted', false)
        ON CONFLICT (pharmacy_id, entry_number) DO NOTHING
        RETURNING id INTO v_sale_id;

        IF v_sale_id IS NOT NULL AND v_account_4113 IS NOT NULL AND v_account_512 IS NOT NULL THEN
          INSERT INTO accounting_journal_lines (entry_id, line_number, account_id, account_code, description, debit_amount, credit_amount)
          VALUES (v_sale_id, 1, v_account_512, '512', 'Banque', 156000, 0),
                 (v_sale_id, 2, v_account_4113, '4113', 'Clients CNAS', 0, 156000);
        END IF;

        -- Extra revenue entry for this month
        INSERT INTO accounting_journal_entries (pharmacy_id, entry_number, journal_type_id, fiscal_year_id, entry_date, description, total_debit, total_credit, status, is_auto_generated)
        VALUES (v_pharmacy.id, 'SEED-VT-003', v_journal_type_id, v_fiscal_year_id, current_date - 3, '[SEED] Ventes espèces', 125000, 125000, 'posted', false)
        ON CONFLICT (pharmacy_id, entry_number) DO NOTHING
        RETURNING id INTO v_sale_id;
        IF v_sale_id IS NOT NULL THEN
          INSERT INTO accounting_journal_lines (entry_id, line_number, account_id, account_code, description, debit_amount, credit_amount)
          VALUES (v_sale_id, 1, v_account_531, '531', 'Caisse', 125000, 0),
                 (v_sale_id, 2, v_account_700, '700', 'Ventes', 0, 125000);
        END IF;
      END IF;

      -- ========== PURCHASE ORDERS - Realistic amounts (DZD) ==========
      IF v_supplier_id IS NOT NULL THEN
        INSERT INTO pharmacy_purchase_orders (pharmacy_id, po_number, supplier_id, warehouse_id, status, subtotal, total_amount, order_date)
        VALUES (v_pharmacy.id, 'SEED-PO-001', v_supplier_id, v_warehouse_id, 'draft', 450000, 450000, current_date - 2)
        ON CONFLICT (pharmacy_id, po_number) DO NOTHING
        RETURNING id INTO v_po_id;

        INSERT INTO pharmacy_purchase_orders (pharmacy_id, po_number, supplier_id, warehouse_id, status, subtotal, total_amount, order_date)
        VALUES (v_pharmacy.id, 'SEED-PO-002', v_supplier_id, v_warehouse_id, 'sent', 680000, 680000, current_date - 5)
        ON CONFLICT (pharmacy_id, po_number) DO NOTHING;

        INSERT INTO pharmacy_purchase_orders (pharmacy_id, po_number, supplier_id, warehouse_id, status, subtotal, total_amount, order_date, received_date)
        VALUES (v_pharmacy.id, 'SEED-PO-003', v_supplier_id, v_warehouse_id, 'received', 320000, 320000, current_date - 10, current_date - 8)
        ON CONFLICT (pharmacy_id, po_number) DO NOTHING;

        IF v_po_id IS NOT NULL THEN
          INSERT INTO pharmacy_purchase_order_items (purchase_order_id, product_id, product_name, quantity_ordered, unit_price, line_total)
          SELECT v_po_id, v_product_id, p.name, 50, p.purchase_price, 50 * p.purchase_price
          FROM pharmacy_products p WHERE p.id = v_product_id;
        END IF;
      END IF;

      -- ========== WAREHOUSE TRANSFERS (Warehouses tab) ==========
      INSERT INTO warehouse_transfers (pharmacy_id, transfer_number, from_warehouse_id, to_warehouse_id, status)
      VALUES (v_pharmacy.id, 'SEED-TR-001', v_warehouse_id, v_warehouse_fridge_id, 'pending')
      ON CONFLICT (pharmacy_id, transfer_number) DO NOTHING
      RETURNING id INTO v_transfer_id;

      INSERT INTO warehouse_transfers (pharmacy_id, transfer_number, from_warehouse_id, to_warehouse_id, status, received_at)
      VALUES (v_pharmacy.id, 'SEED-TR-002', v_warehouse_id, v_warehouse_fridge_id, 'completed', now() - interval '1 day')
      ON CONFLICT (pharmacy_id, transfer_number) DO NOTHING;

      IF v_transfer_id IS NOT NULL THEN
        INSERT INTO warehouse_transfer_items (transfer_id, product_id, quantity_requested, quantity_shipped, quantity_received)
        VALUES (v_transfer_id, v_product_id, 10, 10, 10);
      END IF;

      -- ========== PRESCRIPTIONS (Prescriptions tab) - with total_price for overview revenue ==========
      IF v_doctor_id IS NOT NULL AND v_patient_id IS NOT NULL THEN
        INSERT INTO prescriptions (pharmacy_id, doctor_id, patient_id, prescription_number, diagnosis, status, valid_until, total_price)
        VALUES (v_pharmacy.id, v_doctor_id, v_patient_id, 'SEED-RX-' || replace(v_pharmacy.id::text, '-', '')::text || '-1', '[SEED] Test ordonnance', 'active', current_date + 30, 35000)
        ON CONFLICT (prescription_number) DO NOTHING;

        INSERT INTO prescriptions (pharmacy_id, doctor_id, patient_id, prescription_number, diagnosis, status, valid_until, total_price)
        VALUES (v_pharmacy.id, v_doctor_id, v_patient_id, 'SEED-RX-' || replace(v_pharmacy.id::text, '-', '')::text || '-2', '[SEED] Ordonnance dispensée', 'dispensed', current_date + 15, 52000)
        ON CONFLICT (prescription_number) DO NOTHING;

        INSERT INTO prescriptions (pharmacy_id, doctor_id, patient_id, prescription_number, diagnosis, status, valid_until, total_price)
        VALUES (v_pharmacy.id, v_doctor_id, v_patient_id, 'SEED-RX-' || replace(v_pharmacy.id::text, '-', '')::text || '-3', '[SEED] En attente', 'active', current_date + 7, 28000)
        ON CONFLICT (prescription_number) DO NOTHING;
      END IF;

      RAISE NOTICE 'Seeded test data for pharmacy %', v_pharmacy.id;

    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Error for pharmacy %: %', v_pharmacy.id, SQLERRM;
    END;
  END LOOP;

  RAISE NOTICE 'Complete test data seeding finished.';
END $$;

-- ============================================================================
-- FIX: accounting_journal_lines references v_account_512 which may not be set
-- Run a quick fix for the second journal entry if needed
-- ============================================================================
DO $$
DECLARE
  v_pharmacy RECORD;
  v_entry_id UUID;
  v_account_512 UUID;
  v_account_4113 UUID;
BEGIN
  FOR v_pharmacy IN SELECT id FROM professionals WHERE type = 'pharmacy'
  LOOP
    SELECT id INTO v_account_512 FROM accounting_accounts WHERE pharmacy_id = v_pharmacy.id AND code = '512' LIMIT 1;
    SELECT id INTO v_account_4113 FROM accounting_accounts WHERE pharmacy_id = v_pharmacy.id AND code = '4113' LIMIT 1;
    SELECT id INTO v_entry_id FROM accounting_journal_entries WHERE pharmacy_id = v_pharmacy.id AND entry_number = 'SEED-VT-002';

    IF v_entry_id IS NOT NULL AND v_account_512 IS NOT NULL AND v_account_4113 IS NOT NULL THEN
      IF NOT EXISTS (SELECT 1 FROM accounting_journal_lines WHERE entry_id = v_entry_id) THEN
        INSERT INTO accounting_journal_lines (entry_id, line_number, account_id, account_code, description, debit_amount, credit_amount)
        VALUES (v_entry_id, 1, v_account_512, '512', 'Banque', 3000, 0),
               (v_entry_id, 2, v_account_4113, '4113', 'Clients CNAS', 0, 3000);
      END IF;
    END IF;
  END LOOP;
END $$;

-- ============================================================================
-- EASY DELETION - Run this block to remove all SEED test data
-- ============================================================================
/*
DO $$
BEGIN
  -- Delete in correct order (respecting FKs)
  DELETE FROM accounting_journal_lines WHERE entry_id IN (SELECT id FROM accounting_journal_entries WHERE entry_number LIKE 'SEED-%');
  DELETE FROM accounting_journal_entries WHERE entry_number LIKE 'SEED-%';
  DELETE FROM chifa_rejections WHERE rejection_motif LIKE 'SEED%';
  DELETE FROM chifa_invoice_items WHERE invoice_id IN (SELECT id FROM chifa_invoices WHERE invoice_number LIKE 'SEED-%');
  DELETE FROM chifa_invoices WHERE invoice_number LIKE 'SEED-%';
  DELETE FROM chifa_bordereaux WHERE bordereau_number LIKE 'SEED-%';
  DELETE FROM pos_sale_items WHERE sale_id IN (SELECT id FROM pos_sales WHERE sale_number LIKE 'SEED-%');
  DELETE FROM pos_sales WHERE sale_number LIKE 'SEED-%';
  DELETE FROM warehouse_transfer_items WHERE transfer_id IN (SELECT id FROM warehouse_transfers WHERE transfer_number LIKE 'SEED-%');
  DELETE FROM warehouse_transfers WHERE transfer_number LIKE 'SEED-%';
  DELETE FROM pharmacy_purchase_order_items WHERE purchase_order_id IN (SELECT id FROM pharmacy_purchase_orders WHERE po_number LIKE 'SEED-%');
  DELETE FROM pharmacy_purchase_orders WHERE po_number LIKE 'SEED-%';
  DELETE FROM prescriptions WHERE prescription_number LIKE 'SEED-RX-%';
  DELETE FROM cash_drawer_sessions WHERE session_number LIKE 'SEED-%';
  RAISE NOTICE 'All SEED test data deleted.';
END $$;
*/
