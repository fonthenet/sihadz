-- ============================================================================
-- Universal Business Storefront System
-- Allows any business type to showcase and sell products/services online
-- Primary flow: browse → order → pay at store pickup
-- Optional: online payment (wallet, Chargily) when enabled
-- ============================================================================

-- ============================================================================
-- 1. STOREFRONT SETTINGS (per business)
-- ============================================================================

CREATE TABLE IF NOT EXISTS storefront_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    professional_id UUID NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
    
    -- Toggle
    is_enabled BOOLEAN DEFAULT false,
    
    -- Display
    storefront_name TEXT,
    storefront_name_ar TEXT,
    storefront_description TEXT,
    storefront_description_ar TEXT,
    banner_image_url TEXT,
    
    -- Fulfillment
    pickup_enabled BOOLEAN DEFAULT true,
    delivery_enabled BOOLEAN DEFAULT false,
    delivery_fee DECIMAL(10,2) DEFAULT 0,
    delivery_radius_km INTEGER,
    delivery_notes TEXT,
    
    -- Payment (cash at pickup is primary; online payment optional)
    accept_cash_on_pickup BOOLEAN DEFAULT true,
    accept_online_payment BOOLEAN DEFAULT false, -- Toggle on when ready
    
    -- Policies
    min_order_amount DECIMAL(10,2) DEFAULT 0,
    preparation_time_minutes INTEGER DEFAULT 30,
    
    -- Operating hours for orders (NULL = use business hours)
    order_hours JSONB, -- { "mon": { "open": "08:00", "close": "18:00" }, ... }
    
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    UNIQUE(professional_id)
);

-- Index for quick lookup
CREATE INDEX IF NOT EXISTS idx_storefront_settings_professional 
    ON storefront_settings(professional_id);

CREATE INDEX IF NOT EXISTS idx_storefront_settings_enabled 
    ON storefront_settings(is_enabled) WHERE is_enabled = true;

-- ============================================================================
-- 2. STOREFRONT PRODUCT CATEGORIES
-- ============================================================================

CREATE TABLE IF NOT EXISTS storefront_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    professional_id UUID NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
    
    name TEXT NOT NULL,
    name_ar TEXT,
    description TEXT,
    slug TEXT,
    icon TEXT, -- Icon name or URL
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    UNIQUE(professional_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_storefront_categories_professional 
    ON storefront_categories(professional_id);

-- ============================================================================
-- 3. STOREFRONT PRODUCTS/SERVICES
-- ============================================================================

CREATE TABLE IF NOT EXISTS storefront_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    professional_id UUID NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
    category_id UUID REFERENCES storefront_categories(id) ON DELETE SET NULL,
    
    -- Basic Info
    name TEXT NOT NULL,
    name_ar TEXT,
    description TEXT,
    description_ar TEXT,
    
    -- Categorization (for filtering)
    product_type TEXT DEFAULT 'product', -- 'product', 'service', 'package'
    tags TEXT[],
    
    -- Pricing
    price DECIMAL(10,2) NOT NULL,
    compare_at_price DECIMAL(10,2), -- For showing discounts/original price
    
    -- Availability
    is_available BOOLEAN DEFAULT true,
    stock_quantity INTEGER, -- NULL = unlimited (services)
    track_inventory BOOLEAN DEFAULT false,
    low_stock_threshold INTEGER DEFAULT 5,
    
    -- Images
    image_url TEXT,
    images TEXT[], -- Additional images array
    
    -- Pharmacy-specific (optional link to inventory)
    pharmacy_product_id UUID REFERENCES pharmacy_products(id) ON DELETE SET NULL,
    requires_prescription BOOLEAN DEFAULT false,
    
    -- Service-specific
    duration_minutes INTEGER, -- For services: how long it takes
    
    -- Display
    display_order INTEGER DEFAULT 0,
    is_featured BOOLEAN DEFAULT false,
    
    -- SEO/search
    search_keywords TEXT[],
    
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_storefront_products_professional 
    ON storefront_products(professional_id);

CREATE INDEX IF NOT EXISTS idx_storefront_products_available 
    ON storefront_products(professional_id, is_available) 
    WHERE is_available = true;

CREATE INDEX IF NOT EXISTS idx_storefront_products_category 
    ON storefront_products(category_id);

CREATE INDEX IF NOT EXISTS idx_storefront_products_featured 
    ON storefront_products(professional_id, is_featured) 
    WHERE is_featured = true;

CREATE INDEX IF NOT EXISTS idx_storefront_products_pharmacy_link 
    ON storefront_products(pharmacy_product_id) 
    WHERE pharmacy_product_id IS NOT NULL;

-- Full text search on name/description
CREATE INDEX IF NOT EXISTS idx_storefront_products_search 
    ON storefront_products USING gin(to_tsvector('french', coalesce(name, '') || ' ' || coalesce(description, '')));

-- ============================================================================
-- 4. STOREFRONT ORDERS
-- ============================================================================

CREATE TABLE IF NOT EXISTS storefront_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number TEXT UNIQUE NOT NULL, -- 'ORD-YYYYMMDD-XXXXX'
    
    -- Parties
    professional_id UUID NOT NULL REFERENCES professionals(id),
    customer_id UUID REFERENCES profiles(id), -- NULL for guest orders (future)
    
    -- Customer Info (snapshot)
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    customer_email TEXT,
    
    -- Status workflow: pending → confirmed → preparing → ready → completed
    -- Or: pending → cancelled
    status TEXT DEFAULT 'pending' CHECK (status IN (
        'pending',      -- Order placed, awaiting business confirmation
        'confirmed',    -- Business confirmed, will prepare
        'preparing',    -- Being prepared
        'ready',        -- Ready for pickup/delivery
        'completed',    -- Customer picked up / delivered
        'cancelled'     -- Cancelled by customer or business
    )),
    
    -- Totals
    subtotal DECIMAL(10,2) NOT NULL,
    delivery_fee DECIMAL(10,2) DEFAULT 0,
    discount_amount DECIMAL(10,2) DEFAULT 0,
    discount_code TEXT,
    total DECIMAL(10,2) NOT NULL,
    
    -- Fulfillment
    fulfillment_type TEXT DEFAULT 'pickup' CHECK (fulfillment_type IN ('pickup', 'delivery')),
    estimated_pickup_time TIMESTAMPTZ,
    delivery_address TEXT,
    delivery_notes TEXT,
    
    -- Payment (cash on pickup is primary)
    payment_method TEXT DEFAULT 'cash' CHECK (payment_method IN ('cash', 'wallet', 'chargily')),
    payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
    payment_id UUID REFERENCES payments(id),
    
    -- Notes
    customer_notes TEXT,
    internal_notes TEXT, -- Business internal notes
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT now(),
    confirmed_at TIMESTAMPTZ,
    ready_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    cancellation_reason TEXT,
    cancelled_by TEXT CHECK (cancelled_by IN ('customer', 'business'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_storefront_orders_professional 
    ON storefront_orders(professional_id);

CREATE INDEX IF NOT EXISTS idx_storefront_orders_customer 
    ON storefront_orders(customer_id);

CREATE INDEX IF NOT EXISTS idx_storefront_orders_status 
    ON storefront_orders(professional_id, status);

CREATE INDEX IF NOT EXISTS idx_storefront_orders_created 
    ON storefront_orders(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_storefront_orders_number 
    ON storefront_orders(order_number);

-- ============================================================================
-- 5. STOREFRONT ORDER ITEMS
-- ============================================================================

CREATE TABLE IF NOT EXISTS storefront_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES storefront_orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES storefront_products(id) ON DELETE SET NULL,
    
    -- Snapshot (in case product changes later)
    product_name TEXT NOT NULL,
    product_name_ar TEXT,
    product_image_url TEXT,
    unit_price DECIMAL(10,2) NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    total DECIMAL(10,2) NOT NULL,
    
    -- Item-specific notes
    notes TEXT,
    
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_storefront_order_items_order 
    ON storefront_order_items(order_id);

-- ============================================================================
-- 6. ORDER NUMBER SEQUENCE
-- ============================================================================

CREATE SEQUENCE IF NOT EXISTS storefront_order_number_seq START 1;

-- Function to generate order number: ORD-YYYYMMDD-XXXXX
CREATE OR REPLACE FUNCTION generate_storefront_order_number()
RETURNS TEXT AS $$
DECLARE
    seq_val INTEGER;
BEGIN
    seq_val := nextval('storefront_order_number_seq');
    RETURN 'ORD-' || to_char(now(), 'YYYYMMDD') || '-' || lpad(seq_val::text, 5, '0');
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 7. TRIGGERS FOR UPDATED_AT
-- ============================================================================

-- Storefront settings
CREATE OR REPLACE FUNCTION update_storefront_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_storefront_settings_updated_at ON storefront_settings;
CREATE TRIGGER trigger_storefront_settings_updated_at
    BEFORE UPDATE ON storefront_settings
    FOR EACH ROW EXECUTE FUNCTION update_storefront_settings_updated_at();

-- Storefront categories
CREATE OR REPLACE FUNCTION update_storefront_categories_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_storefront_categories_updated_at ON storefront_categories;
CREATE TRIGGER trigger_storefront_categories_updated_at
    BEFORE UPDATE ON storefront_categories
    FOR EACH ROW EXECUTE FUNCTION update_storefront_categories_updated_at();

-- Storefront products
CREATE OR REPLACE FUNCTION update_storefront_products_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_storefront_products_updated_at ON storefront_products;
CREATE TRIGGER trigger_storefront_products_updated_at
    BEFORE UPDATE ON storefront_products
    FOR EACH ROW EXECUTE FUNCTION update_storefront_products_updated_at();

-- ============================================================================
-- 8. ROW LEVEL SECURITY
-- ============================================================================

-- Enable RLS
ALTER TABLE storefront_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE storefront_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE storefront_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE storefront_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE storefront_order_items ENABLE ROW LEVEL SECURITY;

-- Storefront settings: business can manage their own
DROP POLICY IF EXISTS storefront_settings_owner ON storefront_settings;
CREATE POLICY storefront_settings_owner ON storefront_settings
    FOR ALL USING (
        professional_id IN (
            SELECT id FROM professionals WHERE auth_user_id = auth.uid()
        )
    );

-- Public read for enabled storefronts
DROP POLICY IF EXISTS storefront_settings_public_read ON storefront_settings;
CREATE POLICY storefront_settings_public_read ON storefront_settings
    FOR SELECT USING (is_enabled = true);

-- Categories: business can manage their own
DROP POLICY IF EXISTS storefront_categories_owner ON storefront_categories;
CREATE POLICY storefront_categories_owner ON storefront_categories
    FOR ALL USING (
        professional_id IN (
            SELECT id FROM professionals WHERE auth_user_id = auth.uid()
        )
    );

-- Public read for categories of enabled storefronts
DROP POLICY IF EXISTS storefront_categories_public_read ON storefront_categories;
CREATE POLICY storefront_categories_public_read ON storefront_categories
    FOR SELECT USING (
        professional_id IN (
            SELECT professional_id FROM storefront_settings WHERE is_enabled = true
        )
    );

-- Products: business can manage their own
DROP POLICY IF EXISTS storefront_products_owner ON storefront_products;
CREATE POLICY storefront_products_owner ON storefront_products
    FOR ALL USING (
        professional_id IN (
            SELECT id FROM professionals WHERE auth_user_id = auth.uid()
        )
    );

-- Public read for available products of enabled storefronts
DROP POLICY IF EXISTS storefront_products_public_read ON storefront_products;
CREATE POLICY storefront_products_public_read ON storefront_products
    FOR SELECT USING (
        is_available = true AND
        professional_id IN (
            SELECT professional_id FROM storefront_settings WHERE is_enabled = true
        )
    );

-- Orders: business can view their orders
DROP POLICY IF EXISTS storefront_orders_business ON storefront_orders;
CREATE POLICY storefront_orders_business ON storefront_orders
    FOR ALL USING (
        professional_id IN (
            SELECT id FROM professionals WHERE auth_user_id = auth.uid()
        )
    );

-- Orders: customer can view their orders
DROP POLICY IF EXISTS storefront_orders_customer ON storefront_orders;
CREATE POLICY storefront_orders_customer ON storefront_orders
    FOR SELECT USING (customer_id = auth.uid());

-- Orders: customer can create orders
DROP POLICY IF EXISTS storefront_orders_customer_insert ON storefront_orders;
CREATE POLICY storefront_orders_customer_insert ON storefront_orders
    FOR INSERT WITH CHECK (customer_id = auth.uid());

-- Order items: inherit from order access
DROP POLICY IF EXISTS storefront_order_items_access ON storefront_order_items;
CREATE POLICY storefront_order_items_access ON storefront_order_items
    FOR SELECT USING (
        order_id IN (
            SELECT id FROM storefront_orders WHERE 
                customer_id = auth.uid() OR
                professional_id IN (
                    SELECT id FROM professionals WHERE auth_user_id = auth.uid()
                )
        )
    );

-- Order items: allow insert when creating order
DROP POLICY IF EXISTS storefront_order_items_insert ON storefront_order_items;
CREATE POLICY storefront_order_items_insert ON storefront_order_items
    FOR INSERT WITH CHECK (
        order_id IN (
            SELECT id FROM storefront_orders WHERE customer_id = auth.uid()
        )
    );

-- ============================================================================
-- 9. HELPER FUNCTIONS
-- ============================================================================

-- Get storefront product count
CREATE OR REPLACE FUNCTION get_storefront_product_count(p_professional_id UUID)
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)::INTEGER 
        FROM storefront_products 
        WHERE professional_id = p_professional_id AND is_available = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if storefront has prescription items
CREATE OR REPLACE FUNCTION storefront_has_prescription_items(p_order_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM storefront_order_items oi
        JOIN storefront_products p ON oi.product_id = p.id
        WHERE oi.order_id = p_order_id AND p.requires_prescription = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 10. COMMENTS
-- ============================================================================

COMMENT ON TABLE storefront_settings IS 'Storefront configuration per business - enable/disable, fulfillment, payment options';
COMMENT ON TABLE storefront_categories IS 'Product/service categories for a business storefront';
COMMENT ON TABLE storefront_products IS 'Products or services listed in a business storefront';
COMMENT ON TABLE storefront_orders IS 'Customer orders from storefronts';
COMMENT ON TABLE storefront_order_items IS 'Line items for storefront orders';

COMMENT ON COLUMN storefront_settings.accept_online_payment IS 'Optional: enable when business is ready for wallet/Chargily payments';
COMMENT ON COLUMN storefront_products.pharmacy_product_id IS 'Optional link to pharmacy inventory for stock sync';
COMMENT ON COLUMN storefront_orders.payment_method IS 'cash = pay at pickup (default), wallet/chargily = online payment';
