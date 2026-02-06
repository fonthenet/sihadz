'use client'

import { useState, useEffect, useMemo } from 'react'
import { createBrowserClient } from '@/lib/supabase/client'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card } from '@/components/ui/card'
import { Star, MapPin, Phone, Search, Navigation, Clock, Mail, Pill, Heart } from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/page-loading'
import { Badge } from '@/components/ui/badge'
import { useLocation } from '@/hooks/use-location'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'

interface PharmacySelectorProps {
  open: boolean
  onClose: () => void
  onSelect: (pharmacy: any) => void
  patientId?: string
  /** Doctor's ID to load their recently used pharmacies */
  doctorId?: string
}

const WILAYAS = [
  'Adrar', 'Chlef', 'Laghouat', 'Oum El Bouaghi', 'Batna', 'Béjaïa', 'Biskra', 'Béchar',
  'Blida', 'Bouira', 'Tamanrasset', 'Tébessa', 'Tlemcen', 'Tiaret', 'Tizi Ouzou', 'Alger',
  'Djelfa', 'Jijel', 'Sétif', 'Saïda', 'Skikda', 'Sidi Bel Abbès', 'Annaba', 'Guelma',
  'Constantine', 'Médéa', 'Mostaganem', 'M\'Sila', 'Mascara', 'Ouargla', 'Oran',
  'El Bayadh', 'Illizi', 'Bordj Bou Arreridj', 'Boumerdès', 'El Tarf', 'Tindouf',
  'Tissemsilt', 'El Oued', 'Khenchela', 'Souk Ahras', 'Tipaza', 'Mila', 'Aïn Defla',
  'Naâma', 'Aïn Témouchent', 'Ghardaïa', 'Relizane'
]

export default function PharmacySelector({ open, onClose, onSelect, patientId, doctorId }: PharmacySelectorProps) {
  const supabase = createBrowserClient()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedWilaya, setSelectedWilaya] = useState('all')
  const [pharmacies, setPharmacies] = useState<any[]>([])
  const [favoritePharmacy, setFavoritePharmacy] = useState<any>(null)
  const [recentlyUsedIds, setRecentlyUsedIds] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  
  const { isDetecting, detectedWilaya, detectLocation } = useLocation()

  useEffect(() => {
    if (open) {
      loadPharmacies()
      if (patientId) {
        loadPatientFavorite()
      }
      if (doctorId) {
        loadRecentlyUsed()
      }
    }
  }, [open, selectedWilaya, patientId, doctorId])

  const loadPatientFavorite = async () => {
    const { data: patient } = await supabase
      .from('profiles')
      .select('favorite_pharmacy_id, pharmacies:favorite_pharmacy_id(*)')
      .eq('id', patientId)
      .single()

    if (patient?.pharmacies) {
      setFavoritePharmacy(patient.pharmacies)
    }
  }

  const loadRecentlyUsed = async () => {
    if (!doctorId) return
    const { data } = await supabase
      .from('prescriptions')
      .select('pharmacy_id')
      .eq('doctor_id', doctorId)
      .not('pharmacy_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(50)
    
    if (data) {
      const uniqueIds: string[] = []
      data.forEach((p: any) => {
        if (p.pharmacy_id && !uniqueIds.includes(p.pharmacy_id)) {
          uniqueIds.push(p.pharmacy_id)
        }
      })
      setRecentlyUsedIds(uniqueIds.slice(0, 5))
    }
  }

  const loadPharmacies = async () => {
    setLoading(true)
    
    let query = supabase
      .from('professionals')
      .select('id, business_name, business_name_ar, phone, email, wilaya, commune, address_line1, is_active, rating, review_count, avatar_url, working_hours')
      .eq('type', 'pharmacy')
      .eq('is_active', true)
      .eq('is_verified', true)

    if (selectedWilaya !== 'all') {
      query = query.eq('wilaya', selectedWilaya)
    }

    const { data, error } = await query.limit(50)

    if (error) {
      console.error('[PharmacySelector] Error loading pharmacies:', error)
    } else {
      const mappedPharmacies = (data || []).map((p: any) => ({
        id: p.id,
        business_name: p.business_name,
        name: p.business_name,
        name_ar: p.business_name_ar,
        city: p.commune || p.wilaya,
        wilaya: p.wilaya,
        wilaya_code: p.wilaya,
        commune: p.commune,
        address: p.address_line1,
        phone: p.phone,
        email: p.email,
        is_active: p.is_active,
        rating: p.rating,
        review_count: p.review_count,
        avatar_url: p.avatar_url,
        working_hours: p.working_hours,
      }))
      setPharmacies(mappedPharmacies)
    }
    setLoading(false)
  }

  const sortedPharmacies = useMemo(() => {
    let filtered = pharmacies.filter(pharmacy => {
      if (!searchQuery) return true
      const searchLower = searchQuery.toLowerCase()
      return (
        pharmacy.name?.toLowerCase().includes(searchLower) ||
        pharmacy.city?.toLowerCase().includes(searchLower) ||
        pharmacy.address?.toLowerCase().includes(searchLower) ||
        pharmacy.commune?.toLowerCase().includes(searchLower)
      )
    })

    return filtered.sort((a, b) => {
      const aRecentIdx = recentlyUsedIds.indexOf(a.id)
      const bRecentIdx = recentlyUsedIds.indexOf(b.id)
      
      if (aRecentIdx !== -1 && bRecentIdx !== -1) {
        return aRecentIdx - bRecentIdx
      }
      if (aRecentIdx !== -1) return -1
      if (bRecentIdx !== -1) return 1
      return 0
    })
  }, [pharmacies, searchQuery, recentlyUsedIds])

  const recentlyUsedPharmacies = sortedPharmacies.filter(p => recentlyUsedIds.includes(p.id))
  const otherPharmacies = sortedPharmacies.filter(p => !recentlyUsedIds.includes(p.id))

  const renderPharmacyCard = (pharmacy: any, variant: 'favorite' | 'recent' | 'normal' = 'normal') => {
    const isFavorite = variant === 'favorite'
    const isRecent = variant === 'recent'
    
    return (
      <Card
        key={pharmacy.id}
        className={`p-4 cursor-pointer hover:border-primary transition-colors ${
          isFavorite ? 'border-2 border-rose-200 bg-rose-50/50 dark:border-rose-800 dark:bg-rose-950/50' : 
          isRecent ? 'border-2 border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/50' : ''
        }`}
        onClick={() => onSelect(pharmacy)}
      >
        <div className="flex items-start justify-between gap-3">
          <div className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${
            isFavorite ? 'bg-rose-100 dark:bg-rose-900/60' : isRecent ? 'bg-blue-100 dark:bg-blue-900/60' : 'bg-emerald-100 dark:bg-emerald-900/60'
          }`}>
            {pharmacy.avatar_url ? (
              <img src={pharmacy.avatar_url} alt="" className="w-12 h-12 rounded-lg object-cover" />
            ) : (
              <Pill className={`h-6 w-6 ${
                isFavorite ? 'text-rose-600 dark:text-rose-300' : isRecent ? 'text-blue-600 dark:text-blue-300' : 'text-emerald-600 dark:text-emerald-300'
              }`} />
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              {isFavorite && <Heart className="h-4 w-4 fill-rose-500 text-rose-500 dark:fill-rose-400 dark:text-rose-400 flex-shrink-0" />}
              {isRecent && <Clock className="h-4 w-4 text-blue-500 dark:text-blue-400 flex-shrink-0" />}
              <h3 className="font-semibold truncate">{pharmacy.name || pharmacy.business_name}</h3>
              {isFavorite && <Badge className="bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-900/60 dark:text-rose-200 dark:border-rose-800">Patient Favorite</Badge>}
              {isRecent && <Badge className="bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/60 dark:text-blue-200 dark:border-blue-800">Recently Used</Badge>}
            </div>
            
            <div className="flex items-center gap-1 text-sm text-muted-foreground mb-1">
              <MapPin className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">
                {[pharmacy.address, pharmacy.commune, pharmacy.wilaya].filter(Boolean).join(', ') || pharmacy.city}
              </span>
            </div>
            
            <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
              {pharmacy.phone && (
                <div className="flex items-center gap-1">
                  <Phone className="h-3 w-3 flex-shrink-0" />
                  <span>{pharmacy.phone}</span>
                </div>
              )}
              {pharmacy.email && (
                <div className="flex items-center gap-1">
                  <Mail className="h-3 w-3 flex-shrink-0" />
                  <span className="truncate max-w-[200px]">{pharmacy.email}</span>
                </div>
              )}
              {pharmacy.rating > 0 && (
                <div className="flex items-center gap-1">
                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                  <span>{pharmacy.rating.toFixed(1)}</span>
                  {pharmacy.review_count > 0 && (
                    <span className="text-xs">({pharmacy.review_count})</span>
                  )}
                </div>
              )}
            </div>
          </div>
          
          <Button size="sm" variant={isFavorite ? 'default' : 'outline'} className={isFavorite ? 'bg-rose-600 hover:bg-rose-700 dark:bg-rose-700 dark:hover:bg-rose-600' : ''}>
            Select
          </Button>
        </div>
      </Card>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent size="xl" style={{width: '900px', maxHeight: '85vh'}} className="flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pill className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            Select Pharmacy
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 flex-shrink-0">
          <div className="space-y-2">
            <Label>Search by name or location</Label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search pharmacies..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Filter by Wilaya</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={async () => {
                  await detectLocation()
                  if (detectedWilaya?.nameFr) {
                    setSelectedWilaya(detectedWilaya.nameFr)
                  }
                }}
                disabled={isDetecting}
                className="h-6 px-2 text-xs"
              >
                {isDetecting ? (
                  <>
                    <LoadingSpinner size="sm" className="me-1" />
                    Detecting...
                  </>
                ) : (
                  <>
                    <Navigation className="mr-1 h-3 w-3" />
                    Auto-detect
                  </>
                )}
              </Button>
            </div>
            <Select value={selectedWilaya} onValueChange={setSelectedWilaya}>
              <SelectTrigger>
                <SelectValue placeholder="All wilayas" />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                <SelectItem value="all">All wilayas</SelectItem>
                {WILAYAS.map((wilaya) => (
                  <SelectItem key={wilaya} value={wilaya}>
                    {wilaya}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Separator className="my-2" />

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-4">
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                <LoadingSpinner size="md" className="mx-auto mb-2" />
                Loading pharmacies...
              </div>
            ) : (
              <>
                {favoritePharmacy && (
                  <div>
                    <Label className="text-sm font-medium mb-2 block flex items-center gap-2">
                      <Heart className="h-4 w-4 text-rose-500 dark:text-rose-400" />
                      Patient's Favorite Pharmacy
                    </Label>
                    {renderPharmacyCard(favoritePharmacy, 'favorite')}
                  </div>
                )}

                {recentlyUsedPharmacies.length > 0 && (
                  <div>
                    <Label className="text-sm font-medium mb-2 block flex items-center gap-2">
                      <Clock className="h-4 w-4 text-blue-500 dark:text-blue-400" />
                      Recently Used
                    </Label>
                    <div className="space-y-2">
                      {recentlyUsedPharmacies.map((pharmacy) => renderPharmacyCard(pharmacy, 'recent'))}
                    </div>
                  </div>
                )}

                <div>
                  <Label className="text-sm font-medium mb-2 block">
                    {recentlyUsedPharmacies.length > 0 || favoritePharmacy ? 'Other Pharmacies' : 'Available Pharmacies'}
                    {otherPharmacies.length > 0 && <span className="text-muted-foreground ml-2">({otherPharmacies.length})</span>}
                  </Label>
                  {otherPharmacies.length === 0 && !favoritePharmacy && recentlyUsedPharmacies.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No pharmacies found. Try adjusting your filters.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {otherPharmacies.map((pharmacy) => renderPharmacyCard(pharmacy, 'normal'))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
