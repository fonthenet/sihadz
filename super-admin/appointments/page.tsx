'use client'

import React, { useState, useEffect } from 'react'
import { useLanguage } from '@/lib/i18n/language-context'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { createBrowserClient } from '@/lib/supabase'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import Loading from './loading'

import {
  Search,
  MoreVertical,
  Eye,
  Trash2,
  CheckCircle,
  XCircle,
  Calendar,
  Clock,
  Download,
  RefreshCw,
  Video,
  Building,
  Home,
  DollarSign,
  User,
  Stethoscope,
  Filter,
  AlertCircle
} from 'lucide-react'

interface Appointment {
  id: string
  patient_id?: string
  doctor_id: string
  appointment_date: string
  appointment_time?: string
  visit_type: string
  status: string
  symptoms?: string
  consultation_fee: number
  payment_status?: string
  payment_method?: string
  is_guest_booking: boolean
  guest_name?: string
  guest_phone?: string
  guest_email?: string
  home_visit_address?: string
  created_at: string
  patient?: {
    full_name: string
    email: string
    phone?: string
  }
  doctor?: {
    specialty: string
    clinic_name: string
    profile?: {
      full_name: string
    }
  }
}

export default function AppointmentsManagementPage() {
  const { language, dir } = useLanguage()
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterType, setFilterType] = useState('all')
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null)
  const [isViewModalOpen, setIsViewModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const searchParams = useSearchParams()

  const texts = {
    en: {
      title: 'Appointments Management',
      description: 'View and manage all platform appointments',
      search: 'Search appointments...',
      all: 'All',
      confirmed: 'Confirmed',
      pending: 'Pending',
      completed: 'Completed',
      cancelled: 'Cancelled',
      pendingApproval: 'Pending Approval',
      inPerson: 'In-Person',
      eVisit: 'E-Visit',
      homeVisit: 'Home Visit',
      export: 'Export',
      refresh: 'Refresh',
      patient: 'Patient',
      doctor: 'Doctor',
      date: 'Date',
      time: 'Time',
      type: 'Type',
      status: 'Status',
      fee: 'Fee',
      payment: 'Payment',
      actions: 'Actions',
      view: 'View',
      cancel: 'Cancel',
      delete: 'Delete',
      approve: 'Approve',
      reject: 'Reject',
      appointmentDetails: 'Appointment Details',
      deleteAppointment: 'Delete Appointment',
      deleteConfirm: 'Are you sure you want to delete this appointment?',
      confirmDelete: 'Yes, Delete',
      noAppointments: 'No appointments found',
      totalAppointments: 'Total',
      todayAppointments: 'Today',
      pendingPayments: 'Pending Payments',
      dzd: 'DZD',
      paid: 'Paid',
      unpaid: 'Unpaid',
      cash: 'Cash',
      online: 'Online',
      guest: 'Guest',
      symptoms: 'Symptoms',
      address: 'Home Address',
      close: 'Close',
      filterByStatus: 'Filter by Status',
      filterByType: 'Filter by Type'
    },
    fr: {
      title: 'Gestion des Rendez-vous',
      description: 'Voir et gérer tous les rendez-vous de la plateforme',
      search: 'Rechercher des rendez-vous...',
      all: 'Tous',
      confirmed: 'Confirmé',
      pending: 'En attente',
      completed: 'Terminé',
      cancelled: 'Annulé',
      pendingApproval: 'Approbation en attente',
      inPerson: 'En cabinet',
      eVisit: 'Téléconsultation',
      homeVisit: 'Visite à domicile',
      export: 'Exporter',
      refresh: 'Actualiser',
      patient: 'Patient',
      doctor: 'Médecin',
      date: 'Date',
      time: 'Heure',
      type: 'Type',
      status: 'Statut',
      fee: 'Tarif',
      payment: 'Paiement',
      actions: 'Actions',
      view: 'Voir',
      cancel: 'Annuler',
      delete: 'Supprimer',
      approve: 'Approuver',
      reject: 'Rejeter',
      appointmentDetails: 'Détails du rendez-vous',
      deleteAppointment: 'Supprimer le rendez-vous',
      deleteConfirm: 'Êtes-vous sûr de vouloir supprimer ce rendez-vous?',
      confirmDelete: 'Oui, Supprimer',
      noAppointments: 'Aucun rendez-vous trouvé',
      totalAppointments: 'Total',
      todayAppointments: 'Aujourd\'hui',
      pendingPayments: 'Paiements en attente',
      dzd: 'DZD',
      paid: 'Payé',
      unpaid: 'Non payé',
      cash: 'Espèces',
      online: 'En ligne',
      guest: 'Invité',
      symptoms: 'Symptômes',
      address: 'Adresse domicile',
      close: 'Fermer',
      filterByStatus: 'Filtrer par statut',
      filterByType: 'Filtrer par type'
    },
    ar: {
      title: 'إدارة المواعيد',
      description: 'عرض وإدارة جميع مواعيد المنصة',
      search: 'البحث عن المواعيد...',
      all: 'الكل',
      confirmed: 'مؤكد',
      pending: 'قيد الانتظار',
      completed: 'مكتمل',
      cancelled: 'ملغي',
      pendingApproval: 'في انتظار الموافقة',
      inPerson: 'في العيادة',
      eVisit: 'عن بعد',
      homeVisit: 'زيارة منزلية',
      export: 'تصدير',
      refresh: 'تحديث',
      patient: 'المريض',
      doctor: 'الطبيب',
      date: 'التاريخ',
      time: 'الوقت',
      type: 'النوع',
      status: 'الحالة',
      fee: 'الرسوم',
      payment: 'الدفع',
      actions: 'الإجراءات',
      view: 'عرض',
      cancel: 'إلغاء',
      delete: 'حذف',
      approve: 'موافقة',
      reject: 'رفض',
      appointmentDetails: 'تفاصيل الموعد',
      deleteAppointment: 'حذف الموعد',
      deleteConfirm: 'هل أنت متأكد من حذف هذا الموعد؟',
      confirmDelete: 'نعم، احذف',
      noAppointments: 'لا توجد مواعيد',
      totalAppointments: 'الإجمالي',
      todayAppointments: 'اليوم',
      pendingPayments: 'مدفوعات معلقة',
      dzd: 'د.ج',
      paid: 'مدفوع',
      unpaid: 'غير مدفوع',
      cash: 'نقداً',
      online: 'إلكتروني',
      guest: 'ضيف',
      symptoms: 'الأعراض',
      address: 'عنوان المنزل',
      close: 'إغلاق',
      filterByStatus: 'تصفية حسب الحالة',
      filterByType: 'تصفية حسب النوع'
    }
  }

  const t = texts[language]

  useEffect(() => {
    fetchAppointments()
  }, [filterStatus, filterType])

  const fetchAppointments = async () => {
    setIsLoading(true)
    const supabase = createBrowserClient()
    
    try {
      let query = supabase
        .from('appointments')
        .select(`
          *,
          patient:patient_id (
            full_name,
            email,
            phone
          ),
          doctor:doctor_id (
            specialty,
            clinic_name,
            profile:user_id (
              full_name
            )
          )
        `)
        .order('created_at', { ascending: false })

      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus)
      }

      if (filterType !== 'all') {
        query = query.eq('visit_type', filterType)
      }

      const { data, error } = await query.limit(100)

      if (error) throw error
      setAppointments(data || [])
    } catch (error) {
      console.error('Error fetching appointments:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpdateStatus = async (appointmentId: string, newStatus: string) => {
    const supabase = createBrowserClient()
    try {
      const updateData: any = { status: newStatus }
      if (newStatus === 'confirmed') {
        updateData.approved_at = new Date().toISOString()
      } else if (newStatus === 'rejected') {
        updateData.rejected_at = new Date().toISOString()
      }

      const { error } = await supabase
        .from('appointments')
        .update(updateData)
        .eq('id', appointmentId)

      if (error) throw error
      fetchAppointments()
    } catch (error) {
      console.error('Error updating appointment:', error)
    }
  }

  const handleDeleteAppointment = async () => {
    if (!selectedAppointment) return
    
    const supabase = createBrowserClient()
    try {
      const { error } = await supabase
        .from('appointments')
        .delete()
        .eq('id', selectedAppointment.id)

      if (error) throw error
      
      fetchAppointments()
      setIsDeleteModalOpen(false)
    } catch (error) {
      console.error('Error deleting appointment:', error)
    }
  }

  const filteredAppointments = appointments.filter(apt => {
    const searchLower = searchQuery.toLowerCase()
    const patientName = apt.is_guest_booking 
      ? apt.guest_name?.toLowerCase() 
      : apt.patient?.full_name?.toLowerCase() || ''
    const doctorName = apt.doctor?.profile?.full_name?.toLowerCase() || ''
    
    return patientName?.includes(searchLower) || doctorName.includes(searchLower)
  })

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      confirmed: 'bg-green-100 text-green-800 border-green-200',
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      completed: 'bg-blue-100 text-blue-800 border-blue-200',
      cancelled: 'bg-red-100 text-red-800 border-red-200',
      pending_approval: 'bg-orange-100 text-orange-800 border-orange-200',
      rejected: 'bg-red-100 text-red-800 border-red-200'
    }
    const labels: Record<string, string> = {
      confirmed: t.confirmed,
      pending: t.pending,
      completed: t.completed,
      cancelled: t.cancelled,
      pending_approval: t.pendingApproval,
      rejected: t.cancelled
    }
    return <Badge className={styles[status] || styles.pending}>{labels[status] || status}</Badge>
  }

  const getVisitTypeIcon = (type: string) => {
    switch (type) {
      case 'e-visit': return <Video className="h-4 w-4 text-purple-600" />
      case 'home-visit': return <Home className="h-4 w-4 text-green-600" />
      default: return <Building className="h-4 w-4 text-blue-600" />
    }
  }

  const getVisitTypeLabel = (type: string) => {
    switch (type) {
      case 'e-visit': return t.eVisit
      case 'home-visit': return t.homeVisit
      default: return t.inPerson
    }
  }

  const todayDate = new Date().toISOString().split('T')[0]
  const todayCount = appointments.filter(a => a.appointment_date === todayDate).length
  const pendingPaymentsCount = appointments.filter(a => a.payment_status === 'pending').length

  return (
    <Suspense fallback={<Loading />}>
      <div className="space-y-6">
        {/* Header */}
        <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${dir === 'rtl' ? 'sm:flex-row-reverse' : ''}`}>
          <div className={dir === 'rtl' ? 'text-right' : ''}>
            <h1 className="text-3xl font-bold">{t.title}</h1>
            <p className="text-muted-foreground">{t.description}</p>
          </div>
          <div className={`flex items-center gap-2 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
            <Button variant="outline" size="sm" onClick={fetchAppointments} className="bg-transparent">
              <RefreshCw className="h-4 w-4 mr-2" />
              {t.refresh}
            </Button>
            <Button variant="outline" size="sm" className="bg-transparent">
              <Download className="h-4 w-4 mr-2" />
              {t.export}
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="pt-6">
              <div className={`flex items-center justify-between ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                <div>
                  <p className="text-sm text-muted-foreground">{t.totalAppointments}</p>
                  <p className="text-2xl font-bold">{appointments.length}</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-xl">
                  <Calendar className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className={`flex items-center justify-between ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                <div>
                  <p className="text-sm text-muted-foreground">{t.todayAppointments}</p>
                  <p className="text-2xl font-bold">{todayCount}</p>
                </div>
                <div className="p-3 bg-green-100 rounded-xl">
                  <Clock className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className={`flex items-center justify-between ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                <div>
                  <p className="text-sm text-muted-foreground">{t.pendingPayments}</p>
                  <p className="text-2xl font-bold">{pendingPaymentsCount}</p>
                </div>
                <div className="p-3 bg-yellow-100 rounded-xl">
                  <DollarSign className="h-6 w-6 text-yellow-600" />
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
                  <SelectValue placeholder={t.filterByStatus} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t.all}</SelectItem>
                  <SelectItem value="confirmed">{t.confirmed}</SelectItem>
                  <SelectItem value="pending">{t.pending}</SelectItem>
                  <SelectItem value="pending_approval">{t.pendingApproval}</SelectItem>
                  <SelectItem value="completed">{t.completed}</SelectItem>
                  <SelectItem value="cancelled">{t.cancelled}</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder={t.filterByType} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t.all}</SelectItem>
                  <SelectItem value="in-person">{t.inPerson}</SelectItem>
                  <SelectItem value="e-visit">{t.eVisit}</SelectItem>
                  <SelectItem value="home-visit">{t.homeVisit}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Appointments Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : filteredAppointments.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                {t.noAppointments}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr className={dir === 'rtl' ? 'text-right' : 'text-left'}>
                      <th className="px-4 py-3 font-medium text-sm">{t.patient}</th>
                      <th className="px-4 py-3 font-medium text-sm">{t.doctor}</th>
                      <th className="px-4 py-3 font-medium text-sm">{t.date}</th>
                      <th className="px-4 py-3 font-medium text-sm">{t.type}</th>
                      <th className="px-4 py-3 font-medium text-sm">{t.fee}</th>
                      <th className="px-4 py-3 font-medium text-sm">{t.status}</th>
                      <th className="px-4 py-3 font-medium text-sm">{t.payment}</th>
                      <th className="px-4 py-3 font-medium text-sm">{t.actions}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredAppointments.map((apt) => (
                      <tr key={apt.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3">
                          <div className={`flex items-center gap-2 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                            <User className="h-4 w-4 text-muted-foreground" />
                            <div className={dir === 'rtl' ? 'text-right' : ''}>
                              <span className="font-medium block text-sm">
                                {apt.is_guest_booking ? apt.guest_name : apt.patient?.full_name || 'Unknown'}
                              </span>
                              {apt.is_guest_booking && (
                                <Badge variant="outline" className="text-xs mt-1">{t.guest}</Badge>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className={`flex items-center gap-2 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                            <Stethoscope className="h-4 w-4 text-muted-foreground" />
                            <div className={dir === 'rtl' ? 'text-right' : ''}>
                              <span className="font-medium block text-sm">
                                {apt.doctor?.profile?.full_name || 'Unknown'}
                              </span>
                              <span className="text-xs text-muted-foreground">{apt.doctor?.specialty}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <div className={dir === 'rtl' ? 'text-right' : ''}>
                            <span className="block">{apt.appointment_date || '-'}</span>
                            <span className="text-xs text-muted-foreground">{apt.appointment_time || '-'}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className={`gap-1 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                            {getVisitTypeIcon(apt.visit_type)}
                            {getVisitTypeLabel(apt.visit_type)}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-sm font-medium">
                          {apt.consultation_fee} {t.dzd}
                        </td>
                        <td className="px-4 py-3">
                          {getStatusBadge(apt.status)}
                        </td>
                        <td className="px-4 py-3">
                          <Badge 
                            variant="outline" 
                            className={apt.payment_status === 'paid' ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'}
                          >
                            {apt.payment_status === 'paid' ? t.paid : t.unpaid}
                          </Badge>
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
                                setSelectedAppointment(apt)
                                setIsViewModalOpen(true)
                              }}>
                                <Eye className="h-4 w-4 mr-2" />
                                {t.view}
                              </DropdownMenuItem>
                              {apt.status === 'pending_approval' && (
                                <>
                                  <DropdownMenuItem onClick={() => handleUpdateStatus(apt.id, 'confirmed')}>
                                    <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                                    {t.approve}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleUpdateStatus(apt.id, 'rejected')}>
                                    <XCircle className="h-4 w-4 mr-2 text-red-600" />
                                    {t.reject}
                                  </DropdownMenuItem>
                                </>
                              )}
                              {apt.status === 'confirmed' && (
                                <DropdownMenuItem onClick={() => handleUpdateStatus(apt.id, 'cancelled')}>
                                  <XCircle className="h-4 w-4 mr-2" />
                                  {t.cancel}
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                className="text-red-600"
                                onClick={() => {
                                  setSelectedAppointment(apt)
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

        {/* View Appointment Modal */}
        <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{t.appointmentDetails}</DialogTitle>
            </DialogHeader>
            {selectedAppointment && (
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-muted-foreground">{t.patient}</p>
                      <p className="font-medium">
                        {selectedAppointment.is_guest_booking 
                          ? selectedAppointment.guest_name 
                          : selectedAppointment.patient?.full_name}
                        {selectedAppointment.is_guest_booking && (
                          <Badge variant="outline" className="ml-2 text-xs">{t.guest}</Badge>
                        )}
                      </p>
                      {selectedAppointment.is_guest_booking && selectedAppointment.guest_phone && (
                        <p className="text-sm text-muted-foreground">{selectedAppointment.guest_phone}</p>
                      )}
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">{t.doctor}</p>
                      <p className="font-medium">{selectedAppointment.doctor?.profile?.full_name}</p>
                      <p className="text-sm text-muted-foreground">{selectedAppointment.doctor?.specialty}</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-muted-foreground">{t.date} & {t.time}</p>
                      <p className="font-medium">{selectedAppointment.appointment_date || 'TBD'}</p>
                      <p className="text-sm">{selectedAppointment.appointment_time || 'TBD'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">{t.type}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {getVisitTypeIcon(selectedAppointment.visit_type)}
                        <span>{getVisitTypeLabel(selectedAppointment.visit_type)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-sm text-muted-foreground">{t.fee}</p>
                    <p className="font-medium">{selectedAppointment.consultation_fee} {t.dzd}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t.status}</p>
                    <div className="mt-1">{getStatusBadge(selectedAppointment.status)}</div>
                  </div>
                </div>

                {selectedAppointment.symptoms && (
                  <div>
                    <p className="text-sm text-muted-foreground">{t.symptoms}</p>
                    <p className="text-sm mt-1 p-2 bg-muted rounded">{selectedAppointment.symptoms}</p>
                  </div>
                )}

                {selectedAppointment.visit_type === 'home-visit' && selectedAppointment.home_visit_address && (
                  <div>
                    <p className="text-sm text-muted-foreground">{t.address}</p>
                    <p className="text-sm mt-1 p-2 bg-muted rounded">{selectedAppointment.home_visit_address}</p>
                  </div>
                )}
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsViewModalOpen(false)} className="bg-transparent">
                {t.close}
              </Button>
              {selectedAppointment?.status === 'pending_approval' && (
                <>
                  <Button 
                    variant="destructive"
                    onClick={() => {
                      handleUpdateStatus(selectedAppointment.id, 'rejected')
                      setIsViewModalOpen(false)
                    }}
                  >
                    {t.reject}
                  </Button>
                  <Button 
                    className="bg-green-600 hover:bg-green-700"
                    onClick={() => {
                      handleUpdateStatus(selectedAppointment.id, 'confirmed')
                      setIsViewModalOpen(false)
                    }}
                  >
                    {t.approve}
                  </Button>
                </>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Modal */}
        <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-red-600">{t.deleteAppointment}</DialogTitle>
              <DialogDescription>{t.deleteConfirm}</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)} className="bg-transparent">
                {t.close}
              </Button>
              <Button variant="destructive" onClick={handleDeleteAppointment}>
                {t.confirmDelete}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Suspense>
  )
}
