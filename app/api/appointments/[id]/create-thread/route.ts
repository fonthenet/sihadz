import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = "nodejs"
export const dynamic = "force-dynamic"


/**
 * Create a thread for prescription/lab/referral workflow
 * POST /api/appointments/[id]/create-thread
 * Body: { type: 'prescription' | 'lab' | 'referral', targetId: string (pharmacy/lab/doctor-clinic professional_id) }
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: appointmentId } = await params
    const supabase = await createServerClient()
    const admin = createAdminClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const body = await req.json()
    const { type, targetId } = body

    if (!type || !['prescription', 'lab', 'referral'].includes(type)) {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
    }
    if (!targetId) {
      return NextResponse.json({ error: 'Missing targetId' }, { status: 400 })
    }

    // Get appointment
    const { data: appointment, error: aptError } = await admin
      .from('appointments')
      .select('id, patient_id, doctor_id, professional_id')
      .eq('id', appointmentId)
      .single()

    if (aptError || !appointment) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 })
    }

    const doctorId = appointment.doctor_id || appointment.professional_id
    if (!doctorId) {
      return NextResponse.json({ error: 'Appointment has no doctor' }, { status: 400 })
    }

    // Get doctor's user_id
    const { data: doctor } = await admin
      .from('professionals')
      .select('auth_user_id')
      .eq('id', doctorId)
      .single()

    if (!doctor?.auth_user_id) {
      return NextResponse.json({ error: 'Doctor not found' }, { status: 404 })
    }

    // Get target (pharmacy/lab/doctor-clinic) user_id
    const { data: target } = await admin
      .from('professionals')
      .select('id, type, business_name, auth_user_id')
      .eq('id', targetId)
      .single()

    if (!target?.auth_user_id) {
      return NextResponse.json({ error: 'Target provider not found' }, { status: 404 })
    }

    // Build thread title
    const targetName = target.business_name || 'Provider'
    let threadTitle = ''
    if (type === 'prescription') {
      threadTitle = `Prescription - ${targetName}`
    } else if (type === 'lab') {
      threadTitle = `Lab Request - ${targetName}`
    } else {
      threadTitle = `Referral - ${targetName}`
    }

    // Create thread with order_type and order_id
    const { data: thread, error: threadError } = await admin
      .from('chat_threads')
      .insert({
        thread_type: 'group',
        title: threadTitle,
        order_type: type,
        order_id: appointmentId,
        created_by: doctor.auth_user_id,
        metadata: {
          appointment_id: appointmentId,
          doctor_id: doctorId,
          target_id: targetId,
          target_type: target.type,
        },
      })
      .select('id')
      .single()

    if (threadError || !thread) {
      return NextResponse.json({ error: 'Failed to create thread' }, { status: 500 })
    }

    // Add members: doctor and target provider only (patient does not join the thread; they only see ticket status updates)
    const members: Array<{ thread_id: string; user_id: string; role: string }> = [
      { thread_id: thread.id, user_id: doctor.auth_user_id, role: 'admin' },
      { thread_id: thread.id, user_id: target.auth_user_id, role: 'member' },
    ]

    const { error: membersError } = await admin
      .from('chat_thread_members')
      .insert(members)

    if (membersError) {
      return NextResponse.json({ error: 'Failed to add members' }, { status: 500 })
    }

    // Create initial system message
    let systemMessage = ''
    if (type === 'prescription') {
      systemMessage = `Prescription thread created. Doctor can add medications from pharmacy inventory or doctor's medication list.`
    } else if (type === 'lab') {
      systemMessage = `Lab request thread created. Doctor can add lab tests.`
    } else {
      systemMessage = `Referral thread created. Doctor can provide referral details.`
    }

    await admin.from('chat_messages').insert({
      thread_id: thread.id,
      sender_id: doctor.auth_user_id,
      message_type: 'system',
      content: systemMessage,
    })

    return NextResponse.json({ 
      ok: true, 
      threadId: thread.id,
      threadTitle,
    })

  } catch (error: any) {
    console.error('Create thread error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
