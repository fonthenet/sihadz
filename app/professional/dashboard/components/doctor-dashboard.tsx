'use client'

import { AlertDescription } from "@/components/ui/alert"

import { Alert } from "@/components/ui/alert"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { SignOutButton } from '@/components/sign-out-button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { 
  Calendar, Users, DollarSign, Star, Clock, Bell, Settings,
  FileText, Pill, FlaskConical, Send, Plus, Search, CheckCircle, XCircle,
  Stethoscope, ClipboardList, MessageSquare, AlertCircle, Trash2, Banknote
} from 'lucide-react'
import { createBrowserClient } from '@/lib/supabase/client'
import PharmacySelector from './pharmacy-selector'
import LaboratorySelector from './laboratory-selector'
import DiagnosisSearch from './diagnosis-search'
import MedicationSearch from './medication-search'
import LabTestSearch from './lab-test-search'
import PrescriptionWorkflow from '@/components/prescription-workflow'
import LabTestWorkflow from '@/components/lab-test-workflow'

interface DashboardProps {
  professional: any
  profile: any
  onSignOut: () => void
}

export default function DoctorDashboard({ professional, profile, onSignOut }: DashboardProps) {
  const router = useRouter()
  const [stats, setStats] = useState({
    todayAppointments: 0,
    pendingAppointments: 0,
    totalPatients: 0,
    monthlyRevenue: 0,
    rating: 0,
    reviewCount: 0,
    pendingPrescriptions: 0,
    pendingLabRequests: 0,
  })
  const [appointments, setAppointments] = useState<any[]>([])
  const [prescriptions, setPrescriptions] = useState<any[]>([])
  const [labRequests, setLabRequests] = useState<any[]>([])
  const [showPrescriptionDialog, setShowPrescriptionDialog] = useState(false)
  const [showLabRequestDialog, setShowLabRequestDialog] = useState(false)
  const [showPharmacySelector, setShowPharmacySelector] = useState(false)
  const [showLaboratorySelector, setShowLaboratorySelector] = useState(false)
  const [showDiagnosisSearch, setShowDiagnosisSearch] = useState(false)
  const [showMedicationSearch, setShowMedicationSearch] = useState(false)
  const [showLabTestSearch, setShowLabTestSearch] = useState(false)
  const [selectedPatient, setSelectedPatient] = useState<any>(null)
  const [selectedPharmacy, setSelectedPharmacy] = useState<any>(null)
  const [selectedLaboratory, setSelectedLaboratory] = useState<any>(null)
  const [selectedPrescription, setSelectedPrescription] = useState<any>(null)
  const [selectedLabRequest, setSelectedLabRequest] = useState<any>(null)
  const [showPrescriptionWorkflow, setShowPrescriptionWorkflow] = useState(false)
  const [showLabWorkflow, setShowLabWorkflow] = useState(false)

  // Prescription form state
  const [prescriptionForm, setPrescriptionForm] = useState({
    diagnosis: '',
    medications: [{ name: '', dosage: '', frequency: '', duration: '', instructions: '' }],
    notes: '',
    pharmacyId: '',
  })

  // Lab request form state
  const [labRequestForm, setLabRequestForm] = useState({
    testTypes: [] as string[],
    clinicalNotes: '',
    diagnosis: '',
    priority: 'normal',
    laboratoryId: '',
  })

  useEffect(() => {
    loadDashboardData()
  }, [professional?.id])

  const loadDashboardData = async () => {
    if (!professional?.id) return
    
    const supabase = createBrowserClient()
    
    // SINGLE SOURCE OF TRUTH: Use professionals.id only
    const doctorId = professional.id
    
    // Load today's appointments - include both linked patient profiles and guest booking fields
    const today = new Date().toISOString().split('T')[0]
    const { data: appts, error: apptError } = await supabase
      .from('appointments')
      .select(`
        *,
        patient:profiles!appointments_patient_id_fkey(full_name, phone, email)
      `)
      .eq('doctor_id', doctorId)
      .gte('appointment_date', today)
      .order('appointment_date')
      .order('appointment_time')
      .limit(10)

    console.log('[v0] Appointments loaded:', appts, 'Error:', apptError)
    if (appts && appts.length > 0) {
      console.log('[v0] First appointment structure:', {
        patient: appts[0].patient,
        guest_name: appts[0].guest_name,
        patient_name: appts[0].patient_name,
        patient_email: appts[0].patient_email,
        all_keys: Object.keys(appts[0])
      })
    }

    if (apptError) {
      console.log('[v0] Appointments query error:', apptError.message)
    }
    setAppointments(appts || [])

    // Load recent prescriptions  
    const { data: prescList, error: prescError } = await supabase
      .from('prescriptions')
      .select('*, patient:profiles!prescriptions_patient_id_fkey(full_name, phone)')
      .eq('doctor_id', doctorId)
      .order('created_at', { ascending: false })
      .limit(10)

    console.log('[v0] Prescriptions loaded:', prescList, 'Error:', prescError)

    if (prescError) {
      console.log('[v0] Prescriptions query error:', prescError.message)
    }
    setPrescriptions(prescList || [])

    // Load recent lab requests via API (includes items, lab_fulfillment, proper joins)
    const labRes = await fetch('/api/lab-requests?role=doctor', { credentials: 'include' })
    const labJson = await labRes.json()
    const labList = labRes.ok && labJson?.labRequests ? labJson.labRequests : []
    setLabRequests(labList)

    // Calculate stats - pending lab = awaiting results (not fulfilled/completed/denied)
    const awaitingLabResults = labList.filter((l: any) =>
      !['fulfilled', 'completed', 'denied'].includes(l.status || '')
    ).length
    setStats({
      todayAppointments: appts?.length || 0,
      pendingAppointments: appts?.filter((a: any) => a.status === 'pending').length || 0,
      totalPatients: 0, // Would need to query unique patients
      monthlyRevenue: 0, // Would calculate from completed appointments
      rating: profile?.average_rating || 0,
      reviewCount: profile?.total_reviews || 0,
      pendingPrescriptions: prescList?.filter((p: any) => p.status === 'pending').length || 0,
      pendingLabRequests: awaitingLabResults,
    })
  }

  const handleCreatePrescription = async () => {
    if (!selectedPatient) return
    
    const supabase = createBrowserClient()
    
    const { data, error } = await supabase
      .from('prescriptions')
      .insert({
        doctor_id: professional.id,
        patient_id: selectedPatient.patient_id,
        appointment_id: selectedPatient.id, // Link to appointment
        diagnosis: prescriptionForm.diagnosis,
        medications: prescriptionForm.medications,
        notes: prescriptionForm.notes,
        pharmacy_id: null, // Don't set pharmacy yet - will be selected in workflow
        status: 'created', // New status - not yet sent
        payment_status: 'unpaid',
        valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      })
      .select()
      .single()
    
    if (!error && data) {
      // Create a prescription ticket linked to the appointment ticket
      const { data: appointmentTicket } = await supabase
        .from('healthcare_tickets')
        .select('id')
        .eq('appointment_id', selectedPatient.id)
        .single()

      if (appointmentTicket) {
        await fetch('/api/tickets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'prescription',
            patient_id: selectedPatient.patient_id,
            doctor_id: professional.id,
            parent_ticket_id: appointmentTicket.id,
            appointment_id: selectedPatient.id,
            metadata: {
              prescription_id: data.id,
              diagnosis: prescriptionForm.diagnosis,
              medications: prescriptionForm.medications,
              patient_name: selectedPatient.patient?.full_name || selectedPatient.guest_name || selectedPatient.patient_name
            },
            priority: 'normal'
          })
        })
      }

      // Close dialog and show workflow
      setShowPrescriptionDialog(false)
      setSelectedPrescription({
        ...data,
        patient: selectedPatient.profiles || { first_name: 'Patient', last_name: '' }
      })
      setShowPrescriptionWorkflow(true)

      setShowPrescriptionDialog(false)
      setPrescriptionForm({
        diagnosis: '',
        medications: [{ name: '', dosage: '', frequency: '', duration: '', instructions: '' }],
        notes: '',
        pharmacyId: '',
      })
      loadDashboardData()
    }
  }

  const handleCreateLabRequest = async () => {
    if (!selectedPatient) return
    
    const supabase = createBrowserClient()
    
    const requestNumber = `LT-${Date.now().toString(36).toUpperCase().slice(-6)}`
    
    const { data: request, error } = await supabase
      .from('lab_test_requests')
      .insert({
        doctor_id: professional.id,
        patient_id: selectedPatient.patient_id,
        appointment_id: selectedPatient.id, // Link to appointment
        laboratory_id: null, // Don't set lab yet - will be selected in workflow
        clinical_notes: labRequestForm.clinicalNotes,
        diagnosis: labRequestForm.diagnosis,
        priority: labRequestForm.priority,
        status: 'created', // New status - not yet sent
        payment_status: 'unpaid',
        test_types: labRequestForm.testTypes, // Store test names directly
        request_number: requestNumber,
      })
      .select()
      .single()
    
    if (!error && request) {
      // Create a lab request ticket linked to the appointment ticket
      const { data: appointmentTicket } = await supabase
        .from('healthcare_tickets')
        .select('id')
        .eq('appointment_id', selectedPatient.id)
        .single()

      if (appointmentTicket) {
        await fetch('/api/tickets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'lab_request',
            patient_id: selectedPatient.patient_id,
            doctor_id: professional.id,
            parent_ticket_id: appointmentTicket.id,
            appointment_id: selectedPatient.id,
            metadata: {
              lab_request_id: request.id,
              diagnosis: labRequestForm.diagnosis,
              tests: labRequestForm.tests,
              clinical_notes: labRequestForm.clinicalNotes,
              urgency: labRequestForm.urgency,
              patient_name: selectedPatient.patient?.full_name || selectedPatient.guest_name || selectedPatient.patient_name
            },
            priority: labRequestForm.urgency === 'urgent' ? 'high' : 'normal'
          })
        })
      }

      setShowLabRequestDialog(false)
      setSelectedLabRequest({
        ...request,
        patient: selectedPatient.profiles || { first_name: 'Patient', last_name: '' }
      })
      setShowLabWorkflow(true)
      
      setLabRequestForm({
        clinicalNotes: '',
        diagnosis: '',
        tests: [{ test_name: '', test_code: '', sample_type: '', instructions: '' }],
        urgency: 'routine'
      })
      loadDashboardData()
    }
  }

  const addMedication = () => {
    setPrescriptionForm({
      ...prescriptionForm,
      medications: [...prescriptionForm.medications, { name: '', dosage: '', frequency: '', duration: '', instructions: '' }],
    })
  }

  const updateMedication = (index: number, field: string, value: string) => {
    const updated = [...prescriptionForm.medications]
    updated[index] = { ...updated[index], [field]: value }
    setPrescriptionForm({ ...prescriptionForm, medications: updated })
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="w-full px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 p-2 rounded-full">
                <Stethoscope className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">{professional?.business_name}</h1>
                <p className="text-sm text-muted-foreground">Doctor Dashboard</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge 
                variant={professional?.status === 'verified' || professional?.status === 'approved' ? 'default' : 'secondary'}
                className={
                  professional?.status === 'waiting_approval' 
                    ? 'bg-orange-500 text-white hover:bg-orange-600' 
                    : ''
                }
              >
                {professional?.status === 'waiting_approval' ? 'Waiting Approval' : professional?.status}
              </Badge>
              <Button variant="ghost" size="icon">
                <Bell className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => router.push('/professional/dashboard/settings')}>
                <Settings className="h-5 w-5" />
              </Button>
              <SignOutButton variant="icon" onClick={onSignOut} label="Sign Out" />
            </div>
          </div>
        </div>
      </header>

      <div className="w-full py-8">
        {/* Waiting Approval Notice */}
        {professional?.status === 'waiting_approval' && (
          <Alert className="mb-6 mx-4 sm:mx-6 border-orange-200 bg-orange-50">
            <AlertCircle className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-800">
              Your account is pending admin approval. You will be able to accept appointments and see patients once your account is verified.
            </AlertDescription>
          </Alert>
        )}

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-3 mb-6 px-4 sm:px-6">
          <Button onClick={() => setShowPrescriptionDialog(true)}>
            <Pill className="mr-2 h-4 w-4" />
            New Prescription
          </Button>
          <Button variant="outline" onClick={() => setShowLabRequestDialog(true)}>
            <FlaskConical className="mr-2 h-4 w-4" />
            Lab Request
          </Button>
          <Button variant="outline" onClick={() => router.push('/professional/dashboard/tools')}>
            <FileText className="mr-2 h-4 w-4" />
            Medical Tools
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 px-0">
          <Card className="rounded-none sm:rounded-xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Today's Appointments</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.todayAppointments}</div>
              <p className="text-xs text-muted-foreground">
                {stats.pendingAppointments} pending confirmation
              </p>
            </CardContent>
          </Card>

          <Card className="rounded-none sm:rounded-xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Prescriptions</CardTitle>
              <Pill className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pendingPrescriptions}</div>
              <p className="text-xs text-muted-foreground">
                Awaiting pharmacy pickup
              </p>
            </CardContent>
          </Card>

          <Card className="rounded-none sm:rounded-xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Lab Requests</CardTitle>
              <FlaskConical className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pendingLabRequests}</div>
              <p className="text-xs text-muted-foreground">
                Awaiting results
              </p>
            </CardContent>
          </Card>

          <Card className="rounded-none sm:rounded-xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Rating</CardTitle>
              <Star className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.rating || 'N/A'}</div>
              <p className="text-xs text-muted-foreground">
                {stats.reviewCount} reviews
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Access to Ticket Hub */}
        <Card className="rounded-none sm:rounded-xl mb-6 border-primary/20 bg-gradient-to-r from-primary/5 to-indigo-500/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-primary/10">
                  <ClipboardList className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">Healthcare Ticket Hub</h3>
                  <p className="text-sm text-muted-foreground">Manage all tickets: appointments, prescriptions, lab requests, referrals</p>
                </div>
              </div>
              <Button onClick={() => router.push('/professional/dashboard/tickets')}>
                View All Tickets
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Main Content Tabs */}
        <Tabs defaultValue="appointments" className="space-y-6">
          <TabsList>
            <TabsTrigger value="appointments">Appointments</TabsTrigger>
            <TabsTrigger value="prescriptions">Prescriptions</TabsTrigger>
            <TabsTrigger value="lab-requests">Lab Requests</TabsTrigger>
          </TabsList>

          <TabsContent value="appointments" className="space-y-4">
            <Card className="rounded-none sm:rounded-xl">
              <CardHeader>
                <CardTitle>Today's Appointments</CardTitle>
                <CardDescription>Manage your appointments for today</CardDescription>
              </CardHeader>
              <CardContent>
                {appointments.length === 0 ? (
                  <div className="text-center py-8">
                    <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No appointments scheduled for today</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {appointments.map((appt) => (
                      <div 
                        key={appt.id} 
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted cursor-pointer transition-colors"
                        onClick={() => {
                          // Navigate to appointment details
                          window.location.href = `/professional/dashboard/appointments/${appt.id}`
                        }}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`p-2 rounded-full ${appt.status === 'confirmed' ? 'bg-green-100' : appt.status === 'cancelled' ? 'bg-red-100' : 'bg-yellow-100'}`}>
                            <Clock className={`h-5 w-5 ${appt.status === 'confirmed' ? 'text-green-600' : appt.status === 'cancelled' ? 'text-red-600' : 'text-yellow-600'}`} />
                          </div>
                          <div>
                            <p className="font-medium">{appt.patient?.full_name || appt.guest_name || appt.patient_name || 'Patient'}</p>
                            <p className="text-sm text-muted-foreground">{appt.appointment_time} - {appt.visit_type}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          <Badge 
                            variant="outline"
                            className={
                              appt.status === 'confirmed' 
                                ? 'bg-green-50 text-green-700 border-green-200' 
                                : appt.status === 'cancelled'
                                ? 'bg-red-50 text-red-700 border-red-200'
                                : ''
                            }
                          >
                            {appt.status}
                          </Badge>
                          <Button 
                            size="sm" 
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedPatient(appt)
                              setShowPrescriptionDialog(true)
                            }}
                          >
                            <Pill className="mr-1 h-3 w-3" />
                            Prescribe
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedPatient(appt)
                              setShowLabRequestDialog(true)
                            }}
                          >
                            <FlaskConical className="mr-1 h-3 w-3" />
                            Lab
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            className="text-green-600 border-green-300 hover:bg-green-50"
                            onClick={(e) => {
                              e.stopPropagation()
                              // Navigate to POS with this appointment pre-loaded
                              router.push(`/professional/dashboard?section=pos&appointment=${appt.id}`)
                            }}
                          >
                            <Banknote className="mr-1 h-3 w-3" />
                            Charge
                          </Button>
                          <Button 
                            size="sm" 
                            variant="destructive"
                            onClick={async (e) => {
                              e.stopPropagation()
                              if (confirm('Are you sure you want to delete this appointment?')) {
                                const supabase = createBrowserClient()
                                const { error } = await supabase
                                  .from('appointments')
                                  .delete()
                                  .eq('id', appt.id)
                                
                                if (!error) {
                                  setAppointments(appointments.filter(a => a.id !== appt.id))
                                } else {
                                  alert('Failed to delete appointment: ' + error.message)
                                }
                              }
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="prescriptions" className="space-y-4">
            <Card className="rounded-none sm:rounded-xl">
              <CardHeader>
                <CardTitle>Recent Prescriptions</CardTitle>
                <CardDescription>Prescriptions you've issued</CardDescription>
              </CardHeader>
              <CardContent>
                {prescriptions.length === 0 ? (
                  <div className="text-center py-8">
                    <Pill className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No prescriptions issued yet</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {prescriptions.map((presc) => (
                      <div key={presc.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <p className="font-medium">{presc.patient?.full_name || 'Patient'}</p>
                          <p className="text-sm text-muted-foreground">{presc.diagnosis}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(presc.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <Badge variant={presc.status === 'dispensed' ? 'default' : 'secondary'}>
                          {presc.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="lab-requests" className="space-y-4">
            <Card className="rounded-none sm:rounded-xl">
              <CardHeader>
                <CardTitle>Lab Test Requests</CardTitle>
                <CardDescription>Track lab requests and results</CardDescription>
              </CardHeader>
              <CardContent>
                {labRequests.length === 0 ? (
                  <div className="text-center py-8">
                    <FlaskConical className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No lab requests sent yet</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {labRequests.map((req) => (
                      <div key={req.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <p className="font-medium">{req.patient?.full_name || 'Patient'}</p>
                          <p className="text-sm text-muted-foreground">Request #{req.request_number}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(req.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={['completed', 'fulfilled'].includes(req.status || '') ? 'default' : 'secondary'}>
                            {['completed', 'fulfilled'].includes(req.status || '') ? 'Results Received' : (req.status || 'pending').replace(/_/g, ' ')}
                          </Badge>
                          {['completed', 'fulfilled'].includes(req.status || '') && (
                            <Button size="sm" variant="outline">View Results</Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Prescription Dialog */}
      <Dialog open={showPrescriptionDialog} onOpenChange={setShowPrescriptionDialog}>
        <DialogContent size="xl" style={{width: '800px', height: '85vh'}}>
          <DialogHeader>
            <DialogTitle>Create Prescription</DialogTitle>
            <DialogDescription>
              {selectedPatient ? `For ${selectedPatient.profiles?.full_name || 'Patient'}` : 'Select a patient first'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Diagnosis</Label>
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setShowDiagnosisSearch(true)}
                >
                  <Search className="mr-1 h-3 w-3" /> Search Illnesses
                </Button>
              </div>
              <Input 
                placeholder="Enter diagnosis"
                value={prescriptionForm.diagnosis}
                onChange={(e) => setPrescriptionForm({...prescriptionForm, diagnosis: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Medications</Label>
                <div className="flex gap-2">
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setShowMedicationSearch(true)}
                  >
                    <Search className="mr-1 h-3 w-3" /> Search Meds
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={addMedication}>
                    <Plus className="mr-1 h-3 w-3" /> Add Manually
                  </Button>
                </div>
              </div>
              
              {prescriptionForm.medications.map((med, index) => (
                <div key={index} className="p-4 border rounded-lg space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <Input 
                      placeholder="Medication name"
                      value={med.name}
                      onChange={(e) => updateMedication(index, 'name', e.target.value)}
                    />
                    <Input 
                      placeholder="Dosage (e.g., 500mg)"
                      value={med.dosage}
                      onChange={(e) => updateMedication(index, 'dosage', e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Input 
                      placeholder="Frequency (e.g., 3x daily)"
                      value={med.frequency}
                      onChange={(e) => updateMedication(index, 'frequency', e.target.value)}
                    />
                    <Input 
                      placeholder="Duration (e.g., 7 days)"
                      value={med.duration}
                      onChange={(e) => updateMedication(index, 'duration', e.target.value)}
                    />
                  </div>
                  <Input 
                    placeholder="Special instructions"
                    value={med.instructions}
                    onChange={(e) => updateMedication(index, 'instructions', e.target.value)}
                  />
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <Label>Additional Notes</Label>
              <Textarea 
                placeholder="Any additional notes for the patient or pharmacy"
                value={prescriptionForm.notes}
                onChange={(e) => setPrescriptionForm({...prescriptionForm, notes: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <Label>Send to Pharmacy (Optional)</Label>
              {selectedPharmacy ? (
                <Card className="p-3 bg-muted">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{selectedPharmacy.name || selectedPharmacy.business_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {selectedPharmacy.wilaya}, {selectedPharmacy.commune}
                      </p>
                    </div>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={() => {
                        setSelectedPharmacy(null)
                        setPrescriptionForm({...prescriptionForm, pharmacyId: ''})
                      }}
                    >
                      Change
                    </Button>
                  </div>
                </Card>
              ) : (
                <Button 
                  type="button" 
                  variant="outline" 
                  className="w-full bg-transparent"
                  onClick={() => setShowPharmacySelector(true)}
                >
                  <Search className="mr-2 h-4 w-4" />
                  Select Pharmacy
                </Button>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPrescriptionDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreatePrescription}>
              <Send className="mr-2 h-4 w-4" />
              Create Prescription
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Lab Request Dialog */}
      <Dialog open={showLabRequestDialog} onOpenChange={setShowLabRequestDialog}>
        <DialogContent size="lg" style={{width: '720px'}}>
          <DialogHeader>
            <DialogTitle>Create Lab Request</DialogTitle>
            <DialogDescription>
              {selectedPatient ? `For ${selectedPatient.profiles?.full_name || 'Patient'}` : 'Select a patient first'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Clinical Notes</Label>
              <Textarea 
                placeholder="Clinical notes for the laboratory"
                value={labRequestForm.clinicalNotes}
                onChange={(e) => setLabRequestForm({...labRequestForm, clinicalNotes: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Diagnosis</Label>
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setShowDiagnosisSearch(true)}
                >
                  <Search className="mr-1 h-3 w-3" /> Search Illnesses
                </Button>
              </div>
              <Input 
                placeholder="Suspected diagnosis"
                value={labRequestForm.diagnosis}
                onChange={(e) => setLabRequestForm({...labRequestForm, diagnosis: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Lab Tests Required</Label>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowLabTestSearch(true)}
                >
                  <Search className="mr-1 h-3 w-3" /> Search Tests
                </Button>
              </div>
              {labRequestForm.testTypes.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {labRequestForm.testTypes.map((test, idx) => (
                    <Badge key={idx} variant="secondary">
                      {test}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Priority</Label>
              <Select 
                value={labRequestForm.priority} 
                onValueChange={(v) => setLabRequestForm({...labRequestForm, priority: v})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="stat">STAT (Emergency)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Send to Laboratory (Optional)</Label>
              {selectedLaboratory ? (
                <Card className="p-3 bg-muted">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{selectedLaboratory.business_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {selectedLaboratory.wilaya}, {selectedLaboratory.commune}
                      </p>
                    </div>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={() => {
                        setSelectedLaboratory(null)
                        setLabRequestForm({...labRequestForm, laboratoryId: ''})
                      }}
                    >
                      Change
                    </Button>
                  </div>
                </Card>
              ) : (
                <Button 
                  type="button" 
                  variant="outline" 
                  className="w-full bg-transparent"
                  onClick={() => setShowLaboratorySelector(true)}
                >
                  <Search className="mr-2 h-4 w-4" />
                  Select Laboratory
                </Button>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLabRequestDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateLabRequest}>
              <Send className="mr-2 h-4 w-4" />
              Create Lab Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pharmacy Selector */}
      <PharmacySelector
        open={showPharmacySelector}
        onClose={() => setShowPharmacySelector(false)}
        onSelect={(pharmacy) => {
          setSelectedPharmacy(pharmacy)
          setPrescriptionForm({...prescriptionForm, pharmacyId: pharmacy.id})
          setShowPharmacySelector(false)
        }}
        patientId={selectedPatient?.patient_id}
        doctorId={professional?.id}
      />

      {/* Laboratory Selector */}
      <LaboratorySelector
        open={showLaboratorySelector}
        onClose={() => setShowLaboratorySelector(false)}
        onSelect={(laboratory) => {
          setSelectedLaboratory(laboratory)
          setLabRequestForm({...labRequestForm, laboratoryId: laboratory.id})
          setShowLaboratorySelector(false)
        }}
        patientId={selectedPatient?.patient_id}
        doctorId={professional?.id}
      />

      {/* Diagnosis Search */}
      <DiagnosisSearch
        open={showDiagnosisSearch}
        onClose={() => setShowDiagnosisSearch(false)}
        onSelect={(diagnosis) => {
          setPrescriptionForm({...prescriptionForm, diagnosis: diagnosis.name})
          setLabRequestForm({...labRequestForm, diagnosis: diagnosis.name})
        }}
      />

      {/* Medication Search */}
      <MedicationSearch
        open={showMedicationSearch}
        onClose={() => setShowMedicationSearch(false)}
        onSelect={(medication) => {
          const newMed = {
            name: medication.commercial_name,
            dosage: medication.dosage || '',
            frequency: '',
            duration: '',
            instructions: ''
          }
          setPrescriptionForm({
            ...prescriptionForm,
            medications: [...prescriptionForm.medications, newMed]
          })
        }}
      />

      {/* Lab Test Search */}
      <LabTestSearch
        open={showLabTestSearch}
        onClose={() => setShowLabTestSearch(false)}
        onSelectMultiple={(tests) => {
          setLabRequestForm({
            ...labRequestForm,
            testTypes: tests.map(t => t.name)
          })
        }}
        selectedTests={labRequestForm.testTypes.map(name => ({ id: name, name }))}
      />

      {/* Prescription Workflow - Send to Pharmacy */}
      {selectedPrescription && (
        <PrescriptionWorkflow
          prescription={selectedPrescription}
          open={showPrescriptionWorkflow}
          onClose={() => {
            setShowPrescriptionWorkflow(false)
            setSelectedPrescription(null)
            loadDashboardData()
          }}
          userRole="doctor"
        />
      )}

      {/* Lab Test Workflow - Send to Laboratory */}
      {selectedLabRequest && (
        <LabTestWorkflow
          labRequest={selectedLabRequest}
          open={showLabWorkflow}
          onClose={() => {
            setShowLabWorkflow(false)
            setSelectedLabRequest(null)
            loadDashboardData()
          }}
          userRole="doctor"
        />
      )}
    </div>
  )
}
