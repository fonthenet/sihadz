'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { findNearestWilaya, algeriaWilayas, type Wilaya, type City } from '@/lib/data/algeria-locations'

const LOCATION_CACHE_KEY = 'dzdoc_location_wilaya'
const LOCATION_CACHE_TS_KEY = 'dzdoc_location_timestamp'
const MANUAL_WILAYA_KEY = 'dzdoc_wilaya_manual' // sessionStorage: user's manual choice
const CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000 // 24 hours

function getManualWilaya(): Wilaya | null | 'all' {
  if (typeof window === 'undefined') return null
  try {
    const v = sessionStorage.getItem(MANUAL_WILAYA_KEY)
    if (!v || v === 'all') return v === 'all' ? 'all' : null
    const w = algeriaWilayas.find(x => x.code === v)
    return w ?? null
  } catch {
    return null
  }
}

function setManualWilaya(wilaya: Wilaya | null) {
  if (typeof window === 'undefined') return
  try {
    if (wilaya) sessionStorage.setItem(MANUAL_WILAYA_KEY, wilaya.code)
    else sessionStorage.setItem(MANUAL_WILAYA_KEY, 'all')
  } catch {}
}

function getCachedWilaya(): Wilaya | null {
  if (typeof window === 'undefined') return null
  try {
    const code = localStorage.getItem(LOCATION_CACHE_KEY)
    const ts = localStorage.getItem(LOCATION_CACHE_TS_KEY)
    if (!code || !ts) return null
    const age = Date.now() - parseInt(ts, 10)
    if (age > CACHE_MAX_AGE_MS) return null
    const wilaya = algeriaWilayas.find(w => w.code === code)
    return wilaya ?? null
  } catch {
    return null
  }
}

function setCachedWilaya(wilaya: Wilaya) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(LOCATION_CACHE_KEY, wilaya.code)
    localStorage.setItem(LOCATION_CACHE_TS_KEY, String(Date.now()))
  } catch {}
}

export interface LocationState {
  isLoading: boolean
  isDetecting: boolean
  error: string | null
  detectedWilaya: Wilaya | null
  selectedWilaya: Wilaya | null
  selectedCity: City | null
  coordinates: { lat: number; lng: number } | null
  permissionStatus: 'prompt' | 'granted' | 'denied' | 'unavailable'
}

export interface UseLocationOptions {
  /** When geolocation denied/fails, use profile wilaya/city as fallback */
  profileFallback?: { default_wilaya_code?: string | null; default_city_id?: string | null } | null
}

export function useLocation(options?: UseLocationOptions) {
  const [state, setState] = useState<LocationState>({
    isLoading: true,
    isDetecting: false,
    error: null,
    detectedWilaya: null,
    selectedWilaya: null,
    selectedCity: null,
    coordinates: null,
    permissionStatus: 'prompt',
  })

  // Check if geolocation is supported
  const isGeolocationSupported = typeof window !== 'undefined' && 'geolocation' in navigator

  // Get current position
  const detectLocation = useCallback(async () => {
    if (!isGeolocationSupported) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        isDetecting: false,
        permissionStatus: 'unavailable',
        error: 'Geolocation is not supported by your browser',
      }))
      return
    }

    setState(prev => ({ ...prev, isDetecting: true, error: null }))

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000, // 5 minutes cache
        })
      })

      const { latitude, longitude } = position.coords
      const nearestWilaya = findNearestWilaya(latitude, longitude)
      if (nearestWilaya) {
        setCachedWilaya(nearestWilaya)
        try { sessionStorage.removeItem(MANUAL_WILAYA_KEY) } catch {} // clear manual override
      }

      setState(prev => ({
        ...prev,
        isLoading: false,
        isDetecting: false,
        coordinates: { lat: latitude, lng: longitude },
        detectedWilaya: nearestWilaya,
        selectedWilaya: nearestWilaya,
        permissionStatus: 'granted',
      }))
    } catch (error) {
      const geoError = error as GeolocationPositionError
      let errorMessage = 'Unable to detect location'
      let permissionStatus: LocationState['permissionStatus'] = 'prompt'

      switch (geoError.code) {
        case geoError.PERMISSION_DENIED:
          errorMessage = 'Location permission denied'
          permissionStatus = 'denied'
          break
        case geoError.POSITION_UNAVAILABLE:
          errorMessage = 'Location information unavailable'
          break
        case geoError.TIMEOUT:
          errorMessage = 'Location detection timed out'
          break
      }

      const fb = options?.profileFallback
      if (fb?.default_wilaya_code) {
        const wilaya = algeriaWilayas.find(w => w.code === String(fb.default_wilaya_code).padStart(2, '0'))
        if (wilaya) {
          setState(prev => ({
            ...prev,
            isLoading: false,
            isDetecting: false,
            detectedWilaya: wilaya,
            selectedWilaya: wilaya,
            selectedCity: fb.default_city_id ? (wilaya.cities.find(c => c.id === fb.default_city_id) ?? null) : null,
            error: null,
            permissionStatus,
          }))
          return
        }
      }

      setState(prev => ({
        ...prev,
        isLoading: false,
        isDetecting: false,
        error: errorMessage,
        permissionStatus,
      }))
    }
  }, [isGeolocationSupported, options?.profileFallback])

  // Select wilaya manually - persists so auto-detect doesn't override on remount
  const selectWilaya = useCallback((wilaya: Wilaya | null) => {
    setManualWilaya(wilaya)
    setState(prev => ({
      ...prev,
      selectedWilaya: wilaya,
      selectedCity: null,
    }))
  }, [])

  // Select city
  const selectCity = useCallback((city: City | null) => {
    setState(prev => ({
      ...prev,
      selectedCity: city,
    }))
  }, [])

  // Select wilaya by code
  const selectWilayaByCode = useCallback((code: string) => {
    const wilaya = algeriaWilayas.find(w => w.code === code)
    if (wilaya) {
      selectWilaya(wilaya)
    }
  }, [selectWilaya])

  // Clear selection - persists so auto-detect doesn't override on remount
  const clearSelection = useCallback(() => {
    setManualWilaya(null)
    setState(prev => ({
      ...prev,
      selectedWilaya: null,
      selectedCity: null,
    }))
  }, [])

  // Use detected location
  const useDetectedLocation = useCallback(() => {
    if (state.detectedWilaya) {
      setState(prev => ({
        ...prev,
        selectedWilaya: prev.detectedWilaya,
        selectedCity: null,
      }))
    }
  }, [state.detectedWilaya])

  const detectRef = useRef(detectLocation)
  detectRef.current = detectLocation

  // Check permission status on mount - manual selection takes precedence over auto/cache
  useEffect(() => {
    if (typeof window === 'undefined') return

    const run = async () => {
      // User's manual choice (this session) overrides auto-detected/cached
      const manual = getManualWilaya()
      if (manual === 'all') {
        setState(prev => ({
          ...prev,
          isLoading: false,
          isDetecting: false,
          selectedWilaya: null,
          selectedCity: null,
        }))
        return
      }
      if (manual) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          isDetecting: false,
          detectedWilaya: prev.detectedWilaya ?? manual,
          selectedWilaya: manual,
          permissionStatus: 'granted',
        }))
        return
      }

      // No manual choice - use cache to avoid geolocation on every reload
      const cached = getCachedWilaya()
      if (cached) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          isDetecting: false,
          detectedWilaya: cached,
          selectedWilaya: cached,
          permissionStatus: 'granted',
        }))
        return
      }

      if (!('permissions' in navigator)) {
        setState(prev => ({ ...prev, isLoading: false }))
        return
      }

      const result = await navigator.permissions.query({ name: 'geolocation' }).catch(() => null)
      if (!result) {
        setState(prev => ({ ...prev, isLoading: false }))
        return
      }

      setState(prev => ({
        ...prev,
        isLoading: false,
        permissionStatus: result.state as LocationState['permissionStatus'],
      }))

      if (result.state === 'granted') {
        detectRef.current()
      }
    }
    run()
  }, []) // Run once on mount - do not re-run when detectLocation/profileFallback changes

  // When geolocation is denied/unavailable and we have profile fallback, use it
  useEffect(() => {
    const fb = options?.profileFallback
    if (!fb?.default_wilaya_code) return
    if (state.selectedWilaya) return // Already have a selection
    if (state.isDetecting) return
    if (state.permissionStatus !== 'denied' && state.permissionStatus !== 'unavailable') return
    if (state.isLoading) return

    const wilaya = algeriaWilayas.find(w => w.code === String(fb.default_wilaya_code).padStart(2, '0'))
    if (wilaya) {
      setState(prev => ({
        ...prev,
        selectedWilaya: wilaya,
        selectedCity: fb.default_city_id ? (wilaya.cities.find(c => c.id === fb.default_city_id) ?? null) : null,
      }))
    }
  }, [options?.profileFallback, state.selectedWilaya, state.isDetecting, state.permissionStatus, state.isLoading])

  return {
    ...state,
    isGeolocationSupported,
    detectLocation,
    selectWilaya,
    selectCity,
    selectWilayaByCode,
    clearSelection,
    useDetectedLocation,
    allWilayas: algeriaWilayas,
  }
}
