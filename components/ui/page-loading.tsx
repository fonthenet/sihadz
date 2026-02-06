import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

/**
 * Unified loading components for the entire website.
 * Uses the border-circle spinner (same as patient My Appointments) everywhere.
 * Use: FullPageLoading for routes, SectionLoading for page sections, LoadingSpinner for inline/buttons.
 */

/** Border-circle spinner - the clean loading circle used on My Appointments. */
function BorderSpinner({
  size = 'md',
  className,
}: {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
} = {}) {
  const sizeClass =
    size === 'sm' ? 'h-4 w-4' : size === 'md' ? 'h-5 w-5' : size === 'lg' ? 'h-8 w-8' : 'h-10 w-10'
  return (
    <div
      className={cn(
        'animate-spin rounded-full border-b-2 border-primary dark:border-emerald-400',
        sizeClass,
        className
      )}
      role="status"
      aria-label="Loading"
    />
  )
}

/** Full-page loading - centered spinner. Use for route transitions (loading.tsx). */
export function FullPageLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background" role="status" aria-label="Loading">
      <BorderSpinner size="xl" />
    </div>
  )
}

/** @deprecated Use FullPageLoading */
export function PageLoadingSpinner() {
  return <FullPageLoading />
}

/** Section loading - centered spinner for a card/section. Use for data fetch within a page. */
export function SectionLoading({
  className,
  label,
  minHeight = 'min-h-[200px]',
}: {
  className?: string
  label?: string
  minHeight?: string
} = {}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 text-muted-foreground',
        minHeight,
        className
      )}
      role="status"
      aria-label={label || 'Loading'}
    >
      <BorderSpinner size="lg" className="mb-0" />
      {label && <p className="text-sm">{label}</p>}
    </div>
  )
}

/** Small spinner for buttons and inline use. Size: sm (16px), md (20px), lg (32px), xl (40px). */
export function LoadingSpinner({
  size = 'md',
  className,
}: {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
} = {}) {
  const spinnerSize = size === 'sm' ? 'sm' : size === 'md' ? 'md' : size === 'lg' ? 'lg' : 'xl'
  return <BorderSpinner size={spinnerSize} className={className} />
}

/** Skeleton for list/card pages (search, clinics, pharmacies, labs) */
export function PageLoadingSkeleton({ type = 'cards' }: { type?: 'cards' | 'list' }) {
  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card/95">
        <div className="container mx-auto h-16 px-4" />
      </div>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6 space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="mb-6 flex gap-4">
          <Skeleton className="h-10 flex-1 max-w-md" />
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-48 rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  )
}
