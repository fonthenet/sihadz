'use client'

import { cn } from '@/lib/utils'
import { useLanguage } from '@/lib/i18n/language-context'

interface DashboardPageWrapperProps {
  children: React.ReactNode
  /** Page title - displayed as h1 */
  title?: string
  /** Optional subtitle/description */
  subtitle?: string
  /** Optional header actions (buttons, etc.) */
  headerActions?: React.ReactNode
  /** Max width variant: 'sm' (768px), 'md' (1024px), 'lg' (1152px), 'xl' (1280px) - enlarged for better use of space */
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  /** Custom className for the container */
  className?: string
  /** Whether to show the header section (title + subtitle) */
  showHeader?: boolean
}

/**
 * Unified dashboard page wrapper component.
 * Provides consistent layout, spacing, and responsive behavior across all dashboard pages.
 * 
 * Usage:
 * ```tsx
 * <DashboardPageWrapper title="My Page" subtitle="Description">
 *   <Card>...</Card>
 * </DashboardPageWrapper>
 * ```
 */
export function DashboardPageWrapper({
  children,
  title,
  subtitle,
  headerActions,
  maxWidth = 'lg',
  className,
  showHeader = true,
}: DashboardPageWrapperProps) {
  const { dir } = useLanguage()

  const maxWidthClass = {
    sm: 'max-w-none sm:max-w-3xl', // full on mobile, 768px on sm+
    md: 'max-w-none sm:max-w-5xl',
    lg: 'max-w-none sm:max-w-6xl', // full on mobile, 1152px on sm+
    xl: 'max-w-none sm:max-w-7xl',
    full: 'max-w-none',
  }[maxWidth]

  return (
    <div
      className={cn(
        'w-full min-h-0 min-w-0',
        // Edge-to-edge layout (zero horizontal padding)
        'px-0',
        // Center content with consistent max-width
        maxWidthClass,
        dir === 'rtl' ? 'me-auto' : 'mx-auto',
        // Consistent vertical spacing
        'pb-6 sm:pb-8',
        className
      )}
      dir={dir}
    >
      {/* Header: Title + Subtitle + Actions */}
      {showHeader && (title || subtitle || headerActions) && (
        <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 sm:gap-4 mb-6">
          <div className="min-w-0 flex-1">
            {title && (
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight">{title}</h1>
            )}
            {subtitle && (
              <p className="text-muted-foreground text-sm mt-1">{subtitle}</p>
            )}
          </div>
          {headerActions && (
            <div className="flex items-center gap-2 shrink-0">{headerActions}</div>
          )}
        </header>
      )}

      {/* Main content - responsive spacing for 320px-428px */}
      <div className="space-y-4 min-[375px]:space-y-5 sm:space-y-6">{children}</div>
    </div>
  )
}

/**
 * Simple wrapper for dashboard page content without header.
 * Use when you need consistent spacing but handle the header yourself.
 */
export function DashboardPageContent({
  children,
  maxWidth = 'lg',
  className,
}: {
  children: React.ReactNode
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  className?: string
}) {
  const { dir } = useLanguage()

  const maxWidthClass = {
    sm: 'max-w-none sm:max-w-3xl',
    md: 'max-w-none sm:max-w-5xl',
    lg: 'max-w-none sm:max-w-6xl',
    xl: 'max-w-none sm:max-w-7xl',
    full: 'max-w-none',
  }[maxWidth]

  return (
    <div
      className={cn(
        'w-full min-h-0 min-w-0',
        'px-0',
        maxWidthClass,
        dir === 'rtl' ? 'me-auto' : 'mx-auto',
        'pb-6 sm:pb-8',
        'space-y-6',
        className
      )}
      dir={dir}
    >
      {children}
    </div>
  )
}
