-- ============================================================================
-- SUPPLIER UNPAID ORDERS & PAYMENT TERMS
-- Track unpaid orders, pay-after-N-orders terms, alert supplier and buyer
-- ============================================================================

-- Add paid_at to supplier_purchase_orders (when buyer pays for this order)
ALTER TABLE supplier_purchase_orders 
ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;

COMMENT ON COLUMN supplier_purchase_orders.paid_at IS 'When buyer paid for this order; NULL = unpaid';

-- Add pay_after_orders to supplier_buyer_links (collect payment after N delivered orders)
ALTER TABLE supplier_buyer_links 
ADD COLUMN IF NOT EXISTS pay_after_orders INTEGER;

COMMENT ON COLUMN supplier_buyer_links.pay_after_orders IS 'Collect payment after N delivered orders (e.g. 2 or 3); NULL = use payment_terms';

-- Extend payment_terms check to allow after_N_orders
ALTER TABLE supplier_buyer_links DROP CONSTRAINT IF EXISTS supplier_buyer_links_payment_terms_check;
ALTER TABLE supplier_buyer_links ADD CONSTRAINT supplier_buyer_links_payment_terms_check 
  CHECK (payment_terms IN ('cash', '15_days', '30_days', '60_days', '90_days', 'after_2_orders', 'after_3_orders'));

-- Index for unpaid orders queries
CREATE INDEX IF NOT EXISTS idx_supplier_orders_paid_at 
  ON supplier_purchase_orders(supplier_id, paid_at) 
  WHERE paid_at IS NULL AND status IN ('delivered', 'completed', 'shipped');

CREATE INDEX IF NOT EXISTS idx_supplier_orders_buyer_unpaid 
  ON supplier_purchase_orders(buyer_id, paid_at) 
  WHERE paid_at IS NULL AND status IN ('delivered', 'completed', 'shipped');

-- Update get_supplier_stats to include unpaid orders
CREATE OR REPLACE FUNCTION get_supplier_stats(p_supplier_id UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_products', (SELECT COUNT(*) FROM supplier_product_catalog WHERE supplier_id = p_supplier_id AND is_active = TRUE),
    'active_buyers', (SELECT COUNT(*) FROM supplier_buyer_links WHERE supplier_id = p_supplier_id AND status = 'active'),
    'pending_orders', (SELECT COUNT(*) FROM supplier_purchase_orders WHERE supplier_id = p_supplier_id AND status IN ('submitted', 'confirmed', 'processing')),
    'pending_invoices', (SELECT COUNT(*) FROM supplier_invoices WHERE supplier_id = p_supplier_id AND status IN ('sent', 'partial', 'overdue')),
    'monthly_revenue', (
      SELECT COALESCE(SUM(amount_paid), 0) 
      FROM supplier_invoices 
      WHERE supplier_id = p_supplier_id 
      AND paid_at >= date_trunc('month', CURRENT_DATE)
    ),
    'outstanding_balance', (
      SELECT COALESCE(SUM(balance), 0) 
      FROM supplier_invoices 
      WHERE supplier_id = p_supplier_id 
      AND status IN ('sent', 'partial', 'overdue')
    ),
    'unpaid_orders_count', (
      SELECT COUNT(*) FROM supplier_purchase_orders 
      WHERE supplier_id = p_supplier_id 
      AND status IN ('delivered', 'completed', 'shipped') 
      AND paid_at IS NULL
    ),
    'unpaid_amount', (
      SELECT COALESCE(SUM(total), 0) FROM supplier_purchase_orders 
      WHERE supplier_id = p_supplier_id 
      AND status IN ('delivered', 'completed', 'shipped') 
      AND paid_at IS NULL
    ),
    'buyers_with_unpaid', (
      SELECT COUNT(DISTINCT buyer_id) FROM supplier_purchase_orders 
      WHERE supplier_id = p_supplier_id 
      AND status IN ('delivered', 'completed', 'shipped') 
      AND paid_at IS NULL
    )
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
