'use client'

import { useState, useEffect, useCallback } from 'react'
import { findNearestWilaya, algeriaWilayas, type Wilaya, type City } from '@/lib/data/algeria-locations'

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

export function useLocation() {
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

      setState(prev => ({
        ...prev,
        isLoading: false,
        isDetecting: false,
        error: errorMessage,
        permissionStatus,
      }))
    }
  }, [isGeolocationSupported])

  // Select wilaya manually
  const selectWilaya = useCallback((wilaya: Wilaya | null) => {
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

  // Clear selection
  const clearSelection = useCallback(() => {
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

  // Check permission status on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && 'permissions' in navigator) {
      navigator.permissions.query({ name: 'geolocation' }).then((result) => {
        setState(prev => ({
          ...prev,
          isLoading: false,
          permissionStatus: result.state as LocationState['permissionStatus'],
        }))

        // Auto-detect if permission is already granted
        if (result.state === 'granted') {
          detectLocation()
        }
      }).catch(() => {
        setState(prev => ({ ...prev, isLoading: false }))
      })
    } else {
      setState(prev => ({ ...prev, isLoading: false }))
    }
  }, [detectLocation])

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
