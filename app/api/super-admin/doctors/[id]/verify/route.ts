import { createAdminClient } from '@/lib/supabase/admin'
import { requireSuperAdmin } from '@/lib/super-admin/auth'
import { NextRequest, NextResponse } from 'next/server'

export const runtime = "nodejs"
export const dynamic = "force-dynamic"


/**
 * Verify/reject a doctor. Handles both:
 * - professionals table (when id is a professional id with type=doctor)
 * - doctors table (legacy)
 */
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
    const { action } = body
    const isApprove = action !== 'reject'

    const admin = createAdminClient()

    // Try professionals first (unified table)
    const { data: prof } = await admin
      .from('professionals')
      .select('id, type')
      .eq('id', id)
      .maybeSingle()

    if (prof && prof.type === 'doctor') {
      const { error } = await admin
        .from('professionals')
        .update({
          status: isApprove ? 'verified' : 'rejected',
          verified_at: isApprove ? new Date().toISOString() : null,
          verified_by: user.id,
          is_verified: isApprove,
          is_active: isApprove,
        })
        .eq('id', id)
      if (error) {
        console.error('[super-admin] doctor verify (professionals):', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
      return NextResponse.json({ success: true, is_verified: isApprove })
    }

    // Fallback: doctors table (legacy)
    const { error } = await admin
      .from('doctors')
      .update({ is_verified: isApprove, is_active: isApprove })
      .eq('id', id)

    if (error) {
      console.error('[super-admin] doctor verify:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, is_verified: isApprove })
  } catch (err: unknown) {
    console.error('[super-admin] doctor verify:', err)
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
