import { createAdminClient } from '@/lib/supabase/admin'
import { requireSuperAdmin } from '@/lib/super-admin/auth'
import { NextRequest, NextResponse } from 'next/server'

export const runtime = "nodejs"
export const dynamic = "force-dynamic"


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
    const { approved } = body
    const isApproved = approved !== false

    const admin = createAdminClient()
    const { error } = await admin
      .from('reviews')
      .update({ is_approved: isApproved })
      .eq('id', id)

    if (error) {
      console.error('[super-admin] review approve error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, is_approved: isApproved })
  } catch (err: unknown) {
    console.error('[super-admin] review approve:', err)
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
