import { createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import { validateEmployeeSession, EMPLOYEE_SESSION_COOKIE } from '@/lib/employee-auth'
import type { ScannerSettings } from '@/lib/scanner/types'

/**
 * GET /api/professional/scanner-settings
 * Returns scanner settings for the current professional (owner or employee session)
 */
export async function GET(request: NextRequest) {
  try {
    const admin = createAdminClient()

    // 1. Check employee session first
    const token = request.cookies.get(EMPLOYEE_SESSION_COOKIE)?.value
    if (token) {
      const session = await validateEmployeeSession(token)
      if (session?.professional?.id) {
        const { data } = await admin
          .from('professionals')
          .select('scanner_settings')
          .eq('id', session.professional.id)
          .single()
        return NextResponse.json({
          scanner_settings: data?.scanner_settings ?? null,
          professional_id: session.professional.id,
        })
      }
    }

    // 2. Owner session
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: pro } = await supabase
      .from('professionals')
      .select('id, scanner_settings')
      .eq('auth_user_id', user.id)
      .single()

    if (!pro) {
      return NextResponse.json({ error: 'Professional not found' }, { status: 404 })
    }

    return NextResponse.json({
      scanner_settings: pro.scanner_settings ?? null,
      professional_id: pro.id,
    })
  } catch (err) {
    console.error('[scanner-settings] GET error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PATCH /api/professional/scanner-settings
 * Update scanner settings (owner or employee with permission)
 */
export async function PATCH(request: NextRequest) {
  try {
    const admin = createAdminClient()
    let professionalId: string | null = null

    // 1. Check employee session
    const token = request.cookies.get(EMPLOYEE_SESSION_COOKIE)?.value
    if (token) {
      const session = await validateEmployeeSession(token)
      if (session?.professional?.id) {
        professionalId = session.professional.id
      }
    }

    // 2. Owner session
    if (!professionalId) {
      const supabase = await createServerClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      const { data: pro } = await supabase
        .from('professionals')
        .select('id')
        .eq('auth_user_id', user.id)
        .single()
      professionalId = pro?.id ?? null
    }

    if (!professionalId) {
      return NextResponse.json({ error: 'Professional not found' }, { status: 404 })
    }

    const body = await request.json().catch(() => ({}))
    const settings = body.scanner_settings as Partial<ScannerSettings> | null

    if (!settings || typeof settings !== 'object') {
      return NextResponse.json({ error: 'Invalid scanner_settings payload' }, { status: 400 })
    }

    // Merge with existing (partial update)
    const { data: existing } = await admin
      .from('professionals')
      .select('scanner_settings')
      .eq('id', professionalId)
      .single()

    const merged = {
      ...(existing?.scanner_settings ?? {}),
      ...settings,
      scanContexts: {
        ...(existing?.scanner_settings?.scanContexts ?? {}),
        ...(settings.scanContexts ?? {}),
      },
    }

    const { error } = await admin
      .from('professionals')
      .update({
        scanner_settings: merged,
        updated_at: new Date().toISOString(),
      })
      .eq('id', professionalId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, scanner_settings: merged })
  } catch (err) {
    console.error('[scanner-settings] PATCH error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
