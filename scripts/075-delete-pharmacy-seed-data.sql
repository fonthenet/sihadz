-- ============================================================================
-- DELETE PHARMACY SEED DATA
-- Removes all test data inserted by 074-seed-pharmacy-complete-test-data.sql
-- Run this to clean up SEED-* test data from all pharmacies.
-- ============================================================================

DO $$
DECLARE
  v_deleted INT;
BEGIN
  -- Delete in correct order (respecting FKs)
  WITH d AS (DELETE FROM accounting_journal_lines WHERE entry_id IN (SELECT id FROM accounting_journal_entries WHERE entry_number LIKE 'SEED-%') RETURNING 1)
  SELECT COUNT(*) INTO v_deleted FROM d;
  RAISE NOTICE 'Deleted % accounting journal lines', v_deleted;

  WITH d AS (DELETE FROM accounting_journal_entries WHERE entry_number LIKE 'SEED-%' RETURNING 1)
  SELECT COUNT(*) INTO v_deleted FROM d;
  RAISE NOTICE 'Deleted % accounting journal entries', v_deleted;

  WITH d AS (DELETE FROM chifa_rejections WHERE rejection_motif LIKE 'SEED%' RETURNING 1)
  SELECT COUNT(*) INTO v_deleted FROM d;
  RAISE NOTICE 'Deleted % chifa rejections', v_deleted;

  WITH d AS (DELETE FROM chifa_invoice_items WHERE invoice_id IN (SELECT id FROM chifa_invoices WHERE invoice_number LIKE 'SEED-%') RETURNING 1)
  SELECT COUNT(*) INTO v_deleted FROM d;
  RAISE NOTICE 'Deleted % chifa invoice items', v_deleted;

  WITH d AS (DELETE FROM chifa_invoices WHERE invoice_number LIKE 'SEED-%' RETURNING 1)
  SELECT COUNT(*) INTO v_deleted FROM d;
  RAISE NOTICE 'Deleted % chifa invoices', v_deleted;

  WITH d AS (DELETE FROM chifa_bordereaux WHERE bordereau_number LIKE 'SEED-%' RETURNING 1)
  SELECT COUNT(*) INTO v_deleted FROM d;
  RAISE NOTICE 'Deleted % chifa bordereaux', v_deleted;

  WITH d AS (DELETE FROM pos_sale_items WHERE sale_id IN (SELECT id FROM pos_sales WHERE sale_number LIKE 'SEED-%') RETURNING 1)
  SELECT COUNT(*) INTO v_deleted FROM d;
  RAISE NOTICE 'Deleted % pos sale items', v_deleted;

  WITH d AS (DELETE FROM pos_sales WHERE sale_number LIKE 'SEED-%' RETURNING 1)
  SELECT COUNT(*) INTO v_deleted FROM d;
  RAISE NOTICE 'Deleted % pos sales', v_deleted;

  WITH d AS (DELETE FROM warehouse_transfer_items WHERE transfer_id IN (SELECT id FROM warehouse_transfers WHERE transfer_number LIKE 'SEED-%') RETURNING 1)
  SELECT COUNT(*) INTO v_deleted FROM d;
  RAISE NOTICE 'Deleted % warehouse transfer items', v_deleted;

  WITH d AS (DELETE FROM warehouse_transfers WHERE transfer_number LIKE 'SEED-%' RETURNING 1)
  SELECT COUNT(*) INTO v_deleted FROM d;
  RAISE NOTICE 'Deleted % warehouse transfers', v_deleted;

  WITH d AS (DELETE FROM pharmacy_purchase_order_items WHERE purchase_order_id IN (SELECT id FROM pharmacy_purchase_orders WHERE po_number LIKE 'SEED-%') RETURNING 1)
  SELECT COUNT(*) INTO v_deleted FROM d;
  RAISE NOTICE 'Deleted % purchase order items', v_deleted;

  WITH d AS (DELETE FROM pharmacy_purchase_orders WHERE po_number LIKE 'SEED-%' RETURNING 1)
  SELECT COUNT(*) INTO v_deleted FROM d;
  RAISE NOTICE 'Deleted % purchase orders', v_deleted;

  WITH d AS (DELETE FROM prescriptions WHERE prescription_number LIKE 'SEED-RX-%' RETURNING 1)
  SELECT COUNT(*) INTO v_deleted FROM d;
  RAISE NOTICE 'Deleted % prescriptions', v_deleted;

  WITH d AS (DELETE FROM cash_drawer_sessions WHERE session_number LIKE 'SEED-%' RETURNING 1)
  SELECT COUNT(*) INTO v_deleted FROM d;
  RAISE NOTICE 'Deleted % cash drawer sessions', v_deleted;

  RAISE NOTICE 'All SEED test data deleted successfully.';
END $$;
