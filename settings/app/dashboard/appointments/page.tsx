'use client'

import { useState, useEffect } from 'react'
import { useLanguage } from '@/lib/i18n/language-context'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Calendar, Clock, MapPin, Video, Plus, Phone, MessageCircle } from 'lucide-react'
import Link from 'next/link'
import { useToast } from '@/hooks/use-toast'
import { createBrowserClient } from '@/lib/supabase/client'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useAuth } from '@/components/auth-provider'

export default function AppointmentsPage() {
  const { language, dir } = useLanguage()
  const { toast } = useToast()
  const { user } = useAuth()
  const supabase = createBrowserClient()
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
  const [successDialogOpen, setSuccessDialogOpen] = useState(false)
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null)
  const [appointments, setAppointments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  
  // Fetch appointments from database
  useEffect(() => {
    async function fetchAppointments() {
      if (!user) {
        setLoading(false)
        return
      }
      
      try {
        // Query appointments by patient_id OR by email for guest bookings
        const { data: appointmentsData, error: apptError} = await supabase
          .from('appointments')
          .select('*')
          .or(`patient_id.eq.${user.id},patient_email.eq.${user.email},guest_email.eq.${user.email}`)
          .order('appointment_date', { ascending: false })
        
        if (apptError || !appointmentsData || appointmentsData.length === 0) {
          setAppointments([])
          setLoading(false)
          return
        }

        // Get unique doctor IDs
        const doctorIds = [...new Set(appointmentsData.map(a => a.doctor_id).filter(Boolean))]
        
        // Fetch doctors info separately
        const { data: doctorsData } = await supabase
          .from('doctors')
          .select('*')
          .in('id', doctorIds)
        
        // Fetch doctor profiles for names
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', doctorIds)
        
        // Create lookup maps
        const doctorsMap = new Map((doctorsData || []).map(d => [d.id, d]))
        const profilesMap = new Map((profilesData || []).map(p => [p.id, p]))
        
        // Transform appointments
        const transformedData = appointmentsData.map(apt => {
          const doctor = doctorsMap.get(apt.doctor_id) || {}
          const profile = profilesMap.get(apt.doctor_id) || {}
          const appointmentDate = new Date(apt.appointment_date)
          const dateStr = appointmentDate.toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })
          const dateStrAr = appointmentDate.toLocaleDateString('ar-DZ', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
          
          return {
            id: apt.id,
            doctorName: profile.full_name || 'Doctor',
            doctorNameAr: profile.full_name || 'طبيب',
            specialty: doctor.specialty || 'General Medicine',
            specialtyAr: doctor.specialty_ar || 'طب عام',
            date: dateStr,
            dateAr: dateStrAr,
            time: apt.appointment_time?.substring(0, 5) || '00:00',
            location: apt.visit_type === 'e-visit' ? 'Video Call' : (doctor.clinic_name || 'Clinic'),
            locationAr: apt.visit_type === 'e-visit' ? 'مكالمة فيديو' : (doctor.clinic_name || 'عيادة'),
            type: apt.visit_type === 'e-visit' ? 'video' : 'in-person',
            status: apt.status,
            doctorPhone: doctor.clinic_phone || '+213555000000',
            rawData: apt
          }
        })
        
        console.log('[v0] Transformed appointments:', transformedData)
        setAppointments(transformedData)
      } catch (error) {
        console.error('[v0] Error fetching appointments:', error)
        setAppointments([])
      } finally {
        setLoading(false)
      }
    }
    
    fetchAppointments()
  }, [user, supabase])

  const handleJoinVideoCall = (appointmentId: string) => {
    console.log('[v0] Joining video call for appointment:', appointmentId)
    window.open(`/video-call/${appointmentId}`, '_blank')
  }

  const handleWhatsAppCall = (doctorPhone: string) => {
    window.open(`https://wa.me/${doctorPhone}`, '_blank')
  }

  const handlePhoneCall = (doctorPhone: string) => {
    window.location.href = `tel:${doctorPhone}`
  }

  const handleCancelAppointment = (appointmentId: string) => {
    setSelectedAppointmentId(appointmentId)
    setCancelDialogOpen(true)
  }

  const confirmCancelAppointment = async () => {
    if (selectedAppointmentId) {
      console.log('[v0] Cancelling appointment:', selectedAppointmentId)
      
      try {
        // Try to update in database if appointments were loaded from DB
        if (appointments.length > 0) {
          const { error } = await supabase
            .from('appointments')
            .update({ status: 'cancelled' })
            .eq('id', selectedAppointmentId)
          
          if (error) {
            console.error('[v0] Error cancelling appointment in DB:', error)
          }
        }
        
        // Save to localStorage for persistence with mock data
        const cancelledIds = JSON.parse(localStorage.getItem('cancelledAppointments') || '[]')
        if (!cancelledIds.includes(selectedAppointmentId)) {
          cancelledIds.push(selectedAppointmentId)
          localStorage.setItem('cancelledAppointments', JSON.stringify(cancelledIds))
        }
        
        // Always update local state regardless of DB success
        setAppointments(prev => prev.map(apt => 
          apt.id === selectedAppointmentId 
            ? { ...apt, status: 'cancelled' }
            : apt
        ))
        
        console.log('[v0] Appointment cancelled successfully')
        setCancelDialogOpen(false)
        
        // Show success confirmation dialog
        setSuccessDialogOpen(true)
      } catch (error) {
        console.error('[v0] Error:', error)
        toast({
          title: language === 'ar' ? 'خطأ' : language === 'fr' ? 'Erreur' : 'Error',
          description: language === 'ar' 
            ? 'فشل في إلغاء الموعد'
            : language === 'fr'
            ? 'Échec de l\'annulation du rendez-vous'
            : 'Failed to cancel appointment',
          variant: 'destructive'
        })
      }
    }
  }

  const upcomingAppointments = appointments.filter(apt => 
    apt.status === 'confirmed' || apt.status === 'pending'
  )
  const cancelledAppointments = appointments.filter(apt => apt.status === 'cancelled')
  const completedAppointments = appointments.filter(apt => apt.status === 'completed')

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center" dir={dir}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">
            {language === 'ar' ? 'جاري التحميل...' : language === 'fr' ? 'Chargement...' : 'Loading...'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background" dir={dir}>
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">
            {language === 'ar' ? 'مواعيدي' : language === 'fr' ? 'Mes Rendez-vous' : 'My Appointments'}
          </h1>
          <p className="text-muted-foreground">
            {language === 'ar' ? 'إدارة مواعيدك الطبية' : language === 'fr' ? 'Gérez vos rendez-vous médicaux' : 'Manage your medical appointments'}
          </p>
        </div>

        {/* New Appointment Button - Only show if there are upcoming appointments */}
        {upcomingAppointments.length > 0 && (
          <Link href="/booking/new">
            <Button className="mb-6 w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              {language === 'ar' ? 'حجز موعد جديد' : language === 'fr' ? 'Nouveau rendez-vous' : 'Book New Appointment'}
            </Button>
          </Link>
        )}

        {/* Upcoming Appointments */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">
            {language === 'ar' ? 'المواعيد القادمة' : language === 'fr' ? 'Rendez-vous à venir' : 'Upcoming Appointments'}
          </h2>
          
          {upcomingAppointments.length === 0 ? (
            <Card className="p-8 text-center">
              <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground mb-4">
                {language === 'ar' ? 'لا توجد مواعيد قادمة' : language === 'fr' ? 'Aucun rendez-vous à venir' : 'No upcoming appointments'}
              </p>
              <Link href="/booking/new">
                <Button>
                  {language === 'ar' ? 'احجز موعدك الأول' : language === 'fr' ? 'Réservez votre premier rendez-vous' : 'Book Your First Appointment'}
                </Button>
              </Link>
            </Card>
          ) : (
            <div className="space-y-4">
              {upcomingAppointments.map((apt) => (
                <Card key={apt.id} className="p-6">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div className="flex-1">
                      {/* Doctor Info */}
                      <div className="mb-3">
                        <h3 className="text-lg font-semibold mb-1">
                          {language === 'ar' ? apt.doctorNameAr : apt.doctorName}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {language === 'ar' ? apt.specialtyAr : apt.specialty}
                        </p>
                      </div>

                      {/* Appointment Details */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span>{language === 'ar' ? apt.dateAr : apt.date}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span>{apt.time}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          {apt.type === 'video' ? (
                            <Video className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                          )}
                          <span>{language === 'ar' ? apt.locationAr : apt.location}</span>
                        </div>
                      </div>
                    </div>

                    {/* Status & Actions */}
                    <div className="flex flex-col gap-3 sm:items-end sm:min-w-[200px]">
                      <Badge 
                        variant="outline" 
                        className={`w-fit ${
                          apt.status === 'confirmed' 
                            ? 'bg-green-50 text-green-700 hover:bg-green-50 border-green-200' 
                            : apt.status === 'cancelled'
                            ? 'bg-red-50 text-red-700 hover:bg-red-50 border-red-200'
                            : 'bg-blue-100 text-blue-700 hover:bg-blue-100 border-blue-200'
                        }`}
                      >
                        {apt.status === 'confirmed' 
                          ? (language === 'ar' ? 'مؤكد' : language === 'fr' ? 'Confirmé' : 'Confirmed')
                          : apt.status === 'cancelled'
                          ? (language === 'ar' ? 'ملغى' : language === 'fr' ? 'Annulé' : 'Cancelled')
                          : (language === 'ar' ? 'قيد الانتظار' : language === 'fr' ? 'En attente' : 'Pending')}
                      </Badge>
                      
                      <div className="flex flex-col gap-2 w-full sm:w-auto">
                        {apt.type === 'video' && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="sm" className="w-full sm:w-auto justify-start">
                                <Video className="h-4 w-4 mr-2" />
                                {language === 'ar' ? 'انضم للموعد' : language === 'fr' ? 'Rejoindre' : 'Join Meeting'}
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align={dir === 'rtl' ? 'start' : 'end'} className="w-56">
                              <DropdownMenuItem onClick={() => handleJoinVideoCall(apt.id)}>
                                <Video className="h-4 w-4 mr-2" />
                                {language === 'ar' ? 'مكالمة فيديو' : language === 'fr' ? 'Appel vidéo' : 'Video Call'}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleWhatsAppCall(apt.doctorPhone)}>
                                <MessageCircle className="h-4 w-4 mr-2" />
                                {language === 'ar' ? 'واتساب' : language === 'fr' ? 'WhatsApp' : 'WhatsApp'}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                        
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="sm" variant="outline" className="w-full sm:w-auto justify-start bg-transparent">
                              <Phone className="h-4 w-4 mr-2" />
                              {language === 'ar' ? 'اتصال' : language === 'fr' ? 'Contacter' : 'Contact'}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align={dir === 'rtl' ? 'start' : 'end'} className="w-56">
                            <DropdownMenuItem onClick={() => handlePhoneCall(apt.doctorPhone)}>
                              <Phone className="h-4 w-4 mr-2" />
                              {language === 'ar' ? 'مكالمة هاتفية' : language === 'fr' ? 'Appel' : 'Phone Call'}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleWhatsAppCall(apt.doctorPhone)}>
                              <MessageCircle className="h-4 w-4 mr-2" />
                              {language === 'ar' ? 'واتساب' : language === 'fr' ? 'WhatsApp' : 'WhatsApp'}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                        
                        <Button 
                          size="sm" 
                          variant="destructive" 
                          className="w-full sm:w-auto justify-start"
                          onClick={() => handleCancelAppointment(apt.id)}
                        >
                          {language === 'ar' ? 'إلغاء الموعد' : language === 'fr' ? 'Annuler' : 'Cancel Appointment'}
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Cancelled Appointments */}
        {cancelledAppointments.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">
              {language === 'ar' ? 'المواعيد الملغاة' : language === 'fr' ? 'Rendez-vous annulés' : 'Cancelled Appointments'}
            </h2>
            
            <div className="space-y-4">
              {cancelledAppointments.map((apt) => (
                <Card key={apt.id} className="p-6 border-destructive/30 bg-destructive/5">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div className="flex-1">
                      <div className="mb-3">
                        <h3 className="text-lg font-semibold mb-1">
                          {language === 'ar' ? apt.doctorNameAr : apt.doctorName}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {language === 'ar' ? apt.specialtyAr : apt.specialty}
                        </p>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span>{language === 'ar' ? apt.dateAr : apt.date}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span>{apt.time}</span>
                        </div>
                      </div>
                    </div>

                    <Badge variant="destructive" className="bg-rose-100 text-rose-700 hover:bg-rose-100 border-rose-200">
                      {language === 'ar' ? 'ملغى' : language === 'fr' ? 'Annulé' : 'Cancelled'}
                    </Badge>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Completed Appointments */}
        {completedAppointments.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold mb-4">
              {language === 'ar' ? 'المواعيد المكتملة' : language === 'fr' ? 'Rendez-vous terminés' : 'Completed Appointments'}
            </h2>
            
            <div className="space-y-4">
              {completedAppointments.map((apt) => (
                <Card key={apt.id} className="p-6 opacity-75">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div className="flex-1">
                      <div className="mb-3">
                        <h3 className="text-lg font-semibold mb-1">
                          {language === 'ar' ? apt.doctorNameAr : apt.doctorName}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {language === 'ar' ? apt.specialtyAr : apt.specialty}
                        </p>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span>{language === 'ar' ? apt.dateAr : apt.date}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span>{apt.time}</span>
                        </div>
                      </div>
                    </div>

                    <Badge variant="secondary" className="bg-slate-100 text-slate-700 hover:bg-slate-100 border-slate-200">
                      {language === 'ar' ? 'مكتمل' : language === 'fr' ? 'Terminé' : 'Completed'}
                    </Badge>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {language === 'ar' ? 'إلغاء الموعد' : language === 'fr' ? 'Annuler le rendez-vous' : 'Cancel Appointment'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {language === 'ar' 
                ? 'هل أنت متأكد أنك تريد إلغاء هذا الموعد؟ لا يمكن التراجع عن هذا الإجراء.'
                : language === 'fr'
                ? 'Êtes-vous sûr de vouloir annuler ce rendez-vous ? Cette action ne peut pas être annulée.'
                : 'Are you sure you want to cancel this appointment? This action cannot be undone.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {language === 'ar' ? 'رجوع' : language === 'fr' ? 'Retour' : 'Go Back'}
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmCancelAppointment} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {language === 'ar' ? 'نعم، إلغاء الموعد' : language === 'fr' ? 'Oui, annuler' : 'Yes, Cancel Appointment'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Success Confirmation Dialog */}
      <AlertDialog open={successDialogOpen} onOpenChange={(open) => {
        setSuccessDialogOpen(open)
        if (!open) {
          setSelectedAppointmentId(null)
        }
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-center">
              {language === 'ar' ? '✓ تم الإلغاء بنجاح' : language === 'fr' ? '✓ Annulation réussie' : '✓ Cancellation Successful'}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center pt-2">
              {language === 'ar' 
                ? 'تم إلغاء موعدك بنجاح. يمكنك العثور عليه في قسم المواعيد الملغاة أدناه.'
                : language === 'fr'
                ? 'Votre rendez-vous a été annulé avec succès. Vous pouvez le retrouver dans la section des rendez-vous annulés ci-dessous.'
                : 'Your appointment has been cancelled successfully. You can find it in the cancelled appointments section below.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:justify-center">
            <AlertDialogAction onClick={() => setSuccessDialogOpen(false)} className="w-full sm:w-auto">
              {language === 'ar' ? 'حسناً' : language === 'fr' ? 'D\'accord' : 'OK'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
