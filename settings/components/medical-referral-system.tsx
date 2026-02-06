'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useToast } from '@/hooks/use-toast'
import { 
  Send, Search, Plus, User, Stethoscope, Building2, Clock,
  CheckCircle, XCircle, AlertCircle, ArrowRight, Calendar,
  Share2, Eye, MessageSquare, Phone
} from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/page-loading'
import { QRCodeDisplay } from './qr-code-display'

// Specialties list
const SPECIALTIES = [
  { value: 'cardiology', label: 'Cardiology', labelAr: 'أمراض القلب', labelFr: 'Cardiologie' },
  { value: 'dermatology', label: 'Dermatology', labelAr: 'الأمراض الجلدية', labelFr: 'Dermatologie' },
  { value: 'endocrinology', label: 'Endocrinology', labelAr: 'الغدد الصماء', labelFr: 'Endocrinologie' },
  { value: 'gastroenterology', label: 'Gastroenterology', labelAr: 'أمراض الجهاز الهضمي', labelFr: 'Gastro-entérologie' },
  { value: 'neurology', label: 'Neurology', labelAr: 'الأمراض العصبية', labelFr: 'Neurologie' },
  { value: 'oncology', label: 'Oncology', labelAr: 'الأورام', labelFr: 'Oncologie' },
  { value: 'ophthalmology', label: 'Ophthalmology', labelAr: 'طب العيون', labelFr: 'Ophtalmologie' },
  { value: 'orthopedics', label: 'Orthopedics', labelAr: 'جراحة العظام', labelFr: 'Orthopédie' },
  { value: 'pediatrics', label: 'Pediatrics', labelAr: 'طب الأطفال', labelFr: 'Pédiatrie' },
  { value: 'psychiatry', label: 'Psychiatry', labelAr: 'الطب النفسي', labelFr: 'Psychiatrie' },
  { value: 'pulmonology', label: 'Pulmonology', labelAr: 'أمراض الرئة', labelFr: 'Pneumologie' },
  { value: 'radiology', label: 'Radiology', labelAr: 'الأشعة', labelFr: 'Radiologie' },
  { value: 'rheumatology', label: 'Rheumatology', labelAr: 'أمراض الروماتيزم', labelFr: 'Rhumatologie' },
  { value: 'urology', label: 'Urology', labelAr: 'المسالك البولية', labelFr: 'Urologie' },
  { value: 'gynecology', label: 'Gynecology', labelAr: 'أمراض النساء', labelFr: 'Gynécologie' },
  { value: 'ent', label: 'ENT', labelAr: 'الأنف والأذن والحنجرة', labelFr: 'ORL' },
  { value: 'general_surgery', label: 'General Surgery', labelAr: 'الجراحة العامة', labelFr: 'Chirurgie générale' },
  { value: 'internal_medicine', label: 'Internal Medicine', labelAr: 'الطب الباطني', labelFr: 'Médecine interne' },
  { value: 'other', label: 'Other', labelAr: 'أخرى', labelFr: 'Autre' },
]

interface Referral {
  id: string
  referral_number: string
  referring_doctor_id: string
  referring_doctor?: any
  referred_to_doctor_id?: string
  referred_to_doctor?: any
  referred_to_clinic_id?: string
  referred_to_clinic?: any
  referred_to_specialty: string
  referred_to_type: string
  patient_id: string
  patient?: any
  patient_name: string
  patient_phone?: string
  reason: string
  clinical_history?: string
  diagnosis?: string
  urgency: 'emergency' | 'urgent' | 'routine'
  status: 'pending' | 'accepted' | 'declined' | 'completed' | 'expired'
  accepted_at?: string
  declined_at?: string
  decline_reason?: string
  completed_at?: string
  expires_at: string
  created_at: string
}

interface MedicalReferralSystemProps {
  userRole: 'doctor' | 'clinic' | 'patient'
  userId: string
  professionalId?: string
  patientId?: string
  language?: 'ar' | 'fr' | 'en'
  onReferralCreated?: (referral: Referral) => void
}

export function MedicalReferralSystem({
  userRole,
  userId,
  professionalId,
  patientId,
  language = 'ar',
  onReferralCreated
}: MedicalReferralSystemProps) {
  const { toast } = useToast()
  const supabase = createBrowserClient()
  
  const [referrals, setReferrals] = useState<Referral[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showDetailsDialog, setShowDetailsDialog] = useState(false)
  const [selectedReferral, setSelectedReferral] = useState<Referral | null>(null)
  const [activeTab, setActiveTab] = useState('all')
  
  const [createForm, setCreateForm] = useState({
    patientId: patientId || '',
    patientName: '',
    patientPhone: '',
    referToType: 'doctor' as 'doctor' | 'clinic',
    specialty: '',
    specificDoctorId: '',
    specificClinicId: '',
    reason: '',
    clinicalHistory: '',
    diagnosis: '',
    urgency: 'routine' as 'emergency' | 'urgent' | 'routine',
  })
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [patientSearch, setPatientSearch] = useState('')
  const [patientResults, setPatientResults] = useState<any[]>([])

  const labels = {
    ar: {
      referrals: 'الإحالات الطبية',
      createReferral: 'إنشاء إحالة',
      all: 'الكل',
      pending: 'قيد الانتظار',
      accepted: 'مقبولة',
      declined: 'مرفوضة',
      completed: 'مكتملة',
      patient: 'المريض',
      specialty: 'التخصص',
      referTo: 'إحالة إلى',
      doctor: 'طبيب',
      clinic: 'عيادة',
      reason: 'سبب الإحالة',
      clinicalHistory: 'التاريخ المرضي',
      diagnosis: 'التشخيص',
      urgency: 'الاستعجال',
      emergency: 'طارئ',
      urgent: 'عاجل',
      routine: 'عادي',
      search: 'بحث...',
      selectPatient: 'اختر المريض',
      selectSpecialty: 'اختر التخصص',
      send: 'إرسال',
      cancel: 'إلغاء',
      accept: 'قبول',
      decline: 'رفض',
      viewDetails: 'عرض التفاصيل',
      noReferrals: 'لا توجد إحالات',
      referralSent: 'تم إرسال الإحالة بنجاح',
      referralAccepted: 'تم قبول الإحالة',
      referralDeclined: 'تم رفض الإحالة',
      scheduleAppointment: 'جدولة موعد',
      referralNumber: 'رقم الإحالة',
      from: 'من',
      to: 'إلى',
      message: 'مراسلة',
      qrCode: 'رمز QR',
      declineReason: 'سبب الرفض',
    },
    fr: {
      referrals: 'Références médicales',
      createReferral: 'Créer une référence',
      all: 'Tout',
      pending: 'En attente',
      accepted: 'Acceptée',
      declined: 'Refusée',
      completed: 'Terminée',
      patient: 'Patient',
      specialty: 'Spécialité',
      referTo: 'Référer à',
      doctor: 'Médecin',
      clinic: 'Clinique',
      reason: 'Raison de la référence',
      clinicalHistory: 'Historique clinique',
      diagnosis: 'Diagnostic',
      urgency: 'Urgence',
      emergency: 'Urgence',
      urgent: 'Urgent',
      routine: 'Routine',
      search: 'Rechercher...',
      selectPatient: 'Sélectionner le patient',
      selectSpecialty: 'Sélectionner la spécialité',
      send: 'Envoyer',
      cancel: 'Annuler',
      accept: 'Accepter',
      decline: 'Refuser',
      viewDetails: 'Voir les détails',
      noReferrals: 'Aucune référence',
      referralSent: 'Référence envoyée avec succès',
      referralAccepted: 'Référence acceptée',
      referralDeclined: 'Référence refusée',
      scheduleAppointment: 'Planifier un rendez-vous',
      referralNumber: 'Numéro de référence',
      from: 'De',
      to: 'À',
      message: 'Message',
      qrCode: 'Code QR',
      declineReason: 'Raison du refus',
    },
    en: {
      referrals: 'Medical Referrals',
      createReferral: 'Create Referral',
      all: 'All',
      pending: 'Pending',
      accepted: 'Accepted',
      declined: 'Declined',
      completed: 'Completed',
      patient: 'Patient',
      specialty: 'Specialty',
      referTo: 'Refer to',
      doctor: 'Doctor',
      clinic: 'Clinic',
      reason: 'Reason for referral',
      clinicalHistory: 'Clinical History',
      diagnosis: 'Diagnosis',
      urgency: 'Urgency',
      emergency: 'Emergency',
      urgent: 'Urgent',
      routine: 'Routine',
      search: 'Search...',
      selectPatient: 'Select patient',
      selectSpecialty: 'Select specialty',
      send: 'Send',
      cancel: 'Cancel',
      accept: 'Accept',
      decline: 'Decline',
      viewDetails: 'View Details',
      noReferrals: 'No referrals',
      referralSent: 'Referral sent successfully',
      referralAccepted: 'Referral accepted',
      referralDeclined: 'Referral declined',
      scheduleAppointment: 'Schedule Appointment',
      referralNumber: 'Referral Number',
      from: 'From',
      to: 'To',
      message: 'Message',
      qrCode: 'QR Code',
      declineReason: 'Decline reason',
    },
  }
  
  const l = labels[language]

  const getSpecialtyLabel = (value: string) => {
    const spec = SPECIALTIES.find(s => s.value === value)
    if (!spec) return value
    return language === 'ar' ? spec.labelAr : language === 'fr' ? spec.labelFr : spec.label
  }

  const loadReferrals = async () => {
    setIsLoading(true)
    try {
      let query = supabase.from('referrals').select(`
        *,
        referring_doctor:referring_doctor_id(id, business_name, specialty, wilaya),
        referred_to_doctor:referred_to_doctor_id(id, business_name, specialty, wilaya),
        referred_to_clinic:referred_to_clinic_id(id, business_name, wilaya),
        patient:patient_id(id, full_name, phone, avatar_url)
      `)

      if (userRole === 'doctor' || userRole === 'clinic') {
        query = query.or(`referring_doctor_id.eq.${professionalId},referred_to_doctor_id.eq.${professionalId},referred_to_clinic_id.eq.${professionalId}`)
      } else if (userRole === 'patient') {
        query = query.eq('patient_id', userId)
      }

      const { data, error } = await query.order('created_at', { ascending: false })
      if (error) throw error
      setReferrals(data || [])
    } catch (error) {
      console.error('Error loading referrals:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadReferrals()
  }, [professionalId, userId])

  const searchPatients = async (query: string) => {
    if (!query.trim()) {
      setPatientResults([])
      return
    }
    try {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, phone, avatar_url')
        .or(`full_name.ilike.%${query}%,phone.ilike.%${query}%`)
        .limit(10)
      setPatientResults(data || [])
    } catch (error) {
      console.error('Error searching patients:', error)
    }
  }

  const searchProviders = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([])
      return
    }
    setIsSearching(true)
    try {
      const type = createForm.referToType === 'doctor' ? 'doctor' : 'clinic'
      let dbQuery = supabase
        .from('professionals')
        .select('id, business_name, professional_type, specialty, wilaya, avatar_url')
        .eq('professional_type', type)
        .eq('status', 'verified')
        .or(`business_name.ilike.%${query}%`)

      if (createForm.specialty && createForm.referToType === 'doctor') {
        dbQuery = dbQuery.eq('specialty', createForm.specialty)
      }
      const { data } = await dbQuery.limit(10)
      setSearchResults(data || [])
    } catch (error) {
      console.error('Error searching providers:', error)
    } finally {
      setIsSearching(false)
    }
  }

  const handleCreateReferral = async () => {
    if (!createForm.patientId || !createForm.reason || !createForm.specialty) {
      toast({ title: 'Please fill all required fields', variant: 'destructive' })
      return
    }

    setIsSubmitting(true)
    try {
      const referralData: any = {
        referring_doctor_id: professionalId,
        patient_id: createForm.patientId,
        patient_name: createForm.patientName,
        patient_phone: createForm.patientPhone,
        referred_to_specialty: createForm.specialty,
        referred_to_type: createForm.referToType,
        reason: createForm.reason,
        clinical_history: createForm.clinicalHistory,
        diagnosis: createForm.diagnosis,
        urgency: createForm.urgency,
        status: 'pending',
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      }

      if (createForm.specificDoctorId) referralData.referred_to_doctor_id = createForm.specificDoctorId
      if (createForm.specificClinicId) referralData.referred_to_clinic_id = createForm.specificClinicId

      const { data, error } = await supabase.from('referrals').insert(referralData).select().single()
      if (error) throw error

      if (createForm.specificDoctorId || createForm.specificClinicId) {
        const recipientId = createForm.specificDoctorId || createForm.specificClinicId
        const { data: recipient } = await supabase
          .from('professionals')
          .select('auth_user_id')
          .eq('id', recipientId)
          .single()

        if (recipient?.auth_user_id) {
          await supabase.from('notifications').insert({
            user_id: recipient.auth_user_id,
            type: 'new_referral',
            title: 'New Patient Referral',
            message: `You have received a new patient referral for ${createForm.patientName}`,
            data: { referral_id: data.id },
          })
        }
      }

      toast({ title: l.referralSent })
      setShowCreateDialog(false)
      resetCreateForm()
      loadReferrals()
      onReferralCreated?.(data)
    } catch (error: any) {
      toast({ title: 'Error creating referral', description: error.message, variant: 'destructive' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleAcceptReferral = async (referralId: string) => {
    try {
      const { error } = await supabase
        .from('referrals')
        .update({ status: 'accepted', accepted_at: new Date().toISOString() })
        .eq('id', referralId)
      if (error) throw error

      const referral = referrals.find(r => r.id === referralId)
      if (referral) {
        const { data: referringDoc } = await supabase
          .from('professionals')
          .select('auth_user_id')
          .eq('id', referral.referring_doctor_id)
          .single()

        if (referringDoc?.auth_user_id) {
          await supabase.from('notifications').insert({
            user_id: referringDoc.auth_user_id,
            type: 'referral_accepted',
            title: 'Referral Accepted',
            message: `Your referral for ${referral.patient_name} has been accepted`,
            data: { referral_id: referralId },
          })
        }
      }

      toast({ title: l.referralAccepted })
      loadReferrals()
    } catch (error: any) {
      toast({ title: 'Error accepting referral', description: error.message, variant: 'destructive' })
    }
  }

  const handleDeclineReferral = async (referralId: string, reason: string) => {
    try {
      const { error } = await supabase
        .from('referrals')
        .update({ status: 'declined', declined_at: new Date().toISOString(), decline_reason: reason })
        .eq('id', referralId)
      if (error) throw error
      toast({ title: l.referralDeclined })
      loadReferrals()
    } catch (error: any) {
      toast({ title: 'Error declining referral', description: error.message, variant: 'destructive' })
    }
  }

  const resetCreateForm = () => {
    setCreateForm({
      patientId: patientId || '',
      patientName: '',
      patientPhone: '',
      referToType: 'doctor',
      specialty: '',
      specificDoctorId: '',
      specificClinicId: '',
      reason: '',
      clinicalHistory: '',
      diagnosis: '',
      urgency: 'routine',
    })
    setSearchResults([])
    setPatientResults([])
    setPatientSearch('')
  }

  const getUrgencyBadge = (urgency: string) => {
    switch (urgency) {
      case 'emergency': return <Badge variant="destructive">{l.emergency}</Badge>
      case 'urgent': return <Badge className="bg-orange-500">{l.urgent}</Badge>
      default: return <Badge variant="secondary">{l.routine}</Badge>
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending': return <Badge variant="outline" className="text-amber-600 border-amber-400">{l.pending}</Badge>
      case 'accepted': return <Badge variant="outline" className="text-green-600 border-green-400">{l.accepted}</Badge>
      case 'declined': return <Badge variant="outline" className="text-red-600 border-red-400">{l.declined}</Badge>
      case 'completed': return <Badge className="bg-green-600">{l.completed}</Badge>
      default: return <Badge variant="secondary">{status}</Badge>
    }
  }

  const filteredReferrals = referrals.filter(r => activeTab === 'all' || r.status === activeTab)
  const isSentByMe = (referral: Referral) => referral.referring_doctor_id === professionalId

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">{l.referrals}</h2>
        {userRole !== 'patient' && (
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 me-2" />
            {l.createReferral}
          </Button>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">{l.all}</TabsTrigger>
          <TabsTrigger value="pending">{l.pending}</TabsTrigger>
          <TabsTrigger value="accepted">{l.accepted}</TabsTrigger>
          <TabsTrigger value="declined">{l.declined}</TabsTrigger>
          <TabsTrigger value="completed">{l.completed}</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner size="lg" className="text-muted-foreground" />
            </div>
          ) : filteredReferrals.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Share2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">{l.noReferrals}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredReferrals.map(referral => (
                <Card key={referral.id} className={
                  referral.urgency === 'emergency' ? 'border-red-500' :
                  referral.urgency === 'urgent' ? 'border-orange-400' : ''
                }>
                  <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                      <div className="space-y-3 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          {getStatusBadge(referral.status)}
                          {getUrgencyBadge(referral.urgency)}
                          <span className="text-sm text-muted-foreground">#{referral.referral_number}</span>
                        </div>

                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarImage src={referral.patient?.avatar_url} />
                            <AvatarFallback><User className="h-4 w-4" /></AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{referral.patient_name || referral.patient?.full_name}</p>
                            {referral.patient_phone && (
                              <p className="text-sm text-muted-foreground">{referral.patient_phone}</p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 text-sm">
                          <div className="flex items-center gap-1">
                            <Stethoscope className="h-4 w-4 text-muted-foreground" />
                            <span>{referral.referring_doctor?.business_name || 'Dr.'}</span>
                          </div>
                          <ArrowRight className="h-4 w-4 text-muted-foreground" />
                          <div className="flex items-center gap-1">
                            <Badge variant="outline">{getSpecialtyLabel(referral.referred_to_specialty)}</Badge>
                            {referral.referred_to_doctor && (
                              <span className="text-muted-foreground">({referral.referred_to_doctor.business_name})</span>
                            )}
                          </div>
                        </div>

                        <p className="text-sm text-muted-foreground line-clamp-2">{referral.reason}</p>

                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(referral.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 min-w-[150px]">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            setSelectedReferral(referral)
                            setShowDetailsDialog(true)
                          }}
                        >
                          <Eye className="h-4 w-4 me-2" />
                          {l.viewDetails}
                        </Button>
                        
                        {!isSentByMe(referral) && referral.status === 'pending' && (
                          <>
                            <Button size="sm" onClick={() => handleAcceptReferral(referral.id)}>
                              <CheckCircle className="h-4 w-4 me-2" />
                              {l.accept}
                            </Button>
                            <Button variant="destructive" size="sm" onClick={() => handleDeclineReferral(referral.id, '')}>
                              <XCircle className="h-4 w-4 me-2" />
                              {l.decline}
                            </Button>
                          </>
                        )}

                        {referral.status === 'accepted' && !isSentByMe(referral) && (
                          <Button size="sm">
                            <Calendar className="h-4 w-4 me-2" />
                            {l.scheduleAppointment}
                          </Button>
                        )}

                        <Button variant="ghost" size="sm">
                          <MessageSquare className="h-4 w-4 me-2" />
                          {l.message}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Create Referral Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{l.createReferral}</DialogTitle>
            <DialogDescription>Create a medical referral for your patient</DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <div className="space-y-2">
              <Label>{l.patient} *</Label>
              {createForm.patientId ? (
                <Card className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback><User className="h-4 w-4" /></AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{createForm.patientName}</p>
                        <p className="text-sm text-muted-foreground">{createForm.patientPhone}</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setCreateForm({ ...createForm, patientId: '', patientName: '', patientPhone: '' })}>
                      Change
                    </Button>
                  </div>
                </Card>
              ) : (
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder={l.selectPatient}
                      value={patientSearch}
                      onChange={(e) => {
                        setPatientSearch(e.target.value)
                        searchPatients(e.target.value)
                      }}
                      className="ps-9"
                    />
                  </div>
                  {patientResults.length > 0 && (
                    <Card className="p-2">
                      {patientResults.map(patient => (
                        <div
                          key={patient.id}
                          onClick={() => {
                            setCreateForm({
                              ...createForm,
                              patientId: patient.id,
                              patientName: patient.full_name,
                              patientPhone: patient.phone
                            })
                            setPatientResults([])
                            setPatientSearch('')
                          }}
                          className="flex items-center gap-3 p-2 hover:bg-muted rounded cursor-pointer"
                        >
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={patient.avatar_url} />
                            <AvatarFallback><User className="h-3 w-3" /></AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium">{patient.full_name}</p>
                            <p className="text-xs text-muted-foreground">{patient.phone}</p>
                          </div>
                        </div>
                      ))}
                    </Card>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>{l.referTo}</Label>
              <RadioGroup
                value={createForm.referToType}
                onValueChange={(v) => setCreateForm({ ...createForm, referToType: v as 'doctor' | 'clinic', specificDoctorId: '', specificClinicId: '' })}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="doctor" id="doctor" />
                  <Label htmlFor="doctor" className="flex items-center gap-1 cursor-pointer">
                    <Stethoscope className="h-4 w-4" />
                    {l.doctor}
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="clinic" id="clinic" />
                  <Label htmlFor="clinic" className="flex items-center gap-1 cursor-pointer">
                    <Building2 className="h-4 w-4" />
                    {l.clinic}
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label>{l.specialty} *</Label>
              <Select value={createForm.specialty} onValueChange={(v) => setCreateForm({ ...createForm, specialty: v })}>
                <SelectTrigger>
                  <SelectValue placeholder={l.selectSpecialty} />
                </SelectTrigger>
                <SelectContent>
                  {SPECIALTIES.map(spec => (
                    <SelectItem key={spec.value} value={spec.value}>
                      {language === 'ar' ? spec.labelAr : language === 'fr' ? spec.labelFr : spec.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{l.urgency}</Label>
              <Select value={createForm.urgency} onValueChange={(v) => setCreateForm({ ...createForm, urgency: v as any })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="routine">{l.routine}</SelectItem>
                  <SelectItem value="urgent">{l.urgent}</SelectItem>
                  <SelectItem value="emergency">{l.emergency}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{l.reason} *</Label>
              <Textarea
                value={createForm.reason}
                onChange={(e) => setCreateForm({ ...createForm, reason: e.target.value })}
                placeholder="Describe the reason for this referral..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>{l.clinicalHistory}</Label>
              <Textarea
                value={createForm.clinicalHistory}
                onChange={(e) => setCreateForm({ ...createForm, clinicalHistory: e.target.value })}
                placeholder="Relevant clinical history..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>{l.diagnosis}</Label>
              <Input
                value={createForm.diagnosis}
                onChange={(e) => setCreateForm({ ...createForm, diagnosis: e.target.value })}
                placeholder="Current diagnosis or suspected condition"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              {l.cancel}
            </Button>
            <Button onClick={handleCreateReferral} disabled={isSubmitting}>
              {isSubmitting && <LoadingSpinner size="sm" className="me-2" />}
              <Send className="h-4 w-4 me-2" />
              {l.send}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{l.referralNumber}: {selectedReferral?.referral_number}</DialogTitle>
          </DialogHeader>

          {selectedReferral && (
            <div className="space-y-6">
              <div className="flex items-center gap-2">
                {getStatusBadge(selectedReferral.status)}
                {getUrgencyBadge(selectedReferral.urgency)}
              </div>

              <Card className="p-4">
                <h4 className="font-medium mb-2">{l.patient}</h4>
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={selectedReferral.patient?.avatar_url} />
                    <AvatarFallback><User className="h-4 w-4" /></AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{selectedReferral.patient_name || selectedReferral.patient?.full_name}</p>
                    {selectedReferral.patient_phone && (
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {selectedReferral.patient_phone}
                      </p>
                    )}
                  </div>
                </div>
              </Card>

              <div className="grid grid-cols-2 gap-4">
                <Card className="p-4">
                  <h4 className="font-medium mb-2">{l.from}</h4>
                  <div className="flex items-center gap-2">
                    <Stethoscope className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium">{selectedReferral.referring_doctor?.business_name}</p>
                      <p className="text-sm text-muted-foreground">{selectedReferral.referring_doctor?.wilaya}</p>
                    </div>
                  </div>
                </Card>

                <Card className="p-4">
                  <h4 className="font-medium mb-2">{l.to}</h4>
                  <div className="flex items-center gap-2">
                    {selectedReferral.referred_to_type === 'doctor' ? (
                      <Stethoscope className="h-5 w-5 text-secondary" />
                    ) : (
                      <Building2 className="h-5 w-5 text-secondary" />
                    )}
                    <div>
                      <p className="font-medium">
                        {selectedReferral.referred_to_doctor?.business_name || 
                         selectedReferral.referred_to_clinic?.business_name ||
                         getSpecialtyLabel(selectedReferral.referred_to_specialty)}
                      </p>
                      <Badge variant="outline">{getSpecialtyLabel(selectedReferral.referred_to_specialty)}</Badge>
                    </div>
                  </div>
                </Card>
              </div>

              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-1">{l.reason}</h4>
                  <p className="text-sm text-muted-foreground bg-muted p-3 rounded">{selectedReferral.reason}</p>
                </div>

                {selectedReferral.diagnosis && (
                  <div>
                    <h4 className="font-medium mb-1">{l.diagnosis}</h4>
                    <p className="text-sm text-muted-foreground bg-muted p-3 rounded">{selectedReferral.diagnosis}</p>
                  </div>
                )}

                {selectedReferral.clinical_history && (
                  <div>
                    <h4 className="font-medium mb-1">{l.clinicalHistory}</h4>
                    <p className="text-sm text-muted-foreground bg-muted p-3 rounded">{selectedReferral.clinical_history}</p>
                  </div>
                )}

                {selectedReferral.decline_reason && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>{l.declineReason}:</strong> {selectedReferral.decline_reason}
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium mb-3">{l.qrCode}</h4>
                <QRCodeDisplay
                  value={JSON.stringify({
                    type: 'referral',
                    id: selectedReferral.id,
                    number: selectedReferral.referral_number,
                    patient: selectedReferral.patient_name,
                    specialty: selectedReferral.referred_to_specialty,
                    status: selectedReferral.status
                  })}
                  size={150}
                  downloadFileName={`referral-${selectedReferral.referral_number}`}
                />
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium mb-3">Timeline</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    Created: {new Date(selectedReferral.created_at).toLocaleString()}
                  </div>
                  {selectedReferral.accepted_at && (
                    <div className="flex items-center gap-2 text-green-600">
                      <CheckCircle className="h-4 w-4" />
                      Accepted: {new Date(selectedReferral.accepted_at).toLocaleString()}
                    </div>
                  )}
                  {selectedReferral.declined_at && (
                    <div className="flex items-center gap-2 text-red-600">
                      <XCircle className="h-4 w-4" />
                      Declined: {new Date(selectedReferral.declined_at).toLocaleString()}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetailsDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default MedicalReferralSystem
