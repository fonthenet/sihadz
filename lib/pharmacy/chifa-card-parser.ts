/**
 * Chifa Card Parser
 * Parses output from Chifa/CNAS card readers that use keyboard-wedge mode.
 * When a patient inserts their Chifa card, the reader "types" the card data + Enter.
 *
 * Supported formats (common in Algerian pharmacy software):
 * - Pure numeric: 123456789012345 (insured number, 10-15 digits)
 * - Track 2 style: ;123456789012345=1 (insured + rank)
 * - With separators: 123456789012345|1|CNAS or 123456789012345^NAME^RANK
 * - Custom: varies by reader vendor
 */

export type InsuranceType = 'CNAS' | 'CASNOS' | 'CVM' | 'HORS_CHIFA'

export interface ParsedChifaCard {
  /** Numéro assuré (insured number) - required */
  insured_number: string
  /** Rang: 1=principal, 2+=ayant-droit (dependent) */
  insured_rank: number
  /** Organisme: CNAS, CASNOS, CVM */
  insurance_type: InsuranceType | null
  /** Insured name if present on card */
  insured_name: string | null
  /** Raw string for debugging */
  raw: string
}

/**
 * Extract digits-only from start of string (insured number)
 */
function extractInsuredNumber(s: string): string {
  const digits = s.replace(/\D/g, '')
  // Chifa numbers are typically 10-15 digits
  const match = digits.match(/^\d{10,15}/)
  return match ? match[0] : digits
}

/**
 * Parse Chifa card reader output.
 * Returns null if the input doesn't look like valid Chifa data.
 */
export function parseChifaCardOutput(raw: string): ParsedChifaCard | null {
  const trimmed = (raw || '').trim()
  if (!trimmed.length) return null

  // Remove leading/trailing control chars
  const cleaned = trimmed.replace(/^[\s;]+|[\s]+$/g, '')

  let insured_number = ''
  let insured_rank = 1
  let insurance_type: InsuranceType | null = null
  let insured_name: string | null = null

  // Format 1: Track 2 style ;NNNNNNNNNNNNNNN=R (e.g. ;123456789012345=1)
  const track2Match = cleaned.match(/;?(\d{10,15})=(\d)/)
  if (track2Match) {
    insured_number = track2Match[1]
    insured_rank = parseInt(track2Match[2], 10) || 1
    return { insured_number, insured_rank, insurance_type, insured_name, raw: trimmed }
  }

  // Format 2: Pipe-separated NNNN|R|ORG (e.g. 123456789012345|1|CNAS)
  const pipeParts = cleaned.split('|')
  if (pipeParts.length >= 2) {
    insured_number = extractInsuredNumber(pipeParts[0])
    if (pipeParts[1]) insured_rank = parseInt(pipeParts[1], 10) || 1
    if (pipeParts[2]) {
      const org = pipeParts[2].toUpperCase()
      if (org.includes('CNAS')) insurance_type = 'CNAS'
      else if (org.includes('CASNOS')) insurance_type = 'CASNOS'
      else if (org.includes('CVM')) insurance_type = 'CVM'
    }
    if (insured_number.length >= 10) {
      return { insured_number, insured_rank, insurance_type, insured_name, raw: trimmed }
    }
  }

  // Format 3: Caret-separated (Track 1 style) NNNN^NAME^R
  const caretParts = cleaned.split('^')
  if (caretParts.length >= 2) {
    insured_number = extractInsuredNumber(caretParts[0])
    if (caretParts[1] && /[A-Za-z\u0600-\u06FF]/.test(caretParts[1])) {
      insured_name = caretParts[1].trim()
    }
    if (caretParts[2]) insured_rank = parseInt(caretParts[2], 10) || 1
    if (insured_number.length >= 10) {
      return { insured_number, insured_rank, insurance_type, insured_name, raw: trimmed }
    }
  }

  // Format 4: Pure numeric (10-15 digits) - most common
  const digitsOnly = cleaned.replace(/\D/g, '')
  if (digitsOnly.length >= 10 && digitsOnly.length <= 15) {
    insured_number = digitsOnly
    return { insured_number, insured_rank, insurance_type, insured_name, raw: trimmed }
  }

  // Format 5: Numeric with trailing data (e.g. 123456789012345=1)
  const eqMatch = cleaned.match(/^(\d{10,15})=(\d)/)
  if (eqMatch) {
    insured_number = eqMatch[1]
    insured_rank = parseInt(eqMatch[2], 10) || 1
    return { insured_number, insured_rank, insurance_type, insured_name, raw: trimmed }
  }

  return null
}

/**
 * Check if a string looks like Chifa card data (vs barcode).
 * Chifa: typically 10-15 digits, or contains ; = ^ |
 */
export function looksLikeChifaCardData(s: string): boolean {
  const t = (s || '').trim()
  if (t.length < 10) return false
  // Contains card-like separators
  if (/[;=^|]/.test(t)) return true
  // Pure numeric 10-15 digits
  if (/^\d{10,15}$/.test(t)) return true
  return false
}
