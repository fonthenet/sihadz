# Supplier Advanced Commercial Tools

## Overview

Advanced B2B commercial tools designed specifically for suppliers dealing with large orders, bulk quantities, and complex commercial relationships. These tools provide enterprise-grade functionality for managing inventory, pricing, orders, and buyer relationships at scale.

## Features Implemented

### 1. Bulk Import/Export System

**Purpose:** Handle large product catalogs efficiently

**Features:**
- **CSV/JSON Import:** Import up to 1000 products at once
- **Bulk Updates:** Update existing products or create new ones
- **Export:** Export entire catalog in CSV or JSON format
- **Validation:** Automatic validation and error reporting

**API Endpoints:**
- `POST /api/supplier/products/import` - Bulk import products
- `GET /api/supplier/products/export?format=csv|json` - Export products

**Use Cases:**
- Initial catalog setup
- Periodic catalog updates from ERP systems
- Backup and restore operations
- Integration with external systems

### 2. Tiered Pricing System

**Purpose:** Implement volume discounts and buyer-specific pricing

**Features:**
- **Volume Discounts:** Set pricing tiers based on quantity
- **Buyer-Specific Pricing:** Custom pricing for individual buyers
- **Group Pricing:** Apply pricing rules to buyer groups
- **Product-Level Tiers:** Different pricing for different products
- **Priority System:** Handle overlapping pricing rules

**Database Tables:**
- `supplier_pricing_tiers` - Stores pricing rules
- `supplier_buyer_groups` - Organize buyers into groups

**API Endpoints:**
- `GET /api/supplier/pricing-tiers` - List all pricing tiers
- `POST /api/supplier/pricing-tiers` - Create pricing tier
- `PATCH /api/supplier/pricing-tiers` - Update pricing tier
- `DELETE /api/supplier/pricing-tiers` - Delete pricing tier

**Pricing Calculation:**
- Automatic price calculation using `calculate_supplier_price()` function
- Priority: Buyer-specific > Group > Product-level
- Supports both percentage discounts and fixed prices

### 3. Buyer Groups Management

**Purpose:** Organize buyers into groups with shared commercial terms

**Features:**
- **Group Creation:** Create buyer groups with default settings
- **Default Terms:** Set payment terms, discounts, and credit limits per group
- **Buyer Assignment:** Assign buyers to groups
- **Group Analytics:** Track performance by group

**API Endpoints:**
- `GET /api/supplier/buyer-groups` - List buyer groups
- `POST /api/supplier/buyer-groups` - Create buyer group
- `PATCH /api/supplier/buyer-groups` - Update buyer group
- `DELETE /api/supplier/buyer-groups` - Delete buyer group

**Use Cases:**
- Premium buyers with better terms
- Regional groups with specific pricing
- Volume-based groups with tiered discounts

### 4. Order Templates

**Purpose:** Save frequently ordered items for quick reordering

**Features:**
- **Template Creation:** Save order items as reusable templates
- **Buyer-Specific Templates:** Templates can be buyer-specific or general
- **Usage Tracking:** Track how often templates are used
- **Quick Ordering:** Create orders from templates with one click

**API Endpoints:**
- `GET /api/supplier/order-templates` - List templates
- `POST /api/supplier/order-templates` - Create template
- `PATCH /api/supplier/order-templates` - Update template
- `DELETE /api/supplier/order-templates` - Delete template

**Use Cases:**
- Regular monthly orders
- Standard product bundles
- Frequently ordered items

### 5. Multi-Warehouse Support (Schema Ready)

**Purpose:** Manage inventory across multiple warehouse locations

**Features:**
- **Warehouse Management:** Create and manage multiple warehouses
- **Stock Tracking:** Track stock levels per warehouse
- **Batch/Lot Tracking:** Track batches and lot numbers per warehouse
- **Location Codes:** Organize products within warehouses
- **Reserved Stock:** Reserve stock for pending orders

**Database Tables:**
- `supplier_warehouses` - Warehouse information
- `supplier_warehouse_stock` - Stock levels per warehouse

**Use Cases:**
- Multiple distribution centers
- Regional warehouses
- Batch/lot tracking for pharmaceuticals
- Expiry date management

### 6. Recurring Orders (Schema Ready)

**Purpose:** Automate regular orders from buyers

**Features:**
- **Schedule Management:** Daily, weekly, biweekly, monthly schedules
- **Custom Schedules:** Flexible scheduling options
- **Auto-Processing:** Optional auto-confirm and auto-ship
- **Template Integration:** Use order templates for recurring orders

**Database Tables:**
- `supplier_recurring_orders` - Recurring order definitions

**Use Cases:**
- Monthly restocking orders
- Regular supply contracts
- Automated procurement

### 7. Price History Tracking

**Purpose:** Track price changes over time

**Features:**
- **Automatic Tracking:** Price changes are automatically recorded
- **Price History:** View historical prices for any product
- **Change Reasons:** Optional reason tracking for price changes
- **Effective Dates:** Track when prices become effective

**Database Tables:**
- `supplier_price_history` - Historical price records

**Use Cases:**
- Price change audits
- Historical analysis
- Buyer price negotiations

### 8. Commercial Reports & Analytics (Schema Ready)

**Purpose:** Business intelligence for suppliers

**Features:**
- **Sales Summaries:** Daily, weekly, monthly, yearly summaries
- **Top Buyers:** Identify best customers
- **Top Products:** Best-selling products
- **Revenue Tracking:** Track revenue by period
- **Performance Metrics:** Average order value, buyer counts, etc.

**Database Tables:**
- `supplier_sales_summary` - Pre-calculated sales summaries

**Use Cases:**
- Business performance analysis
- Buyer relationship management
- Product performance tracking
- Financial reporting

## UI Components

### Advanced Tools Section

Located in the supplier dashboard under "Advanced Tools" section, includes:

1. **Bulk Operations Tab:**
   - Import products from CSV/JSON
   - Export products to CSV/JSON
   - File upload interface
   - Import/export status feedback

2. **Pricing Management Tab:**
   - View all pricing tiers
   - Create/edit/delete pricing tiers
   - Filter by product, buyer group, or buyer
   - Visual tier display

3. **Buyer Groups Tab:**
   - List all buyer groups
   - Create/edit/delete groups
   - View group statistics
   - Manage group settings

4. **Order Templates Tab:**
   - List all templates
   - Create/edit/delete templates
   - Usage statistics
   - Quick order creation from templates

## Integration Points

### ERP Integration
- Bulk import/export APIs for ERP synchronization
- Webhook support (planned)
- API key authentication (planned)

### Accounting Systems
- Export invoices and orders for accounting
- CSV/JSON formats compatible with most systems
- Financial reporting data

### Inventory Management
- Multi-warehouse stock tracking
- Batch/lot management
- Expiry date tracking
- Stock reservations

## Future Enhancements

1. **Document Generation:**
   - PDF invoices with custom templates
   - Delivery notes
   - Proforma invoices
   - Credit notes

2. **Advanced Analytics:**
   - Sales forecasting
   - Inventory optimization
   - Buyer behavior analysis
   - Product performance metrics

3. **Automation:**
   - Auto-reorder points
   - Low stock alerts
   - Payment reminders
   - Order approval workflows

4. **Integration:**
   - Webhook system for real-time updates
   - API key management
   - Third-party integrations (accounting, shipping)

## Database Schema

All advanced features are stored in dedicated tables:
- `supplier_buyer_groups` - Buyer groups
- `supplier_pricing_tiers` - Pricing rules
- `supplier_order_templates` - Order templates
- `supplier_recurring_orders` - Recurring orders
- `supplier_warehouses` - Warehouses
- `supplier_warehouse_stock` - Warehouse stock
- `supplier_sales_summary` - Sales summaries
- `supplier_price_history` - Price history

## Security

- Row Level Security (RLS) enabled on all tables
- Suppliers can only access their own data
- API endpoints require authentication
- Data validation on all inputs

## Performance

- Indexed database queries for fast lookups
- Batch processing for bulk operations
- Efficient pricing calculation functions
- Optimized for large catalogs (1000+ products)

## Commercial Standards

These tools follow B2B commercial standards:
- **Payment Terms:** Cash, 15/30/60/90 days
- **Credit Management:** Credit limits per buyer/group
- **Volume Discounts:** Standard tiered pricing
- **Order Management:** PO-based ordering system
- **Invoice Management:** Professional invoicing with payment tracking
- **Buyer Relationships:** Group-based relationship management

## Usage Examples

### Bulk Import Products
```json
POST /api/supplier/products/import
{
  "products": [
    {
      "name": "Product Name",
      "sku": "SKU-001",
      "unit_price": 1000,
      "min_order_qty": 10,
      "bulk_discount_qty": 100,
      "bulk_discount_percent": 5
    }
  ]
}
```

### Create Pricing Tier
```json
POST /api/supplier/pricing-tiers
{
  "product_id": "uuid",
  "min_quantity": 100,
  "max_quantity": 500,
  "discount_percent": 10
}
```

### Create Buyer Group
```json
POST /api/supplier/buyer-groups
{
  "name": "Premium Buyers",
  "default_payment_terms": "30_days",
  "default_discount_percent": 5,
  "default_credit_limit": 100000
}
```

## Support

For questions or issues with advanced features, contact support or refer to the API documentation.
