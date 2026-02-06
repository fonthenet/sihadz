/**
 * Pharmacy Inventory - Calculation Utilities
 * Pricing, margins, CNAS reimbursement, TVA
 */

// ============================================================================
// MARGIN CALCULATIONS
// ============================================================================

/**
 * Calculate margin percentage from purchase and selling prices
 */
export function calculateMarginPercent(purchasePrice: number, sellingPrice: number): number {
  if (purchasePrice <= 0) return 0
  return ((sellingPrice - purchasePrice) / purchasePrice) * 100
}

/**
 * Calculate selling price from purchase price and desired margin
 */
export function calculateSellingPrice(purchasePrice: number, marginPercent: number): number {
  return purchasePrice * (1 + marginPercent / 100)
}

/**
 * Calculate purchase price from selling price and margin
 */
export function calculatePurchasePrice(sellingPrice: number, marginPercent: number): number {
  if (marginPercent <= -100) return sellingPrice
  return sellingPrice / (1 + marginPercent / 100)
}

/**
 * Calculate profit per unit
 */
export function calculateProfit(purchasePrice: number, sellingPrice: number): number {
  return sellingPrice - purchasePrice
}

// ============================================================================
// TVA (VAT) CALCULATIONS
// ============================================================================

export type TVARate = 0 | 9 | 19

/**
 * Calculate TVA amount from price (price includes TVA)
 */
export function calculateTVAFromTTC(priceTTC: number, tvaRate: TVARate): number {
  if (tvaRate === 0) return 0
  return priceTTC - (priceTTC / (1 + tvaRate / 100))
}

/**
 * Calculate price HT (without TVA) from TTC (with TVA)
 */
export function calculatePriceHT(priceTTC: number, tvaRate: TVARate): number {
  if (tvaRate === 0) return priceTTC
  return priceTTC / (1 + tvaRate / 100)
}

/**
 * Calculate price TTC (with TVA) from HT (without TVA)
 */
export function calculatePriceTTC(priceHT: number, tvaRate: TVARate): number {
  return priceHT * (1 + tvaRate / 100)
}

/**
 * Get TVA rate based on product category
 */
export function getDefaultTVARate(category: string, isChifaListed: boolean): TVARate {
  // Essential medications are TVA exempt
  if (isChifaListed) return 0
  
  // Cosmetics and parapharmacy have standard rate
  if (category === 'cosmetics' || category === 'parapharmacie') return 19
  
  // Medical devices and supplements have reduced rate
  if (category === 'medical_devices' || category === 'supplements') return 9
  
  // Default: medications are exempt
  return 0
}

// ============================================================================
// CNAS/CHIFA REIMBURSEMENT CALCULATIONS
// ============================================================================

export type ReimbursementRate = 0 | 80 | 100

export interface ChifaCalculation {
  total_amount: number
  chifa_covered: number
  patient_portion: number
  reimbursement_rate: ReimbursementRate
}

/**
 * Calculate Chifa reimbursement split
 */
export function calculateChifaSplit(
  sellingPrice: number,
  tarifReference: number | undefined,
  reimbursementRate: ReimbursementRate,
  quantity: number = 1
): ChifaCalculation {
  const totalAmount = sellingPrice * quantity
  
  // If not reimbursable, patient pays everything
  if (reimbursementRate === 0) {
    return {
      total_amount: totalAmount,
      chifa_covered: 0,
      patient_portion: totalAmount,
      reimbursement_rate: 0
    }
  }
  
  // Use tarif de référence if available, otherwise selling price
  const baseForReimbursement = (tarifReference || sellingPrice) * quantity
  
  // Calculate CNAS coverage
  const chifaCovered = Math.round(baseForReimbursement * (reimbursementRate / 100) * 100) / 100
  
  // Patient pays the difference
  // If selling price > tarif reference, patient pays the surplus + their portion
  const patientPortion = Math.round((totalAmount - chifaCovered) * 100) / 100
  
  return {
    total_amount: totalAmount,
    chifa_covered: Math.max(0, chifaCovered),
    patient_portion: Math.max(0, patientPortion),
    reimbursement_rate: reimbursementRate
  }
}

/**
 * Calculate total Chifa split for multiple items
 */
export function calculateTotalChifaSplit(
  items: Array<{
    selling_price: number
    tarif_reference?: number
    reimbursement_rate: ReimbursementRate
    quantity: number
  }>
): ChifaCalculation {
  let total = 0
  let chifaCovered = 0
  let patientPortion = 0
  
  for (const item of items) {
    const split = calculateChifaSplit(
      item.selling_price,
      item.tarif_reference,
      item.reimbursement_rate,
      item.quantity
    )
    total += split.total_amount
    chifaCovered += split.chifa_covered
    patientPortion += split.patient_portion
  }
  
  return {
    total_amount: Math.round(total * 100) / 100,
    chifa_covered: Math.round(chifaCovered * 100) / 100,
    patient_portion: Math.round(patientPortion * 100) / 100,
    reimbursement_rate: 80 // Average, not meaningful for totals
  }
}

// ============================================================================
// STOCK VALUE CALCULATIONS
// ============================================================================

/**
 * Calculate stock value using FIFO (First In First Out)
 */
export function calculateStockValueFIFO(
  batches: Array<{ quantity: number; purchase_price_unit: number }>
): number {
  return batches.reduce((total, batch) => {
    return total + (batch.quantity * batch.purchase_price_unit)
  }, 0)
}

/**
 * Calculate average unit cost (weighted average)
 */
export function calculateAverageUnitCost(
  batches: Array<{ quantity: number; purchase_price_unit: number }>
): number {
  const totalValue = calculateStockValueFIFO(batches)
  const totalQuantity = batches.reduce((sum, b) => sum + b.quantity, 0)
  
  if (totalQuantity === 0) return 0
  return totalValue / totalQuantity
}

// ============================================================================
// EXPIRY CALCULATIONS
// ============================================================================

/**
 * Calculate days until expiry
 */
export function daysUntilExpiry(expiryDate: string | Date): number {
  const expiry = typeof expiryDate === 'string' ? new Date(expiryDate) : expiryDate
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  expiry.setHours(0, 0, 0, 0)
  
  const diffTime = expiry.getTime() - today.getTime()
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

/**
 * Check if product is expired
 */
export function isExpired(expiryDate: string | Date): boolean {
  return daysUntilExpiry(expiryDate) < 0
}

/**
 * Check if product is expiring soon (within threshold days)
 */
export function isExpiringSoon(expiryDate: string | Date, thresholdDays: number = 30): boolean {
  const days = daysUntilExpiry(expiryDate)
  return days >= 0 && days <= thresholdDays
}

/**
 * Get expiry status and color
 */
export function getExpiryStatus(expiryDate: string | Date): {
  status: 'ok' | 'warning' | 'critical' | 'expired'
  color: string
  label: string
  days: number
} {
  const days = daysUntilExpiry(expiryDate)
  
  if (days < 0) {
    return { status: 'expired', color: 'red', label: 'Expired', days }
  }
  if (days <= 7) {
    return { status: 'critical', color: 'red', label: `${days}d`, days }
  }
  if (days <= 30) {
    return { status: 'warning', color: 'orange', label: `${days}d`, days }
  }
  if (days <= 90) {
    return { status: 'warning', color: 'yellow', label: `${days}d`, days }
  }
  return { status: 'ok', color: 'green', label: `${days}d`, days }
}

// ============================================================================
// STOCK LEVEL HELPERS
// ============================================================================

/**
 * Check if stock is low (below min level)
 */
export function isLowStock(currentStock: number, minStockLevel: number): boolean {
  return currentStock < minStockLevel && currentStock > 0
}

/**
 * Check if product is out of stock
 */
export function isOutOfStock(currentStock: number): boolean {
  return currentStock <= 0
}

/**
 * Get stock status and color
 */
export function getStockStatus(currentStock: number, minStockLevel: number): {
  status: 'ok' | 'low' | 'critical' | 'out'
  color: string
  label: string
} {
  if (currentStock <= 0) {
    return { status: 'out', color: 'red', label: 'Out of Stock' }
  }
  if (currentStock < minStockLevel / 2) {
    return { status: 'critical', color: 'red', label: 'Critical' }
  }
  if (currentStock < minStockLevel) {
    return { status: 'low', color: 'orange', label: 'Low' }
  }
  return { status: 'ok', color: 'green', label: 'OK' }
}

/**
 * Calculate reorder quantity based on usage
 */
export function suggestReorderQuantity(
  minStockLevel: number,
  averageMonthlyUsage: number,
  leadTimeDays: number = 7
): number {
  // Safety stock + lead time demand + buffer
  const leadTimeDemand = (averageMonthlyUsage / 30) * leadTimeDays
  const buffer = minStockLevel * 0.2
  
  return Math.ceil(minStockLevel + leadTimeDemand + buffer)
}

// ============================================================================
// FORMATTING UTILITIES
// ============================================================================

/**
 * Format price in DZD
 */
export function formatPrice(amount: number): string {
  return new Intl.NumberFormat('fr-DZ', {
    style: 'decimal',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount) + ' DA'
}

/**
 * Format quantity with unit
 */
export function formatQuantity(quantity: number, unit?: string): string {
  const formatted = new Intl.NumberFormat('fr-DZ').format(quantity)
  return unit ? `${formatted} ${unit}` : formatted
}

/**
 * Format percentage
 */
export function formatPercent(value: number): string {
  return new Intl.NumberFormat('fr-DZ', {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  }).format(value / 100)
}

/**
 * Format date in French locale
 */
export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('fr-DZ', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }).format(d)
}
