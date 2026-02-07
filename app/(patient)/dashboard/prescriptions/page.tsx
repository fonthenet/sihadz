'use client'
/**
 * Stable system v2: Patient prescriptions list. Do not break. See docs/STABLE-SYSTEM-V2.md
 */

import React, { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { useLanguage } from '@/lib/i18n/language-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { 
  Pill, 
  Calendar,
  Clock,
  CheckCircle,
  AlertTriangle,
  Send,
  Package,
  TestTube,
  FileText,
} from 'lucide-react'
import { createBrowserClient } from '@/lib/supabase'
import { PrescriptionWorkflow } from '@/components/prescription-workflow'
import { LabTestWorkflow, LAB_TEST_STATUS } from '@/components/lab-test-workflow'
import { DashboardPageWrapper } from '@/components/dashboard/dashboard-page-wrapper'

// Status constants
const PRESCRIPTION_STATUS = {
  CREATED: 'created',
  SENT_TO_PHARMACY: 'sent_to_pharmacy',
  PROCESSING: 'processing',
  READY: 'ready',
  COLLECTED: 'collected',
}

export default function PrescriptionsPage() {
  const { language } = useLanguage()
  const searchParams = useSearchParams()
  const prescriptionParam = searchParams.get('prescription')
  const labRequestParam = searchParams.get('labRequest')
  const tabParam = searchParams.get('tab')
  const defaultTab = tabParam === 'labtests' ? 'labtests' : labRequestParam ? 'labtests' : (prescriptionParam ? 'prescriptions' : 'prescriptions')
  const [prescriptions, setPrescriptions] = useState<any[]>([])
  const [labRequests, setLabRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [profileId, setProfileId] = useState<string | null>(null)

  const l = {
    en: {
      title: 'My Prescriptions & Lab Tests',
      subtitle: 'View and manage your prescriptions and lab test requests',
      prescriptions: 'Prescriptions',
      labTests: 'Lab Tests',
      noPrescriptions: 'No prescriptions found',
      noLabTests: 'No lab test requests found',
      loading: 'Loading...',
    },
    ar: {
      title: 'وصفاتي الطبية والتحاليل',
      subtitle: 'عرض وإدارة وصفاتك الطبية وطلبات التحاليل',
      prescriptions: 'الوصفات الطبية',
      labTests: 'التحاليل المخبرية',
      noPrescriptions: 'لا توجد وصفات طبية',
      noLabTests: 'لا توجد طلبات تحاليل',
      loading: 'جاري التحميل...',
    },
    fr: {
      title: 'Mes Ordonnances & Analyses',
      subtitle: 'Consultez et gérez vos ordonnances et demandes d\'analyses',
      prescriptions: 'Ordonnances',
      labTests: 'Analyses',
      noPrescriptions: 'Aucune ordonnance trouvée',
      noLabTests: 'Aucune demande d\'analyse trouvée',
      loading: 'Chargement...',
    }
  }[language]

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    const supabase = createBrowserClient()
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setLoading(false)
      return
    }

    console.log('[v0] Loading prescriptions for user:', user.id)
    setProfileId(user.id)

    // Load prescriptions - simple query
    const { data: prescList, error: prescError } = await supabase
      .from('prescriptions')
      .select('*')
      .eq('patient_id', user.id)
      .order('created_at', { ascending: false })

    console.log('[v0] Prescriptions data:', prescList, 'Error:', prescError)

    if (prescList && prescList.length > 0) {
      const doctorIds = [...new Set(prescList.map(p => p.doctor_id).filter(Boolean))]
      const pharmacyIds = [...new Set(prescList.map(p => p.pharmacy_id).filter(Boolean))]
      
      const { data: doctorProfiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', doctorIds)
      
      const { data: pharmaciesData } = await supabase
        .from('pharmacies')
        .select('user_id, name')
        .in('user_id', pharmacyIds)
      
      const { data: professionalsData } = await supabase
        .from('professionals')
        .select('id, business_name, commune, wilaya')
        .in('id', pharmacyIds)
      
      const doctorProfilesMap = new Map((doctorProfiles || []).map(p => [p.id, p.full_name]))
      const pharmaciesMap = new Map((pharmaciesData || []).map(ph => [ph.user_id, ph.name]))
      const professionalsMap = new Map((professionalsData || []).map(pr => [pr.id, pr]))
      
      const enrichedPresc = prescList.map(p => ({
        ...p,
        doctor_name: doctorProfilesMap.get(p.doctor_id) || 'Doctor',
        pharmacy_name: pharmaciesMap.get(p.pharmacy_id) || professionalsMap.get(p.pharmacy_id)?.business_name || 'Pharmacy',
        pharmacy: p.pharmacy_id ? professionalsMap.get(p.pharmacy_id) : undefined
      }))
      
      console.log('[v0] Enriched prescriptions:', enrichedPresc)
      setPrescriptions(enrichedPresc)
    }

    // Load lab requests with items and lab_fulfillment for results display
    const { data: labList, error: labError } = await supabase
      .from('lab_test_requests')
      .select(`
        *,
        items:lab_test_items(
          id,
          result_value,
          result_unit,
          reference_range,
          result_status,
          lab_notes,
          test_type:lab_test_types(id, name, name_ar, category)
        )
      `)
      .eq('patient_id', user.id)
      .order('created_at', { ascending: false })
    
    console.log('[v0] Lab requests:', labList, 'Error:', labError)

    if (labList && labList.length > 0) {
      // Get doctor names
      const labDoctorIds = [...new Set(labList.map(l => l.doctor_id).filter(Boolean))]
      const labIds = [...new Set(labList.map(l => l.laboratory_id).filter(Boolean))]
      
      const { data: labDoctorProfiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', labDoctorIds)
      
      // Get lab names from professionals table
      const { data: laboratoriesData } = await supabase
        .from('professionals')
        .select('id, business_name')
        .in('id', labIds)
      
      const labDoctorMap = new Map((labDoctorProfiles || []).map(p => [p.id, p.full_name]))
      const laboratoriesMap = new Map((laboratoriesData || []).map(l => [l.id, l.business_name]))
      
      // Enrich lab requests with names
      const enrichedLabs = labList.map(l => ({
        ...l,
        doctor_name: labDoctorMap.get(l.doctor_id) || 'Doctor',
        laboratory_name: laboratoriesMap.get(l.laboratory_id) || 'Laboratory'
      }))
      
      console.log('[v0] Enriched lab requests:', enrichedLabs)
      setLabRequests(enrichedLabs)
    }
    
    setLoading(false)
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case PRESCRIPTION_STATUS.CREATED:
        return <Clock className="h-4 w-4 text-amber-500" />
      case PRESCRIPTION_STATUS.SENT_TO_PHARMACY:
        return <Send className="h-4 w-4 text-blue-500" />
      case PRESCRIPTION_STATUS.READY:
        return <Package className="h-4 w-4 text-green-500" />
      case PRESCRIPTION_STATUS.COLLECTED:
        return <CheckCircle className="h-4 w-4 text-green-600" />
      default:
        return <Pill className="h-4 w-4" />
    }
  }

  const getLabStatusIcon = (status: string) => {
    switch (status) {
      case LAB_TEST_STATUS.CREATED:
        return <Clock className="h-4 w-4 text-amber-500" />
      case LAB_TEST_STATUS.SENT_TO_LAB:
        return <Send className="h-4 w-4 text-blue-500" />
      case LAB_TEST_STATUS.PROCESSING:
        return <LoadingSpinner size="sm" className="text-purple-500" />
      case LAB_TEST_STATUS.FULFILLED:
        return <FileText className="h-4 w-4 text-green-600" />
      default:
        return <TestTube className="h-4 w-4" />
    }
  }

  if (loading) {
    return (
      <DashboardPageWrapper maxWidth="xl" showHeader={false}>
        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-80 max-w-full" />
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-64 rounded-xl" />
            ))}
          </div>
        </div>
      </DashboardPageWrapper>
    )
  }

  return (
    <DashboardPageWrapper maxWidth="xl" showHeader={false}>
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">{l.title}</h1>
        <p className="text-muted-foreground text-sm mt-1">{l.subtitle}</p>
      </div>

      <Tabs defaultValue={defaultTab} className="flex flex-col gap-4 w-full">
        <TabsList className="grid w-full grid-cols-2 h-11 p-1 rounded-xl bg-muted/50 border">
          <TabsTrigger value="prescriptions" className="gap-2 rounded-lg px-4 sm:px-5 data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700 data-[state=active]:shadow-sm dark:data-[state=active]:bg-emerald-950/30 dark:data-[state=active]:text-emerald-300">
            <Pill className="h-4 w-4" />
            {l.prescriptions}
            {prescriptions.length > 0 && (
              <Badge variant="secondary" className="h-5 px-1.5 text-xs">{prescriptions.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="labtests" className="gap-2 rounded-lg px-4 sm:px-5 data-[state=active]:bg-violet-50 data-[state=active]:text-violet-700 data-[state=active]:shadow-sm dark:data-[state=active]:bg-violet-950/30 dark:data-[state=active]:text-violet-300">
            <TestTube className="h-4 w-4" />
            {l.labTests}
            {labRequests.length > 0 && (
              <Badge variant="secondary" className="h-5 px-1.5 text-xs">{labRequests.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="prescriptions" className="mt-4">
          {prescriptions.length === 0 ? (
            <Card className="rounded-none sm:rounded-xl overflow-hidden">
              <CardContent className="py-16 text-center">
                <Pill className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">{l.noPrescriptions}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-2 gap-4 sm:gap-6">
              {prescriptions.map((prescription) => (
                <PrescriptionWorkflow
                  key={prescription.id}
                  prescription={prescription}
                  userRole="patient"
                  patientId={profileId || undefined}
                  onUpdate={loadData}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="labtests" className="mt-4">
          {labRequests.length === 0 ? (
            <Card className="rounded-none sm:rounded-xl overflow-hidden">
              <CardContent className="py-16 text-center">
                <TestTube className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">{l.noLabTests}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-2 gap-4 sm:gap-6 list-stripe">
              {labRequests.map((labRequest) => (
                <LabTestWorkflow
                  key={labRequest.id}
                  labRequest={labRequest}
                  userRole="patient"
                  patientId={profileId || undefined}
                  onUpdate={loadData}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </DashboardPageWrapper>
  )
}
