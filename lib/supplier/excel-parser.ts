/**
 * Excel (XLSX) parser for supplier product import
 */

import * as XLSX from 'xlsx'
import { csvRowToProduct } from './csv-parser'

export interface ExcelParseResult {
  rows: Record<string, string>[]
  sheetNames: string[]
  errors: string[]
}

/**
 * Parse Excel file and return rows from first sheet
 */
export function parseExcel(buffer: ArrayBuffer): ExcelParseResult {
  const errors: string[] = []
  const workbook = XLSX.read(buffer, { type: 'array' })
  const sheetNames = workbook.SheetNames

  if (sheetNames.length === 0) {
    return { rows: [], sheetNames: [], errors: ['No sheets in workbook'] }
  }

  const sheet = workbook.Sheets[sheetNames[0]]
  const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    header: 1,
    defval: '',
    raw: false,
  }) as unknown[][]

  if (!data || data.length === 0) {
    return { rows: [], sheetNames, errors: ['Sheet is empty'] }
  }

  const headers = (data[0] as string[]).map((h) =>
    String(h || '')
      .toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_]/g, '')
  )
  const rows: Record<string, string>[] = []

  for (let i = 1; i < data.length; i++) {
    const values = data[i] as unknown[]
    const row: Record<string, string> = {}
    headers.forEach((h, idx) => {
      if (h && values[idx] !== undefined && values[idx] !== null) {
        row[h] = String(values[idx])
      }
    })
    if (Object.keys(row).some((k) => row[k]?.trim())) {
      rows.push(row)
    }
  }

  return { rows, sheetNames, errors }
}

/**
 * Convert Excel rows to product objects
 */
export function excelRowsToProducts(
  rows: Record<string, string>[],
  categoryIdMap?: Record<string, string>
): Record<string, unknown>[] {
  return rows.map((row) => csvRowToProduct(row, categoryIdMap))
}
