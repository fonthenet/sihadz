'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Search, FileText, TestTube, Pill } from 'lucide-react'
import { createBrowserClient } from '@/lib/supabase/client'

interface DiagnosisSearchProps {
  open: boolean
  onClose: () => void
  onSelect: (diagnosis: any) => void
}

export default function DiagnosisSearch({ open, onClose, onSelect }: DiagnosisSearchProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [diagnoses, setDiagnoses] = useState<any[]>([])
  const [filteredDiagnoses, setFilteredDiagnoses] = useState<any[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('all')

  const categories = [
    'all',
    'Respiratory',
    'Cardiovascular',
    'Gastrointestinal',
    'Endocrine',
    'Neurological',
    'Genitourinary',
    'Hematological',
  ]

  useEffect(() => {
    if (open) {
      loadDiagnoses()
    }
  }, [open])

  useEffect(() => {
    filterDiagnoses()
  }, [searchQuery, selectedCategory, diagnoses])

  const loadDiagnoses = async () => {
    const supabase = createBrowserClient()
    const { data, error } = await supabase
      .from('diagnoses')
      .select('*')
      .order('name')

    if (error) {
      console.error('[v0] Error loading diagnoses:', error)
    }

    if (data) {
      console.log('[v0] Loaded diagnoses:', data.length)
      setDiagnoses(data)
    }
  }

  const filterDiagnoses = () => {
    let filtered = diagnoses

    if (selectedCategory !== 'all') {
      filtered = filtered.filter((d) => d.category === selectedCategory)
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (d) =>
          d.name.toLowerCase().includes(query) ||
          d.name_ar?.includes(query) ||
          d.icd_code?.toLowerCase().includes(query) ||
          d.common_symptoms?.some((s: string) => s.toLowerCase().includes(query))
      )
    }

    setFilteredDiagnoses(filtered)
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Search Diagnoses & Illnesses</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, ICD code, or symptoms..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Category Filters */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            {categories.map((cat) => (
              <Button
                key={cat}
                size="sm"
                variant={selectedCategory === cat ? 'default' : 'outline'}
                onClick={() => setSelectedCategory(cat)}
                className="whitespace-nowrap"
              >
                {cat === 'all' ? 'All Categories' : cat}
              </Button>
            ))}
          </div>

          {/* Results */}
          <div className="flex-1 overflow-y-auto space-y-2">
            {filteredDiagnoses.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No diagnoses found matching your search
              </div>
            ) : (
              filteredDiagnoses.map((diagnosis) => (
                <Card
                  key={diagnosis.id}
                  className="p-4 hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => {
                    onSelect(diagnosis)
                    onClose()
                  }}
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{diagnosis.name}</h3>
                          {diagnosis.name_ar && (
                            <span className="text-sm text-muted-foreground">
                              ({diagnosis.name_ar})
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary">{diagnosis.category}</Badge>
                          {diagnosis.icd_code && (
                            <Badge variant="outline">ICD: {diagnosis.icd_code}</Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                      {diagnosis.common_symptoms && diagnosis.common_symptoms.length > 0 && (
                        <div>
                          <div className="flex items-center gap-1 font-medium mb-1">
                            <FileText className="h-3 w-3" />
                            <span>Common Symptoms:</span>
                          </div>
                          <div className="text-muted-foreground">
                            {diagnosis.common_symptoms.slice(0, 3).join(', ')}
                            {diagnosis.common_symptoms.length > 3 && '...'}
                          </div>
                        </div>
                      )}

                      {diagnosis.recommended_tests && diagnosis.recommended_tests.length > 0 && (
                        <div>
                          <div className="flex items-center gap-1 font-medium mb-1">
                            <TestTube className="h-3 w-3" />
                            <span>Recommended Tests:</span>
                          </div>
                          <div className="text-muted-foreground">
                            {diagnosis.recommended_tests.slice(0, 2).join(', ')}
                            {diagnosis.recommended_tests.length > 2 && '...'}
                          </div>
                        </div>
                      )}

                      {diagnosis.common_medications && diagnosis.common_medications.length > 0 && (
                        <div>
                          <div className="flex items-center gap-1 font-medium mb-1">
                            <Pill className="h-3 w-3" />
                            <span>Common Medications:</span>
                          </div>
                          <div className="text-muted-foreground">
                            {diagnosis.common_medications.slice(0, 2).join(', ')}
                            {diagnosis.common_medications.length > 2 && '...'}
                          </div>
                        </div>
                      )}
                    </div>

                    {diagnosis.notes && (
                      <div className="text-sm text-muted-foreground italic border-l-2 pl-2">
                        {diagnosis.notes}
                      </div>
                    )}
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
