-- Ensure all suppliers have supplier_settings with notify_new_orders and notify_new_link_requests ON by default
-- Fixes: suppliers not receiving order notifications when settings were missing or misconfigured
-- Run: npm run db:run -- scripts/204-supplier-notification-defaults.sql

-- 1. Create supplier_settings for any supplier who doesn't have one (with notification defaults ON)
INSERT INTO supplier_settings (
  supplier_id,
  default_shipping_cost,
  default_payment_terms,
  default_lead_time_days,
  auto_accept_orders,
  accept_orders_from_anyone,
  notify_new_orders,
  notify_new_link_requests
)
SELECT 
  p.id,
  0,
  'cash',
  3,
  false,
  true,
  true,
  true
FROM professionals p
WHERE p.type IN ('pharma_supplier', 'equipment_supplier')
  AND NOT EXISTS (SELECT 1 FROM supplier_settings ss WHERE ss.supplier_id = p.id)
ON CONFLICT (supplier_id) DO NOTHING;

-- 2. Fix any existing supplier_settings: set notify_new_orders and notify_new_link_requests to true
--    when null (column might have been added later)
UPDATE supplier_settings ss
SET 
  notify_new_orders = COALESCE(notify_new_orders, true),
  notify_new_link_requests = COALESCE(notify_new_link_requests, true)
WHERE ss.supplier_id IN (
  SELECT id FROM professionals WHERE type IN ('pharma_supplier', 'equipment_supplier')
)
AND (ss.notify_new_orders IS NULL OR ss.notify_new_link_requests IS NULL);

-- 3. Trigger: Auto-create supplier_settings when a new supplier professional is created
CREATE OR REPLACE FUNCTION create_supplier_settings_for_new_supplier()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.type IN ('pharma_supplier', 'equipment_supplier') THEN
    INSERT INTO supplier_settings (
      supplier_id,
      default_shipping_cost,
      default_payment_terms,
      default_lead_time_days,
      auto_accept_orders,
      accept_orders_from_anyone,
      notify_new_orders,
      notify_new_link_requests
    ) VALUES (
      NEW.id,
      0,
      'cash',
      3,
      false,
      true,
      true,
      true
    )
    ON CONFLICT (supplier_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_professional_created_create_supplier_settings ON professionals;
CREATE TRIGGER on_professional_created_create_supplier_settings
  AFTER INSERT ON professionals
  FOR EACH ROW
  EXECUTE FUNCTION create_supplier_settings_for_new_supplier();

SELECT 'Supplier notification defaults migration complete' AS status;
