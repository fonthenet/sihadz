'use client'

import { useState, useCallback, useEffect } from 'react'
import { getWilayaByCode } from '@/lib/data/algeria-locations'

const DEFAULT_LAT = 36.7538
const DEFAULT_LON = 3.0588

export interface ProfileLocationFallback {
  default_wilaya_code?: string | null
  default_city_id?: string | null
  address?: string | null
}

export interface ProLocationFallback {
  wilaya?: string | null
  commune?: string | null
  address_line1?: string | null
}

export type LocationFallback = ProfileLocationFallback | ProLocationFallback

function isProfileFallback(f: LocationFallback): f is ProfileLocationFallback {
  return 'default_wilaya_code' in f
}

/** Get coords from profile/pro fallback (wilaya or address). */
function getCoordsFromFallback(fallback: LocationFallback | null | undefined): { lat: number; lng: number } | null {
  if (!fallback) return null
  if (isProfileFallback(fallback) && fallback.default_wilaya_code) {
    const w = getWilayaByCode(String(fallback.default_wilaya_code).padStart(2, '0'))
    if (w?.coordinates) return { lat: w.coordinates.lat, lng: w.coordinates.lng }
  }
  if (!isProfileFallback(fallback) && fallback.wilaya) {
    const w = getWilayaByCode(String(fallback.wilaya).padStart(2, '0'))
    if (w?.coordinates) return { lat: w.coordinates.lat, lng: w.coordinates.lng }
  }
  return null
}

export interface UseLocationWithProfileFallbackResult {
  /** Current coords used for distance/search (from geolocation or profile fallback) */
  coords: { lat: number; lng: number }
  /** True if coords came from device geolocation */
  usedGeolocation: boolean
  /** True while requesting geolocation */
  isLocating: boolean
  /** Error message if geolocation failed (and we fell back to profile) */
  locationError: string | null
  /** Trigger geolocation request (e.g. when user clicks "Near me") */
  requestLocation: () => void
  /** Wilaya code from fallback when geolocation denied (for syncing UI) */
  fallbackWilayaCode: string | null
  /** City id from fallback when geolocation denied */
  fallbackCityId: string | null
}

/**
 * Platform-wide location rule:
 * - When "Near me" / auto-location: try geolocation first
 * - If user denies or geolocation fails: fallback to profile address (patient) or pro address (professional)
 * - Patient: profiles.default_wilaya_code, default_city_id, address
 * - Pro: professionals.wilaya, commune, address_line1
 */
export function useLocationWithProfileFallback(
  useAutoLocation: boolean,
  fallback: LocationFallback | null | undefined
): UseLocationWithProfileFallbackResult {
  const [coords, setCoords] = useState<{ lat: number; lng: number }>(() => {
    const fromFallback = getCoordsFromFallback(fallback)
    return fromFallback ?? { lat: DEFAULT_LAT, lng: DEFAULT_LON }
  })
  const [usedGeolocation, setUsedGeolocation] = useState(false)
  const [isLocating, setIsLocating] = useState(false)
  const [locationError, setLocationError] = useState<string | null>(null)

  const applyFallback = useCallback(() => {
    const fromFallback = getCoordsFromFallback(fallback)
    if (fromFallback) {
      setCoords(fromFallback)
      setUsedGeolocation(false)
      setLocationError(null)
    } else {
      setCoords({ lat: DEFAULT_LAT, lng: DEFAULT_LON })
      setUsedGeolocation(false)
    }
  }, [fallback])

  const requestLocation = useCallback(() => {
    if (!navigator?.geolocation) {
      applyFallback()
      setLocationError('Geolocation not supported')
      return
    }
    setIsLocating(true)
    setLocationError(null)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setUsedGeolocation(true)
        setIsLocating(false)
        setLocationError(null)
      },
      (err) => {
        setIsLocating(false)
        const msg = err.code === 1 ? 'Location denied' : err.code === 2 ? 'Location unavailable' : 'Location timeout'
        setLocationError(msg)
        applyFallback()
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
    )
  }, [applyFallback])

  useEffect(() => {
    if (!useAutoLocation) {
      const fromFallback = getCoordsFromFallback(fallback)
      if (fromFallback) setCoords(fromFallback)
      setUsedGeolocation(false)
      return
    }
    requestLocation()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [useAutoLocation])

  const fallbackWilayaCode =
    fallback && isProfileFallback(fallback) ? fallback.default_wilaya_code ?? null
    : fallback && !isProfileFallback(fallback) ? fallback.wilaya ?? null
    : null
  const fallbackCityId = fallback && isProfileFallback(fallback) ? fallback.default_city_id ?? null : null

  return {
    coords,
    usedGeolocation,
    isLocating,
    locationError,
    requestLocation,
    fallbackWilayaCode,
    fallbackCityId,
  }
}
