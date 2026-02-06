'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { SignOutButton } from '@/components/sign-out-button'
import { 
  FlaskConical, Bell, Settings, Clock, CheckCircle, 
  FileText, Users, Star, AlertCircle, Upload, Send
} from 'lucide-react'
import { createBrowserClient } from '@/lib/supabase/client'

interface DashboardProps {
  professional: any
  profile: any
  onSignOut: () => void
}

export default function LaboratoryDashboard({ professional, profile, onSignOut }: DashboardProps) {
  const router = useRouter()
  const [stats, setStats] = useState({
    pendingRequests: 0,
    inProgress: 0,
    completedToday: 0,
    rating: 0,
    reviewCount: 0,
  })
  const [labRequests, setLabRequests] = useState<any[]>([])
  const [selectedRequest, setSelectedRequest] = useState<any>(null)
  const [showResultsDialog, setShowResultsDialog] = useState(false)
  const [resultForm, setResultForm] = useState({
    results: '',
    notes: '',
  })

  useEffect(() => {
    loadDashboardData()
  }, [professional?.id])

  const loadDashboardData = async () => {
    if (!professional?.id) return
    
    const supabase = createBrowserClient()
    
    // Load lab requests sent to this laboratory (doctor_id -> professionals, patient_id -> profiles)
    const { data: requests } = await supabase
      .from('lab_test_requests')
      .select(`
        *,
        doctor:professionals!doctor_id(
          id,
          business_name,
          specialty
        ),
        patient:profiles!patient_id(
          id,
          full_name,
          phone,
          date_of_birth,
          gender
        )
      `)
      .eq('laboratory_id', professional.id)
      .order('created_at', { ascending: false })

    setLabRequests(requests || [])

    // Calculate stats - use new status flow
    const pending = requests?.filter((r: any) => r.status === 'sent_to_lab').length || 0
    const inProgress = requests?.filter((r: any) => r.status === 'sample_collected' || r.status === 'processing').length || 0
    const completed = requests?.filter((r: any) => 
      r.status === 'fulfilled' && 
      new Date(r.fulfilled_at || r.updated_at).toDateString() === new Date().toDateString()
    ).length || 0

    setStats({
      pendingRequests: pending,
      inProgress: inProgress,
      completedToday: completed,
      rating: profile?.average_rating || 0,
      reviewCount: profile?.total_reviews || 0,
    })
  }

  const handleStartProcessing = async (requestId: string, confirmCashPayment: boolean = false) => {
    const supabase = createBrowserClient()
    
    const updateData: any = { 
      status: 'sample_collected',
    }
    
    // If patient is paying cash at the lab
    if (confirmCashPayment) {
      updateData.payment_status = 'paid_cash'
    }
    
    await supabase
      .from('lab_test_requests')
      .update(updateData)
      .eq('id', requestId)

    loadDashboardData()
  }
  
  const handleStartAnalysis = async (requestId: string) => {
    const supabase = createBrowserClient()
    
    await supabase
      .from('lab_test_requests')
      .update({ status: 'processing' })
      .eq('id', requestId)

    loadDashboardData()
  }

  const handleCompleteResults = async (pdfUrl?: string) => {
    if (!selectedRequest) return
    
    const supabase = createBrowserClient()
    const patientName = `${selectedRequest.patient?.first_name} ${selectedRequest.patient?.last_name}`
    
    // Update request status with result
    await supabase
      .from('lab_test_requests')
      .update({ 
        status: 'fulfilled',
        fulfilled_at: new Date().toISOString(),
        result_pdf_url: pdfUrl || null,
        result_notes: resultForm.notes || null,
      })
      .eq('id', selectedRequest.id)

    // Get doctor's auth user ID for notification
    if (selectedRequest.doctor?.id) {
      const { data: doctorProf } = await supabase
        .from('professionals')
        .select('auth_user_id')
        .eq('id', selectedRequest.doctor.id)
        .single()

      if (doctorProf?.auth_user_id) {
        await supabase.from('notifications').insert({
          user_id: doctorProf.auth_user_id,
          type: 'lab_results_ready',
          title: 'Lab Results Ready',
          message: `Lab results for ${patientName} are ready`,
          data: { request_id: selectedRequest.id },
        })
      }
    }

    // Get patient's auth user ID for notification
    if (selectedRequest.patient?.id) {
      const { data: patientProfile } = await supabase
        .from('profiles')
        .select('auth_user_id')
        .eq('id', selectedRequest.patient.id)
        .single()

      if (patientProfile?.auth_user_id) {
        await supabase.from('notifications').insert({
          user_id: patientProfile.auth_user_id,
          type: 'lab_results_ready',
          title: 'Lab Results Ready',
          message: `Your lab results from ${professional.business_name} are ready`,
          data: { request_id: selectedRequest.id },
        })
      }
    }

    setShowResultsDialog(false)
    setResultForm({ results: '', notes: '' })
    loadDashboardData()
  }

  const viewRequestDetails = (request: any) => {
    setSelectedRequest(request)
    setShowResultsDialog(true)
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'stat': return 'bg-red-100 text-red-700 border-red-200'
      case 'urgent': return 'bg-orange-100 text-orange-700 border-orange-200'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="w-full px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-purple-100 p-2 rounded-full">
                <FlaskConical className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">{professional?.business_name}</h1>
                <p className="text-sm text-muted-foreground">Laboratory Dashboard</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant={professional?.status === 'verified' ? 'default' : 'secondary'}>
                {professional?.status}
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
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 px-0">
          <Card className="rounded-none sm:rounded-xl border-yellow-200 bg-yellow-50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
              <Clock className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-700">{stats.pendingRequests}</div>
              <p className="text-xs text-yellow-600">
                Awaiting processing
              </p>
            </CardContent>
          </Card>

          <Card className="rounded-none sm:rounded-xl border-blue-200 bg-blue-50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">In Progress</CardTitle>
              <FlaskConical className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-700">{stats.inProgress}</div>
              <p className="text-xs text-blue-600">
                Being processed
              </p>
            </CardContent>
          </Card>

          <Card className="rounded-none sm:rounded-xl border-green-200 bg-green-50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed Today</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-700">{stats.completedToday}</div>
              <p className="text-xs text-green-600">
                Results delivered
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
              Pending ({stats.pendingRequests})
            </TabsTrigger>
            <TabsTrigger value="in-progress">
              In Progress ({stats.inProgress})
            </TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
            <TabsTrigger value="test-catalog">Test Catalog</TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-4">
            <Card className="rounded-none sm:rounded-xl">
              <CardHeader>
                <CardTitle>Pending Lab Requests</CardTitle>
                <CardDescription>New requests from doctors</CardDescription>
              </CardHeader>
              <CardContent>
                {labRequests.filter(r => r.status === 'sent_to_lab').length === 0 ? (
                  <div className="text-center py-8">
                    <FlaskConical className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No pending requests</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {labRequests.filter(r => r.status === 'sent_to_lab').map((req) => (
                      <div key={req.id} className={`p-4 border rounded-lg ${getPriorityColor(req.priority)}`}>
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{req.patient?.full_name || `${req.patient?.first_name || ''} ${req.patient?.last_name || ''}`.trim() || 'Patient'}</p>
                              {req.priority === 'stat' && (
                                <Badge variant="destructive">STAT</Badge>
                              )}
                              {req.priority === 'urgent' && (
                                <Badge className="bg-orange-500">Urgent</Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              From: Dr. {req.doctor?.business_name || `${req.doctor?.profiles?.first_name || ''} ${req.doctor?.profiles?.last_name || ''}`.trim() || 'Doctor'}
                            </p>
                            {req.payment_status === 'paid_online' && (
                              <Badge className="bg-green-100 text-green-700 text-xs">Paid Online</Badge>
                            )}
                            {req.payment_status === 'unpaid' && (
                              <Badge variant="outline" className="text-amber-600 border-amber-300 text-xs">Cash Payment Required</Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {new Date(req.created_at).toLocaleString()}
                          </p>
                        </div>
                        
                        <div className="bg-white/50 p-3 rounded-lg mb-3">
                          <p className="text-sm font-medium mb-1">Tests Requested:</p>
                          <ul className="text-sm space-y-1">
                            {req.items?.map((item: any, i: number) => (
                              <li key={i}>{item.test_type?.name || 'Unknown test'}</li>
                            ))}
                          </ul>
                        </div>

                        {req.clinical_notes && (
                          <p className="text-sm mb-3">
                            <span className="font-medium">Notes:</span> {req.clinical_notes}
                          </p>
                        )}

                        <div className="flex gap-2">
                          {req.payment_status === 'unpaid' ? (
                            <Button 
                              size="sm"
                              onClick={() => handleStartProcessing(req.id, true)}
                            >
                              <FlaskConical className="mr-1 h-3 w-3" />
                              Confirm Cash & Start
                            </Button>
                          ) : (
                            <Button 
                              size="sm"
                              onClick={() => handleStartProcessing(req.id, false)}
                            >
                              <FlaskConical className="mr-1 h-3 w-3" />
                              Start Processing
                            </Button>
                          )}
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => viewRequestDetails(req)}
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

          <TabsContent value="in-progress" className="space-y-4">
            <Card className="rounded-none sm:rounded-xl">
              <CardHeader>
                <CardTitle>Tests In Progress</CardTitle>
                <CardDescription>Currently being processed</CardDescription>
              </CardHeader>
              <CardContent>
                {labRequests.filter(r => r.status === 'sample_collected' || r.status === 'processing').length === 0 ? (
                  <div className="text-center py-8">
                    <FlaskConical className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No tests in progress</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {labRequests.filter(r => r.status === 'sample_collected' || r.status === 'processing').map((req) => (
                      <div key={req.id} className="p-4 border border-blue-200 bg-blue-50 rounded-lg">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <p className="font-medium">{req.patient?.full_name || `${req.patient?.first_name || ''} ${req.patient?.last_name || ''}`.trim() || 'Patient'}</p>
                            <p className="text-sm text-muted-foreground">
                              From: Dr. {req.doctor?.business_name || `${req.doctor?.profiles?.first_name || ''} ${req.doctor?.profiles?.last_name || ''}`.trim() || 'Doctor'}
                            </p>
                            <Badge className={req.status === 'processing' ? 'bg-purple-600' : 'bg-blue-600'}>
                              {req.status === 'processing' ? 'Analyzing' : 'Sample Collected'}
                            </Badge>
                          </div>
                          <div className="text-right">
                            {req.payment_status === 'paid_online' && (
                              <Badge className="bg-green-100 text-green-700 text-xs">Paid Online</Badge>
                            )}
                            {req.payment_status === 'paid_cash' && (
                              <Badge className="bg-green-100 text-green-700 text-xs">Paid Cash</Badge>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex gap-2">
                          {req.status === 'sample_collected' && (
                            <Button 
                              size="sm"
                              variant="outline"
                              onClick={() => handleStartAnalysis(req.id)}
                            >
                              <FlaskConical className="mr-1 h-3 w-3" />
                              Start Analysis
                            </Button>
                          )}
                          <Button 
                            size="sm"
                            onClick={() => viewRequestDetails(req)}
                          >
                            <Upload className="mr-1 h-3 w-3" />
                            Enter Results
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
                <CardTitle>Completed Tests</CardTitle>
                <CardDescription>Results delivered to doctors and patients</CardDescription>
              </CardHeader>
              <CardContent>
                {labRequests.filter(r => r.status === 'fulfilled').length === 0 ? (
                  <div className="text-center py-8">
                    <CheckCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No completed tests yet</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {labRequests.filter(r => r.status === 'fulfilled').map((req) => (
                      <div key={req.id} className="p-4 border rounded-lg">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium">{req.patient?.full_name || `${req.patient?.first_name || ''} ${req.patient?.last_name || ''}`.trim() || 'Patient'}</p>
                            <p className="text-sm text-muted-foreground">
                              From: Dr. {req.doctor?.business_name || `${req.doctor?.profiles?.first_name || ''} ${req.doctor?.profiles?.last_name || ''}`.trim() || 'Doctor'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Completed: {new Date(req.fulfilled_at || req.updated_at).toLocaleString()}
                            </p>
                            {req.result_pdf_url && (
                              <a href={req.result_pdf_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">
                                View PDF Results
                              </a>
                            )}
                          </div>
                          <Badge variant="outline" className="text-green-600 border-green-600">
                            Fulfilled
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="test-catalog" className="space-y-4">
            <Card className="rounded-none sm:rounded-xl">
              <CardHeader>
                <CardTitle>Test Catalog</CardTitle>
                <CardDescription>Manage available tests and pricing</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Test catalog management coming soon</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Configure available tests, pricing, and turnaround times
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          </Tabs>
      </div>

      {/* Results Entry Dialog */}
      <Dialog open={showResultsDialog} onOpenChange={setShowResultsDialog}>
        <DialogContent size="xl" style={{width: '800px', height: '85vh'}}>
          <DialogHeader>
            <DialogTitle>
              {(selectedRequest?.status === 'sample_collected' || selectedRequest?.status === 'processing') ? 'Enter Results' : 'Request Details'}
            </DialogTitle>
            <DialogDescription>
              Patient: {selectedRequest?.patient?.first_name} {selectedRequest?.patient?.last_name}
            </DialogDescription>
          </DialogHeader>
          
          {selectedRequest && (
            <div className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Patient information is confidential. Only view what's necessary for testing.
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium">Requesting Doctor</p>
                  <p className="text-sm text-muted-foreground">
                    Dr. {selectedRequest.doctor?.profiles?.first_name} {selectedRequest.doctor?.profiles?.last_name}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium">Priority</p>
                  <Badge className={getPriorityColor(selectedRequest.priority)}>
                    {selectedRequest.priority}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm font-medium">Payment Status</p>
                  <Badge className={
                    selectedRequest.payment_status === 'paid_online' ? 'bg-green-100 text-green-700' :
                    selectedRequest.payment_status === 'paid_cash' ? 'bg-green-100 text-green-700' :
                    'bg-amber-100 text-amber-700'
                  }>
                    {selectedRequest.payment_status === 'paid_online' ? 'Paid Online' :
                     selectedRequest.payment_status === 'paid_cash' ? 'Paid Cash' : 'Unpaid'}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm font-medium">Status</p>
                  <Badge>{selectedRequest.status.replace(/_/g, ' ')}</Badge>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium mb-2">Tests Requested</p>
                <div className="space-y-2">
                  {selectedRequest.test_types?.map((test: string, i: number) => (
                    <div key={i} className="p-3 border rounded-lg">
                      <p className="font-medium">{test}</p>
                    </div>
                  ))}
                </div>
              </div>

              {selectedRequest.diagnosis && (
                <div>
                  <p className="text-sm font-medium mb-2">Diagnosis</p>
                  <p className="text-sm bg-muted p-2 rounded">{selectedRequest.diagnosis}</p>
                </div>
              )}

              {selectedRequest.clinical_notes && (
                <div>
                  <p className="text-sm font-medium mb-2">Clinical Notes</p>
                  <p className="text-sm bg-muted p-2 rounded">{selectedRequest.clinical_notes}</p>
                </div>
              )}

              {(selectedRequest.status === 'sample_collected' || selectedRequest.status === 'processing') && (
                <>
                  <div className="space-y-2">
                    <Label>Results PDF URL (Optional)</Label>
                    <Input 
                      placeholder="https://example.com/results.pdf"
                      value={resultForm.results}
                      onChange={(e) => setResultForm({...resultForm, results: e.target.value})}
                    />
                    <p className="text-xs text-muted-foreground">Upload PDF to storage and paste link here</p>
                  </div>

                  <div className="space-y-2">
                    <Label>Lab Notes / Summary</Label>
                    <Textarea 
                      placeholder="Enter results summary or additional notes..."
                      rows={4}
                      value={resultForm.notes}
                      onChange={(e) => setResultForm({...resultForm, notes: e.target.value})}
                    />
                  </div>
                </>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResultsDialog(false)}>
              Close
            </Button>
            {(selectedRequest?.status === 'sample_collected' || selectedRequest?.status === 'processing') && (
              <Button onClick={() => handleCompleteResults(resultForm.results || undefined)}>
                <Send className="mr-2 h-4 w-4" />
                Complete & Send Results
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
