'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@/lib/supabase/client'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card } from '@/components/ui/card'
import { MapPin, Phone, Search, Navigation, Stethoscope, Building2 } from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/page-loading'
import { Badge } from '@/components/ui/badge'
import { useLocation } from '@/hooks/use-location'

interface ReferralSelectorProps {
  open: boolean
  onClose: () => void
  onSelect: (target: { id: string; type: string; business_name: string; specialization?: string; specialty?: string; wilaya?: string; commune?: string; phone?: string; email?: string }) => void
  patientId?: string
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

export default function ReferralSelector({ open, onClose, onSelect, patientId }: ReferralSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedWilaya, setSelectedWilaya] = useState('all')
  const [doctorsAndClinics, setDoctorsAndClinics] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const { isDetecting, detectedWilaya, detectLocation } = useLocation()

  useEffect(() => {
    if (open) {
      loadDoctorsAndClinics()
    }
  }, [open, selectedWilaya])

  const loadDoctorsAndClinics = async () => {
    setLoading(true)
    const supabase = createBrowserClient()

    let query = supabase
      .from('professionals')
      .select('id, type, business_name, business_name_ar, specialty, wilaya, commune, phone, email, is_active')
      .in('type', ['doctor', 'clinic'])
      .eq('is_active', true)
      .eq('is_verified', true)

    if (selectedWilaya !== 'all') {
      query = query.eq('wilaya', selectedWilaya)
    }

    const { data, error } = await query.order('business_name').limit(50)

    if (error) {
      console.error('Error loading doctors/clinics:', error.message || error.code || JSON.stringify(error))
      setDoctorsAndClinics([])
    } else {
      setDoctorsAndClinics(data || [])
    }
    setLoading(false)
  }

  const filtered = doctorsAndClinics.filter((p) => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    const specialty = p.specialty
    return (
      p.business_name?.toLowerCase().includes(q) ||
      specialty?.toLowerCase().includes(q) ||
      p.commune?.toLowerCase().includes(q) ||
      p.wilaya?.toLowerCase().includes(q)
    )
  })

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent size="xl" style={{width: '900px', height: '80vh'}}>
        <DialogHeader>
          <DialogTitle>Refer to Doctor or Clinic</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Search by name or specialty</Label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search doctors or clinics..."
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
                  {WILAYAS.map((w) => (
                    <SelectItem key={w} value={w}>
                      {w}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="text-sm font-medium mb-2 block">Doctors & Clinics</Label>
            <div className="space-y-2">
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No doctors or clinics found. Try adjusting your filters.
                </div>
              ) : (
                filtered.map((p) => (
                  <Card
                    key={p.id}
                    className="p-4 cursor-pointer hover:border-primary transition-colors"
                    onClick={() =>
                      onSelect({
                        id: p.id,
                        type: p.type,
                        business_name: p.business_name,
                        specialization: p.specialty,
                        specialty: p.specialty,
                        wilaya: p.wilaya,
                        commune: p.commune,
                        phone: p.phone,
                        email: p.email,
                      })
                    }
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-cyan-100 dark:bg-cyan-900 flex items-center justify-center">
                          {p.type === 'clinic' ? (
                            <Building2 className="h-5 w-5 text-cyan-600" />
                          ) : (
                            <Stethoscope className="h-5 w-5 text-cyan-600" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold">{p.business_name}</h3>
                            <Badge variant="secondary" className="capitalize">
                              {p.type}
                            </Badge>
                          </div>
                          {p.specialty && (
                            <p className="text-sm text-muted-foreground mt-0.5">{p.specialty}</p>
                          )}
                          <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                            {(p.wilaya || p.commune) && (
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {[p.wilaya, p.commune].filter(Boolean).join(', ')}
                              </span>
                            )}
                            {p.phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {p.phone}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <Button size="sm" variant="outline" className="flex-shrink-0">
                        Select
                      </Button>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
