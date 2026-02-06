'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useToast } from '@/hooks/use-toast'
import {
  Search,
  Download,
  Package,
  Pill,
  ChevronLeft,
  ChevronRight,
  Check,
  Database,
  Filter,
  X,
  AlertCircle,
  ExternalLink,
  Edit
} from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/page-loading'
import { formatPrice } from '@/lib/inventory/calculations'

interface NationalMedication {
  id: string
  brand_name: string
  full_name: string
  dci: string
  therapeutic_class: string
  pharmacological_class: string
  category: string
  dosage_forms: string[]
  strengths: string[]
  conditioning: string
  manufacturer: string
  country_origin: string
  cnas_covered: boolean
  requires_prescription: boolean
  prescription_list: string
  reference_price_dzd: number
  public_price_dzd: number
  price_range: string
  pharmnet_link: string
  is_marketed: boolean
}

interface NationalImportProps {
  onImportComplete?: () => void
}

export default function NationalImport({ onImportComplete }: NationalImportProps) {
  const { toast } = useToast()
  const [medications, setMedications] = useState<NationalMedication[]>([])
  const [loading, setLoading] = useState(false)
  const [importing, setImporting] = useState(false)
  
  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  
  // Filters
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [therapeuticClass, setTherapeuticClass] = useState('')
  const [cnasOnly, setCnasOnly] = useState(false)
  const [showAll, setShowAll] = useState(false)
  
  // Pagination
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  
  // Filter options
  const [categories, setCategories] = useState<string[]>([])
  const [therapeuticClasses, setTherapeuticClasses] = useState<string[]>([])
  
  // Import settings
  const [defaultMargin, setDefaultMargin] = useState(20)

  // Detail/Edit dialog
  const [detailMedication, setDetailMedication] = useState<NationalMedication | null>(null)
  const [detailMargin, setDetailMargin] = useState(20)
  const [detailImporting, setDetailImporting] = useState(false)

  const fetchMedications = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        per_page: '20',
        ...(search && { search }),
        ...(category && { category }),
        ...(therapeuticClass && { therapeutic_class: therapeuticClass }),
        ...(cnasOnly && { cnas_only: 'true' }),
        ...(showAll && { marketed_only: 'false' })
      })

      const res = await fetch(`/api/pharmacy/inventory/import-from-national?${params}`)
      const data = await res.json()

      if (!res.ok) throw new Error(data.error)

      setMedications(data.data || [])
      setTotal(data.total || 0)
      setTotalPages(data.total_pages || 1)
      
      if (data.filters) {
        setCategories(data.filters.categories || [])
        setTherapeuticClasses(data.filters.therapeutic_classes || [])
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [page, search, category, therapeuticClass, cnasOnly, toast])

  useEffect(() => {
    fetchMedications()
  }, [fetchMedications])

  const handleSearch = () => {
    setPage(1)
    fetchMedications()
  }

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedIds(newSelected)
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === medications.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(medications.map(m => m.id)))
    }
  }

  const handleImport = async () => {
    if (selectedIds.size === 0) {
      toast({ title: 'Error', description: 'Please select medications to import', variant: 'destructive' })
      return
    }

    setImporting(true)
    try {
      const res = await fetch('/api/pharmacy/inventory/import-from-national', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          medication_ids: Array.from(selectedIds),
          default_margin: defaultMargin
        })
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      toast({
        title: 'Import Complete',
        description: `Imported ${data.imported} medications (${data.skipped} skipped)`
      })

      setSelectedIds(new Set())
      onImportComplete?.()
    } catch (err: any) {
      toast({ title: 'Import Failed', description: err.message, variant: 'destructive' })
    } finally {
      setImporting(false)
    }
  }

  const openDetailDialog = (med: NationalMedication) => {
    setDetailMedication(med)
    setDetailMargin(defaultMargin)
  }

  const handleDetailImport = async () => {
    if (!detailMedication) return
    setDetailImporting(true)
    try {
      const res = await fetch('/api/pharmacy/inventory/import-from-national', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          medication_ids: [detailMedication.id],
          default_margin: detailMargin
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast({
        title: 'Import Complete',
        description: data.imported > 0 ? `Imported ${detailMedication.brand_name}` : 'Already in your catalog'
      })
      setDetailMedication(null)
      onImportComplete?.()
    } catch (err: any) {
      toast({ title: 'Import Failed', description: (err as Error).message, variant: 'destructive' })
    } finally {
      setDetailImporting(false)
    }
  }

  const formatMedicationPrice = (med: NationalMedication) => {
    const price = med.public_price_dzd || med.reference_price_dzd
    return price ? `${price.toFixed(2)} DZD` : 'N/A'
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
              <Database className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <CardTitle className="text-lg">National Medications Database</CardTitle>
              <CardDescription>
                Import from Algeria's official medication database (5,100+ medications)
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-3">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, DCI, class, manufacturer — e.g. dol 500, paracétamol"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="pl-9"
                />
              </div>
            </div>

            <Select value={category || '_all_'} onValueChange={(v) => setCategory(v === '_all_' ? '' : v)}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_all_">All Categories</SelectItem>
                {categories.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={therapeuticClass || '_all_'} onValueChange={(v) => setTherapeuticClass(v === '_all_' ? '' : v)}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Therapeutic Class" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_all_">All Classes</SelectItem>
                {therapeuticClasses.map(cls => (
                  <SelectItem key={cls} value={cls}>{cls}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex items-center gap-2">
              <Checkbox
                id="cnas-only"
                checked={cnasOnly}
                onCheckedChange={(checked) => setCnasOnly(checked === true)}
              />
              <Label htmlFor="cnas-only" className="text-sm cursor-pointer">
                CNAS Only
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="show-all"
                checked={showAll}
                onCheckedChange={(checked) => setShowAll(checked === true)}
              />
              <Label htmlFor="show-all" className="text-sm cursor-pointer">
                Include discontinued
              </Label>
            </div>

            <Button onClick={handleSearch} variant="default">
              <Filter className="h-4 w-4 mr-1" />
              Filter
            </Button>

            {(search || category || therapeuticClass || cnasOnly) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearch('')
                  setCategory('')
                  setTherapeuticClass('')
                  setCnasOnly(false)
                  setShowAll(false)
                  setPage(1)
                }}
              >
                <X className="h-4 w-4 mr-1" />
                Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Import Settings & Actions */}
      {selectedIds.size > 0 && (
        <Card className="border-green-200 bg-green-50 dark:bg-green-950/20">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-4">
                <Badge variant="secondary" className="text-base px-3 py-1">
                  <Check className="h-4 w-4 mr-1" />
                  {selectedIds.size} selected
                </Badge>
                
                <div className="flex items-center gap-2">
                  <Label htmlFor="margin" className="text-sm">Default Margin:</Label>
                  <Input
                    id="margin"
                    type="number"
                    value={defaultMargin}
                    onChange={(e) => setDefaultMargin(parseInt(e.target.value) || 0)}
                    className="w-20 h-8"
                  />
                  <span className="text-sm text-muted-foreground">%</span>
                </div>
              </div>

              <Button onClick={handleImport} disabled={importing} className="bg-green-600 hover:bg-green-700">
                {importing ? (
                  <LoadingSpinner size="sm" className="mr-2" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                Import Selected
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results Table */}
      <Card>
        <CardContent className="p-0">
          <ScrollArea className="h-[500px]">
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10">
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={medications.length > 0 && selectedIds.size === medications.length}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Medication</TableHead>
                  <TableHead>DCI (Generic)</TableHead>
                  <TableHead>Form / Dosage</TableHead>
                  <TableHead>Manufacturer</TableHead>
                  <TableHead>CNAS</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <LoadingSpinner size="lg" className="mx-auto border-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ) : medications.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <Package className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-muted-foreground">No medications found</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  medications.map((med) => (
                    <TableRow 
                      key={med.id} 
                      className={`cursor-pointer hover:bg-muted/50 transition-colors ${selectedIds.has(med.id) ? 'bg-primary/5' : ''}`}
                      onClick={() => openDetailDialog(med)}
                    >
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedIds.has(med.id)}
                          onCheckedChange={() => toggleSelect(med.id)}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{med.brand_name}</div>
                        <div className="text-xs text-muted-foreground">{med.therapeutic_class}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{med.dci || 'N/A'}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {med.dosage_forms?.join(', ') || 'N/A'}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {med.strengths?.join(', ') || ''}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{med.manufacturer || 'N/A'}</div>
                        <div className="text-xs text-muted-foreground">{med.country_origin}</div>
                      </TableCell>
                      <TableCell>
                        {med.cnas_covered ? (
                          <Badge variant="default" className="bg-green-600">
                            <Check className="h-3 w-3 mr-1" />
                            CNAS
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground">
                            Non
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="font-medium">{formatMedicationPrice(med)}</div>
                        {med.requires_prescription && (
                          <Badge variant="outline" className="text-xs mt-1">
                            <Pill className="h-3 w-3 mr-1" />
                            Rx
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t">
          <p className="text-sm text-muted-foreground">
            Showing {medications.length} of {total.toLocaleString()} medications
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1 || loading}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages || loading}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Info */}
      <div className="flex items-start gap-2 text-sm text-muted-foreground">
        <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
        <p>
          Data sourced from PharmNet/DZ-Pharma-Data. CNAS coverage and prices are based on official Algerian nomenclature.
          Click a medication to view details and import with custom margin.
        </p>
      </div>

      {/* Detail / Edit Dialog */}
      <Dialog open={!!detailMedication} onOpenChange={(open) => !open && setDetailMedication(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5" />
              {detailMedication?.brand_name}
            </DialogTitle>
            <DialogDescription>
              View details and import with custom margin
            </DialogDescription>
          </DialogHeader>
          {detailMedication && (
            <div className="space-y-4">
              <div className="grid gap-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">DCI (Generic)</span>
                  <span className="font-medium">{detailMedication.dci || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Therapeutic class</span>
                  <span>{detailMedication.therapeutic_class || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Form / Dosage</span>
                  <span>
                    {detailMedication.dosage_forms?.join(', ') || 'N/A'}
                    {detailMedication.strengths?.length ? ` — ${detailMedication.strengths.join(', ')}` : ''}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Manufacturer</span>
                  <span>{detailMedication.manufacturer || 'N/A'} {detailMedication.country_origin && `(${detailMedication.country_origin})`}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Reference price</span>
                  <span className="font-medium">{formatMedicationPrice(detailMedication)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">CNAS</span>
                  {detailMedication.cnas_covered ? (
                    <Badge variant="default" className="bg-green-600">CNAS covered</Badge>
                  ) : (
                    <Badge variant="outline">Non</Badge>
                  )}
                </div>
                {detailMedication.pharmnet_link && (
                  <a
                    href={detailMedication.pharmnet_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-primary hover:underline text-sm"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    View on PharmNet
                  </a>
                )}
              </div>

              <div className="border-t pt-4 space-y-3">
                <Label htmlFor="detail-margin">Margin (%)</Label>
                <Input
                  id="detail-margin"
                  type="number"
                  min={0}
                  max={500}
                  value={detailMargin}
                  onChange={(e) => setDetailMargin(parseInt(e.target.value) || 0)}
                  className="w-24"
                />
                <p className="text-xs text-muted-foreground">
                  Selling price will be: {(() => {
                    const base = detailMedication.public_price_dzd || detailMedication.reference_price_dzd || 0
                    const selling = base * (1 + detailMargin / 100)
                    return `${selling.toFixed(2)} DZD`
                  })()}
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailMedication(null)}>
              Cancel
            </Button>
            <Button onClick={handleDetailImport} disabled={detailImporting}>
              {detailImporting ? (
                <LoadingSpinner size="sm" className="mr-2" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              Import
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
