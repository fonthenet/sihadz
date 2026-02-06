'use client'

import { useState, useEffect, useCallback } from 'react'

const STORAGE_KEY = 'dzd_chat_sidebar_layout_v1'
const MIN_WIDTH = 240
const MAX_WIDTH = 480
const DEFAULT_WIDTH = 320

export type SidebarPosition = 'left' | 'right'

interface SidebarLayout {
  width: number
  position: SidebarPosition
}

function loadLayout(): SidebarLayout | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { width?: number; position?: string }
    const width = typeof parsed.width === 'number'
      ? Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, parsed.width))
      : DEFAULT_WIDTH
    const position = parsed.position === 'right' ? 'right' : 'left'
    return { width, position }
  } catch (_) {}
  return null
}

function saveLayout(layout: SidebarLayout) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(layout))
  } catch (_) {}
}

export function useChatSidebarLayout() {
  const [layout, setLayout] = useState<SidebarLayout | null>(null)

  useEffect(() => {
    setLayout(loadLayout())
  }, [])

  const width = layout?.width ?? DEFAULT_WIDTH
  const position = layout?.position ?? 'left'

  const setWidth = useCallback((w: number) => {
    const clamped = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, w))
    setLayout(prev => {
      const next = { width: clamped, position: prev?.position ?? 'left' }
      saveLayout(next)
      return next
    })
  }, [])

  const setPosition = useCallback((pos: SidebarPosition) => {
    setLayout(prev => {
      const next = { width: prev?.width ?? DEFAULT_WIDTH, position: pos }
      saveLayout(next)
      return next
    })
  }, [])

  const togglePosition = useCallback(() => {
    setLayout(prev => {
      const next = {
        width: prev?.width ?? DEFAULT_WIDTH,
        position: prev?.position === 'right' ? 'left' : 'right'
      }
      saveLayout(next)
      return next
    })
  }, [])

  const adjustWidth = useCallback((delta: number) => {
    setLayout(prev => {
      const current = prev?.width ?? DEFAULT_WIDTH
      const clamped = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, current + delta))
      const next = { width: clamped, position: prev?.position ?? 'left' }
      saveLayout(next)
      return next
    })
  }, [])

  return { width, position, setWidth, setPosition, togglePosition, adjustWidth, minWidth: MIN_WIDTH, maxWidth: MAX_WIDTH }
}
