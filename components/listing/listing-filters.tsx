'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useLanguage } from '@/lib/i18n/language-context'
import { WILAYAS, type Wilaya } from '@/lib/data/algeria-locations'
import {
  Search,
  MapPin,
  Navigation,
  Clock,
  X,
  Filter,
  SlidersHorizontal,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { LoadingSpinner } from '@/components/ui/page-loading'

export interface ListingFiltersProps {
  searchQuery: string
  onSearchChange: (value: string) => void
  selectedWilaya: string
  onWilayaChange: (value: string) => void
  showOpenFilter?: boolean
  filterOpen?: boolean
  onOpenFilterChange?: (value: boolean) => void
  isLocating?: boolean
  onDetectLocation?: () => void
  /** When true, search is rendered in the header instead of here */
  searchInHeader?: boolean
  /** When true, hide wilaya + near-me on mobile (location is in header search bar) */
  hideLocationOnMobile?: boolean
  // Additional filters slot
  additionalFilters?: React.ReactNode
  // Results count
  resultCount?: number
  resultLabel?: string
  className?: string
}

export function ListingFilters({
  searchQuery,
  onSearchChange,
  selectedWilaya,
  onWilayaChange,
  showOpenFilter = true,
  filterOpen = false,
  onOpenFilterChange,
  isLocating = false,
  onDetectLocation,
  searchInHeader = false,
  hideLocationOnMobile = false,
  additionalFilters,
  resultCount,
  resultLabel,
  className,
}: ListingFiltersProps) {
  const { language, dir } = useLanguage()

  const labels = {
    ar: {
      search: 'بحث...',
      allWilayas: 'جميع الولايات',
      wilaya: 'الولاية',
      openNow: 'مفتوح الآن',
      nearMe: 'بالقرب مني',
      detecting: 'جاري الكشف...',
      clearFilters: 'مسح',
      results: 'نتيجة',
    },
    fr: {
      search: 'Rechercher...',
      allWilayas: 'Toutes les wilayas',
      wilaya: 'Wilaya',
      openNow: 'Ouvert maintenant',
      nearMe: 'Près de moi',
      detecting: 'Détection...',
      clearFilters: 'Effacer',
      results: 'résultats',
    },
    en: {
      search: 'Search...',
      allWilayas: 'All Wilayas',
      wilaya: 'Wilaya',
      openNow: 'Open Now',
      nearMe: 'Near Me',
      detecting: 'Detecting...',
      clearFilters: 'Clear',
      results: 'results',
    },
  }

  const l = labels[language] || labels.en

  const hasActiveFilters = selectedWilaya !== 'all' || filterOpen || searchQuery.trim()

  const clearFilters = () => {
    onSearchChange('')
    onWilayaChange('all')
    onOpenFilterChange?.(false)
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Main filter row */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {/* Search input (hidden when searchInHeader) */}
        {!searchInHeader && (
          <div className="relative flex-1">
            <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              type="text"
              placeholder={l.search}
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="h-10 ps-10 bg-background"
            />
          </div>
        )}

        {/* Action buttons + Wilaya + Additional filters (single row) */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Open now filter */}
          {showOpenFilter && onOpenFilterChange && (
            <Button
              variant={filterOpen ? 'default' : 'outline'}
              size="sm"
              onClick={() => onOpenFilterChange(!filterOpen)}
              className={cn('h-10 px-2 sm:px-3 text-xs sm:text-sm shrink-0', !filterOpen && 'bg-background')}
            >
              <Clock className="h-4 w-4 me-1 sm:me-1.5 shrink-0" />
              {l.openNow}
            </Button>
          )}

          {/* Additional filters (inline with Open Now) */}
          {additionalFilters}

          {/* Near me + Wilaya (hidden on mobile when location is in header) */}
          <>
            {onDetectLocation && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onDetectLocation}
                  disabled={isLocating}
                  className={cn(
                    'h-10 px-2 sm:px-3 bg-background text-xs sm:text-sm shrink-0',
                    hideLocationOnMobile && 'hidden md:flex'
                  )}
                >
                  {isLocating ? (
                    <LoadingSpinner size="sm" className="me-1.5" />
                  ) : (
                    <Navigation className="h-4 w-4 me-1.5" />
                  )}
                  <span className="hidden sm:inline">
                    {isLocating ? l.detecting : l.nearMe}
                  </span>
                </Button>
              )}

              <Select value={selectedWilaya} onValueChange={onWilayaChange}>
                <SelectTrigger
                  className={cn(
                    'h-10 w-[260px] sm:w-[280px] shrink-0 bg-background',
                    hideLocationOnMobile && 'hidden md:flex'
                  )}
                >
                  <MapPin className="h-4 w-4 me-2 text-muted-foreground shrink-0" />
                  <SelectValue placeholder={l.allWilayas} />
                </SelectTrigger>
                <SelectContent side="bottom" avoidCollisions={false}>
                  <SelectItem value="all">{l.allWilayas}</SelectItem>
                  {WILAYAS.map((wilaya) => (
                    <SelectItem key={wilaya.code} value={wilaya.code}>
                      {language === 'ar' ? wilaya.nameAr : wilaya.nameFr}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </>
        </div>
      </div>

      {/* Results count + Clear filters */}
      {(resultCount !== undefined || hasActiveFilters) && (
        <div className="flex items-center justify-between">
          {resultCount !== undefined && (
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{resultCount}</span>{' '}
              {resultLabel || l.results}
            </p>
          )}
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
            >
              <X className="h-3 w-3 me-1" />
              {l.clearFilters}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

// Page header component for consistent titles
export interface ListingPageHeaderProps {
  title: string
  subtitle?: string
  icon?: React.ReactNode
}

export function ListingPageHeader({ title, subtitle, icon }: ListingPageHeaderProps) {
  return (
    <div className="mb-4 sm:mb-6 w-full flex justify-start">
      <div className="flex items-center gap-2 sm:gap-3">
        {icon && (
          <div className="p-1.5 sm:p-2 rounded-lg bg-primary/10 text-primary shrink-0">
            {icon}
          </div>
        )}
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-foreground truncate">{title}</h1>
          {subtitle && (
            <p className="text-muted-foreground mt-0.5">{subtitle}</p>
          )}
        </div>
      </div>
    </div>
  )
}

// Empty state component
export interface ListingEmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
}

export function ListingEmptyState({ icon, title, description, action }: ListingEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      {icon && (
        <div className="p-4 rounded-full bg-muted mb-4">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-semibold text-foreground mb-1">{title}</h3>
      {description && (
        <p className="text-muted-foreground text-sm max-w-md">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
