-- ============================================================================
-- FIX ORDER ITEM STATUS CONSTRAINT
-- Ensure the item_status column has proper default and constraint
-- ============================================================================

-- Drop any existing CHECK constraint on item_status
ALTER TABLE supplier_purchase_order_items DROP CONSTRAINT IF EXISTS supplier_purchase_order_items_item_status_check;

-- Ensure the column exists with proper default
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'supplier_purchase_order_items' 
    AND column_name = 'item_status'
  ) THEN
    ALTER TABLE supplier_purchase_order_items ADD COLUMN item_status TEXT DEFAULT 'pending';
  ELSE
    ALTER TABLE supplier_purchase_order_items ALTER COLUMN item_status SET DEFAULT 'pending';
  END IF;
END $$;

-- Set NULL values to 'pending'
UPDATE supplier_purchase_order_items 
SET item_status = 'pending' 
WHERE item_status IS NULL;

-- Now add the CHECK constraint separately
ALTER TABLE supplier_purchase_order_items ADD CONSTRAINT supplier_purchase_order_items_item_status_check
  CHECK (item_status IN ('pending', 'accepted', 'rejected', 'substitution_offered', 'substitution_accepted', 'substitution_rejected', 'quantity_adjusted', 'price_adjusted'));

-- Backfill existing items to 'accepted' if order is past submitted (re-run)
UPDATE supplier_purchase_order_items oi
SET item_status = 'accepted'
FROM supplier_purchase_orders o
WHERE oi.order_id = o.id
  AND o.status NOT IN ('draft', 'submitted', 'rejected', 'cancelled', 'pending_buyer_review')
  AND oi.item_status = 'pending';
