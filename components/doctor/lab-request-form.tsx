'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  FlaskConical, Search, Send, Plus, Trash2, Star, TrendingUp,
  Clock, MapPin, CheckCircle, Building2
} from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/page-loading'
import { createBrowserClient } from '@/lib/supabase/client'

interface LabTestType {
  id: string
  code: string
  name: string
  name_ar?: string
  name_fr?: string
  category: string
  base_price: number
  is_chifa_covered: boolean
  chifa_reimbursement_rate: number
  order_count: number
}

interface Laboratory {
  id: string
  business_name: string
  address?: string
  city?: string
  phone?: string
  rating?: number
}

interface SelectedTest {
  test_type_id: string
  code: string
  name: string
  category: string
  price: number
  is_urgent: boolean
}

interface LabRequestFormProps {
  doctorId: string
  patientId?: string
  patientName?: string
  appointmentId?: string
  onComplete?: (requestId: string) => void
}

const TEST_CATEGORIES = [
  { value: 'all', label: 'All Tests' },
  { value: 'hematology', label: 'Hematology' },
  { value: 'biochemistry', label: 'Biochemistry' },
  { value: 'endocrinology', label: 'Thyroid/Hormones' },
  { value: 'vitamins', label: 'Vitamins & Minerals' },
  { value: 'urinalysis', label: 'Urinalysis' },
  { value: 'cardiology', label: 'Cardiac Markers' },
  { value: 'immunology', label: 'Immunology' },
  { value: 'serology', label: 'Serology' },
  { value: 'microbiology', label: 'Microbiology' }
]

// Popular test panels
const POPULAR_PANELS = [
  { name: 'Complete Blood Panel', tests: ['FBC', 'HGB', 'PLT', 'ESR'] },
  { name: 'Diabetes Screening', tests: ['GLU', 'HBA1C'] },
  { name: 'Lipid Profile', tests: ['CHOL', 'HDL', 'LDL', 'TG'] },
  { name: 'Liver Function', tests: ['AST', 'ALT', 'ALP', 'GGT', 'BIL'] },
  { name: 'Kidney Function', tests: ['CREA', 'UREA', 'UA'] },
  { name: 'Thyroid Panel', tests: ['TSH', 'T3', 'T4'] },
  { name: 'Iron Studies', tests: ['FER', 'FE'] },
  { name: 'Cardiac Markers', tests: ['TROP', 'CK', 'BNP'] },
  { name: 'Hepatitis Screening', tests: ['HBSAG', 'HCVAB'] },
  { name: 'General Checkup', tests: ['FBC', 'GLU', 'CHOL', 'CREA', 'AST', 'ALT'] }
]

export function LabRequestForm({
  doctorId,
  patientId,
  patientName,
  appointmentId,
  onComplete
}: LabRequestFormProps) {
  const [labTests, setLabTests] = useState<LabTestType[]>([])
  const [laboratories, setLaboratories] = useState<Laboratory[]>([])
  const [selectedTests, setSelectedTests] = useState<SelectedTest[]>([])
  const [selectedLab, setSelectedLab] = useState<string | null>('default') // Updated default value
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [clinicalNotes, setClinicalNotes] = useState('')
  const [diagnosis, setDiagnosis] = useState('')
  const [priority, setPriority] = useState<'normal' | 'urgent'>('normal')
  const [isChifaEligible, setIsChifaEligible] = useState(false)
  const [chifaNumber, setChifaNumber] = useState('')
  const [isSending, setIsSending] = useState(false)

  const supabase = createBrowserClient()

  // Load lab tests and laboratories
  useEffect(() => {
    async function loadData() {
      const [testsResult, labsResult] = await Promise.all([
        supabase.from('lab_test_types').select('*').order('order_count', { ascending: false }),
        supabase.from('professionals').select('id, business_name, address, city, phone').eq('type', 'laboratory').eq('status', 'active')
      ])

      if (testsResult.data) setLabTests(testsResult.data)
      if (labsResult.data) setLaboratories(labsResult.data)
    }
    loadData()
  }, [supabase])

  // Filter tests
  const filteredTests = labTests.filter(test => {
    const matchesSearch = searchQuery === '' || 
      test.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      test.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      test.name_ar?.includes(searchQuery) ||
      test.name_fr?.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesCategory = categoryFilter === 'all' || test.category === categoryFilter
    
    return matchesSearch && matchesCategory
  })

  // Popular tests (top 10 by order count)
  const popularTests = labTests.slice(0, 10)

  const addTest = (test: LabTestType) => {
    if (selectedTests.find(t => t.test_type_id === test.id)) return
    
    setSelectedTests([...selectedTests, {
      test_type_id: test.id,
      code: test.code,
      name: test.name,
      category: test.category,
      price: test.base_price,
      is_urgent: priority === 'urgent'
    }])
  }

  const removeTest = (testId: string) => {
    setSelectedTests(selectedTests.filter(t => t.test_type_id !== testId))
  }

  const applyPanel = (panel: typeof POPULAR_PANELS[0]) => {
    const panelTests = labTests.filter(t => panel.tests.includes(t.code))
    const newTests = panelTests.filter(t => !selectedTests.find(st => st.test_type_id === t.id))
    
    setSelectedTests([
      ...selectedTests,
      ...newTests.map(test => ({
        test_type_id: test.id,
        code: test.code,
        name: test.name,
        category: test.category,
        price: test.base_price,
        is_urgent: priority === 'urgent'
      }))
    ])
  }

  const totalPrice = selectedTests.reduce((sum, test) => sum + test.price, 0)

  const sendRequest = async () => {
    if (selectedTests.length === 0) return

    setIsSending(true)
    try {
      // Generate request number
      const requestNumber = `LT-${Date.now().toString(36).toUpperCase().slice(-6)}`

      // Create the lab request
      const { data: request, error: requestError } = await supabase
        .from('lab_test_requests')
        .insert({
          request_number: requestNumber,
          patient_id: patientId,
          doctor_id: doctorId,
          laboratory_id: selectedLab,
          appointment_id: appointmentId,
          status: selectedLab ? 'sent' : 'pending',
          priority,
          clinical_notes: clinicalNotes,
          diagnosis,
          is_chifa_eligible: isChifaEligible,
          chifa_number: isChifaEligible ? chifaNumber : null
        })
        .select()
        .single()

      if (requestError) throw requestError

      // Add individual test items
      const testItems = selectedTests.map(test => ({
        request_id: request.id,
        test_type_id: test.test_type_id,
        is_urgent: test.is_urgent,
        status: 'pending'
      }))

      const { error: itemsError } = await supabase
        .from('lab_test_items')
        .insert(testItems)

      if (itemsError) throw itemsError

      // Update test popularity
      const testIds = selectedTests.map(t => t.test_type_id)
      await supabase.rpc('increment_test_order_count', { test_ids: testIds })

      if (onComplete) {
        onComplete(request.id)
      }

      // Reset form
      setSelectedTests([])
      setClinicalNotes('')
      setDiagnosis('')

    } catch (error) {
      console.error('Failed to send lab request:', error)
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FlaskConical className="h-5 w-5" />
                Lab Test Request
              </CardTitle>
              {patientName && (
                <CardDescription>Patient: {patientName}</CardDescription>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-sm">Priority:</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as 'normal' | 'urgent')}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Test Selection */}
        <div className="lg:col-span-2 space-y-4">
          {/* Quick Panels */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Star className="h-4 w-4 text-yellow-500" />
                Quick Panels
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {POPULAR_PANELS.map(panel => (
                  <Button
                    key={panel.name}
                    variant="outline"
                    size="sm"
                    onClick={() => applyPanel(panel)}
                    className="bg-transparent"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    {panel.name}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Test Search */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Select Tests</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search tests (e.g., glucose, TSH, FBC)..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    {TEST_CATEGORIES.map(cat => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Tabs defaultValue="all">
                <TabsList>
                  <TabsTrigger value="all">All Tests</TabsTrigger>
                  <TabsTrigger value="popular">
                    <TrendingUp className="h-4 w-4 mr-1" />
                    Popular
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="all">
                  <ScrollArea className="h-[300px]">
                    <div className="space-y-1">
                      {filteredTests.map(test => (
                        <div
                          key={test.id}
                          className={`p-3 rounded-lg flex items-center justify-between hover:bg-muted cursor-pointer ${
                            selectedTests.find(t => t.test_type_id === test.id) ? 'bg-primary/10 border-primary' : ''
                          }`}
                          onClick={() => addTest(test)}
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-sm text-muted-foreground">{test.code}</span>
                              <span className="font-medium">{test.name}</span>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {test.name_ar && <span>{test.name_ar} • </span>}
                              <span className="capitalize">{test.category}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-medium">{test.base_price} DA</span>
                            {test.is_chifa_covered && (
                              <Badge variant="secondary" className="text-xs">
                                {test.chifa_reimbursement_rate}% CNAS
                              </Badge>
                            )}
                            {selectedTests.find(t => t.test_type_id === test.id) && (
                              <CheckCircle className="h-5 w-5 text-primary" />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="popular">
                  <ScrollArea className="h-[300px]">
                    <div className="space-y-1">
                      {popularTests.map(test => (
                        <div
                          key={test.id}
                          className={`p-3 rounded-lg flex items-center justify-between hover:bg-muted cursor-pointer ${
                            selectedTests.find(t => t.test_type_id === test.id) ? 'bg-primary/10' : ''
                          }`}
                          onClick={() => addTest(test)}
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-sm text-muted-foreground">{test.code}</span>
                              <span className="font-medium">{test.name}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <TrendingUp className="h-4 w-4 text-green-500" />
                            {selectedTests.find(t => t.test_type_id === test.id) && (
                              <CheckCircle className="h-5 w-5 text-primary" />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Clinical Notes */}
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="space-y-2">
                <Label>Diagnosis / Reason for Tests</Label>
                <Input
                  placeholder="e.g., Suspected diabetes, routine checkup"
                  value={diagnosis}
                  onChange={(e) => setDiagnosis(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Clinical Notes (optional)</Label>
                <Textarea
                  placeholder="Any relevant clinical information for the lab..."
                  value={clinicalNotes}
                  onChange={(e) => setClinicalNotes(e.target.value)}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Order Summary */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedTests.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  No tests selected
                </p>
              ) : (
                <ScrollArea className="h-[200px]">
                  <div className="space-y-2">
                    {selectedTests.map(test => (
                      <div key={test.test_type_id} className="flex items-center justify-between p-2 rounded bg-muted">
                        <div>
                          <span className="font-mono text-xs text-muted-foreground">{test.code}</span>
                          <div className="text-sm font-medium">{test.name}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{test.price} DA</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => removeTest(test.test_type_id)}
                          >
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}

              <Separator />

              <div className="flex justify-between font-medium">
                <span>Total ({selectedTests.length} tests)</span>
                <span>{totalPrice} DA</span>
              </div>
            </CardContent>
          </Card>

          {/* Chifa/CNAS Option */}
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="chifa"
                  checked={isChifaEligible}
                  onCheckedChange={(checked) => setIsChifaEligible(checked as boolean)}
                />
                <Label htmlFor="chifa">Patient has Chifa/CNAS coverage</Label>
              </div>
              
              {isChifaEligible && (
                <div className="space-y-2">
                  <Label>Chifa Number</Label>
                  <Input
                    placeholder="Enter Chifa number"
                    value={chifaNumber}
                    onChange={(e) => setChifaNumber(e.target.value)}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Select Laboratory */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Send to Laboratory
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {laboratories.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No laboratories available. Patient will choose a lab.
                </p>
              ) : (
                <Select value={selectedLab || 'default'} onValueChange={setSelectedLab}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a laboratory (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">Let patient choose</SelectItem>
                    {laboratories.map(lab => (
                      <SelectItem key={lab.id} value={lab.id}>
                        {lab.business_name}
                        {lab.city && ` - ${lab.city}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </CardContent>
          </Card>

          {/* Send Button */}
          <Button
            className="w-full"
            size="lg"
            onClick={sendRequest}
            disabled={isSending || selectedTests.length === 0}
          >
            {isSending ? (
              <>
                <LoadingSpinner size="sm" className="me-2" />
                Sending...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Send Lab Request
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
