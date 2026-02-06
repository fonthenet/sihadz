'use client'

import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { useLanguage } from '@/lib/i18n/language-context'
import { useLocation } from '@/hooks/use-location'
import { 
  algeriaWilayas, 
  getWilayaName, 
  getCityName,
  type Wilaya,
  type City 
} from '@/lib/data/algeria-locations'
import { 
  MapPin, 
  Navigation, 
  ChevronDown, 
  Check, 
  X,
  Search,
  AlertCircle
} from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/page-loading'

interface LocationSelectorProps {
  onLocationSelect?: (wilaya: Wilaya | null, city: City | null) => void
  showCitySelector?: boolean
  compact?: boolean
  className?: string
}

export function LocationSelector({ 
  onLocationSelect, 
  showCitySelector = true,
  compact = false,
  className = ''
}: LocationSelectorProps) {
  const { language, t } = useLanguage()
  const {
    isDetecting,
    error,
    detectedWilaya,
    selectedWilaya,
    selectedCity,
    permissionStatus,
    detectLocation,
    selectWilaya,
    selectCity,
    clearSelection,
  } = useLocation()
  
  const [wilayaOpen, setWilayaOpen] = useState(false)
  const [cityOpen, setCityOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const filteredWilayas = useMemo(() => {
    if (!searchQuery) return algeriaWilayas
    const query = searchQuery.toLowerCase()
    return algeriaWilayas.filter(wilaya => 
      getWilayaName(wilaya, language).toLowerCase().includes(query) ||
      wilaya.code.includes(query)
    )
  }, [searchQuery, language])

  const handleWilayaSelect = (wilaya: Wilaya) => {
    selectWilaya(wilaya)
    setWilayaOpen(false)
    onLocationSelect?.(wilaya, null)
  }

  const handleCitySelect = (city: City) => {
    selectCity(city)
    setCityOpen(false)
    onLocationSelect?.(selectedWilaya, city)
  }

  const handleDetectLocation = async () => {
    await detectLocation()
  }

  const handleClear = () => {
    clearSelection()
    onLocationSelect?.(null, null)
  }

  const labels = {
    ar: {
      selectWilaya: 'اختر الولاية',
      selectCity: 'اختر البلدية',
      detectLocation: 'تحديد موقعي',
      detecting: 'جاري التحديد...',
      nearYou: 'قريب منك',
      allWilayas: 'جميع الولايات',
      searchWilaya: 'ابحث عن ولاية...',
      searchCity: 'ابحث عن بلدية...',
      noResults: 'لا توجد نتائج',
      locationDenied: 'تم رفض إذن الموقع',
      enableLocation: 'تفعيل الموقع',
      clear: 'مسح',
    },
    fr: {
      selectWilaya: 'Sélectionner la wilaya',
      selectCity: 'Sélectionner la commune',
      detectLocation: 'Détecter ma position',
      detecting: 'Détection...',
      nearYou: 'Près de vous',
      allWilayas: 'Toutes les wilayas',
      searchWilaya: 'Rechercher une wilaya...',
      searchCity: 'Rechercher une commune...',
      noResults: 'Aucun résultat',
      locationDenied: 'Permission de localisation refusée',
      enableLocation: 'Activer la localisation',
      clear: 'Effacer',
    },
    en: {
      selectWilaya: 'Select Wilaya',
      selectCity: 'Select City',
      detectLocation: 'Detect my location',
      detecting: 'Detecting...',
      nearYou: 'Near you',
      allWilayas: 'All Wilayas',
      searchWilaya: 'Search wilaya...',
      searchCity: 'Search city...',
      noResults: 'No results',
      locationDenied: 'Location permission denied',
      enableLocation: 'Enable location',
      clear: 'Clear',
    },
  }

  const l = labels[language]

  if (compact) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Popover open={wilayaOpen} onOpenChange={setWilayaOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="justify-between gap-2 bg-transparent">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span className="truncate max-w-[150px]">
                {selectedWilaya 
                  ? getWilayaName(selectedWilaya, language)
                  : l.selectWilaya
                }
              </span>
              <ChevronDown className="h-4 w-4 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[300px] p-0" align="start" side="bottom" avoidCollisions={false}>
            <Command>
              <CommandInput placeholder={l.searchWilaya} />
              <CommandList>
                <CommandEmpty>{l.noResults}</CommandEmpty>
                <CommandGroup>
                  {/* Auto-detect option */}
                  <CommandItem
                    onSelect={handleDetectLocation}
                    className="gap-2"
                  >
                    {isDetecting ? (
                      <LoadingSpinner size="sm" />
                    ) : (
                      <Navigation className="h-4 w-4" />
                    )}
                    <span>{isDetecting ? l.detecting : l.detectLocation}</span>
                    {detectedWilaya && (
                      <Badge variant="secondary" className="ms-auto">
                        {l.nearYou}
                      </Badge>
                    )}
                  </CommandItem>
                </CommandGroup>
                <CommandGroup heading={l.allWilayas}>
                  {filteredWilayas.map((wilaya) => (
                    <CommandItem
                      key={wilaya.code}
                      value={getWilayaName(wilaya, language)}
                      onSelect={() => handleWilayaSelect(wilaya)}
                      className="gap-2"
                    >
                      <span className="text-muted-foreground text-xs w-6">
                        {wilaya.code}
                      </span>
                      <span>{getWilayaName(wilaya, language)}</span>
                      {selectedWilaya?.code === wilaya.code && (
                        <Check className="h-4 w-4 ms-auto" />
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        {selectedWilaya && (
          <Button variant="ghost" size="icon" onClick={handleClear}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    )
  }

  return (
    <Card className={className}>
      <CardContent className="p-4">
        <div className="space-y-4">
          {/* Auto-detect section */}
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={handleDetectLocation}
              disabled={isDetecting}
              className="gap-2 bg-transparent"
            >
              {isDetecting ? (
                <LoadingSpinner size="sm" />
              ) : (
                <Navigation className="h-4 w-4" />
              )}
              {isDetecting ? l.detecting : l.detectLocation}
            </Button>
            
            {detectedWilaya && (
              <Badge variant="secondary" className="gap-1">
                <MapPin className="h-3 w-3" />
                {getWilayaName(detectedWilaya, language)}
              </Badge>
            )}
          </div>

          {/* Error message */}
          {error && permissionStatus === 'denied' && (
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              <span>{l.locationDenied}</span>
            </div>
          )}

          {/* Wilaya selector */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              {l.selectWilaya}
            </label>
            <Popover open={wilayaOpen} onOpenChange={setWilayaOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={wilayaOpen}
                  className="w-full justify-between bg-transparent"
                >
                  <span className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    {selectedWilaya 
                      ? `${selectedWilaya.code} - ${getWilayaName(selectedWilaya, language)}`
                      : l.selectWilaya
                    }
                  </span>
                  <ChevronDown className="h-4 w-4 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0" align="start" side="bottom" avoidCollisions={false}>
                <Command>
                  <CommandInput placeholder={l.searchWilaya} />
                  <CommandList>
                    <CommandEmpty>{l.noResults}</CommandEmpty>
                    <CommandGroup>
                      <ScrollArea className="h-[300px]">
                        {algeriaWilayas.map((wilaya) => (
                          <CommandItem
                            key={wilaya.code}
                            value={`${wilaya.code} ${getWilayaName(wilaya, language)}`}
                            onSelect={() => handleWilayaSelect(wilaya)}
                            className="gap-2"
                          >
                            <span className="text-muted-foreground text-xs w-6 shrink-0">
                              {wilaya.code}
                            </span>
                            <span className="truncate">{getWilayaName(wilaya, language)}</span>
                            {selectedWilaya?.code === wilaya.code && (
                              <Check className="h-4 w-4 ms-auto shrink-0" />
                            )}
                          </CommandItem>
                        ))}
                      </ScrollArea>
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* City selector */}
          {showCitySelector && selectedWilaya && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                {l.selectCity}
              </label>
              <Popover open={cityOpen} onOpenChange={setCityOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={cityOpen}
                    className="w-full justify-between bg-transparent"
                  >
                    <span>
                      {selectedCity 
                        ? getCityName(selectedCity, language)
                        : l.selectCity
                      }
                    </span>
                    <ChevronDown className="h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start" side="bottom" avoidCollisions={false}>
                  <Command>
                    <CommandInput placeholder={l.searchCity} />
                    <CommandList>
                      <CommandEmpty>{l.noResults}</CommandEmpty>
                      <CommandGroup>
                        {selectedWilaya.cities.map((city) => (
                          <CommandItem
                            key={city.id}
                            value={getCityName(city, language)}
                            onSelect={() => handleCitySelect(city)}
                            className="gap-2"
                          >
                            <span>{getCityName(city, language)}</span>
                            {selectedCity?.id === city.id && (
                              <Check className="h-4 w-4 ms-auto" />
                            )}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          )}

          {/* Clear button */}
          {(selectedWilaya || selectedCity) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClear}
              className="w-full gap-2"
            >
              <X className="h-4 w-4" />
              {l.clear}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
