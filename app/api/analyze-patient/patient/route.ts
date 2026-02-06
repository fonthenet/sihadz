'use server'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server'

/** GET: Patient fetches shared AI analysis for their appointment */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const appointmentId = searchParams.get('appointmentId')
    if (!appointmentId) {
      return NextResponse.json({ error: 'appointmentId required' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = createAdminClient()
    const { data: apt } = await admin
      .from('appointments')
      .select('id, patient_id')
      .eq('id', appointmentId)
      .single()

    if (!apt) return NextResponse.json({ error: 'Appointment not found' }, { status: 404 })
    if (apt.patient_id !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const { data } = await admin
      .from('patient_ai_analyses')
      .select('analysis_result')
      .eq('appointment_id', appointmentId)
      .eq('shared_with_patient', true)
      .maybeSingle()

    if (!data) return NextResponse.json({ analysis: null })
    return NextResponse.json({ analysis: data.analysis_result })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
