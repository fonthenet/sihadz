'use client'

import { useEffect, useState, useCallback } from 'react'
import { Sun, CloudSun, Cloud, CloudRain, CloudSnow, CloudFog, CloudLightning, MapPin } from 'lucide-react'
import { cn } from '@/lib/utils'

const DEFAULT_LAT = 36.7538
const DEFAULT_LON = 3.0588

/** WMO weather code -> description and icon */
const WEATHER_MAP: Record<number, { desc: string; Icon: typeof Sun }> = {
  0: { desc: 'Clear', Icon: Sun },
  1: { desc: 'Mainly clear', Icon: Sun },
  2: { desc: 'Partly cloudy', Icon: CloudSun },
  3: { desc: 'Overcast', Icon: Cloud },
  45: { desc: 'Foggy', Icon: CloudFog },
  48: { desc: 'Foggy', Icon: CloudFog },
  51: { desc: 'Light drizzle', Icon: CloudRain },
  53: { desc: 'Drizzle', Icon: CloudRain },
  55: { desc: 'Dense drizzle', Icon: CloudRain },
  61: { desc: 'Light rain', Icon: CloudRain },
  63: { desc: 'Rain', Icon: CloudRain },
  65: { desc: 'Heavy rain', Icon: CloudRain },
  71: { desc: 'Light snow', Icon: CloudSnow },
  73: { desc: 'Snow', Icon: CloudSnow },
  75: { desc: 'Heavy snow', Icon: CloudSnow },
  80: { desc: 'Rain showers', Icon: CloudRain },
  81: { desc: 'Rain showers', Icon: CloudRain },
  82: { desc: 'Heavy showers', Icon: CloudRain },
  95: { desc: 'Thunderstorm', Icon: CloudLightning },
}

function getWeatherInfo(code: number) {
  return WEATHER_MAP[code] ?? { desc: 'Unknown', Icon: Cloud }
}

/** Geocode address via Open-Meteo (free, no key). Prefer Algeria results.
 *  Tries progressively simpler queries: full address, then last 2 parts, then last part only.
 */
async function geocodeAddress(address: string): Promise<{ lat: number; lon: number } | null> {
  if (!address?.trim()) return null
  const parts = address.trim().split(',').map((p) => p.trim()).filter(Boolean)
  // Build query variations: full → last 2 parts → last part (usually wilaya)
  const queries: string[] = []
  if (parts.length > 0) queries.push(parts.join(', '))
  if (parts.length > 2) queries.push(parts.slice(-2).join(', '))
  if (parts.length > 1) queries.push(parts[parts.length - 1])

  for (const q of queries) {
    const query = encodeURIComponent(`${q}, Algeria`)
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${query}&count=5&language=en&format=json&_t=${Date.now()}`
    try {
      const res = await fetch(url, { cache: 'no-store' })
      const data = await res.json()
      const results = data?.results as Array<{ latitude: number; longitude: number; country_code?: string }> | undefined
      if (results?.length) {
        // Prefer Algeria (DZ)
        const dz = results.find((r) => r.country_code === 'DZ')
        const first = dz || results[0]
        return { lat: first.latitude, lon: first.longitude }
      }
    } catch {
      // Try next query
    }
  }
  return null
}

interface WeatherWidgetProps {
  /** When geolocation disabled/denied, use this address for geocoding and display */
  fallbackAddress?: string | null
  /** Celsius by default */
  unit?: 'c' | 'f'
  className?: string
  /** minimal: compact inline | compact: icon+temp only (for mobile sidebars) */
  variant?: 'default' | 'minimal' | 'compact'
}

export function WeatherWidget({
  fallbackAddress,
  unit = 'c',
  className,
  variant = 'default',
}: WeatherWidgetProps) {
  const [temp, setTemp] = useState<number | null>(null)
  const [weatherCode, setWeatherCode] = useState<number | null>(null)
  const [location, setLocation] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null)
  const [usedGeolocation, setUsedGeolocation] = useState(false)

  const resetAndFetch = useCallback(() => {
    setLoading(true)
    setError(null)
    setTemp(null)
    setWeatherCode(null)
    setLocation(null)
    setCoords(null)
    setUsedGeolocation(false)
  }, [])

  // 1. When profile address exists, use it (instant update when user changes location).
  //    Otherwise try geolocation, then default.
  useEffect(() => {
    resetAndFetch()
    let cancelled = false
    const hasAddress = !!fallbackAddress?.trim()

    const applyFallback = (addr: string) => {
      geocodeAddress(addr).then((geo) => {
        if (cancelled) return
        if (geo) {
          setCoords(geo)
          setLocation(addr)
        } else {
          setCoords({ lat: DEFAULT_LAT, lon: DEFAULT_LON })
          setLocation(addr)
        }
        setUsedGeolocation(false)
      }).catch(() => {
        if (cancelled) return
        setCoords({ lat: DEFAULT_LAT, lon: DEFAULT_LON })
        setLocation(addr)
        setUsedGeolocation(false)
      })
    }

    // Profile address takes priority: user explicitly set location, update instantly when it changes
    if (hasAddress) {
      applyFallback(fallbackAddress!.trim())
      return () => { cancelled = true }
    }

    // No profile address: try geolocation
    if (!navigator?.geolocation?.getCurrentPosition) {
      setCoords({ lat: DEFAULT_LAT, lon: DEFAULT_LON })
      setLocation(null)
      setUsedGeolocation(false)
      return () => { cancelled = true }
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (cancelled) return
        setCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude })
        setUsedGeolocation(true)
      },
      () => {
        if (cancelled) return
        setCoords({ lat: DEFAULT_LAT, lon: DEFAULT_LON })
        setLocation(null)
        setUsedGeolocation(false)
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 }
    )
    return () => { cancelled = true }
  }, [fallbackAddress, resetAndFetch])

  // 2. Reverse geocode when we have coords from auto-location
  useEffect(() => {
    if (!coords || !usedGeolocation || location) return
    let cancelled = false
    fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${coords.lat}&longitude=${coords.lon}`,
      { headers: { Accept: 'application/json' } }
    )
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return
        const city = data.city || data.locality
        const sub = data.principalSubdivision
        const name = [city, sub].filter(Boolean).join(', ') || data.countryName || null
        setLocation(name)
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [coords, usedGeolocation, location])

  // 3. Fetch weather when we have coords
  useEffect(() => {
    if (!coords) return
    let cancelled = false
    setLoading(true)
    // Add timestamp to bust browser cache
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&current=temperature_2m,weather_code&_t=${Date.now()}`
    fetch(url, { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return
        setTemp(data.current?.temperature_2m ?? null)
        setWeatherCode(data.current?.weather_code ?? null)
        setError(null)
      })
      .catch((e) => {
        if (cancelled) return
        setError(e?.message ?? 'Failed to load')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [coords])

  const isMinimal = variant === 'minimal'
  const isCompact = variant === 'compact'

  if (loading) {
    return (
      <div
        className={cn(
          isCompact ? 'flex items-center gap-1.5 py-0.5' : isMinimal ? 'flex items-center gap-2 py-1' : 'flex items-center gap-2.5 px-3 py-2 rounded-lg bg-muted/40 dark:bg-muted/20 border border-border/50',
          className
        )}
      >
        <div className={cn('shrink-0 animate-pulse rounded-full bg-muted', isCompact ? 'h-4 w-4' : isMinimal ? 'h-5 w-5' : 'h-8 w-8')} />
        {!isCompact && (
          <div className={cn('flex flex-col gap-1 flex-1 min-w-0', isMinimal && 'gap-0.5')}>
            <div className={cn('rounded bg-muted animate-pulse', isMinimal ? 'h-3 w-10' : 'h-4 w-5')} />
            <div className={cn('rounded bg-muted/70 animate-pulse', isMinimal ? 'h-2.5 w-8' : 'h-3 w-16')} />
          </div>
        )}
      </div>
    )
  }

  if (error) return null

  const { desc, Icon } = getWeatherInfo(weatherCode ?? 0)
  const displayTemp =
    temp != null
      ? unit === 'f'
        ? Math.round(temp * (9 / 5) + 32)
        : Math.round(temp)
      : '—'
  const tempUnit = unit === 'f' ? '°F' : '°C'

  // Compact: icon + temp only (for mobile sidebars)
  if (isCompact) {
    return (
      <div
        className={cn('flex items-center gap-1.5 py-0.5 min-w-0 overflow-hidden', className)}
        title={`${location || 'Location'} · ${desc} · ${displayTemp}${tempUnit}`}
      >
        <span className="shrink-0 text-amber-500 dark:text-amber-400" aria-hidden>
          <Icon className="h-3.5 w-3.5" />
        </span>
        <span className="shrink-0 tabular-nums font-medium text-xs">
          {displayTemp}{tempUnit}
        </span>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'flex items-center text-left w-full min-w-0 overflow-hidden',
        isMinimal
          ? 'gap-2 py-0.5 min-h-0'
          : 'gap-2 px-3 py-2 rounded-lg bg-muted/40 dark:bg-muted/20 border border-border/50',
        className
      )}
      title={`${location || 'Location'} · ${desc} · ${displayTemp}${tempUnit}`}
    >
      <MapPin className={cn('shrink-0 text-primary', isMinimal ? 'h-3.5 w-3.5' : 'h-4 w-4')} />
      <span className={cn('min-w-0 flex-1 text-muted-foreground truncate', isMinimal ? 'text-[11px]' : 'text-[11px]')}>
        {location || 'Your location'}
      </span>
      <span className="shrink-0 text-amber-500 dark:text-amber-400" aria-hidden>
        <Icon className={isMinimal ? 'h-3.5 w-3.5' : 'h-5 w-5'} />
      </span>
      <span className={cn('shrink-0 tabular-nums font-medium', isMinimal ? 'text-xs' : 'text-sm')}>
        {displayTemp}{tempUnit}
      </span>
      <span className={cn('shrink-0 text-muted-foreground', isMinimal ? 'text-[11px]' : 'text-[11px]')}>
        {desc}
      </span>
    </div>
  )
}
