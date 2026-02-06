'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

export interface InfoItem {
  label: string
  value: React.ReactNode
  icon?: React.ComponentType<{ className?: string }>
}

interface InfoCardProps {
  title: string
  icon?: React.ComponentType<{ className?: string }>
  items: InfoItem[]
  accent?: 'teal' | 'slate' | 'amber' | 'blue'
  className?: string
  /** Optional: grid columns on sm+ (default 4). Use 3 to fit 3 items in one row. */
  cols?: 2 | 3 | 4
  /** Optional content rendered below the items grid (e.g. patient notes) */
  children?: React.ReactNode
}

const accentStyles = {
  teal: 'border-teal-200/80 bg-gradient-to-br from-teal-50/60 to-white dark:from-teal-950/20 dark:to-slate-900',
  slate: 'border-slate-200 dark:border-slate-800',
  amber: 'border-amber-200/80 bg-gradient-to-br from-amber-50/60 to-white dark:from-amber-950/20 dark:to-slate-900',
  blue: 'border-blue-200/80 bg-gradient-to-br from-blue-50/60 to-white dark:from-blue-950/20 dark:to-slate-900',
}

const iconAccentStyles = {
  teal: 'bg-teal-100 text-teal-600 dark:bg-teal-900/50 dark:text-teal-400',
  slate: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  amber: 'bg-amber-100 text-amber-600 dark:bg-amber-900/50 dark:text-amber-400',
  blue: 'bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400',
}

const labelAccentStyles = {
  teal: 'text-teal-600 dark:text-teal-400',
  slate: 'text-muted-foreground',
  amber: 'text-amber-600 dark:text-amber-400',
  blue: 'text-blue-600 dark:text-blue-400',
}

/** Compact info card for dashboards - easy to scan, minimal padding */
export function InfoCard({
  title,
  icon: Icon,
  items,
  accent = 'slate',
  className,
  cols = 4,
  children,
}: InfoCardProps) {
  const iconStyle = iconAccentStyles[accent]
  const labelStyle = labelAccentStyles[accent]

  return (
    <div
      className={cn(
        'rounded-xl border py-3 px-4',
        accentStyles[accent],
        className
      )}
    >
      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-200/60 dark:border-slate-700/60">
        {Icon && (
          <div className={cn('flex items-center justify-center w-7 h-7 rounded-lg shrink-0', iconStyle)}>
            <Icon className="h-4 w-4" />
          </div>
        )}
        <h3 className="font-semibold text-sm text-slate-800 dark:text-slate-100">{title}</h3>
      </div>
      <div className={cn('grid gap-x-4 gap-y-3', cols === 2 && 'grid-cols-2', cols === 3 && 'grid-cols-3', cols === 4 && 'grid-cols-2 sm:grid-cols-4')}>
        {items.map((item, i) => {
          const ItemIcon = item.icon
          return (
            <div key={i} className="min-w-0">
              <p className={cn('text-[11px] font-medium uppercase tracking-wider', labelStyle)}>
                {item.label}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                {ItemIcon && <ItemIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
                <p className="font-medium text-sm text-slate-800 dark:text-slate-100 truncate">
                  {item.value}
                </p>
              </div>
            </div>
          )
        })}
      </div>
      {children && (
        <div className="mt-3 pt-3 border-t border-slate-200/60 dark:border-slate-700/60">
          {children}
        </div>
      )}
    </div>
  )
}
