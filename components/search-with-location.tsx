'use client'

import React, { useState, useRef } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Search, MapPin, ChevronDown, Navigation, Check } from 'lucide-react'
import { useLanguage } from '@/lib/i18n/language-context'
import {
  WILAYAS,
  getWilayaName,
  getCityName,
  getWilayaByCode,
  type Wilaya,
  type City,
} from '@/lib/data/algeria-locations'
import { LoadingSpinner } from '@/components/ui/page-loading'
import { cn } from '@/lib/utils'

interface SearchWithLocationProps {
  searchValue: string
  onSearchChange: (value: string) => void
  searchPlaceholder?: string
  selectedWilaya: string
  onWilayaChange: (value: string) => void
  selectedCityId?: string | null
  onCityChange?: (cityId: string | null, cityName: string) => void
  isLocating?: boolean
  onDetectLocation?: () => void
  className?: string
}

const labels = {
  ar: {
    allWilayas: 'جميع الولايات',
    nearMe: 'بالقرب مني',
    detecting: 'جاري الكشف...',
    selectWilaya: 'اختر الولاية',
    selectCity: 'اختر البلدية',
    searchWilaya: 'ابحث ولاية...',
    searchCity: 'ابحث بلدية...',
    noResults: 'لا توجد نتائج',
    wholeWilaya: 'كل الولاية',
    selectWilayaFirst: 'اختر الولاية أولاً',
  },
  fr: {
    allWilayas: 'Toutes les wilayas',
    nearMe: 'Près de moi',
    detecting: 'Détection...',
    selectWilaya: 'Sélectionner la wilaya',
    selectCity: 'Sélectionner la commune',
    searchWilaya: 'Rechercher wilaya...',
    searchCity: 'Rechercher commune...',
    noResults: 'Aucun résultat',
    wholeWilaya: 'Toute la wilaya',
    selectWilayaFirst: 'Sélectionner la wilaya d\'abord',
  },
  en: {
    allWilayas: 'All Wilayas',
    nearMe: 'Near Me',
    detecting: 'Detecting...',
    selectWilaya: 'Select Wilaya',
    selectCity: 'Select City',
    searchWilaya: 'Search wilaya...',
    searchCity: 'Search city...',
    noResults: 'No results',
    wholeWilaya: 'Whole wilaya',
    selectWilayaFirst: 'Select wilaya first',
  },
}

export function SearchWithLocation({
  searchValue,
  onSearchChange,
  searchPlaceholder,
  selectedWilaya,
  onWilayaChange,
  selectedCityId = null,
  onCityChange,
  isLocating = false,
  onDetectLocation,
  className,
}: SearchWithLocationProps) {
  const { language } = useLanguage()
  const [sheetOpen, setSheetOpen] = useState(false)
  const [internalCityId, setInternalCityId] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const l = labels[language] || labels.en


  const effectiveCityId = onCityChange ? selectedCityId : internalCityId

  const wilaya = selectedWilaya && selectedWilaya !== 'all' && selectedWilaya !== 'near-me'
    ? getWilayaByCode(selectedWilaya)
    : null
  const cities = wilaya?.cities ?? []
  const selectedCity = effectiveCityId ? cities.find((c) => c.id === effectiveCityId) : null

  const getLocationLabel = () => {
    if (isLocating && selectedWilaya === 'near-me') return l.detecting
    if (selectedWilaya === 'near-me') return l.nearMe
    if (selectedWilaya === 'all' || !selectedWilaya) return l.allWilayas
    if (selectedCity) return `${getWilayaName(wilaya!, language)} › ${getCityName(selectedCity, language)}`
    return getWilayaName(wilaya!, language)
  }

  const handleWilayaSelect = (w: Wilaya) => {
    onWilayaChange(w.code)
    if (onCityChange) onCityChange(null, '')
    else setInternalCityId(null)
  }

  const handleCitySelect = (c: City) => {
    onWilayaChange(wilaya!.code)
    if (onCityChange) onCityChange(c.id, getCityName(c, language))
    else setInternalCityId(c.id)
    setSheetOpen(false)
  }

  const handleWholeWilaya = () => {
    if (wilaya) {
      onWilayaChange(wilaya.code)
      if (onCityChange) onCityChange(null, '')
      else setInternalCityId(null)
      setSheetOpen(false)
    }
  }

  const handleNearMe = () => {
    if (onDetectLocation) {
      onWilayaChange('near-me')
      onDetectLocation()
      setSheetOpen(false)
    }
  }

  const handleAll = () => {
    onWilayaChange('all')
    if (onCityChange) onCityChange(null, '')
    else setInternalCityId(null)
    setSheetOpen(false)
  }

  return (
    <div className={cn(className)}>
      {/* Search bar with location chip */}
      <div className="flex items-center gap-2 overflow-hidden">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            ref={inputRef}
            type="text"
            placeholder={searchPlaceholder ?? (language === 'ar' ? 'بحث...' : language === 'fr' ? 'Rechercher...' : 'Search...')}
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            className="h-9 ps-9 pe-2 border-0 rounded-none text-base focus-visible:ring-0"
          />
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSheetOpen(true)}
          disabled={isLocating}
          className="h-9 shrink-0 rounded-none border-s px-2.5 gap-1.5 min-w-0"
        >
          {isLocating ? (
            <LoadingSpinner size="sm" className="h-3.5 w-3.5" />
          ) : (
            <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          )}
          <span className="truncate max-w-[100px] text-xs font-medium">
            {getLocationLabel()}
          </span>
          <ChevronDown className="h-3.5 w-3.5 opacity-50 shrink-0" />
        </Button>
      </div>

      {/* Location sheet - Wilaya then City */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="bottom" className="h-[85vh] rounded-t-2xl p-0 flex flex-col">
          <SheetHeader className="px-4 py-3 border-b shrink-0">
            <SheetTitle className="text-base">
              {language === 'ar' ? 'اختر الموقع' : language === 'fr' ? 'Choisir le lieu' : 'Choose location'}
            </SheetTitle>
          </SheetHeader>

          <div className="flex-1 overflow-hidden flex flex-col min-h-0">
            {/* All / Near Me quick actions */}
            <div className="flex gap-2 p-4 border-b shrink-0">
              <Button
                variant={selectedWilaya === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={handleAll}
                className="flex-1"
              >
                {l.allWilayas}
              </Button>
              {onDetectLocation && (
                <Button
                  variant={selectedWilaya === 'near-me' ? 'default' : 'outline'}
                  size="sm"
                  onClick={handleNearMe}
                  disabled={isLocating}
                  className="flex-1 gap-1.5"
                >
                  {isLocating ? <LoadingSpinner size="sm" /> : <Navigation className="h-4 w-4" />}
                  {l.nearMe}
                </Button>
              )}
            </div>

            {/* Wilaya section */}
            <div className="flex-1 overflow-hidden flex flex-col min-h-0">
              <p className="text-xs font-medium text-muted-foreground px-4 py-2 mt-2">{l.selectWilaya}</p>
              <div className="flex-1 min-h-0 overflow-hidden">
                <Command className="rounded-none border-0 bg-transparent h-full [&_[data-slot=command-input-wrapper]]:border-b-0">
                  <CommandInput placeholder={l.searchWilaya} className="h-10" />
                  <CommandList className="max-h-[min(400px,50vh)]">
                    <CommandEmpty>{l.noResults}</CommandEmpty>
                    <CommandGroup>
                      {WILAYAS.map((w) => (
                        <CommandItem
                          key={w.code}
                          value={`${w.code} ${getWilayaName(w, language)} ${w.nameAr}`}
                          onSelect={() => handleWilayaSelect(w)}
                          className="gap-2"
                        >
                          <span className="text-muted-foreground text-xs w-6 shrink-0">{w.code}</span>
                          <span className="truncate">{getWilayaName(w, language)}</span>
                          {selectedWilaya === w.code && !effectiveCityId && (
                            <Check className="h-4 w-4 ms-auto shrink-0" />
                          )}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </div>
            </div>

            {/* City section - only when wilaya selected */}
            {wilaya && (
              <div className="flex-1 overflow-hidden flex flex-col min-h-0 border-t">
                <div className="flex items-center justify-between px-4 py-2 mt-2">
                  <p className="text-xs font-medium text-muted-foreground">{l.selectCity}</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleWholeWilaya}
                    className="h-7 text-xs"
                  >
                    {l.wholeWilaya}
                  </Button>
                </div>
                <div className="flex-1 min-h-0 overflow-hidden">
                  <Command className="rounded-none border-0 bg-transparent h-full [&_[data-slot=command-input-wrapper]]:border-b-0">
                    <CommandInput placeholder={l.searchCity} className="h-10" />
                    <CommandList className="max-h-[min(320px,40vh)]">
                      <CommandEmpty>{l.noResults}</CommandEmpty>
                      <CommandGroup>
                        {cities.map((c) => (
                          <CommandItem
                            key={c.id}
                            value={`${c.id} ${getCityName(c, language)} ${c.nameAr}`}
                            onSelect={() => handleCitySelect(c)}
                            className="gap-2"
                          >
                            <span className="truncate">{getCityName(c, language)}</span>
                            {effectiveCityId === c.id && <Check className="h-4 w-4 ms-auto shrink-0" />}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </div>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
