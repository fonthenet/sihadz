import { createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { getPharmacyIdFromRequest } from '@/lib/pharmacy/auth'

/**
 * GET /api/demo - Check if demo/seed data is present
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await getPharmacyIdFromRequest(request)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createAdminClient()
    const { data, error } = await supabase.rpc('demo_has_seed_data')

    if (error) throw error

    return NextResponse.json({ active: !!data })
  } catch (error: any) {
    console.error('Demo status error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * POST /api/demo - Toggle demo mode (seed or clear)
 * Body: { action: 'seed' | 'clear' }
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await getPharmacyIdFromRequest(request)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const action = body?.action === 'clear' ? 'clear' : body?.action === 'seed' ? 'seed' : null

    if (!action) {
      return NextResponse.json(
        { error: 'Invalid action. Use { "action": "clear" } to remove existing demo data.' },
        { status: 400 }
      )
    }

    // Seed is disabled in production - no fake data is added to new accounts
    if (action === 'seed') {
      return NextResponse.json(
        { error: 'Demo seed is disabled. Use the app to add real data.' },
        { status: 403 }
      )
    }

    const supabase = createAdminClient()
    const { data, error } = await supabase.rpc('demo_clear_pharmacy_data')
    if (error) throw error
    return NextResponse.json({ success: true, active: false, details: data })
  } catch (error: any) {
    console.error('Demo toggle error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
