import { createAdminClient } from '@/lib/supabase/admin'
import { requireSuperAdmin } from '@/lib/super-admin/auth'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { error: authError } = await requireSuperAdmin()
    if (authError) {
      return NextResponse.json({ error: authError }, { status: authError === 'Admin access required' ? 403 : 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const type = searchParams.get('type')

    const admin = createAdminClient()
    let query = admin
      .from('appointments')
      .select(`
        *,
        patient:patient_id(id, full_name, email, phone),
        doctor:doctor_id(id, business_name, specialty, auth_user_id)
      `)
      .order('appointment_date', { ascending: false })
      .order('appointment_time', { ascending: false })
      .limit(200)

    if (status && status !== 'all') query = query.eq('status', status)
    if (type && type !== 'all') query = query.eq('visit_type', type)

    const { data, error } = await query

    if (error) {
      console.error('[super-admin] appointments fetch error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ appointments: data || [] })
  } catch (err: unknown) {
    console.error('[super-admin] appointments:', err)
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
