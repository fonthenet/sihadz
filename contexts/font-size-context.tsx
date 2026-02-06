'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'

const STORAGE_KEY = 'dzdoc-font-size'
export type FontSizeLevel = 1 | 2 | 3

interface FontSizeContextValue {
  level: FontSizeLevel
  setLevel: (level: FontSizeLevel) => void
  cycleLevel: () => void
}

const FontSizeContext = createContext<FontSizeContextValue | null>(null)

export function useFontSize() {
  const ctx = useContext(FontSizeContext)
  if (!ctx) throw new Error('useFontSize must be used within FontSizeProvider')
  return ctx
}

export function FontSizeProvider({ children }: { children: React.ReactNode }) {
  const [level, setLevelState] = useState<FontSizeLevel>(1)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    const parsed = stored ? parseInt(stored, 10) : 1
    if (parsed >= 1 && parsed <= 3) setLevelState(parsed as FontSizeLevel)
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return
    const root = document.documentElement
    root.setAttribute('data-font-size', String(level))
    // Also set inline style to ensure it overrides everything
    const sizes: Record<FontSizeLevel, string> = { 1: '100%', 2: '118.75%', 3: '137.5%' }
    root.style.fontSize = sizes[level]
    localStorage.setItem(STORAGE_KEY, String(level))
  }, [level, mounted])

  const setLevel = (l: FontSizeLevel) => setLevelState(l)
  const cycleLevel = () => setLevelState((prev) => ((prev % 3) + 1) as FontSizeLevel)

  return (
    <FontSizeContext.Provider value={{ level, setLevel, cycleLevel }}>
      {children}
    </FontSizeContext.Provider>
  )
}
