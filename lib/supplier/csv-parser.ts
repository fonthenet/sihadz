/**
 * CSV parser for supplier product import
 * Handles comma-separated values with proper quote escaping
 */

export interface CsvParseResult {
  headers: string[]
  rows: Record<string, string>[]
  errors: string[]
}

/**
 * Parse CSV text into headers and rows of key-value objects
 */
export function parseCsv(csvText: string): CsvParseResult {
  const errors: string[] = []
  const lines = csvText.split(/\r?\n/).filter((line) => line.trim())
  if (lines.length === 0) {
    return { headers: [], rows: [], errors: ['File is empty'] }
  }

  const parseLine = (line: string): string[] => {
    const result: string[] = []
    let current = ''
    let inQuotes = false
    for (let i = 0; i < line.length; i++) {
      const c = line[i]
      if (c === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"'
          i++
        } else {
          inQuotes = !inQuotes
        }
      } else if ((c === ',' && !inQuotes) || c === '\n' || c === '\r') {
        result.push(current.trim())
        current = ''
      } else {
        current += c
      }
    }
    result.push(current.trim())
    return result
  }

  const normalizeHeader = (h: string) =>
    h
      .toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_]/g, '')
  const headers = parseLine(lines[0]).map(normalizeHeader)
  const headerMap: Record<string, string> = {
    name_en: 'name',
    sku: 'sku',
    barcode: 'barcode',
    name: 'name',
    name_fr: 'name_fr',
    name_ar: 'name_ar',
    description: 'description',
    dci_code: 'dci_code',
    generic_name: 'generic_name',
    form: 'form',
    dosage: 'dosage',
    packaging: 'packaging',
    category: 'category',
    category_id: 'category_id',
    price: 'unit_price',
    manufacturer: 'manufacturer',
    country_of_origin: 'country_of_origin',
    unit_price: 'unit_price',
    min_order_qty: 'min_order_qty',
    pack_size: 'pack_size',
    bulk_discount_qty: 'bulk_discount_qty',
    bulk_discount_percent: 'bulk_discount_percent',
    in_stock: 'in_stock',
    stock_quantity: 'stock_quantity',
    expiry_date: 'expiry_date',
    batch_number: 'batch_number',
    lot_number: 'lot_number',
    lead_time_days: 'lead_time_days',
    is_chifa_listed: 'is_chifa_listed',
    reimbursement_rate: 'reimbursement_rate',
    requires_prescription: 'requires_prescription',
    is_controlled: 'is_controlled',
    storage_conditions: 'storage_conditions',
  }

  const rows: Record<string, string>[] = []
  for (let i = 1; i < lines.length; i++) {
    const values = parseLine(lines[i])
    const row: Record<string, string> = {}
    headers.forEach((h, idx) => {
      const mapped = headerMap[h] || h
      if (values[idx] !== undefined) row[mapped] = values[idx]
    })
    rows.push(row)
  }

  return { headers, rows, errors }
}

/**
 * Map CSV row to supplier product input (snake_case keys)
 */
export function csvRowToProduct(row: Record<string, string>, categoryIdMap?: Record<string, string>): Record<string, unknown> {
  const yesNo = (v: string) => v && /^(1|true|yes|oui|نعم|y)$/i.test(String(v).trim())
  const num = (v: string) => (v ? parseFloat(String(v).replace(/,/g, '')) : undefined)
  const int = (v: string) => (v ? parseInt(String(v).replace(/,/g, ''), 10) : undefined)

  const category = row.category || row.category_id
  const categoryId = categoryIdMap?.[category?.toLowerCase() || ''] || (category?.match(/^[0-9a-f-]{36}$/i) ? category : undefined)

  return {
    sku: row.sku || undefined,
    barcode: row.barcode || undefined,
    name: row.name || row.name_en,
    name_fr: row.name_fr,
    name_ar: row.name_ar,
    description: row.description,
    dci_code: row.dci_code,
    generic_name: row.generic_name,
    form: row.form,
    dosage: row.dosage,
    packaging: row.packaging,
    category_id: categoryId,
    manufacturer: row.manufacturer,
    country_of_origin: row.country_of_origin,
    unit_price: num(row.unit_price) ?? 0,
    min_order_qty: int(row.min_order_qty) || 1,
    pack_size: int(row.pack_size) || 1,
    bulk_discount_qty: int(row.bulk_discount_qty),
    bulk_discount_percent: num(row.bulk_discount_percent),
    in_stock: row.in_stock === undefined ? true : yesNo(row.in_stock),
    stock_quantity: int(row.stock_quantity),
    expiry_date: row.expiry_date || undefined,
    batch_number: row.batch_number || undefined,
    lot_number: row.lot_number || undefined,
    lead_time_days: int(row.lead_time_days) || 1,
    is_chifa_listed: yesNo(row.is_chifa_listed || ''),
    reimbursement_rate: int(row.reimbursement_rate) || 0,
    requires_prescription: yesNo(row.requires_prescription || ''),
    is_controlled: yesNo(row.is_controlled || ''),
    storage_conditions: row.storage_conditions || undefined,
  }
}
