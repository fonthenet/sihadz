'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
import { MapPin, Search, Navigation, ChevronDown, Check, Stethoscope, Building, Pill, FlaskConical, Heart } from 'lucide-react'
import { useLanguage } from '@/lib/i18n/language-context'
import { useLocation } from '@/hooks/use-location'
import { algeriaWilayas, getWilayaName, getWilayaByCode, getCityName, type Wilaya, type City } from '@/lib/data/algeria-locations'
import { createBrowserClient } from '@/lib/supabase/client'
import { LoadingSpinner } from '@/components/ui/page-loading'

const DEBOUNCE_MS = 200
const MIN_QUERY_LENGTH = 1

interface SuggestionProfessional {
  id: string
  name: string | null
  nameAr: string | null
  type: string
  specialty: string | null
  wilaya: string | null
  commune: string | null
}

interface SuggestionSpecialty {
  key: string
  en: string
  fr: string
  ar: string
}

interface SuggestionWilaya {
  code: string
  nameFr: string
  nameAr: string
  nameEn: string
}

interface SuggestionsResponse {
  professionals: SuggestionProfessional[]
  specialties: SuggestionSpecialty[]
  wilayas: SuggestionWilaya[]
}

const typeIcons: Record<string, React.ElementType> = {
  doctor: Stethoscope,
  nurse: Heart,
  clinic: Building,
  pharmacy: Pill,
  lab: FlaskConical,
  laboratory: FlaskConical,
}

const localLabels = {
  ar: {
    detectLocation: 'تحديد موقعي تلقائياً',
    detecting: 'جاري التحديد...',
    nearYou: 'قريب منك',
    nearMe: 'بالقرب مني',
    allWilayas: 'جميع الولايات',
    selectWilaya: 'اختر الولاية',
    selectCity: 'اختر البلدية',
    searchWilaya: 'ابحث ولاية أو بلدية...',
    searchCity: 'ابحث بلدية...',
    noResults: 'لا توجد نتائج',
    wilayas58: '58 ولاية',
    searchDoctors: 'أطباء',
    searchSpecialties: 'تخصصات',
    searchWilayas: 'ولايات',
    searchProfessionals: 'مؤسسات',
    cities: 'البلديات',
    wholeWilaya: 'كل الولاية',
    selectWilayaFirst: 'اختر الولاية أولاً',
  },
  fr: {
    detectLocation: 'Détecter ma position',
    detecting: 'Détection...',
    nearYou: 'Près de vous',
    nearMe: 'Près de moi',
    allWilayas: 'Toutes les wilayas',
    selectWilaya: 'Sélectionner la wilaya',
    selectCity: 'Sélectionner la commune',
    searchWilaya: 'Rechercher wilaya ou commune...',
    searchCity: 'Rechercher commune...',
    noResults: 'Aucun résultat',
    wilayas58: '58 wilayas',
    searchDoctors: 'Médecins',
    searchSpecialties: 'Spécialités',
    searchWilayas: 'Wilayas',
    searchProfessionals: 'Établissements',
    cities: 'Communes',
    wholeWilaya: 'Toute la wilaya',
    selectWilayaFirst: 'Sélectionner la wilaya d\'abord',
  },
  en: {
    detectLocation: 'Detect my location',
    detecting: 'Detecting...',
    nearYou: 'Near you',
    nearMe: 'Near me',
    allWilayas: 'All Wilayas',
    selectWilaya: 'Select Wilaya',
    selectCity: 'Select City',
    searchWilaya: 'Search wilaya or city...',
    searchCity: 'Search city...',
    noResults: 'No results',
    wilayas58: '58 wilayas',
    searchDoctors: 'Doctors',
    searchSpecialties: 'Specialties',
    searchWilayas: 'Wilayas',
    searchProfessionals: 'Facilities',
    cities: 'Cities',
    wholeWilaya: 'Whole wilaya',
    selectWilayaFirst: 'Select wilaya first',
  },
}

export function HeroSearchBar() {
  const { t, language, dir } = useLanguage()
  const router = useRouter()
  const l = localLabels[language]

  const [searchQuery, setSearchQuery] = useState('')
  const [suggestions, setSuggestions] = useState<SuggestionsResponse | null>(null)
  const [suggestionsOpen, setSuggestionsOpen] = useState(false)
  const [suggestionsLoading, setSuggestionsLoading] = useState(false)
  const [wilayaOpen, setWilayaOpen] = useState(false)
  const [cityOpen, setCityOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  const [profileLocation, setProfileLocation] = useState<{ default_wilaya_code?: string; default_city_id?: string } | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const {
    isDetecting,
    detectedWilaya,
    selectedWilaya,
    selectedCity,
    detectLocation,
    selectWilaya,
    selectCity,
    clearSelection,
  } = useLocation({ profileFallback: profileLocation })

  // Fetch profile for location fallback
  useEffect(() => {
    const supabase = createBrowserClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase.from('profiles').select('default_wilaya_code, default_city_id').eq('id', user.id).maybeSingle().then(({ data }) => {
          if (data?.default_wilaya_code) setProfileLocation(data)
        })
      }
    })
  }, [])

  const fetchSuggestions = useCallback(async (q: string) => {
    if (q.length < MIN_QUERY_LENGTH) {
      setSuggestions(null)
      return
    }
    setSuggestionsLoading(true)
    try {
      const res = await fetch(`/api/search/suggestions?q=${encodeURIComponent(q)}`)
      const data = await res.json()
      setSuggestions(data)
      setSuggestionsOpen(true)
    } catch {
      setSuggestions(null)
    } finally {
      setSuggestionsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (searchQuery.length < MIN_QUERY_LENGTH) {
      setSuggestions(null)
      setSuggestionsOpen(false)
      return
    }
    debounceRef.current = setTimeout(() => fetchSuggestions(searchQuery), DEBOUNCE_MS)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [searchQuery, fetchSuggestions])

  const handleSearch = useCallback(() => {
    setSuggestionsOpen(false)
    const params = new URLSearchParams()
    if (searchQuery.trim()) params.set('q', searchQuery.trim())
    if (selectedWilaya) params.set('location', selectedWilaya.code)
    if (selectedCity) params.set('city', selectedCity.id)
    router.push(`/search?${params.toString()}`)
  }, [searchQuery, selectedWilaya, selectedCity, router])

  const handleSelectSuggestion = useCallback((type: 'professional' | 'specialty' | 'wilaya', value: string) => {
    setSuggestionsOpen(false)
    if (type === 'professional') {
      const pro = suggestions?.professionals.find(p => p.id === value)
      if (pro?.type === 'doctor') router.push(`/doctors/${value}`)
      else if (pro?.type === 'nurse') router.push(`/nurses/${value}`)
      else if (pro?.type === 'pharmacy') router.push(`/pharmacies/${value}`)
      else if (pro?.type === 'clinic') router.push(`/clinics/${value}`)
      else if (pro?.type === 'laboratory') router.push(`/labs/${value}`)
      else router.push(`/search?q=${encodeURIComponent(pro?.name || value)}`)
    } else if (type === 'specialty') {
      router.push(`/search?specialty=${value}${selectedWilaya ? `&location=${selectedWilaya.code}` : ''}`)
    } else if (type === 'wilaya') {
      const w = getWilayaByCode(value)
      if (w) selectWilaya(w)
    }
  }, [suggestions, selectedWilaya, selectWilaya, router])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch()
    if (e.key === 'Escape') setSuggestionsOpen(false)
  }

  const hasSuggestions = suggestions && (
    (suggestions.professionals?.length ?? 0) > 0 ||
    (suggestions.specialties?.length ?? 0) > 0 ||
    (suggestions.wilayas?.length ?? 0) > 0
  )

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setSuggestionsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div ref={containerRef} className="w-full min-w-0 max-w-6xl relative">
      {/* Search bar - beautiful blue gradient with soft glow - responsive for 320px-428px */}
      <div className="flex flex-col sm:flex-row sm:min-h-[64px] rounded-xl min-[375px]:rounded-2xl overflow-hidden shadow-xl shadow-blue-500/15 dark:shadow-blue-900/30 ring-1 ring-blue-300/70 dark:ring-blue-500/30 bg-gradient-to-r from-blue-50 via-indigo-50/80 to-blue-50 dark:from-blue-950/60 dark:via-indigo-950/50 dark:to-blue-950/60 border border-blue-300/90 dark:border-blue-600/60 focus-within:ring-2 focus-within:ring-blue-500/50 focus-within:border-blue-500/80 dark:focus-within:ring-blue-400/40 dark:focus-within:border-blue-400/70 transition-all duration-200">
        {/* Search input - takes most space, Near me at end */}
        <div className="relative flex-1 flex items-center min-w-0 rounded-t-2xl sm:rounded-t-none sm:rounded-s-2xl">
          <Search className="absolute start-3 h-5 w-5 text-blue-600 dark:text-blue-300 shrink-0" />
          <input
            type="text"
            placeholder={t('searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => searchQuery.length >= MIN_QUERY_LENGTH && setSuggestionsOpen(true)}
            className="flex-1 min-w-0 h-full py-3 min-[375px]:py-4 sm:py-5 ps-10 min-[375px]:ps-11 pe-11 min-[375px]:pe-12 text-sm sm:text-base bg-transparent border-0 outline-none placeholder:text-blue-600/80 dark:placeholder:text-blue-300/70 focus:ring-0 rounded-t-xl min-[375px]:rounded-t-2xl sm:rounded-s-2xl text-foreground"
            autoComplete="off"
            aria-autocomplete="list"
            aria-expanded={suggestionsOpen && !!hasSuggestions}
          />
          <div className="absolute end-2 flex items-center gap-1">
            {suggestionsLoading ? (
              <LoadingSpinner size="sm" className="text-muted-foreground" />
            ) : (
              <Button
                variant="ghost"
                size="icon"
                onClick={detectLocation}
                disabled={isDetecting}
                title={isDetecting ? l.detecting : l.nearMe}
                aria-label={isDetecting ? l.detecting : l.nearMe}
                className="h-9 w-9 shrink-0 rounded-full text-blue-600 dark:text-blue-300 hover:bg-blue-100/60 dark:hover:bg-blue-800/40"
              >
                {isDetecting ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  <Navigation className="h-5 w-5" />
                )}
              </Button>
            )}
          </div>
        </div>

        {/* Wilaya + City + Search - Popovers render only after mount to avoid Radix ID hydration mismatch */}
        <div className="flex items-stretch flex-1 sm:flex-initial min-h-[44px] min-[375px]:min-h-[48px] sm:min-h-[64px] border-t sm:border-t-0 sm:border-s border-blue-300/60 dark:border-blue-600/50 rounded-b-xl min-[375px]:rounded-b-2xl sm:rounded-none sm:rounded-e-2xl bg-white/70 dark:bg-blue-950/40 sm:bg-transparent">
          {mounted ? <Popover open={wilayaOpen} onOpenChange={setWilayaOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="min-h-[44px] min-[375px]:min-h-[48px] sm:min-h-[64px] flex-1 sm:flex-initial min-w-0 sm:max-w-[140px] px-2 min-[375px]:px-3 sm:px-4 gap-1 min-[375px]:gap-1.5 sm:gap-2 rounded-none border-0 border-e border-blue-300/50 dark:border-blue-600/40 bg-transparent hover:bg-blue-100/60 dark:hover:bg-blue-800/40 font-normal transition-colors flex items-center"
              >
                <MapPin className="h-4 w-4 text-blue-600 dark:text-blue-300 shrink-0" />
                <span className="truncate text-sm font-medium text-foreground">
                  {isDetecting ? l.detecting : (selectedWilaya ? getWilayaName(selectedWilaya, language) : l.allWilayas)}
                </span>
                <ChevronDown className="h-4 w-4 opacity-50 shrink-0" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[340px] max-w-[calc(100vw-2rem)] p-0" align="start" side="bottom" avoidCollisions={false}>
              <Command className="rounded-lg" shouldFilter={true}>
                <CommandInput placeholder={l.searchWilaya} className="h-10 border-b" />
                <CommandList className="max-h-[320px]">
                  <CommandEmpty>{l.noResults}</CommandEmpty>
                  <CommandGroup>
                    <CommandItem
                      value="detect location"
                      onSelect={() => { detectLocation(); setWilayaOpen(false) }}
                      className="gap-2"
                    >
                      {isDetecting ? (
                        <LoadingSpinner size="sm" />
                      ) : (
                        <Navigation className="h-4 w-4 text-primary" />
                      )}
                      <span className="font-medium">{isDetecting ? l.detecting : l.detectLocation}</span>
                      {detectedWilaya && (
                        <Badge variant="secondary" className="ms-auto text-xs bg-blue-100 text-blue-700 border-blue-300/60 dark:bg-blue-900/50 dark:text-blue-200 dark:border-blue-700/50">
                          {getWilayaName(detectedWilaya, language)}
                        </Badge>
                      )}
                    </CommandItem>
                    <CommandItem
                      value="all wilayas toutes"
                      onSelect={() => { clearSelection(); setWilayaOpen(false) }}
                      className="gap-2"
                    >
                      <MapPin className="h-4 w-4" />
                      <span>{l.allWilayas}</span>
                      {!selectedWilaya && <Check className="h-4 w-4 ms-auto" />}
                    </CommandItem>
                  </CommandGroup>
                  <CommandGroup heading={l.wilayas58}>
                    {algeriaWilayas.map((wilaya) => (
                      <CommandItem
                        key={wilaya.code}
                        value={`${wilaya.code} ${getWilayaName(wilaya, 'fr')} ${getWilayaName(wilaya, 'en')} ${getWilayaName(wilaya, 'ar')}`}
                        onSelect={() => { selectWilaya(wilaya); setWilayaOpen(false) }}
                        className="gap-2"
                      >
                        <span className="text-muted-foreground text-xs w-6 shrink-0">{wilaya.code}</span>
                        <span className="truncate">{getWilayaName(wilaya, language)}</span>
                        {selectedWilaya?.code === wilaya.code && !selectedCity && (
                          <Check className="h-4 w-4 ms-auto shrink-0" />
                        )}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover> : (
            <div className="min-h-[48px] sm:min-h-[64px] flex-1 sm:flex-initial min-w-0 sm:max-w-[140px] px-3 sm:px-4 gap-1.5 sm:gap-2 rounded-none border-e border-blue-300/50 dark:border-blue-600/40 flex items-center">
              <MapPin className="h-4 w-4 text-blue-600/80 dark:text-blue-300/70 shrink-0" />
              <span className="truncate text-sm font-medium">{l.selectWilaya}</span>
            </div>
          )}
          {mounted ? <Popover open={cityOpen} onOpenChange={setCityOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                disabled={!selectedWilaya}
                className="min-h-[48px] sm:min-h-[64px] flex-1 sm:flex-initial min-w-0 sm:max-w-[140px] px-3 sm:px-4 gap-1.5 sm:gap-2 rounded-none border-0 border-e border-blue-300/50 dark:border-blue-600/40 bg-transparent hover:bg-blue-100/60 dark:hover:bg-blue-800/40 font-normal transition-colors disabled:opacity-60 flex items-center"
              >
                <Building className="h-4 w-4 text-blue-600 dark:text-blue-300 shrink-0" />
                <span className="truncate text-sm font-medium text-foreground">
                  {!selectedWilaya ? l.selectWilayaFirst : selectedCity ? getCityName(selectedCity, language) : l.selectCity}
                </span>
                <ChevronDown className="h-4 w-4 opacity-50 shrink-0" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[280px] max-w-[calc(100vw-2rem)] p-0" align="end" side="bottom" avoidCollisions={false}>
              <Command className="rounded-lg" shouldFilter={true}>
                <CommandInput placeholder={l.searchCity} className="h-10 border-b" />
                <CommandList className="max-h-[260px]">
                  <CommandEmpty>{l.noResults}</CommandEmpty>
                  {selectedWilaya && (
                    <CommandGroup heading={`${l.cities} - ${getWilayaName(selectedWilaya, language)}`}>
                      <CommandItem
                        value="whole wilaya toute"
                        onSelect={() => { selectCity(null); setCityOpen(false) }}
                        className="gap-2"
                      >
                        <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span>{l.wholeWilaya}</span>
                        {!selectedCity && <Check className="h-4 w-4 ms-auto shrink-0" />}
                      </CommandItem>
                      {selectedWilaya.cities.map((city) => (
                        <CommandItem
                          key={city.id}
                          value={`${getCityName(city, 'fr')} ${getCityName(city, 'en')} ${getCityName(city, 'ar')}`}
                          onSelect={() => { selectCity(city); setCityOpen(false) }}
                          className="gap-2"
                        >
                          <Building className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className="truncate">{getCityName(city, language)}</span>
                          {selectedCity?.id === city.id && <Check className="h-4 w-4 ms-auto shrink-0" />}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )}
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover> : (
            <div className="min-h-[48px] sm:min-h-[64px] flex-1 sm:flex-initial min-w-0 sm:max-w-[140px] px-3 sm:px-4 gap-1.5 sm:gap-2 rounded-none border-e border-blue-300/50 dark:border-blue-600/40 flex items-center opacity-60">
              <Building className="h-4 w-4 text-blue-600/80 dark:text-blue-300/70 shrink-0" />
              <span className="truncate text-sm font-medium">{l.selectCity}</span>
            </div>
          )}

          <Button
            onClick={handleSearch}
            className="h-full min-h-[48px] sm:min-h-[64px] px-4 sm:px-5 shrink-0 gap-2 rounded-tl-none rounded-tr-2xl rounded-br-2xl rounded-bl-2xl sm:rounded-e-2xl font-medium flex-initial leading-none bg-gradient-to-br from-sky-600 via-blue-600 to-slate-700 dark:from-sky-700 dark:via-blue-700 dark:to-slate-800 hover:from-sky-500 hover:via-blue-500 hover:to-slate-600 dark:hover:from-sky-600 dark:hover:via-blue-600 dark:hover:to-slate-700 text-white shadow-lg shadow-sky-900/25 dark:shadow-slate-950/40 border border-sky-500/40 dark:border-sky-600/50"
          >
            <Search className="h-4 w-4 sm:me-2" />
            <span className="hidden sm:inline">{t('searchButton')}</span>
          </Button>
        </div>
      </div>

      {/* Suggestions dropdown - outside the overflow-hidden container */}
      {suggestionsOpen && hasSuggestions && (
        <div className="absolute top-full start-0 end-0 z-50 mt-1 rounded-lg border border-border bg-popover shadow-lg overflow-hidden">
          <Command className="rounded-lg border-0" shouldFilter={false}>
            <CommandList className="max-h-[320px] p-1">
              <CommandEmpty>{l.noResults}</CommandEmpty>
              {suggestions!.professionals && suggestions!.professionals.length > 0 && (
                <CommandGroup heading={l.searchProfessionals}>
                  {suggestions!.professionals.map((p) => {
                    const Icon = typeIcons[p.type] || Stethoscope
                    const name = language === 'ar' ? (p.nameAr || p.name) : (p.name || p.nameAr)
                    return (
                      <CommandItem
                        key={`pro-${p.id}`}
                        value={`${p.id}`}
                        onSelect={() => handleSelectSuggestion('professional', p.id)}
                        className="gap-2 cursor-pointer"
                      >
                        <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="truncate">{name || '—'}</span>
                        {p.wilaya && (
                            <Badge variant="secondary" className="ms-auto shrink-0 text-xs bg-blue-100 text-blue-700 border-blue-300/60 dark:bg-blue-900/50 dark:text-blue-200 dark:border-blue-700/50">
                            {p.wilaya}
                          </Badge>
                        )}
                      </CommandItem>
                    )
                  })}
                </CommandGroup>
              )}
              {suggestions!.specialties && suggestions!.specialties.length > 0 && (
                <CommandGroup heading={l.searchSpecialties}>
                  {suggestions!.specialties.map((s) => {
                    const label = language === 'ar' ? s.ar : language === 'fr' ? s.fr : s.en
                    return (
                      <CommandItem
                        key={`spec-${s.key}`}
                        value={s.key}
                        onSelect={() => handleSelectSuggestion('specialty', s.key)}
                        className="gap-2 cursor-pointer"
                      >
                        <Stethoscope className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span>{label}</span>
                      </CommandItem>
                    )
                  })}
                </CommandGroup>
              )}
              {suggestions!.wilayas && suggestions!.wilayas.length > 0 && (
                <CommandGroup heading={l.searchWilayas}>
                  {suggestions!.wilayas.map((w) => {
                    const label = language === 'ar' ? w.nameAr : language === 'fr' ? w.nameFr : w.nameEn
                    return (
                      <CommandItem
                        key={`wil-${w.code}`}
                        value={w.code}
                        onSelect={() => handleSelectSuggestion('wilaya', w.code)}
                        className="gap-2 cursor-pointer"
                      >
                        <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span>{label}</span>
                        {selectedWilaya?.code === w.code && <Check className="h-4 w-4 ms-auto text-primary" />}
                      </CommandItem>
                    )
                  })}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </div>
      )}
    </div>
  )
}
