-- ============================================================================
-- SUPPLIER ORDER ITEM CONTROL
-- Reject items, substitute, adjust qty/price, send for buyer review
-- ============================================================================

-- Add new order status (drop existing check, add expanded one)
ALTER TABLE supplier_purchase_orders DROP CONSTRAINT IF EXISTS supplier_purchase_orders_status_check;
ALTER TABLE supplier_purchase_orders ADD CONSTRAINT supplier_purchase_orders_status_check
  CHECK (status IN (
    'draft', 'submitted', 'confirmed', 'processing', 'shipped', 'delivered', 'completed',
    'cancelled', 'rejected', 'pending_buyer_review'
  ));

-- Add review tracking to orders
ALTER TABLE supplier_purchase_orders ADD COLUMN IF NOT EXISTS review_requested_at TIMESTAMPTZ;
ALTER TABLE supplier_purchase_orders ADD COLUMN IF NOT EXISTS supplier_changes_summary TEXT;

-- Add item-level control columns to order items
ALTER TABLE supplier_purchase_order_items ADD COLUMN IF NOT EXISTS item_status TEXT DEFAULT 'pending'
  CHECK (item_status IN ('pending', 'accepted', 'rejected', 'substitution_offered', 'substitution_accepted', 'substitution_rejected', 'quantity_adjusted', 'price_adjusted'));

ALTER TABLE supplier_purchase_order_items ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE supplier_purchase_order_items ADD COLUMN IF NOT EXISTS substitute_product_id UUID REFERENCES supplier_product_catalog(id);
ALTER TABLE supplier_purchase_order_items ADD COLUMN IF NOT EXISTS substitute_quantity INTEGER;
ALTER TABLE supplier_purchase_order_items ADD COLUMN IF NOT EXISTS substitute_unit_price DECIMAL(12,2);
ALTER TABLE supplier_purchase_order_items ADD COLUMN IF NOT EXISTS substitute_line_total DECIMAL(12,2);
ALTER TABLE supplier_purchase_order_items ADD COLUMN IF NOT EXISTS substitute_notes TEXT;
ALTER TABLE supplier_purchase_order_items ADD COLUMN IF NOT EXISTS substitute_product_name TEXT;
ALTER TABLE supplier_purchase_order_items ADD COLUMN IF NOT EXISTS substitute_product_sku TEXT;
ALTER TABLE supplier_purchase_order_items ADD COLUMN IF NOT EXISTS adjusted_quantity INTEGER;
ALTER TABLE supplier_purchase_order_items ADD COLUMN IF NOT EXISTS adjusted_unit_price DECIMAL(12,2);
ALTER TABLE supplier_purchase_order_items ADD COLUMN IF NOT EXISTS adjustment_reason TEXT;
ALTER TABLE supplier_purchase_order_items ADD COLUMN IF NOT EXISTS supplier_item_notes TEXT;

-- Backfill existing items to 'accepted' if order is past submitted
UPDATE supplier_purchase_order_items oi
SET item_status = 'accepted'
FROM supplier_purchase_orders o
WHERE oi.order_id = o.id
  AND o.status NOT IN ('draft', 'submitted', 'rejected', 'cancelled')
  AND (oi.item_status IS NULL OR oi.item_status = 'pending');
