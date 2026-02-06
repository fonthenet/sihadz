import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase'

// ============================================================================
// GET /api/wallet/deposits - Get user's deposits
// ============================================================================
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const admin = createAdminClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') // 'frozen', 'released', 'refunded', 'forfeited', or null for all
    const limit = parseInt(searchParams.get('limit') || '50')
    
    let query = admin
      .from('booking_deposits')
      .select(`
        id,
        amount,
        status,
        refund_amount,
        refund_percentage,
        refund_reason,
        appointment_id,
        created_at,
        updated_at,
        refunded_at
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit)
    
    if (status) {
      query = query.eq('status', status)
    }
    
    const { data: deposits, error } = await query
    
    if (error) {
      console.error('Deposits fetch error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    // Calculate totals
    const frozen = deposits?.filter(d => d.status === 'frozen') || []
    const refunded = deposits?.filter(d => d.status === 'refunded') || []
    const forfeited = deposits?.filter(d => d.status === 'forfeited') || []
    
    return NextResponse.json({
      deposits: deposits || [],
      summary: {
        total_frozen: frozen.reduce((sum, d) => sum + parseFloat(String(d.amount)), 0),
        total_refunded: refunded.reduce((sum, d) => sum + parseFloat(String(d.refund_amount || 0)), 0),
        total_forfeited: forfeited.reduce((sum, d) => sum + parseFloat(String(d.amount)), 0),
        frozen_count: frozen.length,
        refunded_count: refunded.length,
        forfeited_count: forfeited.length
      }
    })
    
  } catch (error: any) {
    console.error('Deposits error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
