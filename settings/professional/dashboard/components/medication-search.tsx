'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Search, CheckCircle2, AlertCircle } from 'lucide-react'
import { createBrowserClient } from '@/lib/supabase/client'

interface MedicationSearchProps {
  open: boolean
  onClose: () => void
  onSelect: (medication: any) => void
}

export default function MedicationSearch({ open, onClose, onSelect }: MedicationSearchProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [medications, setMedications] = useState<any[]>([])
  const [filteredMedications, setFilteredMedications] = useState<any[]>([])
  const [filterChifa, setFilterChifa] = useState<boolean | null>(null)
  const [filterGeneric, setFilterGeneric] = useState<boolean | null>(null)

  useEffect(() => {
    if (open) {
      loadMedications()
    }
  }, [open])

  useEffect(() => {
    filterMedications()
  }, [searchQuery, filterChifa, filterGeneric, medications])

  const loadMedications = async () => {
    const supabase = createBrowserClient()
    const { data, error } = await supabase
      .from('medications')
      .select('*')
      .eq('is_available', true)
      .order('commercial_name')
      .limit(200)

    if (error) {
      console.error('[v0] Error loading medications:', error)
    }

    if (data) {
      console.log('[v0] Loaded medications:', data.length)
      setMedications(data)
    }
  }

  const filterMedications = () => {
    let filtered = medications

    if (filterChifa !== null) {
      filtered = filtered.filter((m) => m.is_chifa_listed === filterChifa)
    }

    if (filterGeneric !== null) {
      filtered = filtered.filter((m) => m.is_generic === filterGeneric)
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (m) =>
          m.commercial_name?.toLowerCase().includes(query) ||
          m.dci_name?.toLowerCase().includes(query) ||
          m.therapeutic_class?.toLowerCase().includes(query) ||
          m.commercial_name_ar?.includes(query)
      )
    }

    setFilteredMedications(filtered.slice(0, 50))
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Search Medications</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by commercial name, DCI, or therapeutic class..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Filters */}
          <div className="flex gap-2 flex-wrap">
            <Button
              size="sm"
              variant={filterChifa === null ? 'default' : 'outline'}
              onClick={() => setFilterChifa(null)}
            >
              All
            </Button>
            <Button
              size="sm"
              variant={filterChifa === true ? 'default' : 'outline'}
              onClick={() => setFilterChifa(true)}
            >
              Chifa Listed
            </Button>
            <Button
              size="sm"
              variant={filterChifa === false ? 'default' : 'outline'}
              onClick={() => setFilterChifa(false)}
            >
              Non-Chifa
            </Button>
            <div className="w-px bg-border" />
            <Button
              size="sm"
              variant={filterGeneric === true ? 'default' : 'outline'}
              onClick={() => setFilterGeneric(filterGeneric === true ? null : true)}
            >
              Generic Only
            </Button>
          </div>

          {/* Results */}
          <div className="flex-1 overflow-y-auto space-y-2">
            {filteredMedications.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No medications found matching your search
              </div>
            ) : (
              filteredMedications.map((medication) => (
                <Card
                  key={medication.id}
                  className="p-3 hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => {
                    onSelect(medication)
                    onClose()
                  }}
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold">{medication.commercial_name}</h3>
                          {medication.commercial_name_ar && (
                            <span className="text-sm text-muted-foreground">
                              ({medication.commercial_name_ar})
                            </span>
                          )}
                        </div>
                        {medication.dci_name && (
                          <div className="text-sm text-muted-foreground mt-1">
                            DCI: {medication.dci_name}
                            {medication.dci_name_ar && ` (${medication.dci_name_ar})`}
                          </div>
                        )}
                      </div>
                      <div className="text-right flex-shrink-0">
                        {medication.prix_public && (
                          <div className="font-semibold text-primary">
                            {medication.prix_public} DZD
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap text-xs">
                      {medication.form && <Badge variant="secondary">{medication.form}</Badge>}
                      {medication.dosage && <Badge variant="outline">{medication.dosage}</Badge>}
                      {medication.therapeutic_class && (
                        <Badge variant="outline">{medication.therapeutic_class}</Badge>
                      )}
                      {medication.is_chifa_listed && (
                        <Badge variant="default" className="gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          Chifa {medication.reimbursement_rate}%
                        </Badge>
                      )}
                      {medication.is_generic && (
                        <Badge variant="secondary">Generic</Badge>
                      )}
                      {medication.requires_prescription && (
                        <Badge variant="destructive" className="gap-1">
                          <AlertCircle className="h-3 w-3" />
                          Rx Required
                        </Badge>
                      )}
                    </div>

                    {medication.manufacturer && (
                      <div className="text-xs text-muted-foreground">
                        Manufacturer: {medication.manufacturer}
                        {medication.country_of_origin && ` - ${medication.country_of_origin}`}
                      </div>
                    )}
                  </div>
                </Card>
              ))
            )}
          </div>

          {filteredMedications.length >= 50 && (
            <div className="text-sm text-muted-foreground text-center pb-2">
              Showing first 50 results. Refine your search for more specific results.
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
