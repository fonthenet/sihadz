'use client'

import React, { useState, useEffect } from 'react'
import { useLanguage } from '@/lib/i18n/language-context'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PhoneInput } from '@/components/ui/phone-input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Switch } from '@/components/ui/switch'
import { createBrowserClient } from '@/lib/supabase'
import {
  Search,
  MoreVertical,
  Eye,
  Pencil,
  Trash2,
  Ban,
  CheckCircle,
  XCircle,
  Mail,
  Phone,
  MapPin,
  Download,
  RefreshCw,
  Shield,
  Stethoscope,
  Star,
  Video,
  Home,
  Building,
  Calendar,
  DollarSign,
  Clock,
  FileCheck,
  UserPlus
} from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import Loading from './loading'

interface Doctor {
  id: string
  user_id: string
  specialty: string
  specialty_ar?: string
  clinic_name: string
  clinic_name_ar?: string
  clinic_address: string
  clinic_phone?: string
  consultation_fee: number
  e_visit_fee?: number
  home_visit_fee?: number
  supports_e_visit: boolean
  supports_in_person: boolean
  supports_home_visit: boolean
  experience_years: number
  rating: number
  review_count: number
  is_verified: boolean
  is_active: boolean
  license_number?: string
  city?: string
  wilaya_code?: string
  created_at: string
  profile?: {
    full_name: string
    email: string
    avatar_url?: string
  }
}

export default function DoctorsManagementPage() {
  const { language, dir } = useLanguage()
  const searchParams = useSearchParams()
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null)
  const [isViewModalOpen, setIsViewModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [isAppointmentsModalOpen, setIsAppointmentsModalOpen] = useState(false)
  const [doctorAppointments, setDoctorAppointments] = useState<any[]>([])
  const [appointmentsLoading, setAppointmentsLoading] = useState(false)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [newDoctor, setNewDoctor] = useState({
    email: '',
    full_name: '',
    specialty: '',
    clinic_name: '',
    phone: '',
    password: ''
  })

  const texts = {
    en: {
      title: 'Doctors Management',
      description: 'Manage all registered doctors on the platform',
      search: 'Search doctors...',
      all: 'All Doctors',
      verified: 'Verified',
      pending: 'Pending',
      suspended: 'Suspended',
      addDoctor: 'Add Doctor',
      export: 'Export',
      refresh: 'Refresh',
      name: 'Name',
      specialty: 'Specialty',
      clinic: 'Clinic',
      fee: 'Fee',
      rating: 'Rating',
      status: 'Status',
      actions: 'Actions',
      view: 'View',
      edit: 'Edit',
      delete: 'Delete',
      suspend: 'Suspend',
      activate: 'Activate',
      verify: 'Verify',
      reject: 'Reject',
      active: 'Active',
      inactive: 'Inactive',
      doctorDetails: 'Doctor Details',
      editDoctor: 'Edit Doctor',
      deleteDoctor: 'Delete Doctor',
      deleteConfirm: 'Are you sure you want to delete this doctor? This action cannot be undone.',
      cancel: 'Cancel',
      save: 'Save Changes',
      confirmDelete: 'Yes, Delete',
      noDoctors: 'No doctors found',
      totalDoctors: 'Total Doctors',
      verifiedDoctors: 'Verified',
      pendingVerification: 'Pending Verification',
      services: 'Services',
      inPerson: 'In-Person',
      eVisit: 'E-Visit',
      homeVisit: 'Home Visit',
      experience: 'Experience',
      years: 'years',
      license: 'License',
      reviews: 'reviews',
      dzd: 'DZD',
      sendEmail: 'Send Email',
      viewAppointments: 'View Appointments'
    },
    fr: {
      title: 'Gestion des Médecins',
      description: 'Gérer tous les médecins enregistrés sur la plateforme',
      search: 'Rechercher des médecins...',
      all: 'Tous les médecins',
      verified: 'Vérifiés',
      pending: 'En attente',
      suspended: 'Suspendus',
      addDoctor: 'Ajouter',
      export: 'Exporter',
      refresh: 'Actualiser',
      name: 'Nom',
      specialty: 'Spécialité',
      clinic: 'Clinique',
      fee: 'Tarif',
      rating: 'Note',
      status: 'Statut',
      actions: 'Actions',
      view: 'Voir',
      edit: 'Modifier',
      delete: 'Supprimer',
      suspend: 'Suspendre',
      activate: 'Activer',
      verify: 'Vérifier',
      reject: 'Rejeter',
      active: 'Actif',
      inactive: 'Inactif',
      doctorDetails: 'Détails du médecin',
      editDoctor: 'Modifier le médecin',
      deleteDoctor: 'Supprimer le médecin',
      deleteConfirm: 'Êtes-vous sûr de vouloir supprimer ce médecin?',
      cancel: 'Annuler',
      save: 'Enregistrer',
      confirmDelete: 'Oui, Supprimer',
      noDoctors: 'Aucun médecin trouvé',
      totalDoctors: 'Total Médecins',
      verifiedDoctors: 'Vérifiés',
      pendingVerification: 'En attente de vérification',
      services: 'Services',
      inPerson: 'En cabinet',
      eVisit: 'Téléconsultation',
      homeVisit: 'Visite à domicile',
      experience: 'Expérience',
      years: 'ans',
      license: 'Licence',
      reviews: 'avis',
      dzd: 'DZD',
      sendEmail: 'Envoyer Email',
      viewAppointments: 'Voir les rendez-vous'
    },
    ar: {
      title: 'إدارة الأطباء',
      description: 'إدارة جميع الأطباء المسجلين على المنصة',
      search: 'البحث عن الأطباء...',
      all: 'جميع الأطباء',
      verified: 'موثقون',
      pending: 'قيد الانتظار',
      suspended: 'موقوفون',
      addDoctor: 'إضافة طبيب',
      export: 'تصدير',
      refresh: 'تحديث',
      name: 'الاسم',
      specialty: 'التخصص',
      clinic: 'العيادة',
      fee: 'الرسوم',
      rating: 'التقييم',
      status: 'الحالة',
      actions: 'الإجراءات',
      view: 'عرض',
      edit: 'تعديل',
      delete: 'حذف',
      suspend: 'تعليق',
      activate: 'تفعيل',
      verify: 'تحقق',
      reject: 'رفض',
      active: 'نشط',
      inactive: 'غير نشط',
      doctorDetails: 'تفاصيل الطبيب',
      editDoctor: 'تعديل الطبيب',
      deleteDoctor: 'حذف الطبيب',
      deleteConfirm: 'هل أنت متأكد من حذف هذا الطبيب؟',
      cancel: 'إلغاء',
      save: 'حفظ التغييرات',
      confirmDelete: 'نعم، احذف',
      noDoctors: 'لا يوجد أطباء',
      totalDoctors: 'إجمالي الأطباء',
      verifiedDoctors: 'موثقون',
      pendingVerification: 'في انتظار التحقق',
      services: 'الخدمات',
      inPerson: 'في العيادة',
      eVisit: 'عن بعد',
      homeVisit: 'زيارة منزلية',
      experience: 'الخبرة',
      years: 'سنوات',
      license: 'الترخيص',
      reviews: 'تقييمات',
      dzd: 'د.ج',
      sendEmail: 'إرسال بريد',
      viewAppointments: 'عرض المواعيد'
    }
  }

  const t = texts[language]

  useEffect(() => {
    fetchDoctors()
  }, [filterStatus])

  const fetchDoctors = async () => {
    setIsLoading(true)
    const supabase = createBrowserClient()
    
    try {
      let query = supabase
        .from('doctors')
        .select(`
          *,
          profile:user_id (
            full_name,
            email,
            avatar_url
          )
        `)
        .order('created_at', { ascending: false })

      if (filterStatus === 'verified') {
        query = query.eq('is_verified', true)
      } else if (filterStatus === 'pending') {
        query = query.eq('is_verified', false)
      } else if (filterStatus === 'suspended') {
        query = query.eq('is_active', false)
      }

      const { data, error } = await query

      if (error) throw error
      setDoctors(data || [])
    } catch (error) {
      console.error('Error fetching doctors:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleVerifyDoctor = async (doctorId: string) => {
    try {
      const res = await fetch(`/api/super-admin/doctors/${doctorId}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to verify')
      alert('Doctor verified successfully!')
      fetchDoctors()
    } catch (error: any) {
      console.error('Error verifying doctor:', error)
      alert(`Error: ${error?.message || 'Failed to verify doctor'}`)
    }
  }

  const handleToggleActive = async (doctorId: string, currentStatus: boolean) => {
    const supabase = createBrowserClient()
    try {
      const { error } = await supabase
        .from('doctors')
        .update({ is_active: !currentStatus })
        .eq('id', doctorId)

      if (error) throw error
      fetchDoctors()
    } catch (error) {
      console.error('Error toggling doctor status:', error)
    }
  }

  const handleDeleteDoctor = async () => {
    if (!selectedDoctor) return
    
    const supabase = createBrowserClient()
    try {
      const { error } = await supabase
        .from('doctors')
        .delete()
        .eq('id', selectedDoctor.id)

      if (error) throw error
      
      fetchDoctors()
      setIsDeleteModalOpen(false)
    } catch (error) {
      console.error('Error deleting doctor:', error)
    }
  }

  const fetchDoctorAppointments = async (doctorId: string) => {
    setAppointmentsLoading(true)
    const supabase = createBrowserClient()
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          *,
          patient:patient_id (
            full_name,
            email,
            phone
          )
        `)
        .eq('doctor_id', doctorId)
        .order('appointment_date', { ascending: false })

      if (error) throw error
      setDoctorAppointments(data || [])
    } catch (error) {
      console.error('Error fetching appointments:', error)
    } finally {
      setAppointmentsLoading(false)
    }
  }

  const handleViewAppointments = (doctor: Doctor) => {
    setSelectedDoctor(doctor)
    fetchDoctorAppointments(doctor.id)
    setIsAppointmentsModalOpen(true)
  }

  const handleCancelAppointment = async (appointmentId: string) => {
    const supabase = createBrowserClient()
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: 'cancelled' })
        .eq('id', appointmentId)

      if (error) throw error
      if (selectedDoctor) fetchDoctorAppointments(selectedDoctor.id)
    } catch (error) {
      console.error('Error cancelling appointment:', error)
    }
  }

  const handleDeleteAppointment = async (appointmentId: string) => {
    const supabase = createBrowserClient()
    try {
      const { error } = await supabase
        .from('appointments')
        .delete()
        .eq('id', appointmentId)

      if (error) throw error
      if (selectedDoctor) fetchDoctorAppointments(selectedDoctor.id)
    } catch (error) {
      console.error('Error deleting appointment:', error)
    }
  }

  const handleAddDoctor = async () => {
    if (!newDoctor.email || !newDoctor.full_name || !newDoctor.password || !newDoctor.specialty) {
      alert('Please fill in all required fields')
      return
    }

    const supabase = createBrowserClient()
    
    try {
      // Create auth user first
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newDoctor.email,
        password: newDoctor.password,
      })

      if (authError) throw authError

      if (authData.user) {
        // Update profile
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            full_name: newDoctor.full_name,
            phone: newDoctor.phone,
            user_type: 'doctor',
          })
          .eq('id', authData.user.id)

        if (profileError) throw profileError

        // Create doctor record
        const { error: doctorError } = await supabase
          .from('doctors')
          .insert({
            id: authData.user.id,
            specialty: newDoctor.specialty,
            clinic_name: newDoctor.clinic_name,
            is_verified: false,
            is_active: true,
          })

        if (doctorError) throw doctorError
      }

      alert('Doctor added successfully!')
      setNewDoctor({ email: '', full_name: '', specialty: '', clinic_name: '', phone: '', password: '' })
      setIsAddModalOpen(false)
      fetchDoctors()
    } catch (error: any) {
      console.error('Error adding doctor:', error)
      alert(`Failed to add doctor: ${error.message}`)
    }
  }

  const filteredDoctors = doctors.filter(doctor => {
    const searchLower = searchQuery.toLowerCase()
    const name = doctor.profile?.full_name?.toLowerCase() || ''
    const specialty = doctor.specialty?.toLowerCase() || ''
    const clinic = doctor.clinic_name?.toLowerCase() || ''
    
    return name.includes(searchLower) || specialty.includes(searchLower) || clinic.includes(searchLower)
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${dir === 'rtl' ? 'sm:flex-row-reverse' : ''}`}>
        <div className={dir === 'rtl' ? 'text-right' : ''}>
          <h1 className="text-3xl font-bold">{t.title}</h1>
          <p className="text-muted-foreground">{t.description}</p>
        </div>
        <div className={`flex items-center gap-2 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
          <Button variant="outline" size="sm" onClick={fetchDoctors} className="bg-transparent">
            <RefreshCw className="h-4 w-4 mr-2" />
            {t.refresh}
          </Button>
          <Button variant="outline" size="sm" className="bg-transparent">
            <Download className="h-4 w-4 mr-2" />
            {t.export}
          </Button>
          <Button size="sm" onClick={() => setIsAddModalOpen(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            {t.addDoctor}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className={`flex items-center justify-between ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
              <div>
                <p className="text-sm text-muted-foreground">{t.totalDoctors}</p>
                <p className="text-2xl font-bold">{doctors.length}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-xl">
                <Stethoscope className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className={`flex items-center justify-between ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
              <div>
                <p className="text-sm text-muted-foreground">{t.verifiedDoctors}</p>
                <p className="text-2xl font-bold">{doctors.filter(d => d.is_verified).length}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-xl">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className={`flex items-center justify-between ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
              <div>
                <p className="text-sm text-muted-foreground">{t.pendingVerification}</p>
                <p className="text-2xl font-bold">{doctors.filter(d => !d.is_verified).length}</p>
              </div>
              <div className="p-3 bg-yellow-100 rounded-xl">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className={`flex flex-col sm:flex-row gap-4 ${dir === 'rtl' ? 'sm:flex-row-reverse' : ''}`}>
            <div className="relative flex-1">
              <Search className={`absolute top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground ${dir === 'rtl' ? 'right-3' : 'left-3'}`} />
              <Input
                placeholder={t.search}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`${dir === 'rtl' ? 'pr-10 text-right' : 'pl-10'}`}
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t.all}</SelectItem>
                <SelectItem value="verified">{t.verified}</SelectItem>
                <SelectItem value="pending">{t.pending}</SelectItem>
                <SelectItem value="suspended">{t.suspended}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Doctors Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : filteredDoctors.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {t.noDoctors}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr className={dir === 'rtl' ? 'text-right' : 'text-left'}>
                    <th className="px-4 py-3 font-medium text-sm">{t.name}</th>
                    <th className="px-4 py-3 font-medium text-sm">{t.specialty}</th>
                    <th className="px-4 py-3 font-medium text-sm">{t.clinic}</th>
                    <th className="px-4 py-3 font-medium text-sm">{t.services}</th>
                    <th className="px-4 py-3 font-medium text-sm">{t.fee}</th>
                    <th className="px-4 py-3 font-medium text-sm">{t.rating}</th>
                    <th className="px-4 py-3 font-medium text-sm">{t.status}</th>
                    <th className="px-4 py-3 font-medium text-sm">{t.actions}</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredDoctors.map((doctor) => (
                    <tr key={doctor.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className={`flex items-center gap-3 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                          <Avatar className="h-9 w-9">
                            <AvatarImage src={doctor.profile?.avatar_url || undefined} />
                            <AvatarFallback className="bg-primary/10 text-primary">
                              {doctor.profile?.full_name?.charAt(0) || 'D'}
                            </AvatarFallback>
                          </Avatar>
                          <div className={dir === 'rtl' ? 'text-right' : ''}>
                            <span className="font-medium block">{doctor.profile?.full_name || 'Unknown'}</span>
                            <span className="text-xs text-muted-foreground">{doctor.profile?.email}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {language === 'ar' ? doctor.specialty_ar : doctor.specialty}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {language === 'ar' ? doctor.clinic_name_ar : doctor.clinic_name}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          {doctor.supports_in_person && (
                            <Badge variant="outline" className="text-xs">
                              <Building className="h-3 w-3 mr-1" />
                            </Badge>
                          )}
                          {doctor.supports_e_visit && (
                            <Badge variant="outline" className="text-xs bg-purple-50">
                              <Video className="h-3 w-3 mr-1" />
                            </Badge>
                          )}
                          {doctor.supports_home_visit && (
                            <Badge variant="outline" className="text-xs bg-green-50">
                              <Home className="h-3 w-3 mr-1" />
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm font-medium">
                        {doctor.consultation_fee} {t.dzd}
                      </td>
                      <td className="px-4 py-3">
                        <div className={`flex items-center gap-1 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          <span className="text-sm font-medium">{doctor.rating || 0}</span>
                          <span className="text-xs text-muted-foreground">({doctor.review_count || 0})</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          {doctor.is_verified ? (
                            <Badge className="bg-green-100 text-green-800 border-green-200 text-xs">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              {t.verified}
                            </Badge>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-6 text-xs bg-yellow-50 border-yellow-300 text-yellow-700 hover:bg-yellow-100"
                              onClick={() => handleVerifyDoctor(doctor.id)}
                            >
                              <CheckCircle className="h-3 w-3 mr-1" />
                              {t.verify}
                            </Button>
                          )}
                          {!doctor.is_active && (
                            <Badge variant="destructive" className="text-xs">
                              {t.suspended}
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align={dir === 'rtl' ? 'start' : 'end'}>
                            <DropdownMenuItem onClick={() => {
                              setSelectedDoctor(doctor)
                              setIsViewModalOpen(true)
                            }}>
                              <Eye className="h-4 w-4 mr-2" />
                              {t.view}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => {
                              setSelectedDoctor(doctor)
                              setIsEditModalOpen(true)
                            }}>
                              <Pencil className="h-4 w-4 mr-2" />
                              {t.edit}
                            </DropdownMenuItem>
                            {!doctor.is_verified && (
                              <DropdownMenuItem onClick={() => handleVerifyDoctor(doctor.id)}>
                                <CheckCircle className="h-4 w-4 mr-2" />
                                {t.verify}
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => handleViewAppointments(doctor)}>
                              <Calendar className="h-4 w-4 mr-2" />
                              {t.viewAppointments}
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Mail className="h-4 w-4 mr-2" />
                              {t.sendEmail}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleToggleActive(doctor.id, doctor.is_active)}>
                              {doctor.is_active ? (
                                <>
                                  <Ban className="h-4 w-4 mr-2" />
                                  {t.suspend}
                                </>
                              ) : (
                                <>
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  {t.activate}
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="text-red-600"
                              onClick={() => {
                                setSelectedDoctor(doctor)
                                setIsDeleteModalOpen(true)
                              }}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              {t.delete}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Doctor Modal */}
      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t.doctorDetails}</DialogTitle>
          </DialogHeader>
          {selectedDoctor && (
            <div className="space-y-4">
              <div className={`flex items-center gap-4 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                <Avatar className="h-16 w-16">
                  <AvatarImage src={selectedDoctor.profile?.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary text-xl">
                    {selectedDoctor.profile?.full_name?.charAt(0) || 'D'}
                  </AvatarFallback>
                </Avatar>
                <div className={dir === 'rtl' ? 'text-right' : ''}>
                  <h3 className="font-semibold text-lg">{selectedDoctor.profile?.full_name}</h3>
                  <p className="text-muted-foreground">{selectedDoctor.specialty}</p>
                  <div className="flex gap-2 mt-1">
                    {selectedDoctor.is_verified ? (
                      <Badge className="bg-green-100 text-green-800">{t.verified}</Badge>
                    ) : (
                      <Badge variant="outline" className="text-yellow-600">{t.pending}</Badge>
                    )}
                    {selectedDoctor.is_active ? (
                      <Badge className="bg-blue-100 text-blue-800">{t.active}</Badge>
                    ) : (
                      <Badge variant="destructive">{t.inactive}</Badge>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{selectedDoctor.profile?.email}</span>
                  </div>
                  {selectedDoctor.clinic_phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{selectedDoctor.clinic_phone}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm">
                    <Building className="h-4 w-4 text-muted-foreground" />
                    <span>{selectedDoctor.clinic_name}</span>
                  </div>
                  {selectedDoctor.clinic_address && (
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span>{selectedDoctor.clinic_address}</span>
                    </div>
                  )}
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <span>{t.fee}: {selectedDoctor.consultation_fee} {t.dzd}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>{t.experience}: {selectedDoctor.experience_years} {t.years}</span>
                  </div>
                  {selectedDoctor.license_number && (
                    <div className="flex items-center gap-2 text-sm">
                      <FileCheck className="h-4 w-4 text-muted-foreground" />
                      <span>{t.license}: {selectedDoctor.license_number}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm">
                    <Star className="h-4 w-4 text-yellow-500" />
                    <span>{selectedDoctor.rating || 0} ({selectedDoctor.review_count || 0} {t.reviews})</span>
                  </div>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium">{t.services}</Label>
                <div className="flex gap-2 mt-2">
                  {selectedDoctor.supports_in_person && (
                    <Badge variant="outline">
                      <Building className="h-3 w-3 mr-1" />
                      {t.inPerson}
                    </Badge>
                  )}
                  {selectedDoctor.supports_e_visit && (
                    <Badge variant="outline" className="bg-purple-50">
                      <Video className="h-3 w-3 mr-1" />
                      {t.eVisit} ({selectedDoctor.e_visit_fee} {t.dzd})
                    </Badge>
                  )}
                  {selectedDoctor.supports_home_visit && (
                    <Badge variant="outline" className="bg-green-50">
                      <Home className="h-3 w-3 mr-1" />
                      {t.homeVisit} ({selectedDoctor.home_visit_fee} {t.dzd})
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewModalOpen(false)} className="bg-transparent">
              {t.cancel}
            </Button>
            {selectedDoctor && !selectedDoctor.is_verified && (
              <Button onClick={() => {
                handleVerifyDoctor(selectedDoctor.id)
                setIsViewModalOpen(false)
              }} className="bg-green-600 hover:bg-green-700">
                <CheckCircle className="h-4 w-4 mr-2" />
                {t.verify}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-red-600">{t.deleteDoctor}</DialogTitle>
            <DialogDescription>{t.deleteConfirm}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)} className="bg-transparent">
              {t.cancel}
            </Button>
            <Button variant="destructive" onClick={handleDeleteDoctor}>
              {t.confirmDelete}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Appointments Modal */}
      <Dialog open={isAppointmentsModalOpen} onOpenChange={setIsAppointmentsModalOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              {t.viewAppointments} - {selectedDoctor?.profile?.full_name}
            </DialogTitle>
            <DialogDescription>
              {language === 'ar' ? 'عرض وإدارة مواعيد هذا الطبيب' : language === 'fr' ? 'Voir et gérer les rendez-vous de ce médecin' : 'View and manage appointments for this doctor'}
            </DialogDescription>
          </DialogHeader>
          
          {appointmentsLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : doctorAppointments.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {language === 'ar' ? 'لا توجد مواعيد' : language === 'fr' ? 'Aucun rendez-vous' : 'No appointments found'}
            </div>
          ) : (
            <div className="space-y-3">
              {doctorAppointments.map((appointment) => (
                <div 
                  key={appointment.id} 
                  className={`border rounded-lg p-4 ${
                    appointment.status === 'cancelled' ? 'bg-red-50 border-red-200' :
                    appointment.status === 'completed' ? 'bg-green-50 border-green-200' :
                    appointment.status === 'pending_approval' ? 'bg-yellow-50 border-yellow-200' :
                    'bg-card'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="font-medium">{appointment.patient?.full_name || 'Guest'}</span>
                        <Badge variant="outline" className={
                          appointment.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                          appointment.status === 'completed' ? 'bg-green-100 text-green-700' :
                          appointment.status === 'confirmed' ? 'bg-blue-100 text-blue-700' :
                          appointment.status === 'pending_approval' ? 'bg-yellow-100 text-yellow-700' :
                          ''
                        }>
                          {appointment.status}
                        </Badge>
                        <Badge variant="outline">
                          {appointment.visit_type === 'home-visit' ? 'Home Visit' : 
                           appointment.visit_type === 'e-visit' ? 'E-Visit' : 'In-Person'}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          <span>{appointment.appointment_date || 'TBD'} at {appointment.appointment_time || 'TBD'}</span>
                        </div>
                        {appointment.patient?.email && (
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4" />
                            <span>{appointment.patient.email}</span>
                          </div>
                        )}
                        {appointment.patient?.phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4" />
                            <span>{appointment.patient.phone}</span>
                          </div>
                        )}
                        {appointment.home_visit_address && (
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            <span>{appointment.home_visit_address}, {appointment.home_visit_city}</span>
                          </div>
                        )}
                        {appointment.symptoms && (
                          <div className="mt-2 text-xs bg-muted p-2 rounded">
                            <strong>Symptoms:</strong> {appointment.symptoms}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 ml-4">
                      {appointment.status !== 'cancelled' && appointment.status !== 'completed' && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="text-orange-600 border-orange-300 hover:bg-orange-50 bg-transparent"
                          onClick={() => handleCancelAppointment(appointment.id)}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Cancel
                        </Button>
                      )}
                      <Button 
                        size="sm" 
                        variant="outline"
                        className="text-red-600 border-red-300 hover:bg-red-50 bg-transparent"
                        onClick={() => handleDeleteAppointment(appointment.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAppointmentsModalOpen(false)} className="bg-transparent">
              {t.cancel}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Doctor Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t.addDoctor}</DialogTitle>
            <DialogDescription>Create a new doctor account</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Full Name *</Label>
              <Input
                value={newDoctor.full_name}
                onChange={(e) => setNewDoctor({ ...newDoctor, full_name: e.target.value })}
                placeholder="Dr. John Doe"
              />
            </div>
            <div className="space-y-2">
              <Label>Email *</Label>
              <Input
                type="email"
                value={newDoctor.email}
                onChange={(e) => setNewDoctor({ ...newDoctor, email: e.target.value })}
                placeholder="doctor@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label>Password *</Label>
              <Input
                type="password"
                value={newDoctor.password}
                onChange={(e) => setNewDoctor({ ...newDoctor, password: e.target.value })}
                placeholder="Minimum 6 characters"
              />
            </div>
            <div className="space-y-2">
              <Label>Specialty *</Label>
              <Input
                value={newDoctor.specialty}
                onChange={(e) => setNewDoctor({ ...newDoctor, specialty: e.target.value })}
                placeholder="Cardiology, Pediatrics, etc."
              />
            </div>
            <div className="space-y-2">
              <Label>Clinic Name</Label>
              <Input
                value={newDoctor.clinic_name}
                onChange={(e) => setNewDoctor({ ...newDoctor, clinic_name: e.target.value })}
                placeholder="Clinic/Hospital Name"
              />
            </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <PhoneInput
                  value={newDoctor.phone}
                  onChange={(value) => setNewDoctor({ ...newDoctor, phone: value })}
                />
              </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddModalOpen(false)} className="bg-transparent">
              Cancel
            </Button>
            <Button onClick={handleAddDoctor}>
              <UserPlus className="h-4 w-4 mr-2" />
              Add Doctor
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
