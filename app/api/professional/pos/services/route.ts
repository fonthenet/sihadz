import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getProfessionalIdFromRequest, POS_PROFESSIONAL_TYPES } from '@/lib/professional/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/professional/pos/services
 * Fetch all active services for the professional to use in POS
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await getProfessionalIdFromRequest(request, POS_PROFESSIONAL_TYPES)

    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = createAdminClient()

    // Fetch active services with Chifa info
    const { data: services, error } = await admin
      .from('professional_services')
      .select(`
        id,
        service_name,
        name_ar,
        service_description,
        description_ar,
        price,
        duration,
        image_url,
        category,
        is_chifa_eligible,
        chifa_reimbursement_rate,
        display_order,
        is_active
      `)
      .eq('professional_id', auth.professionalId)
      .eq('is_active', true)
      .order('display_order', { ascending: true })

    if (error) {
      console.error('Error fetching services:', error)
      return NextResponse.json({ error: 'Failed to fetch services' }, { status: 500 })
    }

    return NextResponse.json({ services: services || [] })
  } catch (err) {
    console.error('Services API error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
