import { createAdminClient } from '@/lib/supabase/admin'
import { requireSuperAdmin } from '@/lib/super-admin/auth'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, error: authError } = await requireSuperAdmin()
    if (authError || !user) {
      return NextResponse.json({ error: authError || 'Unauthorized' }, { status: authError === 'Admin access required' ? 403 : 401 })
    }

    const { id } = await params
    const body = await request.json().catch(() => ({}))
    const { status, payment_status } = body

    const admin = createAdminClient()
    const updateData: Record<string, unknown> = {}

    if (status) {
      const validStatuses = ['pending', 'confirmed', 'pending_approval', 'completed', 'cancelled', 'rejected', 'no-show']
      if (!validStatuses.includes(status)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
      }
      updateData.status = status
      if (status === 'confirmed') updateData.approved_at = new Date().toISOString()
      if (status === 'rejected' || status === 'cancelled') updateData.rejected_at = new Date().toISOString()
    }
    if (payment_status) {
      const validPayment = ['pending', 'completed', 'failed', 'refunded', 'paid']
      if (!validPayment.includes(payment_status)) {
        return NextResponse.json({ error: 'Invalid payment_status' }, { status: 400 })
      }
      updateData.payment_status = payment_status
    }
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'Provide status or payment_status' }, { status: 400 })
    }

    const { error } = await admin
      .from('appointments')
      .update(updateData)
      .eq('id', id)

    if (error) {
      console.error('[super-admin] appointment status error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, ...updateData })
  } catch (err: unknown) {
    console.error('[super-admin] appointment status:', err)
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
