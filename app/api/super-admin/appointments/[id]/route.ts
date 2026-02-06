import { createAdminClient } from '@/lib/supabase/admin'
import { requireSuperAdmin } from '@/lib/super-admin/auth'
import { NextRequest, NextResponse } from 'next/server'

export const runtime = "nodejs"
export const dynamic = "force-dynamic"


export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error: authError } = await requireSuperAdmin()
    if (authError) {
      return NextResponse.json({ error: authError }, { status: authError === 'Admin access required' ? 403 : 401 })
    }

    const { id } = await params
    const admin = createAdminClient()
    const { error } = await admin.from('appointments').delete().eq('id', id)

    if (error) {
      console.error('[super-admin] appointment delete error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    console.error('[super-admin] appointment delete:', err)
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
