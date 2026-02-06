'use client'

import { useState, useEffect } from 'react'

/**
 * Returns a scale factor (0-1) so content fits or fills the viewport.
 * @param contentWidth - Content width in px (e.g. 800)
 * @param contentHeight - Content height in px (e.g. 1050)
 * @param headerHeight - Space reserved for header/controls (default 7rem)
 * @param fill - If true, use max scale to fill (no blank space, may clip). If false, fit (may leave blank).
 */
export function useFitToScreenScale(
  contentWidth = 800,
  contentHeight = 1050,
  headerHeight = 112,
  fill = false
): number {
  const [scale, setScale] = useState(0.5)

  useEffect(() => {
    const update = () => {
      if (typeof window === 'undefined') return
      const w = window.innerWidth
      const h = window.innerHeight - headerHeight
      const scaleW = w / contentWidth
      const scaleH = h / contentHeight
      setScale(
        fill
          ? Math.min(1, Math.max(scaleW, scaleH))
          : Math.min(1, scaleW, scaleH)
      )
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [contentWidth, contentHeight, headerHeight, fill])

  return scale
}
