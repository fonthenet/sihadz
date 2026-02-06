'use client'

import { useCallback, useRef } from 'react'
import { PanelLeftClose, PanelRightClose } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { SidebarPosition } from '@/hooks/use-chat-sidebar-layout'

interface SidebarResizeHandleProps {
  onResize: (deltaX: number) => void
  onTogglePosition: () => void
  position: SidebarPosition
  isDark?: boolean
}

export function SidebarResizeHandle({
  onResize,
  onTogglePosition,
  position,
  isDark = false,
}: SidebarResizeHandleProps) {
  const startX = useRef(0)
  const posRef = useRef(position)
  posRef.current = position

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault()
      startX.current = e.clientX
      ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)

      const handlePointerMove = (ev: PointerEvent) => {
        const deltaX = ev.clientX - startX.current
        startX.current = ev.clientX
        const effectiveDelta = posRef.current === 'left' ? deltaX : -deltaX
        onResize(effectiveDelta)
      }

      const handlePointerUp = () => {
        ;(e.target as HTMLElement).releasePointerCapture?.(e.pointerId)
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
        window.removeEventListener('pointermove', handlePointerMove)
        window.removeEventListener('pointerup', handlePointerUp)
      }

      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
      window.addEventListener('pointermove', handlePointerMove)
      window.addEventListener('pointerup', handlePointerUp)
    },
    [onResize]
  )

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center w-2 flex-shrink-0 group cursor-col-resize select-none',
        'hover:bg-slate-200/50 dark:hover:bg-slate-700/50 transition-colors',
        isDark ? 'border-slate-700' : 'border-slate-200'
      )}
      onPointerDown={handlePointerDown}
      role="separator"
      aria-orientation="vertical"
      aria-valuenow={0}
    >
      <div className={cn(
        'w-0.5 h-8 rounded-full transition-opacity',
        isDark ? 'bg-slate-600 group-hover:bg-slate-500' : 'bg-slate-300 group-hover:bg-slate-400'
      )} />
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onTogglePosition(); }}
        className={cn(
          'mt-2 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity',
          isDark ? 'hover:bg-slate-600 text-slate-400' : 'hover:bg-slate-200 text-slate-500'
        )}
        title={position === 'left' ? 'Move sidebar to right' : 'Move sidebar to left'}
      >
        {position === 'left' ? (
          <PanelRightClose className="h-4 w-4" />
        ) : (
          <PanelLeftClose className="h-4 w-4" />
        )}
      </button>
    </div>
  )
}
