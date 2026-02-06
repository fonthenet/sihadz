'use client'

import { useState, useEffect, useMemo } from 'react'
import { createBrowserClient } from '@/lib/supabase/client'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card } from '@/components/ui/card'
import { Star, MapPin, Phone, Search, Navigation, Clock, Mail, FlaskConical, Heart } from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/page-loading'
import { Badge } from '@/components/ui/badge'
import { useLocation } from '@/hooks/use-location'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'

interface LaboratorySelectorProps {
  open: boolean
  onClose: () => void
  onSelect: (laboratory: any) => void
  patientId?: string
  /** Doctor's ID to load their recently used laboratories */
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

export default function LaboratorySelector({ open, onClose, onSelect, patientId, doctorId }: LaboratorySelectorProps) {
  const supabase = createBrowserClient()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedWilaya, setSelectedWilaya] = useState('all')
  const [laboratories, setLaboratories] = useState<any[]>([])
  const [favoriteLaboratory, setFavoriteLaboratory] = useState<any>(null)
  const [recentlyUsedIds, setRecentlyUsedIds] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  const { isDetecting, detectedWilaya, detectLocation } = useLocation()

  useEffect(() => {
    if (open) {
      loadLaboratories()
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
      .select('favorite_laboratory_id, laboratory:favorite_laboratory_id(*)')
      .eq('id', patientId)
      .single()

    if (patient?.laboratory) {
      setFavoriteLaboratory(patient.laboratory)
    }
  }

  const loadRecentlyUsed = async () => {
    if (!doctorId) return
    const { data } = await supabase
      .from('lab_test_requests')
      .select('laboratory_id')
      .eq('doctor_id', doctorId)
      .not('laboratory_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(50)
    
    if (data) {
      const uniqueIds: string[] = []
      data.forEach((r: any) => {
        if (r.laboratory_id && !uniqueIds.includes(r.laboratory_id)) {
          uniqueIds.push(r.laboratory_id)
        }
      })
      setRecentlyUsedIds(uniqueIds.slice(0, 5))
    }
  }

  const loadLaboratories = async () => {
    setLoading(true)
    let query = supabase
      .from('professionals')
      .select('id, business_name, business_name_ar, phone, email, wilaya, commune, address_line1, is_active, rating, review_count, avatar_url, working_hours')
      .eq('type', 'laboratory')
      .eq('is_active', true)
      .eq('is_verified', true)

    if (selectedWilaya && selectedWilaya !== 'all') {
      query = query.eq('wilaya', selectedWilaya)
    }

    const { data, error } = await query.limit(50)

    if (error) {
      console.error('[LaboratorySelector] Error loading laboratories:', error)
    } else {
      setLaboratories(data || [])
    }
    setLoading(false)
  }

  const sortedLaboratories = useMemo(() => {
    let filtered = laboratories.filter(lab => {
      if (!searchQuery) return true
      const searchLower = searchQuery.toLowerCase()
      return (
        lab.business_name?.toLowerCase().includes(searchLower) ||
        lab.commune?.toLowerCase().includes(searchLower) ||
        lab.address_line1?.toLowerCase().includes(searchLower)
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
  }, [laboratories, searchQuery, recentlyUsedIds])

  const recentlyUsedLabs = sortedLaboratories.filter(l => recentlyUsedIds.includes(l.id))
  const otherLabs = sortedLaboratories.filter(l => !recentlyUsedIds.includes(l.id))

  const renderLabCard = (lab: any, variant: 'favorite' | 'recent' | 'normal' = 'normal') => {
    const isFavorite = variant === 'favorite'
    const isRecent = variant === 'recent'
    
    return (
      <Card
        key={lab.id}
        className={`p-4 cursor-pointer hover:border-primary transition-colors ${
          isFavorite ? 'border-2 border-rose-200 bg-rose-50/50 dark:border-rose-800 dark:bg-rose-950/50' : 
          isRecent ? 'border-2 border-violet-200 bg-violet-50/50 dark:border-violet-800 dark:bg-violet-950/50' : ''
        }`}
        onClick={() => onSelect(lab)}
      >
        <div className="flex items-start justify-between gap-3">
          <div className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${
            isFavorite ? 'bg-rose-100 dark:bg-rose-900/60' : 'bg-violet-100 dark:bg-violet-900/60'
          }`}>
            {lab.avatar_url ? (
              <img src={lab.avatar_url} alt="" className="w-12 h-12 rounded-lg object-cover" />
            ) : (
              <FlaskConical className={`h-6 w-6 ${
                isFavorite ? 'text-rose-600 dark:text-rose-300' : 'text-violet-600 dark:text-violet-300'
              }`} />
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              {isFavorite && <Heart className="h-4 w-4 fill-rose-500 text-rose-500 dark:fill-rose-400 dark:text-rose-400 flex-shrink-0" />}
              {isRecent && <Clock className="h-4 w-4 text-violet-500 dark:text-violet-400 flex-shrink-0" />}
              <h3 className="font-semibold truncate">{lab.business_name}</h3>
              {isFavorite && <Badge className="bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-900/60 dark:text-rose-200 dark:border-rose-800">Patient Favorite</Badge>}
              {isRecent && <Badge className="bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-900/60 dark:text-violet-200 dark:border-violet-800">Recently Used</Badge>}
            </div>
            
            <div className="flex items-center gap-1 text-sm text-muted-foreground mb-1">
              <MapPin className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">
                {[lab.address_line1, lab.commune, lab.wilaya].filter(Boolean).join(', ')}
              </span>
            </div>
            
            <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
              {lab.phone && (
                <div className="flex items-center gap-1">
                  <Phone className="h-3 w-3 flex-shrink-0" />
                  <span>{lab.phone}</span>
                </div>
              )}
              {lab.email && (
                <div className="flex items-center gap-1">
                  <Mail className="h-3 w-3 flex-shrink-0" />
                  <span className="truncate max-w-[200px]">{lab.email}</span>
                </div>
              )}
              {lab.rating > 0 && (
                <div className="flex items-center gap-1">
                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                  <span>{lab.rating.toFixed(1)}</span>
                  {lab.review_count > 0 && (
                    <span className="text-xs">({lab.review_count})</span>
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
            <FlaskConical className="h-5 w-5 text-violet-600 dark:text-violet-400" />
            Select Laboratory
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 flex-shrink-0">
          <div className="space-y-2">
            <Label>Search by name or location</Label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search laboratories..."
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
                Loading laboratories...
              </div>
            ) : (
              <>
                {favoriteLaboratory && (
                  <div>
                    <Label className="text-sm font-medium mb-2 block flex items-center gap-2">
                      <Heart className="h-4 w-4 text-rose-500 dark:text-rose-400" />
                      Patient's Favorite Laboratory
                    </Label>
                    {renderLabCard(favoriteLaboratory, 'favorite')}
                  </div>
                )}

                {recentlyUsedLabs.length > 0 && (
                  <div>
                    <Label className="text-sm font-medium mb-2 block flex items-center gap-2">
                      <Clock className="h-4 w-4 text-violet-500 dark:text-violet-400" />
                      Recently Used
                    </Label>
                    <div className="space-y-2">
                      {recentlyUsedLabs.map((lab) => renderLabCard(lab, 'recent'))}
                    </div>
                  </div>
                )}

                <div>
                  <Label className="text-sm font-medium mb-2 block">
                    {recentlyUsedLabs.length > 0 || favoriteLaboratory ? 'Other Laboratories' : 'Available Laboratories'}
                    {otherLabs.length > 0 && <span className="text-muted-foreground ml-2">({otherLabs.length})</span>}
                  </Label>
                  {otherLabs.length === 0 && !favoriteLaboratory && recentlyUsedLabs.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No laboratories found. Try adjusting your filters.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {otherLabs.map((lab) => renderLabCard(lab, 'normal'))}
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
