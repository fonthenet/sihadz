# Google Sheets Integration Guide

This guide explains how to set up automatic synchronization between your pharmacy inventory and Google Sheets.

## Overview

There are two main integration patterns:

1. **Push from Platform → Sheets**: Use webhooks to automatically update your spreadsheet when inventory changes
2. **Pull from Sheets → Platform**: Use the API to import products from your spreadsheet

---

## Option 1: Automatic Export to Google Sheets (Webhooks)

### Step 1: Create a Google Apps Script Web App

1. Open your Google Sheet
2. Go to **Extensions → Apps Script**
3. Delete any existing code and paste the script below
4. Save the project with a name like "Pharmacy Inventory Sync"

### Step 2: Deploy as Web App

1. Click **Deploy → New deployment**
2. Select type: **Web app**
3. Set:
   - Description: "Inventory webhook receiver"
   - Execute as: **Me**
   - Who has access: **Anyone** (required for webhooks)
4. Click **Deploy** and copy the Web app URL

### Step 3: Add Webhook in Platform

1. Go to your Pharmacy Dashboard → Inventory → Integrations
2. Click **Add Webhook**
3. Paste the Web app URL
4. Select events: `product.created`, `product.updated`, `stock.received`, etc.
5. Optionally add a secret for signature verification

---

## Google Apps Script Code

```javascript
/**
 * Pharmacy Inventory → Google Sheets Sync
 * Receives webhook events and updates spreadsheet
 */

// Configuration
const CONFIG = {
  PRODUCTS_SHEET: 'Products',
  STOCK_SHEET: 'Stock',
  LOG_SHEET: 'Webhook Log',
  WEBHOOK_SECRET: '', // Optional: set this if you configured a secret
};

/**
 * Handle incoming webhook POST requests
 */
function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    
    // Verify signature if secret is configured
    if (CONFIG.WEBHOOK_SECRET) {
      const signature = e.parameter['X-Webhook-Signature'] || 
                       (e.parameters && e.parameters['X-Webhook-Signature']);
      // Note: Full HMAC verification requires more setup
      // For basic use, the secret in the URL can provide security
    }
    
    // Log the webhook
    logWebhook(payload);
    
    // Handle event
    const event = payload.event;
    const data = payload.data;
    
    switch (event) {
      case 'product.created':
        handleProductCreated(data.product);
        break;
      case 'product.updated':
        handleProductUpdated(data.product);
        break;
      case 'product.deleted':
        handleProductDeleted(data.product);
        break;
      case 'stock.received':
        handleStockReceived(data);
        break;
      case 'stock.adjusted':
        handleStockAdjusted(data);
        break;
      case 'stock.low':
      case 'stock.out':
      case 'stock.expiring':
      case 'stock.expired':
        handleStockAlert(event, data);
        break;
      default:
        Logger.log('Unknown event: ' + event);
    }
    
    return ContentService.createTextOutput(JSON.stringify({ success: true }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    Logger.log('Error: ' + error.toString());
    return ContentService.createTextOutput(JSON.stringify({ error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Handle GET requests (for testing)
 */
function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: 'ok',
    message: 'Pharmacy Inventory Webhook Receiver is active'
  })).setMimeType(ContentService.MimeType.JSON);
}

/**
 * Log webhook to sheet
 */
function logWebhook(payload) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let logSheet = ss.getSheetByName(CONFIG.LOG_SHEET);
  
  if (!logSheet) {
    logSheet = ss.insertSheet(CONFIG.LOG_SHEET);
    logSheet.appendRow(['Timestamp', 'Event', 'Data']);
  }
  
  logSheet.appendRow([
    new Date().toISOString(),
    payload.event,
    JSON.stringify(payload.data).substring(0, 500)
  ]);
  
  // Keep only last 100 logs
  const lastRow = logSheet.getLastRow();
  if (lastRow > 101) {
    logSheet.deleteRows(2, lastRow - 101);
  }
}

/**
 * Get or create Products sheet with headers
 */
function getProductsSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(CONFIG.PRODUCTS_SHEET);
  
  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.PRODUCTS_SHEET);
    sheet.appendRow([
      'ID', 'Barcode', 'SKU', 'Name', 'Generic Name', 'Form', 'Dosage',
      'Manufacturer', 'Purchase Price', 'Selling Price', 'Margin %',
      'Chifa Listed', 'Reimbursement %', 'Prescription Required',
      'Min Stock', 'Current Stock', 'TVA %', 'Active', 'Updated At'
    ]);
    sheet.setFrozenRows(1);
  }
  
  return sheet;
}

/**
 * Find row by product ID
 */
function findProductRow(sheet, productId) {
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === productId) {
      return i + 1; // 1-indexed
    }
  }
  return null;
}

/**
 * Handle product.created event
 */
function handleProductCreated(product) {
  const sheet = getProductsSheet();
  
  sheet.appendRow([
    product.id,
    product.barcode || '',
    product.sku || '',
    product.name,
    product.generic_name || '',
    product.form || '',
    product.dosage || '',
    product.manufacturer || '',
    product.purchase_price || 0,
    product.selling_price || 0,
    product.margin_percent || 0,
    product.is_chifa_listed ? 'Yes' : 'No',
    product.reimbursement_rate || 0,
    product.requires_prescription ? 'Yes' : 'No',
    product.min_stock_level || 0,
    product.current_stock || 0,
    product.tva_rate || 0,
    product.is_active ? 'Yes' : 'No',
    new Date().toISOString()
  ]);
}

/**
 * Handle product.updated event
 */
function handleProductUpdated(product) {
  const sheet = getProductsSheet();
  const row = findProductRow(sheet, product.id);
  
  if (row) {
    const range = sheet.getRange(row, 1, 1, 19);
    range.setValues([[
      product.id,
      product.barcode || '',
      product.sku || '',
      product.name,
      product.generic_name || '',
      product.form || '',
      product.dosage || '',
      product.manufacturer || '',
      product.purchase_price || 0,
      product.selling_price || 0,
      product.margin_percent || 0,
      product.is_chifa_listed ? 'Yes' : 'No',
      product.reimbursement_rate || 0,
      product.requires_prescription ? 'Yes' : 'No',
      product.min_stock_level || 0,
      product.current_stock || 0,
      product.tva_rate || 0,
      product.is_active ? 'Yes' : 'No',
      new Date().toISOString()
    ]]);
  } else {
    // Product not found, add it
    handleProductCreated(product);
  }
}

/**
 * Handle product.deleted event
 */
function handleProductDeleted(product) {
  const sheet = getProductsSheet();
  const row = findProductRow(sheet, product.id);
  
  if (row) {
    // Mark as inactive rather than deleting
    sheet.getRange(row, 18).setValue('No');
    sheet.getRange(row, 19).setValue(new Date().toISOString());
  }
}

/**
 * Handle stock.received event
 */
function handleStockReceived(data) {
  // Update product's current stock in Products sheet
  const sheet = getProductsSheet();
  const row = findProductRow(sheet, data.product_id);
  
  if (row) {
    const currentStock = sheet.getRange(row, 16).getValue() || 0;
    sheet.getRange(row, 16).setValue(currentStock + data.quantity);
    sheet.getRange(row, 19).setValue(new Date().toISOString());
  }
  
  // Optionally log to Stock sheet
  logStockMovement('RECEIVED', data);
}

/**
 * Handle stock.adjusted event
 */
function handleStockAdjusted(data) {
  const sheet = getProductsSheet();
  const row = findProductRow(sheet, data.product_id);
  
  if (row) {
    sheet.getRange(row, 16).setValue(data.new_quantity);
    sheet.getRange(row, 19).setValue(new Date().toISOString());
  }
  
  logStockMovement('ADJUSTED', data);
}

/**
 * Handle stock alerts
 */
function handleStockAlert(event, data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let alertSheet = ss.getSheetByName('Alerts');
  
  if (!alertSheet) {
    alertSheet = ss.insertSheet('Alerts');
    alertSheet.appendRow(['Timestamp', 'Alert Type', 'Product', 'Details']);
    alertSheet.setFrozenRows(1);
  }
  
  alertSheet.appendRow([
    new Date().toISOString(),
    event.replace('stock.', '').toUpperCase(),
    data.product_name,
    JSON.stringify(data)
  ]);
  
  // Highlight low/out of stock
  if (event === 'stock.out' || event === 'stock.low') {
    const productsSheet = getProductsSheet();
    const row = findProductRow(productsSheet, data.product_id);
    if (row) {
      const color = event === 'stock.out' ? '#ffcccc' : '#fff3cd';
      productsSheet.getRange(row, 1, 1, 19).setBackground(color);
    }
  }
}

/**
 * Log stock movement
 */
function logStockMovement(type, data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let stockSheet = ss.getSheetByName(CONFIG.STOCK_SHEET);
  
  if (!stockSheet) {
    stockSheet = ss.insertSheet(CONFIG.STOCK_SHEET);
    stockSheet.appendRow(['Timestamp', 'Type', 'Product', 'Quantity Change', 'New Quantity', 'Batch', 'Expiry', 'Notes']);
    stockSheet.setFrozenRows(1);
  }
  
  stockSheet.appendRow([
    new Date().toISOString(),
    type,
    data.product_name,
    data.quantity || data.quantity_change || 0,
    data.new_quantity || '',
    data.batch_number || '',
    data.expiry_date || '',
    data.reason || data.notes || ''
  ]);
}

/**
 * Manual sync: Fetch all products from API
 */
function syncAllProducts() {
  const API_KEY = PropertiesService.getScriptProperties().getProperty('API_KEY');
  const API_URL = PropertiesService.getScriptProperties().getProperty('API_URL');
  
  if (!API_KEY || !API_URL) {
    throw new Error('API_KEY and API_URL must be set in Script Properties');
  }
  
  const response = UrlFetchApp.fetch(API_URL + '/api/pharmacy/inventory/export?format=json&type=all', {
    headers: {
      'Authorization': 'Bearer ' + API_KEY
    }
  });
  
  const data = JSON.parse(response.getContentText());
  const products = data.products;
  
  // Clear and rebuild Products sheet
  const sheet = getProductsSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.deleteRows(2, lastRow - 1);
  }
  
  // Add all products
  products.forEach(product => {
    handleProductCreated({
      ...product,
      current_stock: product.current_stock || 0
    });
  });
  
  SpreadsheetApp.getUi().alert('Synced ' + products.length + ' products');
}

/**
 * Setup menu
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('Pharmacy Sync')
    .addItem('Sync All Products', 'syncAllProducts')
    .addItem('Configure API', 'showConfigDialog')
    .addToUi();
}

/**
 * Configuration dialog
 */
function showConfigDialog() {
  const ui = SpreadsheetApp.getUi();
  
  const apiUrlResult = ui.prompt('Enter your API URL (e.g., https://your-domain.com)');
  if (apiUrlResult.getSelectedButton() !== ui.Button.OK) return;
  
  const apiKeyResult = ui.prompt('Enter your API Key (starts with pk_)');
  if (apiKeyResult.getSelectedButton() !== ui.Button.OK) return;
  
  PropertiesService.getScriptProperties().setProperties({
    'API_URL': apiUrlResult.getResponseText().trim(),
    'API_KEY': apiKeyResult.getResponseText().trim()
  });
  
  ui.alert('Configuration saved! You can now use Sync All Products.');
}
```

---

## Option 2: Import from Google Sheets

### Using CSV Export

1. Export your Google Sheet as CSV: **File → Download → Comma-separated values**
2. Use the import API:

```bash
curl -X POST "https://your-domain.com/api/pharmacy/inventory/import" \
  -H "Authorization: Bearer pk_your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "products": [
      {"name": "Product 1", "selling_price": 100, "barcode": "123456789"},
      {"name": "Product 2", "selling_price": 200}
    ]
  }'
```

### CSV Format

Your CSV should have these columns (only `name` and `selling_price` are required):

| Column | Required | Description |
|--------|----------|-------------|
| name | Yes | Product name |
| selling_price | Yes | Price in DZD |
| barcode | No | EAN/UPC barcode |
| sku | No | Internal SKU |
| generic_name | No | Generic/DCI name |
| purchase_price | No | Cost price |
| is_chifa_listed | No | true/false |
| reimbursement_rate | No | 0-100 |
| requires_prescription | No | true/false |
| min_stock_level | No | Reorder point |
| initial_stock | No | Starting quantity |

---

## Troubleshooting

### Webhook not working?

1. Check the **Webhook Log** sheet in your Google Sheet
2. Verify the Web app is deployed as "Anyone can access"
3. Test the webhook from the Platform UI
4. Check Apps Script execution logs: **View → Executions**

### Products not syncing?

1. Ensure API Key has `products:read` and `stock:read` permissions
2. Check the API URL is correct (no trailing slash)
3. Try the "Sync All Products" menu option

### Need help?

Contact support with:
- Your webhook delivery ID
- Any error messages from the Apps Script logs
- Screenshots of your configuration

---

## Security Notes

- API Keys should be treated like passwords
- Use the webhook secret for signature verification
- The Apps Script runs with your Google account permissions
- Consider limiting API key scopes to only what's needed
