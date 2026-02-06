'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import type { ScannerSettings } from './types'
import { DEFAULT_SCANNER_SETTINGS } from './types'
import type { ScanContext } from './types'

const ScannerContext = createContext<{
  settings: ScannerSettings | null
  loading: boolean
  refresh: () => Promise<void>
}>({ settings: null, loading: true, refresh: async () => {} })

export function ScannerProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<ScannerSettings | null>(null)
  const [loading, setLoading] = useState(true)

  const load = async () => {
    try {
      const res = await fetch('/api/professional/scanner-settings', { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        const s = data.scanner_settings
        if (s) {
            setSettings({
              enabled: s.enabled ?? true,
              suffixKey: s.suffixKey ?? 'Enter',
              minBarcodeLength: s.minBarcodeLength ?? 8,
              scanContexts: {
                products: s.scanContexts?.products ?? true,
                prescriptions: s.scanContexts?.prescriptions ?? true,
                receipts: s.scanContexts?.receipts ?? true,
                inventory: s.scanContexts?.inventory ?? true,
                chifa: s.scanContexts?.chifa ?? true,
              },
              soundOnScan: s.soundOnScan ?? false,
            })
        } else {
          setSettings(DEFAULT_SCANNER_SETTINGS)
        }
      } else {
        setSettings(DEFAULT_SCANNER_SETTINGS)
      }
    } catch {
      setSettings(DEFAULT_SCANNER_SETTINGS)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  return (
    <ScannerContext.Provider value={{ settings, loading, refresh: load }}>
      {children}
    </ScannerContext.Provider>
  )
}

export function useScannerSettings() {
  const ctx = useContext(ScannerContext)
  return ctx?.settings ?? DEFAULT_SCANNER_SETTINGS
}

export function useScannerContext() {
  return useContext(ScannerContext)
}

/** Play a short success beep (optional, when soundOnScan is enabled) */
function playScanBeep() {
  try {
    const audioContext = typeof window !== 'undefined' ? new (window.AudioContext || (window as any).webkitAudioContext)() : null
    if (audioContext) {
      const oscillator = audioContext.createOscillator()
      const gain = audioContext.createGain()
      oscillator.connect(gain)
      gain.connect(audioContext.destination)
      oscillator.frequency.value = 1200
      oscillator.type = 'sine'
      gain.gain.setValueAtTime(0.1, audioContext.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.08)
      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + 0.08)
    }
  } catch {}
}

/**
 * Returns true if this keydown event looks like a scanner suffix (Enter/Tab)
 * and the value meets min barcode length.
 */
export function isScanSuffixEvent(
  e: React.KeyboardEvent,
  value: string,
  settings: ScannerSettings
): boolean {
  if (!settings.enabled) return false
  const suffix = settings.suffixKey === 'Tab' ? 'Tab' : 'Enter'
  if (e.key !== suffix) return false
  if (!value || value.trim().length < settings.minBarcodeLength) return false
  return true
}

/**
 * Hook to handle barcode scan events in an input.
 * Use the returned onKeyDown on your input. On scan, onScan receives the value
 * (use e.currentTarget.value from event if state is stale with fast scanner input).
 */
export function useScanHandler(options: {
  context: ScanContext
  value: string
  onScan: (value: string, e?: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => void
  existingOnKeyDown?: (e: React.KeyboardEvent) => void
  /** When true, run existing handler first (e.g. POS "add first result"); when false, handle scan first */
  prioritizeExisting?: boolean
}) {
  const { context, value, onScan, existingOnKeyDown, prioritizeExisting = false } = options
  const { settings } = useScannerContext()
  const s = settings ?? DEFAULT_SCANNER_SETTINGS

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const inputValue = (e.currentTarget?.value ?? value).trim()
    const isScan = s.enabled && s.scanContexts[context] && isScanSuffixEvent(e, inputValue, s)

    if (prioritizeExisting) {
      existingOnKeyDown?.(e)
      if (e.defaultPrevented || !isScan) return
      e.preventDefault()
      if (inputValue.length >= s.minBarcodeLength) {
        onScan(inputValue, e)
        if (s.soundOnScan) playScanBeep()
      }
    } else {
      if (isScan && inputValue.length >= s.minBarcodeLength) {
        e.preventDefault()
        onScan(inputValue, e)
        if (s.soundOnScan) playScanBeep()
        return
      }
      existingOnKeyDown?.(e)
    }
  }

  return { onKeyDown: handleKeyDown, settings: s }
}
