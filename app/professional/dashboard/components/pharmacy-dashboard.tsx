'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { SignOutButton } from '@/components/sign-out-button'
import { 
  Pill, Bell, Settings, Package, CheckCircle, Clock,
  FileText, Users, DollarSign, Star, Truck, AlertCircle, Phone, MessageSquare
} from 'lucide-react'
import { createBrowserClient } from '@/lib/supabase/client'

interface DashboardProps {
  professional: any
  profile: any
  onSignOut: () => void
}

export default function PharmacyDashboard({ professional, profile, onSignOut }: DashboardProps) {
  const router = useRouter()
  const [stats, setStats] = useState({
    pendingPrescriptions: 0,
    readyForPickup: 0,
    dispensedToday: 0,
    totalRevenue: 0,
    rating: 0,
    reviewCount: 0,
  })
  const [prescriptions, setPrescriptions] = useState<any[]>([])
  const [selectedPrescription, setSelectedPrescription] = useState<any>(null)
  const [showDetailsDialog, setShowDetailsDialog] = useState(false)

  useEffect(() => {
    loadDashboardData()
  }, [professional?.id])

  const loadDashboardData = async () => {
    if (!professional?.id) return
    
    const supabase = createBrowserClient()
    
    // Load prescriptions sent to this pharmacy
    const { data: prescList } = await supabase
      .from('prescriptions')
      .select(`
        *,
        doctor:doctor_id(
          id,
          business_name,
          specialty,
          profiles(first_name, last_name)
        ),
        patient:patient_id(
          id,
          first_name,
          last_name,
          phone,
          chifa_number
        )
      `)
      .eq('pharmacy_id', professional.id)
      .order('created_at', { ascending: false })

    setPrescriptions(prescList || [])

    // Calculate stats - update to use new status flow
    const pending = prescList?.filter((p: any) => p.status === 'sent_to_pharmacy' || p.status === 'processing').length || 0
    const ready = prescList?.filter((p: any) => p.status === 'ready').length || 0
    const collected = prescList?.filter((p: any) => 
      p.status === 'collected' && 
      new Date(p.collected_at || p.updated_at).toDateString() === new Date().toDateString()
    ).length || 0

    setStats({
      pendingPrescriptions: pending,
      readyForPickup: ready,
      dispensedToday: collected,
      totalRevenue: 0,
      rating: profile?.average_rating || 0,
      reviewCount: profile?.total_reviews || 0,
    })
  }

  const handleMarkReady = async (prescriptionId: string) => {
    const supabase = createBrowserClient()
    
    const { error } = await supabase
      .from('prescriptions')
      .update({ status: 'ready', fulfilled_at: new Date().toISOString() })
      .eq('id', prescriptionId)

    if (!error) {
      // Get prescription details for notification
      const presc = prescriptions.find(p => p.id === prescriptionId)
      if (presc) {
        // Get patient's auth user ID for notification
        const { data: patientProfile } = await supabase
          .from('profiles')
          .select('auth_user_id')
          .eq('id', presc.patient_id)
          .single()

        if (patientProfile?.auth_user_id) {
          // Notify patient that medications are ready
          await supabase.from('notifications').insert({
            user_id: patientProfile.auth_user_id,
            type: 'prescription_ready',
            title: 'Medications Ready for Pickup',
            message: `Your medications from ${professional.business_name} are ready for pickup`,
            data: { 
              prescription_id: prescriptionId,
              pharmacy_name: professional.business_name,
              pharmacy_phone: professional.phone,
              pharmacy_address: `${professional.commune}, ${professional.wilaya}`,
            },
          })
        }
      }
      loadDashboardData()
    }
  }

  const handleMarkCollected = async (prescriptionId: string, confirmCashPayment: boolean = false) => {
    const supabase = createBrowserClient()
    
    const updateData: any = { 
      status: 'collected', 
      collected_at: new Date().toISOString() 
    }
    
    // If cash payment is being confirmed at pickup
    if (confirmCashPayment) {
      updateData.payment_status = 'paid_cash'
    }
    
    const { error } = await supabase
      .from('prescriptions')
      .update(updateData)
      .eq('id', prescriptionId)

    if (!error) {
      // Get prescription details for notification
      const presc = prescriptions.find(p => p.id === prescriptionId)
      if (presc) {
        const { data: patientProfile } = await supabase
          .from('profiles')
          .select('auth_user_id')
          .eq('id', presc.patient_id)
          .single()

        if (patientProfile?.auth_user_id) {
          await supabase.from('notifications').insert({
            user_id: patientProfile.auth_user_id,
            type: 'prescription_collected',
            title: 'Prescription Collected',
            message: `Your prescription has been collected from ${professional.business_name}`,
            data: { prescription_id: prescriptionId },
          })
        }
      }
      loadDashboardData()
      setShowDetailsDialog(false)
    }
  }

  const handleMarkDispensed = async (prescriptionId: string) => {
    const supabase = createBrowserClient()
    
    const { error } = await supabase
      .from('prescriptions')
      .update({ status: 'dispensed', dispensed_at: new Date().toISOString() })
      .eq('id', prescriptionId)

    if (!error) {
      // Get prescription details for notification
      const presc = prescriptions.find(p => p.id === prescriptionId)
      if (presc) {
        const { data: patientProfile } = await supabase
          .from('profiles')
          .select('auth_user_id')
          .eq('id', presc.patient_id)
          .single()

        if (patientProfile?.auth_user_id) {
          await supabase.from('notifications').insert({
            user_id: patientProfile.auth_user_id,
            type: 'prescription_dispensed',
            title: 'Prescription Dispensed',
            message: `Your prescription has been dispensed from ${professional.business_name}`,
            data: { prescription_id: prescriptionId },
          })
        }
      }
      loadDashboardData()
      setShowDetailsDialog(false)
    }
  }

  const viewPrescriptionDetails = (prescription: any) => {
    setSelectedPrescription(prescription)
    setShowDetailsDialog(true)
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="w-full px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-green-100 p-2 rounded-full">
                <Pill className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">{professional?.business_name}</h1>
                <p className="text-sm text-muted-foreground">Pharmacy Dashboard</p>
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
              Your account is pending admin approval. You will be able to accept prescriptions and serve patients once your account is verified.
            </AlertDescription>
          </Alert>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 px-0">
          <Card className="rounded-none sm:rounded-xl border-yellow-200 bg-yellow-50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Prescriptions</CardTitle>
              <Clock className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-700">{stats.pendingPrescriptions}</div>
              <p className="text-xs text-yellow-600">
                Awaiting preparation
              </p>
            </CardContent>
          </Card>

          <Card className="rounded-none sm:rounded-xl border-blue-200 bg-blue-50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ready for Pickup</CardTitle>
              <Package className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-700">{stats.readyForPickup}</div>
              <p className="text-xs text-blue-600">
                Patients notified
              </p>
            </CardContent>
          </Card>

          <Card className="rounded-none sm:rounded-xl border-green-200 bg-green-50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Dispensed Today</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-700">{stats.dispensedToday}</div>
              <p className="text-xs text-green-600">
                Successfully completed
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

        {/* Main Content Tabs */}
        <Tabs defaultValue="pending" className="space-y-6">
          <TabsList>
            <TabsTrigger value="pending">
              Pending ({stats.pendingPrescriptions})
            </TabsTrigger>
            <TabsTrigger value="ready">
              Ready ({stats.readyForPickup})
            </TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
            <TabsTrigger value="inventory">Inventory</TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-4">
            <Card className="rounded-none sm:rounded-xl">
              <CardHeader>
                <CardTitle>Pending Prescriptions</CardTitle>
                <CardDescription>Prescriptions waiting to be prepared</CardDescription>
              </CardHeader>
              <CardContent>
                {prescriptions.filter(p => p.status === 'sent_to_pharmacy' || p.status === 'processing').length === 0 ? (
                  <div className="text-center py-8">
                    <Pill className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No pending prescriptions</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {prescriptions.filter(p => p.status === 'sent_to_pharmacy' || p.status === 'processing').map((presc) => (
                      <div key={presc.id} className="p-4 border rounded-lg">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <p className="font-medium">{presc.patient?.first_name} {presc.patient?.last_name}</p>
                            <p className="text-sm text-muted-foreground">
                              From: Dr. {presc.doctor?.profiles?.first_name} {presc.doctor?.profiles?.last_name} ({presc.doctor?.specialty})
                            </p>
                            {presc.payment_status === 'paid_online' && (
                              <Badge className="bg-green-100 text-green-700 text-xs">Paid Online</Badge>
                            )}
                            {presc.payment_status === 'unpaid' && (
                              <Badge variant="outline" className="text-amber-600 border-amber-300 text-xs">Cash on Pickup</Badge>
                            )}
                            <p className="text-xs text-muted-foreground">
                              {new Date(presc.created_at).toLocaleString()}
                            </p>
                          </div>
                          <Badge variant="secondary">Pending</Badge>
                        </div>
                        
                        {/* Only show limited info - privacy protection */}
                        <div className="bg-muted/50 p-3 rounded-lg mb-3">
                          <p className="text-sm font-medium mb-2">Medications ({presc.medications?.length || 0}):</p>
                          <ul className="text-sm space-y-1">
                            {presc.medications?.slice(0, 3).map((med: any, i: number) => (
                              <li key={i}>{med.name} - {med.dosage}</li>
                            ))}
                            {presc.medications?.length > 3 && (
                              <li className="text-muted-foreground">+{presc.medications.length - 3} more</li>
                            )}
                          </ul>
                        </div>

                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            onClick={() => viewPrescriptionDetails(presc)}
                          >
                            View Details
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleMarkReady(presc.id)}
                          >
                            <CheckCircle className="mr-1 h-3 w-3" />
                            Mark Ready
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ready" className="space-y-4">
            <Card className="rounded-none sm:rounded-xl">
              <CardHeader>
                <CardTitle>Ready for Pickup</CardTitle>
                <CardDescription>Patients have been notified</CardDescription>
              </CardHeader>
              <CardContent>
                {prescriptions.filter(p => p.status === 'ready').length === 0 ? (
                  <div className="text-center py-8">
                    <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No prescriptions ready for pickup</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {prescriptions.filter(p => p.status === 'ready').map((presc) => (
                      <div key={presc.id} className="p-4 border border-blue-200 bg-blue-50 rounded-lg">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <p className="font-medium">{presc.patient?.first_name} {presc.patient?.last_name}</p>
                            {presc.patient?.phone && (
                              <p className="text-sm text-muted-foreground flex items-center gap-1">
                                <Phone className="h-3 w-3" /> {presc.patient.phone}
                              </p>
                            )}
                            {presc.payment_status === 'paid_online' && (
                              <Badge className="bg-green-100 text-green-700 text-xs mt-1">Paid Online</Badge>
                            )}
                            {presc.payment_status === 'unpaid' && (
                              <Badge variant="outline" className="text-amber-600 border-amber-300 text-xs mt-1">Cash Payment Required</Badge>
                            )}
                          </div>
                          <Badge className="bg-blue-600">Ready</Badge>
                        </div>
                        
                        <div className="flex gap-2">
                          {presc.payment_status === 'unpaid' ? (
                            <Button 
                              size="sm"
                              onClick={() => handleMarkCollected(presc.id, true)}
                            >
                              <CheckCircle className="mr-1 h-3 w-3" />
                              Confirm Cash & Collect
                            </Button>
                          ) : (
                            <Button 
                              size="sm"
                              onClick={() => handleMarkCollected(presc.id, false)}
                            >
                              <CheckCircle className="mr-1 h-3 w-3" />
                              Mark Collected
                            </Button>
                          )}
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => viewPrescriptionDetails(presc)}
                          >
                            View Details
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="completed" className="space-y-4">
            <Card className="rounded-none sm:rounded-xl">
              <CardHeader>
                <CardTitle>Completed Prescriptions</CardTitle>
                <CardDescription>Successfully dispensed medications</CardDescription>
              </CardHeader>
              <CardContent>
                {prescriptions.filter(p => p.status === 'collected').length === 0 ? (
                  <div className="text-center py-8">
                    <CheckCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No completed prescriptions yet</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {prescriptions.filter(p => p.status === 'collected').map((presc) => (
                      <div key={presc.id} className="p-4 border rounded-lg">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium">{presc.patient?.full_name || 'Patient'}</p>
                            <p className="text-sm text-muted-foreground">
                              {presc.medications?.length || 0} medications
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Dispensed: {new Date(presc.updated_at).toLocaleString()}
                            </p>
                          </div>
                          <Badge variant="outline" className="text-green-600 border-green-600">
                            Dispensed
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="inventory" className="space-y-4">
            <Card className="rounded-none sm:rounded-xl">
              <CardHeader>
                <CardTitle>Inventory Management</CardTitle>
                <CardDescription>Manage your medication stock</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Inventory management coming soon</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Track stock levels, expiry dates, and reorder medications
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Prescription Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent size="xl" style={{width: '800px', height: '85vh'}}>
          <DialogHeader>
            <DialogTitle>Prescription Details</DialogTitle>
            <DialogDescription>
              Patient: {selectedPrescription?.patient?.full_name}
            </DialogDescription>
          </DialogHeader>
          
          {selectedPrescription && (
            <div className="space-y-4">
              {/* Privacy Notice */}
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  This information is confidential and only shown for dispensing purposes.
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium">Doctor</p>
                  <p className="text-sm text-muted-foreground">
                    Dr. {selectedPrescription.doctor?.clinic_name}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium">Chifa Number</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedPrescription.patient?.chifa_number || 'N/A'}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium mb-2">Diagnosis</p>
                <p className="text-sm bg-muted p-2 rounded">{selectedPrescription.diagnosis || 'Not specified'}</p>
              </div>

              <div>
                <p className="text-sm font-medium mb-2">Medications</p>
                <div className="space-y-2">
                  {selectedPrescription.medications?.map((med: any, i: number) => (
                    <div key={i} className="p-3 border rounded-lg">
                      <p className="font-medium">{med.name}</p>
                      <div className="grid grid-cols-2 gap-2 mt-1 text-sm text-muted-foreground">
                        <p>Dosage: {med.dosage}</p>
                        <p>Frequency: {med.frequency}</p>
                        <p>Duration: {med.duration}</p>
                        {med.instructions && <p className="col-span-2">Instructions: {med.instructions}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {selectedPrescription.notes && (
                <div>
                  <p className="text-sm font-medium mb-2">Notes</p>
                  <p className="text-sm bg-muted p-2 rounded">{selectedPrescription.notes}</p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetailsDialog(false)}>
              Close
            </Button>
            {selectedPrescription?.status === 'pending' && (
              <Button onClick={() => handleMarkReady(selectedPrescription.id)}>
                <CheckCircle className="mr-2 h-4 w-4" />
                Mark Ready & Notify Patient
              </Button>
            )}
            {selectedPrescription?.status === 'ready' && (
              <Button onClick={() => handleMarkDispensed(selectedPrescription.id)}>
                <CheckCircle className="mr-2 h-4 w-4" />
                Mark Dispensed
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
