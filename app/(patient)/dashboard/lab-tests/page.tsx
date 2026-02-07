'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase'
import { useLanguage } from '@/lib/i18n/language-context'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { FlaskConical, Calendar, Clock, Building2, FileText, AlertCircle, CheckCircle } from 'lucide-react'
import { LabTestWorkflow } from '@/components/lab-test-workflow'
import { format } from 'date-fns'
import { getStatusBadgeClassName } from '@/lib/status-colors'

const LAB_STATUS_LABELS: Record<string, { en: string; ar: string; fr: string }> = {
  created: { en: 'Created', ar: 'تم الإنشاء', fr: 'Créé' },
  sent_to_lab: { en: 'Sent to Lab', ar: 'أرسل للمختبر', fr: 'Envoyé au labo' },
  sample_collected: { en: 'Sample Collected', ar: 'تم جمع العينة', fr: 'Échantillon collecté' },
  processing: { en: 'Processing', ar: 'قيد المعالجة', fr: 'En cours' },
  fulfilled: { en: 'Results Received', ar: 'تم استلام النتائج', fr: 'Résultats reçus' },
}

const PAYMENT_STATUS_LABELS: Record<string, { en: string; ar: string; fr: string }> = {
  unpaid: { en: 'Unpaid', ar: 'غير مدفوع', fr: 'Non payé' },
  paid_online: { en: 'Paid Online', ar: 'مدفوع أونلاين', fr: 'Payé en ligne' },
  paid_cash: { en: 'Paid Cash', ar: 'مدفوع نقداً', fr: 'Payé en espèces' },
}

export default function PatientLabTestsPage() {
  const { language } = useLanguage()
  const router = useRouter()
  const [labRequests, setLabRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [patientId, setPatientId] = useState<string | null>(null)
  const [selectedLabRequest, setSelectedLabRequest] = useState<any>(null)
  const [showWorkflow, setShowWorkflow] = useState(false)

  useEffect(() => {
    loadLabRequests()
  }, [])

  const loadLabRequests = async () => {
    const supabase = createBrowserClient()
    
    // Get current user - user.id is the profile id
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setLoading(false)
      return
    }

    console.log('[v0] Loading lab tests for user:', user.id)
    setPatientId(user.id)

    // Load lab requests for this patient - simple query
    const { data: requests, error } = await supabase
      .from('lab_test_requests')
      .select('*')
      .eq('patient_id', user.id)
      .order('created_at', { ascending: false })

    console.log('[v0] Lab test requests:', requests, 'Error:', error)

    setLabRequests(requests || [])
    setLoading(false)
  }

  const getStatusLabel = (status: string) => {
    const labels = LAB_STATUS_LABELS[status] || LAB_STATUS_LABELS.created
    return language === 'ar' ? labels.ar : language === 'fr' ? labels.fr : labels.en
  }

  const getPaymentLabel = (status: string) => {
    const labels = PAYMENT_STATUS_LABELS[status] || PAYMENT_STATUS_LABELS.unpaid
    return language === 'ar' ? labels.ar : language === 'fr' ? labels.fr : labels.en
  }

  const activeRequests = labRequests.filter(r => 
    ['created', 'sent_to_lab', 'sample_collected', 'processing'].includes(r.status)
  )
  const completedRequests = labRequests.filter(r => r.status === 'fulfilled')

  const l = {
    title: language === 'ar' ? 'طلبات التحاليل' : language === 'fr' ? 'Demandes d\'analyses' : 'Lab Test Requests',
    description: language === 'ar' ? 'تتبع طلبات التحاليل المخبرية' : language === 'fr' ? 'Suivez vos demandes d\'analyses' : 'Track your lab test requests',
    active: language === 'ar' ? 'نشطة' : language === 'fr' ? 'Actives' : 'Active',
    completed: language === 'ar' ? 'مكتملة' : language === 'fr' ? 'Terminées' : 'Completed',
    noActive: language === 'ar' ? 'لا توجد طلبات تحاليل نشطة' : language === 'fr' ? 'Aucune demande active' : 'No active lab requests',
    noCompleted: language === 'ar' ? 'لا توجد تحاليل مكتملة' : language === 'fr' ? 'Aucune analyse terminée' : 'No completed tests',
    doctor: language === 'ar' ? 'الطبيب' : language === 'fr' ? 'Médecin' : 'Doctor',
    laboratory: language === 'ar' ? 'المختبر' : language === 'fr' ? 'Laboratoire' : 'Laboratory',
    tests: language === 'ar' ? 'التحاليل' : language === 'fr' ? 'Analyses' : 'Tests',
    viewResults: language === 'ar' ? 'عرض النتائج' : language === 'fr' ? 'Voir les résultats' : 'View Results',
    sendToLab: language === 'ar' ? 'أرسل للمختبر' : language === 'fr' ? 'Envoyer au labo' : 'Send to Lab',
    payment: language === 'ar' ? 'الدفع' : language === 'fr' ? 'Paiement' : 'Payment',
  }

  if (loading) {
    return (
      <div className="w-full py-4 sm:py-6 px-4 sm:px-6">
        <div className="space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
          <div className="grid gap-4 md:grid-cols-2">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-48" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full py-4 sm:py-6">
      <div className="mb-8 px-4 sm:px-6">
        <h1 className="text-3xl font-bold text-foreground">{l.title}</h1>
        <p className="text-muted-foreground mt-2">{l.description}</p>
      </div>

      <Tabs defaultValue="active" className="space-y-6 px-0">
        <TabsList>
          <TabsTrigger value="active" className="gap-2">
            <FlaskConical className="h-4 w-4" />
            {l.active} ({activeRequests.length})
          </TabsTrigger>
          <TabsTrigger value="completed" className="gap-2">
            <CheckCircle className="h-4 w-4" />
            {l.completed} ({completedRequests.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active">
          {activeRequests.length === 0 ? (
            <Card className="rounded-none sm:rounded-xl">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FlaskConical className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">{l.noActive}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {activeRequests.map((request) => {
                const apptId = request.appointment_id
                const href = apptId ? `/dashboard/appointments/${apptId}?labRequest=${request.id}` : `/dashboard/prescriptions?tab=labtests`
                return (
                <Card
                  key={request.id}
                  className="rounded-none sm:rounded-xl overflow-hidden cursor-pointer hover:border-primary/50 transition-colors"
                  role="button"
                  tabIndex={0}
                  onClick={() => router.push(href)}
                  onKeyDown={(e) => e.key === 'Enter' && router.push(href)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <FlaskConical className="h-5 w-5 text-primary dark:text-emerald-400" />
                          {l.tests}
                        </CardTitle>
                        <CardDescription className="mt-1">
                          {format(new Date(request.created_at), 'PPP')}
                        </CardDescription>
                      </div>
                      <div className="flex flex-col gap-1 items-end">
                        <Badge className={getStatusBadgeClassName(request.status, 'solid')}>
                          {getStatusLabel(request.status)}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {getPaymentLabel(request.payment_status)}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* Doctor Info */}
                    <div className="text-sm">
                      <span className="text-muted-foreground">{l.doctor}: </span>
                      <span className="font-medium">
                        Dr. {request.doctor?.profiles?.first_name} {request.doctor?.profiles?.last_name}
                      </span>
                      {request.doctor?.specialty && (
                        <span className="text-muted-foreground"> ({request.doctor.specialty})</span>
                      )}
                    </div>

                    {/* Laboratory Info */}
                    {request.laboratory && (
                      <div className="text-sm flex items-start gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                        <div>
                          <span className="font-medium">{request.laboratory.business_name}</span>
                          <p className="text-muted-foreground text-xs">
                            {request.laboratory.commune}, {request.laboratory.wilaya}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Test Types */}
                    {request.test_types && request.test_types.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {request.test_types.slice(0, 3).map((test: string, i: number) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {test}
                          </Badge>
                        ))}
                        {request.test_types.length > 3 && (
                          <Badge variant="secondary" className="text-xs">
                            +{request.test_types.length - 3}
                          </Badge>
                        )}
                      </div>
                    )}

                    {/* Actions - stopPropagation so card click doesn't trigger */}
                    {request.status === 'created' && (
                      <div onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
                        <Button 
                          size="sm" 
                          className="w-full mt-2"
                          onClick={() => {
                            setSelectedLabRequest(request)
                            setShowWorkflow(true)
                          }}
                        >
                          {l.sendToLab}
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )})}
            </div>
          )}
        </TabsContent>

        <TabsContent value="completed">
          {completedRequests.length === 0 ? (
            <Card className="rounded-none sm:rounded-xl">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <CheckCircle className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">{l.noCompleted}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {completedRequests.map((request) => {
                const apptId = request.appointment_id
                const href = apptId ? `/dashboard/appointments/${apptId}?labRequest=${request.id}` : `/dashboard/prescriptions?tab=labtests`
                return (
                <Card
                  key={request.id}
                  className="rounded-none sm:rounded-xl overflow-hidden cursor-pointer hover:border-primary/50 transition-colors"
                  role="button"
                  tabIndex={0}
                  onClick={() => router.push(href)}
                  onKeyDown={(e) => e.key === 'Enter' && router.push(href)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <CheckCircle className="h-5 w-5 text-green-500" />
                          {l.tests}
                        </CardTitle>
                        <CardDescription className="mt-1">
                          Completed {format(new Date(request.fulfilled_at || request.updated_at), 'PPP')}
                        </CardDescription>
                      </div>
                      <Badge className="bg-green-500">
                        {getStatusLabel(request.status)}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* Doctor Info */}
                    <div className="text-sm">
                      <span className="text-muted-foreground">{l.doctor}: </span>
                      <span className="font-medium">
                        Dr. {request.doctor?.profiles?.first_name} {request.doctor?.profiles?.last_name}
                      </span>
                    </div>

                    {/* Laboratory Info */}
                    {request.laboratory && (
                      <div className="text-sm">
                        <span className="text-muted-foreground">{l.laboratory}: </span>
                        <span className="font-medium">{request.laboratory.business_name}</span>
                      </div>
                    )}

                    {/* Test Types */}
                    {request.test_types && request.test_types.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {request.test_types.map((test: string, i: number) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {test}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {/* Card is clickable → goes to appointment detail with full lab workflow (including PDF download) */}

                    {request.result_notes && (
                      <div className="p-3 bg-muted rounded-lg text-sm">
                        <p className="font-medium mb-1">Lab Notes:</p>
                        <p className="text-muted-foreground">{request.result_notes}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )})}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Lab Test Workflow Dialog */}
      {selectedLabRequest && patientId && (
        <LabTestWorkflow
          labRequest={selectedLabRequest}
          userRole="patient"
          patientId={patientId}
          open={showWorkflow}
          onClose={() => {
            setShowWorkflow(false)
            setSelectedLabRequest(null)
          }}
          onUpdate={loadLabRequests}
        />
      )}
    </div>
  )
}
