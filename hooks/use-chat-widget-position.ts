'use client'

import { useState, useEffect, useCallback } from 'react'

const STORAGE_KEY = 'dzd_chat_widget_position_v1'

export interface WidgetPosition {
  x: number
  y: number
}

function loadPosition(): WidgetPosition | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { x?: number; y?: number }
    if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
      return { x: parsed.x, y: parsed.y }
    }
  } catch (_) {}
  return null
}

function savePosition(pos: WidgetPosition) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pos))
  } catch (_) {}
}

export function clampPosition(
  x: number,
  y: number,
  width: number,
  height: number,
  /** Offset of launcher from widget top-left when closed. Allows launcher to reach left/top corners. */
  launcherOffset?: { x: number; y: number }
): WidgetPosition {
  if (typeof window === 'undefined') return { x: 16, y: 16 }
  const vw = window.innerWidth
  const vh = window.innerHeight
  const margin = 8
  const off = launcherOffset ?? { x: 0, y: 0 }
  const minX = Math.max(0, -off.x - margin)
  const minY = Math.max(0, -off.y - margin)
  const maxX = vw - width - margin
  const maxY = vh - height - margin
  return {
    x: Math.max(minX, Math.min(maxX, x)),
    y: Math.max(minY, Math.min(maxY, y)),
  }
}

function useChatWidgetPosition(
  defaultPreset: 'bottom-right' | 'bottom-left',
  widgetWidth: number,
  widgetHeight: number,
  launcherOffset?: { x: number; y: number }
) {
  const [customPos, setCustomPos] = useState<WidgetPosition | null>(null)

  useEffect(() => {
    setCustomPos(loadPosition())
  }, [])

  const getPosition = useCallback(
    (): { x: number; y: number } => {
      if (typeof window === 'undefined') return { x: 16, y: 16 }
      if (customPos) {
        return clampPosition(customPos.x, customPos.y, widgetWidth, widgetHeight, launcherOffset)
      }
      const vw = window.innerWidth
      const vh = window.innerHeight
      const margin = 4
      if (defaultPreset === 'bottom-right') {
        return {
          x: vw - widgetWidth - margin,
          y: vh - widgetHeight - margin,
        }
      }
      return { x: margin, y: vh - widgetHeight - margin }
    },
    [customPos, defaultPreset, widgetWidth, widgetHeight, launcherOffset]
  )

  const updatePosition = useCallback(
    (x: number, y: number) => {
      const clamped = clampPosition(x, y, widgetWidth, widgetHeight, launcherOffset)
      setCustomPos(clamped)
      savePosition(clamped)
    },
    [widgetWidth, widgetHeight, launcherOffset]
  )

  const resetToDefault = useCallback(() => {
    setCustomPos(null)
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY)
    }
  }, [])

  return { getPosition, updatePosition, customPos, resetToDefault }
}

export { useChatWidgetPosition }
