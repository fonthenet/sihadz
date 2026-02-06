'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { Check, ChevronDown, MapPin } from 'lucide-react'
import {
  WILAYAS,
  getWilayaName,
  getCityName,
  getWilayaByCode,
  type Wilaya,
  type City,
} from '@/lib/data/algeria-locations'

type Lang = 'ar' | 'fr' | 'en'

export interface WilayaCityValue {
  wilayaCode: string
  wilayaName: string
  cityId: string | null
  cityName: string
  isCustomCity: boolean
}

interface WilayaCitySelectorProps {
  wilayaCode: string
  cityId: string | null
  customCityName: string
  onWilayaChange: (code: string) => void
  onCityChange: (cityId: string | null, cityName: string, isCustom: boolean) => void
  language?: Lang
  className?: string
  wilayaLabel?: string
  cityLabel?: string
}

export function WilayaCitySelector({
  wilayaCode,
  cityId,
  customCityName,
  onWilayaChange,
  onCityChange,
  language = 'fr',
  className = '',
  wilayaLabel = 'Wilaya',
  cityLabel = 'Commune / Ville',
}: WilayaCitySelectorProps) {
  const [wilayaOpen, setWilayaOpen] = useState(false)
  const [cityOpen, setCityOpen] = useState(false)
  const [showCustomCity, setShowCustomCity] = useState(false)
  const [customCityInput, setCustomCityInput] = useState(customCityName)

  useEffect(() => {
    setCustomCityInput(customCityName)
    if (customCityName && !cityId) setShowCustomCity(true)
  }, [customCityName, cityId])

  const selectedWilaya = getWilayaByCode(wilayaCode)
  const cities = selectedWilaya?.cities ?? []

  const selectedCityFromList = cityId ? cities.find((c) => c.id === cityId) : null
  const useCustomCityMode = !!customCityName && !selectedCityFromList

  const handleWilayaSelect = (w: Wilaya) => {
    onWilayaChange(w.code)
    onCityChange(null, '', false)
    setCustomCityInput('')
    setShowCustomCity(false)
    setWilayaOpen(false)
    setCityOpen(false)
  }

  const handleCitySelect = (c: City) => {
    onCityChange(c.id, getCityName(c, language), false)
    setCustomCityInput('')
    setShowCustomCity(false)
    setCityOpen(false)
  }

  const handleUseCustomCity = () => {
    setShowCustomCity(true)
    setCityOpen(false)
    if (customCityInput.trim()) {
      onCityChange(null, customCityInput.trim(), true)
    }
  }

  const handleCustomCityBlur = () => {
    if (customCityInput.trim()) {
      onCityChange(null, customCityInput.trim(), true)
    }
  }

  const handleCustomCityChange = (v: string) => {
    setCustomCityInput(v)
    if (v.trim()) onCityChange(null, v.trim(), true)
    else onCityChange(null, '', true)
  }

  return (
    <div className={className}>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>{wilayaLabel}</Label>
          <Popover open={wilayaOpen} onOpenChange={setWilayaOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={wilayaOpen}
                className="w-full justify-between font-normal h-10"
              >
                <span className="truncate flex items-center gap-2">
                  <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
                  {selectedWilaya
                    ? `${selectedWilaya.code} - ${getWilayaName(selectedWilaya, language)}`
                    : `Select ${wilayaLabel.toLowerCase()} (58 wilayas)`}
                </span>
                <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start" side="bottom" avoidCollisions={false}>
              <Command>
                <CommandInput
                  placeholder={
                    language === 'ar'
                      ? 'بحث الولاية...'
                      : language === 'fr'
                        ? 'Rechercher une wilaya...'
                        : 'Search wilaya...'
                  }
                />
                <CommandList>
                  <CommandEmpty>
                    {language === 'ar'
                      ? 'لا توجد نتائج'
                      : language === 'fr'
                        ? 'Aucun résultat'
                        : 'No results'}
                  </CommandEmpty>
                  <CommandGroup heading={`58 ${language === 'ar' ? 'ولاية' : 'wilayas'}`}>
                    {WILAYAS.map((w) => (
                      <CommandItem
                        key={w.code}
                        value={`${w.code} ${getWilayaName(w, language)} ${w.nameAr}`}
                        onSelect={() => handleWilayaSelect(w)}
                        className="gap-2"
                      >
                        <span className="text-muted-foreground text-xs w-6 shrink-0">{w.code}</span>
                        <span className="truncate">{getWilayaName(w, language)}</span>
                        {wilayaCode === w.code && <Check className="h-4 w-4 ms-auto shrink-0" />}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-2">
          <Label>{cityLabel}</Label>
          {showCustomCity || (customCityName && !selectedCityFromList) ? (
            <div className="space-y-2">
              <Input
                value={customCityInput}
                onChange={(e) => handleCustomCityChange(e.target.value)}
                onBlur={handleCustomCityBlur}
                placeholder={
                  language === 'ar'
                    ? 'اكتب المدينة إذا لم تكن في القائمة'
                    : language === 'fr'
                      ? 'Tapez la ville si absente de la liste'
                      : 'Type city if not in list'
                }
                className="h-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 text-xs"
                onClick={() => {
                  setShowCustomCity(false)
                  setCustomCityInput('')
                  onCityChange(null, '', false)
                  setCityOpen(true)
                }}
              >
                {language === 'ar' ? 'اختر من القائمة' : language === 'fr' ? 'Choisir dans la liste' : 'Choose from list'}
              </Button>
            </div>
          ) : (
            <Popover open={cityOpen} onOpenChange={setCityOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={cityOpen}
                  className="w-full justify-between font-normal h-10"
                  disabled={!wilayaCode}
                >
                  <span className="truncate">
                    {selectedCityFromList
                      ? getCityName(selectedCityFromList, language)
                      : language === 'ar'
                        ? 'اختر المدينة'
                        : language === 'fr'
                          ? 'Choisir la commune / ville'
                          : 'Select city'}
                  </span>
                  <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start" side="bottom" avoidCollisions={false}>
                <Command>
                  <CommandInput
                    placeholder={
                      language === 'ar'
                        ? 'بحث المدينة...'
                        : language === 'fr'
                          ? 'Rechercher une ville...'
                          : 'Search city...'
                    }
                  />
                  <CommandList>
                    <CommandEmpty>
                      {language === 'ar'
                        ? 'لا توجد نتائج'
                        : language === 'fr'
                          ? 'Aucun résultat'
                          : 'No results'}
                    </CommandEmpty>
                    <CommandGroup>
                      {cities.map((c) => (
                        <CommandItem
                          key={c.id}
                          value={`${c.id} ${getCityName(c, language)} ${c.nameAr}`}
                          onSelect={() => handleCitySelect(c)}
                          className="gap-2"
                        >
                          <span className="truncate">{getCityName(c, language)}</span>
                          {cityId === c.id && <Check className="h-4 w-4 ms-auto shrink-0" />}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                    <CommandGroup>
                      <CommandItem onSelect={handleUseCustomCity} className="text-muted-foreground italic">
                        {language === 'ar'
                          ? '+ المدينة غير موجودة؟ اكتبها'
                          : language === 'fr'
                            ? '+ Ville absente ? Tapez-la'
                            : '+ City not in list? Type it'}
                      </CommandItem>
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          )}
        </div>
      </div>
    </div>
  )
}
