import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/supplier/webhooks
 * List webhook configurations
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: professional } = await supabase
      .from('professionals')
      .select('id, type')
      .eq('auth_user_id', user.id)
      .in('type', ['pharma_supplier', 'equipment_supplier'])
      .maybeSingle()

    if (!professional) {
      return NextResponse.json({ error: 'Supplier profile not found' }, { status: 404 })
    }

    // For now, return empty array (webhook table can be added later)
    // This endpoint is ready for webhook management implementation
    return NextResponse.json({
      data: [],
      message: 'Webhook management coming soon',
    })
  } catch (error: any) {
    console.error('Error in webhooks GET:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/supplier/webhooks
 * Create webhook configuration
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: professional } = await supabase
      .from('professionals')
      .select('id, type')
      .eq('auth_user_id', user.id)
      .in('type', ['pharma_supplier', 'equipment_supplier'])
      .maybeSingle()

    if (!professional) {
      return NextResponse.json({ error: 'Supplier profile not found' }, { status: 404 })
    }

    // Webhook implementation can be added here
    // Would require a supplier_webhooks table
    
    return NextResponse.json({
      message: 'Webhook creation coming soon',
    }, { status: 501 })
  } catch (error: any) {
    console.error('Error in webhooks POST:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
