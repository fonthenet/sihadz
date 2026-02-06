/**
 * Google Maps directions utilities.
 * Works for all accounts (new, old, future) - uses coordinates when available,
 * falls back to address when not. Opens in Google Maps (app on mobile, web otherwise).
 */

export interface DirectionsOptions {
  /** Latitude (preferred when available) */
  lat?: number | null
  /** Longitude (preferred when available) */
  lng?: number | null
  /** Address fallback when no coordinates */
  address?: string | null
  /** Alternative: build address from parts */
  addressParts?: (string | null | undefined)[]
}

/**
 * Build Google Maps directions URL.
 * Prefers coordinates; falls back to address when coordinates are missing.
 * Returns null when neither coordinates nor address is available.
 */
export function getGoogleMapsDirectionsUrl(options: DirectionsOptions): string | null {
  const { lat, lng, address, addressParts } = options

  if (lat != null && lng != null && !Number.isNaN(lat) && !Number.isNaN(lng)) {
    return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
  }

  const addr = address?.trim() || (addressParts?.filter(Boolean).join(', ').trim() || '')
  if (addr) {
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(addr)}`
  }

  return null
}

/**
 * Open Google Maps directions. Works on web and mobile (opens Maps app when available).
 */
export function openGoogleMapsDirections(options: DirectionsOptions): boolean {
  const url = getGoogleMapsDirectionsUrl(options)
  if (url) {
    window.open(url, '_blank', 'noopener,noreferrer')
    return true
  }
  return false
}
