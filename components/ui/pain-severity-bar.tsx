'use client'

import * as React from 'react'
import * as SliderPrimitive from '@radix-ui/react-slider'
import { cn } from '@/lib/utils'

export interface PainSeverityBarProps {
  value: number[]
  onValueChange: (value: number[]) => void
  max?: number
  min?: number
  step?: number
  className?: string
  /** Language for labels: 'ar' | 'fr' | 'en' */
  language?: 'ar' | 'fr' | 'en'
  /** Optional label above the bar */
  label?: string
  /** Show severity label (Mild/Moderate/Severe) */
  showLabel?: boolean
  disabled?: boolean
}

const SEVERITY_LABELS = {
  en: { mild: 'Mild', moderate: 'Moderate', severe: 'Severe' },
  fr: { mild: 'Léger', moderate: 'Modéré', severe: 'Sévère' },
  ar: { mild: 'خفيف', moderate: 'متوسط', severe: 'شديد' },
}

function getSeverityInfo(value: number, lang: 'ar' | 'fr' | 'en') {
  const labels = SEVERITY_LABELS[lang]
  if (value < 34) return { label: labels.mild, color: 'text-emerald-600 dark:text-emerald-400' }
  if (value < 67) return { label: labels.moderate, color: 'text-amber-600 dark:text-amber-400' }
  return { label: labels.severe, color: 'text-rose-600 dark:text-rose-400' }
}

const GRADIENT = 'linear-gradient(to right, #10b981 0%, #34d399 15%, #84cc16 35%, #eab308 50%, #f97316 70%, #ef4444 100%)'

export function PainSeverityBar({
  value,
  onValueChange,
  max = 100,
  min = 0,
  step = 1,
  className,
  language = 'en',
  label,
  showLabel = true,
  disabled = false,
}: PainSeverityBarProps) {
  const val = Array.isArray(value) ? value[0] : 0
  const info = getSeverityInfo(val, language)

  return (
    <div className={cn('space-y-2 w-full', className)}>
      {(label || showLabel) && (
        <div className="flex items-center justify-between gap-2">
          {label && (
            <span className="text-xs font-medium text-muted-foreground">{label}</span>
          )}
          {showLabel && (
            <span className={cn('text-xs font-semibold tabular-nums', info.color)}>
              {info.label}
            </span>
          )}
        </div>
      )}
      <div className="relative">
        <SliderPrimitive.Root
          value={value}
          onValueChange={onValueChange}
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          dir={language === 'ar' ? 'rtl' : 'ltr'}
          className={cn(
            'relative flex w-full touch-none items-center select-none',
            'data-[disabled]:opacity-50'
          )}
        >
          <SliderPrimitive.Track
            className={cn(
              'relative h-3 w-full grow overflow-hidden rounded-full',
              'bg-muted/80 dark:bg-muted/50'
            )}
          >
            <SliderPrimitive.Range
              className="absolute h-full rounded-full transition-all duration-150 ease-out"
              style={{
                background: language === 'ar'
                  ? 'linear-gradient(to left, #10b981 0%, #34d399 15%, #84cc16 35%, #eab308 50%, #f97316 70%, #ef4444 100%)'
                  : GRADIENT,
              }}
            />
          </SliderPrimitive.Track>
          <SliderPrimitive.Thumb
            className={cn(
              'block size-5 shrink-0 rounded-full border-2 border-white dark:border-gray-900',
              'bg-white dark:bg-gray-100 shadow-md shadow-black/15',
              'transition-transform duration-150 hover:scale-110 active:scale-105',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
              'disabled:pointer-events-none disabled:opacity-50'
            )}
          />
        </SliderPrimitive.Root>
        {/* Scale labels below */}
        <div className="flex justify-between mt-1.5 px-0.5">
          <span className="text-[10px] text-muted-foreground">
            {SEVERITY_LABELS[language].mild}
          </span>
          <span className="text-[10px] text-muted-foreground">
            {SEVERITY_LABELS[language].moderate}
          </span>
          <span className="text-[10px] text-muted-foreground">
            {SEVERITY_LABELS[language].severe}
          </span>
        </div>
      </div>
    </div>
  )
}
