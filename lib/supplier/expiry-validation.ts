/**
 * Helper to validate expiry date requirements for supplier products.
 * Medications, OTC, vaccines, medical consumables, etc. require expiry date.
 */

export function categoryRequiresExpiry(category: { requires_expiry?: boolean } | null): boolean {
  return category?.requires_expiry === true
}
