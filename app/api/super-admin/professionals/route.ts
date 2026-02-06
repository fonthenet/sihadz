import { createAdminClient } from '@/lib/supabase/admin'
import { requireSuperAdmin } from '@/lib/super-admin/auth'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/super-admin/professionals
 * Fetches all professionals with optional type filter. Uses admin client for full access.
 */
export async function GET(request: NextRequest) {
  try {
    const { error: authError } = await requireSuperAdmin()
    if (authError) {
      return NextResponse.json({ error: authError }, { status: authError === 'Admin access required' ? 403 : 401 })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') // doctor, pharmacy, laboratory, clinic, ambulance

    const admin = createAdminClient()
    let query = admin
      .from('professionals')
      .select('*')
      .order('created_at', { ascending: false })

    if (type && type !== 'all') {
      query = query.eq('type', type)
    }

    const { data, error } = await query

    if (error) {
      console.error('[super-admin] professionals fetch error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ professionals: data || [] })
  } catch (err: unknown) {
    console.error('[super-admin] professionals:', err)
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
