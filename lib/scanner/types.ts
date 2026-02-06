/**
 * Hand scanner settings - applies to all professional types
 * Used for: products (POS/inventory), prescriptions, receipts
 */

export type ScannerSuffixKey = 'Enter' | 'Tab'

export interface ScannerScanContexts {
  products: boolean   // POS, product search
  prescriptions: boolean
  receipts: boolean
  inventory: boolean  // Product catalog, stock
}

export interface ScannerSettings {
  enabled: boolean
  suffixKey: ScannerSuffixKey
  minBarcodeLength: number
  scanContexts: ScannerScanContexts
  soundOnScan: boolean
}

export const DEFAULT_SCANNER_SETTINGS: ScannerSettings = {
  enabled: true,
  suffixKey: 'Enter',
  minBarcodeLength: 8,
  scanContexts: {
    products: true,
    prescriptions: true,
    receipts: true,
    inventory: true,
    chifa: true,
  },
  soundOnScan: false,
}

export type ScanContext = keyof ScannerScanContexts
