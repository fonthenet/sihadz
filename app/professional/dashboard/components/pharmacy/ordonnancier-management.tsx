'use client'

import { useState, useEffect, useCallback } from 'react'
import { 
  Card, CardContent, CardHeader, CardTitle, CardDescription 
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter 
} from '@/components/ui/dialog'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/hooks/use-toast'
import { 
  Book, Plus, FileText, AlertTriangle, CheckCircle, Search,
  Calendar, User, Pill, ClipboardList, Download, RefreshCw
} from 'lucide-react'
import type { 
  OrdonnancierRegister, OrdonnancierEntry, OrdonnancierEntryInput,
  OrdonnancierReconciliation, ControlledTableau 
} from '@/lib/pharmacy/ordonnancier-types'

interface OrdonnancierManagementProps {
  professional?: any
}

export function OrdonnancierManagement({ professional }: OrdonnancierManagementProps) {
  const [registers, setRegisters] = useState<OrdonnancierRegister[]>([])
  const [entries, setEntries] = useState<OrdonnancierEntry[]>([])
  const [reconciliations, setReconciliations] = useState<OrdonnancierReconciliation[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('entries')
  const [selectedTableau, setSelectedTableau] = useState<ControlledTableau | 'all'>('all')
  const [selectedRegisterId, setSelectedRegisterId] = useState<string | null>(null)
  const [showEntryDialog, setShowEntryDialog] = useState(false)
  const [showReconciliationDialog, setShowReconciliationDialog] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  
  // Form state for new entry
  const [entryForm, setEntryForm] = useState<Partial<OrdonnancierEntryInput>>({
    tableau: 'A',
    quantity_dispensed: 1,
    unit: 'unités',
    patient_id_verified: false
  })

  // Fetch registers
  const fetchRegisters = useCallback(async () => {
    try {
      const res = await fetch('/api/pharmacy/ordonnancier?view=registers', {
        credentials: 'include',
        cache: 'no-store'
      })
      if (!res.ok) throw new Error('Failed to fetch registers')
      const data = await res.json()
      setRegisters(data.registers || [])
    } catch (error: any) {
      console.error('Error fetching registers:', error)
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    }
  }, [])

  // Fetch entries
  const fetchEntries = useCallback(async () => {
    try {
      let url = '/api/pharmacy/ordonnancier?view=entries'
      if (selectedTableau !== 'all') url += `&tableau=${selectedTableau}`
      if (selectedRegisterId) url += `&register_id=${selectedRegisterId}`
      
      const res = await fetch(url, {
        credentials: 'include',
        cache: 'no-store'
      })
      if (!res.ok) throw new Error('Failed to fetch entries')
      const data = await res.json()
      setEntries(data.entries || [])
    } catch (error: any) {
      console.error('Error fetching entries:', error)
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    }
  }, [selectedTableau, selectedRegisterId])

  // Fetch reconciliations
  const fetchReconciliations = useCallback(async () => {
    try {
      const res = await fetch('/api/pharmacy/ordonnancier?view=reconciliations', {
        credentials: 'include',
        cache: 'no-store'
      })
      if (!res.ok) throw new Error('Failed to fetch reconciliations')
      const data = await res.json()
      setReconciliations(data.reconciliations || [])
    } catch (error: any) {
      console.error('Error fetching reconciliations:', error)
    }
  }, [])

  // Initial load
  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      await Promise.all([fetchRegisters(), fetchEntries(), fetchReconciliations()])
      setLoading(false)
    }
    loadData()
  }, [fetchRegisters, fetchEntries, fetchReconciliations])

  // Reload entries when filters change
  useEffect(() => {
    if (!loading) {
      fetchEntries()
    }
  }, [selectedTableau, selectedRegisterId, fetchEntries, loading])

  // Create new entry
  const handleCreateEntry = async () => {
    if (!entryForm.product_name || !entryForm.patient_name || 
        !entryForm.prescriber_name || !entryForm.prescription_number || 
        !entryForm.prescription_date) {
      toast({ 
        title: 'Missing fields', 
        description: 'Please fill all required fields', 
        variant: 'destructive' 
      })
      return
    }

    try {
      const res = await fetch('/api/pharmacy/ordonnancier', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          action: 'create_entry',
          entry: entryForm
        })
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create entry')
      }

      toast({ title: 'Success', description: 'Entry recorded in ordonnancier' })
      setShowEntryDialog(false)
      setEntryForm({
        tableau: 'A',
        quantity_dispensed: 1,
        unit: 'unités',
        patient_id_verified: false
      })
      fetchEntries()
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    }
  }

  // Filter entries by search
  const filteredEntries = entries.filter(e => 
    !searchTerm || 
    e.patient_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.product_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.prescriber_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.prescription_number?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Stats
  const tableauStats = {
    A: entries.filter(e => e.tableau === 'A').length,
    B: entries.filter(e => e.tableau === 'B').length,
    C: entries.filter(e => e.tableau === 'C').length,
  }

  const tableauBadgeColor = (t: ControlledTableau) => {
    switch(t) {
      case 'A': return 'bg-red-600 text-white'
      case 'B': return 'bg-orange-600 text-white'
      case 'C': return 'bg-yellow-600 text-white'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Book className="h-6 w-6" />
            Ordonnancier des Stupéfiants
          </h2>
          <p className="text-muted-foreground">
            Registre officiel des substances contrôlées (Tableau A, B, C)
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { fetchEntries(); fetchRegisters() }}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualiser
          </Button>
          <Dialog open={showEntryDialog} onOpenChange={setShowEntryDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nouvelle Entrée
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Nouvelle Entrée Ordonnancier</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                {/* Tableau Selection */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Tableau *</Label>
                    <Select 
                      value={entryForm.tableau} 
                      onValueChange={(v) => setEntryForm(prev => ({ ...prev, tableau: v as ControlledTableau }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="A">
                          <span className="flex items-center gap-2">
                            <span className="w-4 h-4 rounded bg-red-600" />
                            Tableau A - Stupéfiants
                          </span>
                        </SelectItem>
                        <SelectItem value="B">
                          <span className="flex items-center gap-2">
                            <span className="w-4 h-4 rounded bg-orange-600" />
                            Tableau B - Psychotropes
                          </span>
                        </SelectItem>
                        <SelectItem value="C">
                          <span className="flex items-center gap-2">
                            <span className="w-4 h-4 rounded bg-yellow-600" />
                            Tableau C - Substances dangereuses
                          </span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Quantité délivrée *</Label>
                    <div className="flex gap-2">
                      <Input 
                        type="number" 
                        min={1}
                        value={entryForm.quantity_dispensed || 1}
                        onChange={(e) => setEntryForm(prev => ({ 
                          ...prev, 
                          quantity_dispensed: parseInt(e.target.value) || 1 
                        }))}
                        className="w-24"
                      />
                      <Select 
                        value={entryForm.unit || 'unités'}
                        onValueChange={(v) => setEntryForm(prev => ({ ...prev, unit: v }))}
                      >
                        <SelectTrigger className="flex-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="unités">Unités</SelectItem>
                          <SelectItem value="comprimés">Comprimés</SelectItem>
                          <SelectItem value="ampoules">Ampoules</SelectItem>
                          <SelectItem value="flacons">Flacons</SelectItem>
                          <SelectItem value="boîtes">Boîtes</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Product Info */}
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <Pill className="h-4 w-4" />
                    Médicament
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Nom du produit *</Label>
                      <Input 
                        placeholder="ex: MORPHINE 10mg"
                        value={entryForm.product_name || ''}
                        onChange={(e) => setEntryForm(prev => ({ ...prev, product_name: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label>DCI</Label>
                      <Input 
                        placeholder="ex: Morphine sulfate"
                        value={entryForm.product_dci || ''}
                        onChange={(e) => setEntryForm(prev => ({ ...prev, product_dci: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label>Dosage</Label>
                      <Input 
                        placeholder="ex: 10mg"
                        value={entryForm.dosage || ''}
                        onChange={(e) => setEntryForm(prev => ({ ...prev, dosage: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label>N° de lot</Label>
                      <Input 
                        placeholder="Numéro de lot"
                        value={entryForm.batch_number || ''}
                        onChange={(e) => setEntryForm(prev => ({ ...prev, batch_number: e.target.value }))}
                      />
                    </div>
                  </div>
                </div>

                {/* Patient Info */}
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Patient
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Nom complet *</Label>
                      <Input 
                        placeholder="Nom et prénom du patient"
                        value={entryForm.patient_name || ''}
                        onChange={(e) => setEntryForm(prev => ({ ...prev, patient_name: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label>Type de pièce</Label>
                      <Select 
                        value={entryForm.patient_id_type || ''}
                        onValueChange={(v) => setEntryForm(prev => ({ ...prev, patient_id_type: v }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="CIN">CIN (Carte nationale)</SelectItem>
                          <SelectItem value="passport">Passeport</SelectItem>
                          <SelectItem value="permis">Permis de conduire</SelectItem>
                          <SelectItem value="other">Autre</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>N° de pièce</Label>
                      <Input 
                        placeholder="Numéro de la pièce d'identité"
                        value={entryForm.patient_id_number || ''}
                        onChange={(e) => setEntryForm(prev => ({ ...prev, patient_id_number: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label>Téléphone</Label>
                      <Input 
                        placeholder="Numéro de téléphone"
                        value={entryForm.patient_phone || ''}
                        onChange={(e) => setEntryForm(prev => ({ ...prev, patient_phone: e.target.value }))}
                      />
                    </div>
                    <div className="col-span-2">
                      <Label>Adresse</Label>
                      <Input 
                        placeholder="Adresse du patient"
                        value={entryForm.patient_address || ''}
                        onChange={(e) => setEntryForm(prev => ({ ...prev, patient_address: e.target.value }))}
                      />
                    </div>
                  </div>
                </div>

                {/* Prescriber Info */}
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <ClipboardList className="h-4 w-4" />
                    Prescripteur
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Nom du médecin *</Label>
                      <Input 
                        placeholder="Dr. ..."
                        value={entryForm.prescriber_name || ''}
                        onChange={(e) => setEntryForm(prev => ({ ...prev, prescriber_name: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label>Spécialité</Label>
                      <Input 
                        placeholder="ex: Oncologie"
                        value={entryForm.prescriber_specialty || ''}
                        onChange={(e) => setEntryForm(prev => ({ ...prev, prescriber_specialty: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label>N° inscription Ordre</Label>
                      <Input 
                        placeholder="Numéro d'inscription"
                        value={entryForm.prescriber_order_number || ''}
                        onChange={(e) => setEntryForm(prev => ({ ...prev, prescriber_order_number: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label>Adresse cabinet</Label>
                      <Input 
                        placeholder="Adresse du prescripteur"
                        value={entryForm.prescriber_address || ''}
                        onChange={(e) => setEntryForm(prev => ({ ...prev, prescriber_address: e.target.value }))}
                      />
                    </div>
                  </div>
                </div>

                {/* Prescription Info */}
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Ordonnance
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>N° ordonnance *</Label>
                      <Input 
                        placeholder="Numéro de l'ordonnance"
                        value={entryForm.prescription_number || ''}
                        onChange={(e) => setEntryForm(prev => ({ ...prev, prescription_number: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label>Date ordonnance *</Label>
                      <Input 
                        type="date"
                        value={entryForm.prescription_date || ''}
                        onChange={(e) => setEntryForm(prev => ({ ...prev, prescription_date: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label>Durée traitement (jours)</Label>
                      <Input 
                        type="number"
                        placeholder="Nombre de jours"
                        value={entryForm.treatment_duration_days || ''}
                        onChange={(e) => setEntryForm(prev => ({ 
                          ...prev, 
                          treatment_duration_days: parseInt(e.target.value) || undefined 
                        }))}
                      />
                    </div>
                  </div>
                </div>

                {/* Notes */}
                <div className="border-t pt-4">
                  <Label>Notes</Label>
                  <Textarea 
                    placeholder="Observations ou remarques..."
                    value={entryForm.notes || ''}
                    onChange={(e) => setEntryForm(prev => ({ ...prev, notes: e.target.value }))}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowEntryDialog(false)}>
                  Annuler
                </Button>
                <Button onClick={handleCreateEntry}>
                  Enregistrer
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Tableau A</p>
                <p className="text-2xl font-bold">{tableauStats.A}</p>
                <p className="text-xs text-red-600">Stupéfiants</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Tableau B</p>
                <p className="text-2xl font-bold">{tableauStats.B}</p>
                <p className="text-xs text-orange-600">Psychotropes</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-orange-100 flex items-center justify-center">
                <Pill className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Tableau C</p>
                <p className="text-2xl font-bold">{tableauStats.C}</p>
                <p className="text-xs text-yellow-600">Substances dangereuses</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-yellow-100 flex items-center justify-center">
                <Pill className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Entrées</p>
                <p className="text-2xl font-bold">{entries.length}</p>
                <p className="text-xs text-muted-foreground">Ce registre</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                <Book className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Registre des Délivrances</CardTitle>
              <CardDescription>Historique des délivrances de substances contrôlées</CardDescription>
            </div>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Rechercher..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
              <Select 
                value={selectedTableau}
                onValueChange={(v) => setSelectedTableau(v as ControlledTableau | 'all')}
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les tableaux</SelectItem>
                  <SelectItem value="A">Tableau A</SelectItem>
                  <SelectItem value="B">Tableau B</SelectItem>
                  <SelectItem value="C">Tableau C</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredEntries.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Book className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Aucune entrée dans l'ordonnancier</p>
              <p className="text-sm">Cliquez sur "Nouvelle Entrée" pour commencer</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">N°</TableHead>
                  <TableHead className="w-20">Date</TableHead>
                  <TableHead className="w-24">Tableau</TableHead>
                  <TableHead>Médicament</TableHead>
                  <TableHead className="w-20">Qté</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Prescripteur</TableHead>
                  <TableHead>N° Ordonnance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEntries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="font-mono text-sm">
                      {entry.entry_number}
                    </TableCell>
                    <TableCell className="text-sm">
                      {new Date(entry.entry_date).toLocaleDateString('fr-FR')}
                    </TableCell>
                    <TableCell>
                      <Badge className={tableauBadgeColor(entry.tableau)}>
                        {entry.tableau}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{entry.product_name}</p>
                        {entry.dosage && (
                          <p className="text-xs text-muted-foreground">{entry.dosage}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono">
                      {entry.quantity_dispensed} {entry.unit}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{entry.patient_name}</p>
                        {entry.patient_id_number && (
                          <p className="text-xs text-muted-foreground">
                            {entry.patient_id_type}: {entry.patient_id_number}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p>{entry.prescriber_name}</p>
                        {entry.prescriber_specialty && (
                          <p className="text-xs text-muted-foreground">{entry.prescriber_specialty}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {entry.prescription_number}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
