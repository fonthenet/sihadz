import { createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

const ORDER_TYPES = ['prescription', 'lab', 'referral'] as const

/**
 * GET /api/appointments/[id]/threads
 * Returns all threads for this appointment. Uses admin client to bypass RLS
 * after verifying user has access to the appointment (doctor or patient).
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: appointmentId } = await params
    if (!appointmentId) {
      return NextResponse.json({ error: 'Missing appointment id' }, { status: 400 })
    }

    // Verify appointment exists; allow doctor or patient
    const { data: appointment, error: apptError } = await supabase
      .from('appointments')
      .select('id, doctor_id, patient_id')
      .eq('id', appointmentId)
      .maybeSingle()

    if (apptError || !appointment) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 })
    }

    const { data: prof } = await supabase
      .from('professionals')
      .select('id')
      .eq('auth_user_id', user.id)
      .maybeSingle()

    const isDoctor = prof && appointment.doctor_id === prof.id
    const isPatient = appointment.patient_id === user.id
    if (!isDoctor && !isPatient) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Use admin client to bypass RLS (we've verified appointment access above)
    const admin = createAdminClient()
    const byId = new Map<string, { id: string; order_type: string; metadata: Record<string, unknown>; title: string | null; order_id: string | null; ticket_id: string | null }>()

    // 1) Threads by order_id
    const { data: byOrderId } = await admin
      .from('chat_threads')
      .select('id, order_type, metadata, title, order_id, ticket_id')
      .eq('order_id', appointmentId)
      .in('order_type', [...ORDER_TYPES])
      .order('created_at', { ascending: true })

    if (byOrderId?.length) {
      byOrderId.forEach((t: any) => byId.set(t.id, t))
    }

    // 2) Threads by metadata.appointment_id (older threads may only have this)
    const { data: byMeta } = await admin
      .from('chat_threads')
      .select('id, order_type, metadata, title, order_id, ticket_id')
      .eq('metadata->>appointment_id', appointmentId)
      .in('order_type', [...ORDER_TYPES])
      .order('created_at', { ascending: true })

    if (byMeta?.length) {
      byMeta.forEach((t: any) => byId.set(t.id, t))
    }

    // 3) Threads by ticket_id (ticket-centric: healthcare_tickets for this appointment)
    let ticketToSecondary: Record<string, string> = {}
    const { data: tickets } = await admin
      .from('healthcare_tickets')
      .select('id, secondary_provider_id')
      .eq('appointment_id', appointmentId)

    if (tickets?.length) {
      tickets.forEach((t: { id: string; secondary_provider_id?: string }) => {
        if (t.secondary_provider_id) ticketToSecondary[t.id] = t.secondary_provider_id
      })
      const ticketIds = tickets.map((t: { id: string }) => t.id)
      const { data: byTicket } = await admin
        .from('chat_threads')
        .select('id, order_type, metadata, title, order_id, ticket_id')
        .in('ticket_id', ticketIds)
        .order('created_at', { ascending: true })

      if (byTicket?.length) {
        byTicket.forEach((t: any) => byId.set(t.id, t))
      }
    }

    // Patient: only return threads they are a member of
    if (isPatient && byId.size > 0) {
      const threadIds = Array.from(byId.keys())
      const { data: memberships } = await admin
        .from('chat_thread_members')
        .select('thread_id')
        .eq('user_id', user.id)
        .in('thread_id', threadIds)
      const allowedIds = new Set((memberships || []).map((m: { thread_id: string }) => m.thread_id))
      for (const id of threadIds) {
        if (!allowedIds.has(id)) byId.delete(id)
      }
    }

    const list = Array.from(byId.values()).map((t) => {
      const meta = t.metadata as Record<string, unknown> | null
      // Prefer metadata.target_id; for ticket-centric threads use secondary_provider_id so we never pass thread id as targetId
      const targetId = (meta?.target_id as string) ?? (t.ticket_id && ticketToSecondary[t.ticket_id]) ?? t.id
      return {
        type: t.order_type as 'prescription' | 'lab' | 'referral',
        targetId,
        targetName: ((t.title || '').replace(/^(Prescription|Lab Request|Referral) - /i, '') || (meta?.target_name as string)) || '—',
        threadId: t.id,
        prescriptionId: meta?.prescription_id as string | undefined,
        labRequestId: meta?.lab_request_id as string | undefined,
      }
    })

    // Dedupe by type+targetId (same as parent page)
    const seen = new Set<string>()
    const deduped = list.filter((t) => {
      const key = `${t.type}-${t.targetId}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })

    return NextResponse.json({ threads: deduped })
  } catch (e: any) {
    console.error('[appointments/[id]/threads]', e)
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 })
  }
}
