'use client'

import { useState, useEffect, useCallback } from 'react'
import { createBrowserClient } from '@/lib/supabase/client'
import { parseDateOnlyAsLocal, formatDateAlgeria } from '@/lib/date-algeria'

export function usePatientAppointments(userId: string | undefined, language: string) {
  const [appointments, setAppointments] = useState<any[]>([])
  const [tickets, setTickets] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createBrowserClient()

  const fetchTickets = useCallback(async (): Promise<any[]> => {
    if (!userId) return []
    const { data, error } = await supabase
      .from('healthcare_tickets')
      .select('*')
      .eq('patient_id', userId)
      .order('created_at', { ascending: false })
    if (error) {
      console.error('[usePatientAppointments] Tickets fetch error:', error)
      return []
    }
    return data ?? []
  }, [userId, supabase])

  const fetchAppointments = useCallback(async (): Promise<any[]> => {
    if (!userId) return []
    const lang = language === 'ar' ? 'ar' : language === 'fr' ? 'fr' : 'en'
    
    let appointmentsData: any[] | null = null
    let error: any = null
    
    try {
      const result = await supabase
        .from('appointments')
        .select('*')
        .eq('patient_id', userId)
        .order('appointment_date', { ascending: false })
      appointmentsData = result.data
      error = result.error
    } catch (e: any) {
      console.error('[usePatientAppointments] Exception during fetch:', e?.message || e)
      return []
    }
    
    if (error) {
      // Log all possible error properties
      const errStr = typeof error === 'object' ? JSON.stringify(error) : String(error)
      console.error('[usePatientAppointments] Appointments fetch error:', errStr, {
        code: error?.code,
        message: error?.message,
        details: error?.details,
        hint: error?.hint,
        status: error?.status,
        statusText: error?.statusText,
      })
      return []
    }
    if (!appointmentsData?.length) return []

    const appointmentIds = appointmentsData.map((a: any) => a.id)
    const { data: ticketsData } = await supabase
      .from('healthcare_tickets')
      .select('id, ticket_number, appointment_id, status, ticket_type, metadata')
      .eq('patient_id', userId)
      .in('appointment_id', appointmentIds)
    const ticketByAppointmentId = new Map<string, any>()
    if (ticketsData) {
      ticketsData.forEach((t: any) => {
        if (t.appointment_id) ticketByAppointmentId.set(t.appointment_id, t)
      })
    }

    const { data: prescriptionsData } = await supabase
      .from('prescriptions')
      .select('id, appointment_id, pharmacy_id')
      .in('appointment_id', appointmentIds)
      .not('pharmacy_id', 'is', null)
    const pharmacyIdsFromPrescriptions = [...new Set((prescriptionsData || []).map((p: any) => p.pharmacy_id).filter(Boolean))] as string[]
    const { data: pharmacyProfessionalsData } = pharmacyIdsFromPrescriptions.length
      ? await supabase
          .from('professionals')
          .select('id, business_name')
          .in('id', pharmacyIdsFromPrescriptions)
      : { data: [] }
    const pharmacyNameById = new Map((pharmacyProfessionalsData || []).map((p: any) => [p.id, p.business_name || 'Pharmacy']))
    const pharmacyNameByAppointmentId = new Map<string, string>()
    ;(prescriptionsData || []).forEach((p: any) => {
      if (p.appointment_id && p.pharmacy_id) {
        const name = pharmacyNameById.get(p.pharmacy_id)
        if (name) pharmacyNameByAppointmentId.set(p.appointment_id, name)
      }
    })

    const providerIds = [...new Set(
      appointmentsData.map((a: any) => a.doctor_id ?? a.professional_id).filter(Boolean)
    )] as string[]
    const { data: professionalsData } = providerIds.length
      ? await supabase
          .from('professionals')
          .select('id, business_name, business_name_ar, specialty, specialty_ar, phone, address')
          .in('id', providerIds)
      : { data: [] }
    const { data: doctorsData } = providerIds.length
      ? await supabase.from('doctors').select('id, full_name').in('id', providerIds)
      : { data: [] }
    const { data: profilesData } = providerIds.length
      ? await supabase.from('profiles').select('id, full_name').in('id', providerIds)
      : { data: [] }
    const professionalsMap = new Map((professionalsData || []).map((p: any) => [p.id, p]))
    const doctorNameByProviderId = new Map<string, string>()
    ;(doctorsData || []).forEach((d: any) => { if (d?.full_name?.trim()) doctorNameByProviderId.set(d.id, d.full_name.trim()) })
    ;(profilesData || []).forEach((p: any) => { if (p?.full_name?.trim() && !doctorNameByProviderId.has(p.id)) doctorNameByProviderId.set(p.id, p.full_name.trim()) })

    const transformed: any[] = []
    for (const apt of appointmentsData) {
      try {
        const providerId = apt.doctor_id ?? apt.professional_id
        const pro = professionalsMap.get(providerId) || {}
        const dispName = apt.doctor_display_name?.trim() || null
        const fallbackName = doctorNameByProviderId.get(providerId) || null
        const dispSpecialty = apt.doctor_specialty?.trim() || null
        const d = parseDateOnlyAsLocal(apt.appointment_date) ?? new Date(0)
        const dateStr = formatDateAlgeria(d, lang as 'ar' | 'fr' | 'en', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })
        const dateStrAr = formatDateAlgeria(d, 'ar', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
        const timeStr = typeof apt.appointment_time === 'string' ? apt.appointment_time.substring(0, 5) : '00:00'
        const isEvisit = apt.visit_type === 'e-visit'
        const ticket = ticketByAppointmentId.get(apt.id)
        const resolvedDoctorName = dispName || pro.business_name || fallbackName || 'Doctor'
        const resolvedDoctorNameAr = dispName || pro.business_name_ar || pro.business_name || fallbackName || 'طبيب'
        transformed.push({
          id: apt.id,
          doctorName: resolvedDoctorName,
          doctorNameAr: resolvedDoctorNameAr,
          specialty: dispSpecialty || pro.specialty || 'General Medicine',
          specialtyAr: dispSpecialty || pro.specialty_ar || pro.specialty || 'طب عام',
          date: dateStr,
          dateAr: dateStrAr,
          time: timeStr,
          location: isEvisit ? 'Video Call' : (pro.address || 'Clinic'),
          locationAr: isEvisit ? 'مكالمة فيديو' : (pro.address || 'عيادة'),
          type: isEvisit ? 'video' : 'in-person',
          status: apt.status,
          doctorPhone: pro.phone || '+213555000000',
          rawData: apt,
          appointment_date: apt.appointment_date,
          appointment_time: apt.appointment_time,
          appointment_type: isEvisit ? 'e-visit' : 'in-person',
          formattedDate: dateStr,
          formattedDateAr: dateStrAr,
          doctor: { address: isEvisit ? undefined : (pro.address || 'Clinic'), phone: pro.phone || '+213555000000' },
          ticket_number: ticket?.ticket_number || null,
          ticket_id: ticket?.id || null,
          ticket_status: ticket?.status || null,
          pharmacy_name: ticket?.metadata?.pharmacy_name || pharmacyNameByAppointmentId.get(apt.id) || null,
          doctor_id: apt.doctor_id ?? apt.professional_id,
        })
      } catch (e) {
        console.warn('[usePatientAppointments] Skip transform for apt', apt?.id, e)
      }
    }
    return transformed
  }, [userId, language, supabase])

  const fetchData = useCallback(async (opts?: { silent?: boolean }) => {
    if (!userId) {
      setLoading(false)
      return
    }
    if (!opts?.silent) setLoading(true)
    try {
      const [list, ticketsList] = await Promise.all([
        fetchAppointments(),
        fetchTickets(),
      ])
      setAppointments(list)
      setTickets(ticketsList)
    } catch (error) {
      console.error('[usePatientAppointments] Error:', error)
      setAppointments([])
      setTickets([])
    } finally {
      if (!opts?.silent) setLoading(false)
    }
  }, [userId, fetchAppointments, fetchTickets])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const appointmentsById = new Map(appointments.map(apt => [apt.id, apt]))
  const ticketsWithAppointments = new Set<string>()
  tickets.forEach(t => {
    if (t.appointment_id && appointmentsById.has(t.appointment_id)) {
      ticketsWithAppointments.add(t.id)
    }
  })
  const standaloneTickets = tickets.filter(t => !ticketsWithAppointments.has(t.id))
  const standaloneAsAppointments = standaloneTickets.map(ticket => {
    const ticketDate = ticket.metadata?.appointment_date || ticket.created_at
    const ticketTime = ticket.metadata?.appointment_time || ''
    const isCompleted = ticket.status === 'completed' || ticket.status === 'visit_completed'
    return {
      id: `ticket-${ticket.id}`,
      ticket_id: ticket.id,
      ticket_number: ticket.ticket_number,
      ticket_status: ticket.status,
      ticket_type: ticket.ticket_type || ticket.type,
      isStandaloneTicket: true,
      doctorName: ticket.metadata?.doctor_name || 'Healthcare Provider',
      doctorNameAr: ticket.metadata?.doctor_name || 'مقدم الرعاية الصحية',
      specialty: ticket.ticket_type === 'prescription' ? 'Prescription' : ticket.ticket_type === 'lab_request' ? 'Lab Request' : 'Healthcare',
      specialtyAr: ticket.ticket_type === 'prescription' ? 'وصفة طبية' : ticket.ticket_type === 'lab_request' ? 'طلب مختبر' : 'رعاية صحية',
      date: ticketDate ? formatDateAlgeria(new Date(ticketDate), language === 'ar' ? 'ar' : language === 'fr' ? 'fr' : 'en', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' }) : '',
      dateAr: ticketDate ? formatDateAlgeria(new Date(ticketDate), 'ar', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : '',
      time: ticketTime || '',
      appointment_date: ticketDate,
      appointment_time: ticketTime,
      status: ticket.status === 'confirmed' ? 'confirmed' : ticket.status === 'pending' ? 'pending' : isCompleted ? 'completed' : ticket.status === 'cancelled' ? 'cancelled' : 'pending',
      type: 'in-person',
      location: 'See appointment details',
      locationAr: 'انظر تفاصيل الموعد',
      pharmacy_name: ticket.metadata?.pharmacy_name || null,
      doctor_id: null,
      rawData: ticket,
    }
  })

  const unifiedItems = [...appointments, ...standaloneAsAppointments]
  const sortPriority = (item: any) => {
    if (item.status === 'cancelled') return 3
    if (item.status === 'completed') return 2
    return 1
  }
  const sortedUnified = [...unifiedItems].sort((a, b) => {
    const priorityDiff = sortPriority(a) - sortPriority(b)
    if (priorityDiff !== 0) return priorityDiff
    const dateA = new Date(a.appointment_date || a.rawData?.appointment_date || a.created_at || 0).getTime()
    const dateB = new Date(b.appointment_date || b.rawData?.appointment_date || b.created_at || 0).getTime()
    const isUpcoming = sortPriority(a) === 1
    return isUpcoming ? dateA - dateB : dateB - dateA
  })

  const upcomingItems = sortedUnified.filter(item =>
    item.status === 'confirmed' || item.status === 'pending'
  )

  return {
    appointments,
    tickets,
    unifiedItems: sortedUnified,
    upcomingItems,
    loading,
    refetch: fetchData,
  }
}
