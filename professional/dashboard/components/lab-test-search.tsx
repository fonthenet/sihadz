'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Search, Clock, TestTube, AlertCircle } from 'lucide-react'
import { createBrowserClient } from '@/lib/supabase/client'

interface LabTestSearchProps {
  open: boolean
  onClose: () => void
  onSelectMultiple: (tests: any[]) => void
  selectedTests?: any[]
}

export default function LabTestSearch({ 
  open, 
  onClose, 
  onSelectMultiple,
  selectedTests = []
}: LabTestSearchProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [labTests, setLabTests] = useState<any[]>([])
  const [filteredTests, setFilteredTests] = useState<any[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [localSelected, setLocalSelected] = useState<any[]>(selectedTests)

  const categories = [
    'all',
    'Hematology',
    'Biochemistry',
    'Microbiology',
    'Urinalysis',
    'Radiology',
    'Cardiology',
  ]

  useEffect(() => {
    if (open) {
      loadLabTests()
      setLocalSelected(selectedTests)
    }
  }, [open, selectedTests])

  useEffect(() => {
    filterTests()
  }, [searchQuery, selectedCategory, labTests])

  const loadLabTests = async () => {
    const supabase = createBrowserClient()
    const { data, error } = await supabase
      .from('lab_tests_catalog')
      .select('*')
      .order('name')

    if (error) {
      console.error('[v0] Error loading lab tests:', error)
    }

    if (data) {
      console.log('[v0] Loaded lab tests:', data.length)
      setLabTests(data)
    }
  }

  const filterTests = () => {
    let filtered = labTests

    if (selectedCategory !== 'all') {
      filtered = filtered.filter((t) => t.category === selectedCategory)
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (t) =>
          t.name.toLowerCase().includes(query) ||
          t.name_ar?.includes(query) ||
          t.sample_type?.toLowerCase().includes(query)
      )
    }

    setFilteredTests(filtered)
  }

  const toggleTest = (test: any) => {
    const exists = localSelected.find((t) => t.id === test.id)
    if (exists) {
      setLocalSelected(localSelected.filter((t) => t.id !== test.id))
    } else {
      setLocalSelected([...localSelected, test])
    }
  }

  const handleDone = () => {
    onSelectMultiple(localSelected)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            Select Lab Tests {localSelected.length > 0 && `(${localSelected.length} selected)`}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search lab tests..."
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
            {filteredTests.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No lab tests found matching your search
              </div>
            ) : (
              filteredTests.map((test) => {
                const isSelected = localSelected.find((t) => t.id === test.id)
                return (
                  <Card
                    key={test.id}
                    className={`p-4 cursor-pointer transition-colors ${
                      isSelected ? 'bg-primary/10 border-primary' : 'hover:bg-muted/50'
                    }`}
                    onClick={() => toggleTest(test)}
                  >
                    <div className="flex items-start gap-3">
                      <Checkbox checked={!!isSelected} className="mt-1" />
                      <div className="flex-1 space-y-2">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold">{test.name}</h3>
                              {test.name_ar && (
                                <span className="text-sm text-muted-foreground">
                                  ({test.name_ar})
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="secondary">{test.category}</Badge>
                              {test.sample_type && (
                                <Badge variant="outline" className="gap-1">
                                  <TestTube className="h-3 w-3" />
                                  {test.sample_type}
                                </Badge>
                              )}
                              {test.typical_turnaround && (
                                <Badge variant="outline" className="gap-1">
                                  <Clock className="h-3 w-3" />
                                  {test.typical_turnaround}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>

                        {test.preparation_required && test.preparation_instructions && (
                          <div className="flex items-start gap-2 text-sm text-amber-700 bg-amber-50 p-2 rounded">
                            <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                            <div>
                              <span className="font-medium">Preparation Required:</span>{' '}
                              {test.preparation_instructions}
                            </div>
                          </div>
                        )}

                        {test.normal_ranges && (
                          <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                            <div className="font-medium mb-1">Normal Ranges:</div>
                            <div className="space-y-0.5">
                              {Object.entries(test.normal_ranges).map(([key, value]) => (
                                <div key={key}>
                                  {key}: {value as string}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                )
              })
            )}
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between border-t pt-4">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleDone} disabled={localSelected.length === 0}>
              Add {localSelected.length} Test{localSelected.length !== 1 ? 's' : ''}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
