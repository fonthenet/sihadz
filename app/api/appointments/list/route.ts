import { createAdminClient } from '@/lib/supabase/admin'
import { createServerClient } from '@/lib/supabase/server'
import { parseDateOnlyAsLocal, formatDateAlgeria } from '@/lib/date-algeria'
import type { AlgeriaLang } from '@/lib/date-algeria'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/appointments/list
 * Returns appointments for the logged-in user. Uses admin client to bypass RLS
 * so rows are returned even when RLS policies would hide them (e.g. policy
 * mismatches, guest-linked). Only returns rows for the current user.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const lang = (searchParams.get('lang') === 'ar' ? 'ar' : searchParams.get('lang') === 'fr' ? 'fr' : 'en') as AlgeriaLang
    const debug = searchParams.get('debug') === '1'

    const admin = createAdminClient()
    const { data: appointmentsData, error: apptError } = await admin
      .from('appointments')
      .select('*')
      .or(`patient_id.eq.${user.id},guest_linked_to_user_id.eq.${user.id}`)
      .order('appointment_date', { ascending: false })

    if (apptError) {
      console.error('[appointments/list] Fetch error:', apptError)
      if (debug) return NextResponse.json({ ok: false, userId: user.id, error: apptError.message, appointments: [] })
      return NextResponse.json({ error: apptError.message, appointments: [] }, { status: 500 })
    }

    if (!appointmentsData || appointmentsData.length === 0) {
      if (debug) return NextResponse.json({ ok: true, userId: user.id, count: 0, appointments: [] })
      return NextResponse.json({ appointments: [] })
    }

    const providerIds = [...new Set(
      appointmentsData.map((a: { doctor_id?: string; professional_id?: string }) => a.doctor_id ?? a.professional_id).filter(Boolean)
    )] as string[]
    const { data: professionalsData } = await admin
      .from('professionals')
      .select('id, business_name, business_name_ar, specialty, specialty_ar, phone, address')
      .in('id', providerIds)
    const professionalsMap = new Map((professionalsData || []).map((p: { id: string }) => [p.id, p]))

    const transformed: Record<string, unknown>[] = []

    for (const apt of appointmentsData as Record<string, unknown>[]) {
      try {
        const providerId = (apt.doctor_id ?? apt.professional_id) as string
        const pro = professionalsMap.get(providerId) as { business_name?: string; business_name_ar?: string; specialty?: string; specialty_ar?: string; phone?: string; address?: string } | undefined
        const dispName = (apt.doctor_display_name as string)?.trim() || null
        const dispSpecialty = (apt.doctor_specialty as string)?.trim() || null
        const appointmentDate = parseDateOnlyAsLocal(apt.appointment_date as string) ?? new Date(0)
        const dateStr = formatDateAlgeria(appointmentDate, lang, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })
        const dateStrAr = formatDateAlgeria(appointmentDate, 'ar', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
        const rawTime = apt.appointment_time
        const timeStr = typeof rawTime === 'string' ? rawTime.substring(0, 5) : '00:00'
        const visitType = (apt.visit_type as string) || ''
        const isEvisit = visitType === 'e-visit'
        const addr = pro?.address || 'Clinic'
        transformed.push({
          id: apt.id,
          doctorName: dispName || pro?.business_name || 'Doctor',
          doctorNameAr: dispName || pro?.business_name_ar || pro?.business_name || 'طبيب',
          specialty: dispSpecialty || pro?.specialty || 'General Medicine',
          specialtyAr: dispSpecialty || pro?.specialty_ar || pro?.specialty || 'طب عام',
          date: dateStr,
          dateAr: dateStrAr,
          time: timeStr,
          location: isEvisit ? 'Video Call' : addr,
          locationAr: isEvisit ? 'مكالمة فيديو' : addr,
          type: isEvisit ? 'video' : 'in-person',
          status: (apt.status as string) || 'pending',
          doctorPhone: pro?.phone || '+213555000000',
          rawData: apt,
          appointment_date: apt.appointment_date,
          appointment_time: apt.appointment_time,
          appointment_type: isEvisit ? 'e-visit' : 'in-person',
          formattedDate: dateStr,
          formattedDateAr: dateStrAr,
          doctor: { address: isEvisit ? undefined : addr, phone: pro?.phone || '+213555000000' },
          confirmation_code: apt.confirmation_code ?? null,
          consultation_fee: apt.payment_amount ?? apt.consultation_fee ?? null,
          video_link: apt.video_link ?? null,
        })
      } catch (e) {
        console.warn('[appointments/list] Skip transform for apt', apt?.id, e)
      }
    }

    if (debug) return NextResponse.json({ ok: true, userId: user.id, count: transformed.length, appointments: transformed })
    return NextResponse.json({ appointments: transformed })
  } catch (err) {
    console.error('[appointments/list] Error:', err)
    return NextResponse.json({ error: 'Internal server error', appointments: [] }, { status: 500 })
  }
}
