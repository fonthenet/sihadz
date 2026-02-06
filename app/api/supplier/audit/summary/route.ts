import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET - Get audit summary for accounting reports
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: professional } = await supabase
      .from('professionals')
      .select('id, type, business_name')
      .eq('auth_user_id', user.id)
      .maybeSingle()

    if (!professional) {
      return NextResponse.json({ error: 'Professional profile not found' }, { status: 404 })
    }

    const searchParams = request.nextUrl.searchParams
    const period = searchParams.get('period') || 'month' // day, week, month, year
    const dateFrom = searchParams.get('date_from')
    const dateTo = searchParams.get('date_to')

    // Calculate date range
    const now = new Date()
    let fromDate: Date
    
    if (dateFrom) {
      fromDate = new Date(dateFrom)
    } else if (period === 'day') {
      fromDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    } else if (period === 'week') {
      fromDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    } else if (period === 'month') {
      fromDate = new Date(now.getFullYear(), now.getMonth(), 1)
    } else if (period === 'year') {
      fromDate = new Date(now.getFullYear(), 0, 1)
    } else {
      fromDate = new Date(now.getFullYear(), now.getMonth(), 1)
    }

    const toDate = dateTo ? new Date(dateTo + 'T23:59:59.999Z') : now

    // Get summary statistics
    let query = supabase
      .from('supplier_audit_log')
      .select('entity_type, action, amount_change, created_at')
      .or(`supplier_id.eq.${professional.id},buyer_id.eq.${professional.id}`)
      .gte('created_at', fromDate.toISOString())
      .lte('created_at', toDate.toISOString())

    const { data: logs, error } = await query

    if (error) {
      console.error('Error fetching audit summary:', error)
      return NextResponse.json({ error: 'Failed to fetch audit summary' }, { status: 500 })
    }

    // Calculate summaries
    const summary = {
      period,
      date_range: {
        from: fromDate.toISOString(),
        to: toDate.toISOString(),
      },
      total_events: logs?.length || 0,
      
      // By entity type
      by_entity_type: {} as Record<string, number>,
      
      // By action
      by_action: {} as Record<string, number>,
      
      // Financial summary
      financial: {
        total_credits: 0,
        total_debits: 0,
        net_change: 0,
      },
      
      // Timeline (events per day)
      timeline: {} as Record<string, number>,
      
      // Key metrics
      orders_created: 0,
      orders_completed: 0,
      payments_received: 0,
      products_updated: 0,
      invoices_created: 0,
    }

    logs?.forEach(log => {
      // By entity type
      summary.by_entity_type[log.entity_type] = (summary.by_entity_type[log.entity_type] || 0) + 1
      
      // By action
      summary.by_action[log.action] = (summary.by_action[log.action] || 0) + 1
      
      // Financial
      if (log.amount_change) {
        if (log.amount_change > 0) {
          summary.financial.total_credits += log.amount_change
        } else {
          summary.financial.total_debits += Math.abs(log.amount_change)
        }
        summary.financial.net_change += log.amount_change
      }
      
      // Timeline
      const day = new Date(log.created_at).toISOString().split('T')[0]
      summary.timeline[day] = (summary.timeline[day] || 0) + 1
      
      // Key metrics
      if (log.entity_type === 'order' && log.action === 'create') {
        summary.orders_created++
      }
      if (log.entity_type === 'order' && log.action === 'status_change') {
        summary.orders_completed++ // Approximation
      }
      if (log.action === 'payment_marked' || log.action === 'payment_received') {
        summary.payments_received++
      }
      if (log.entity_type === 'product') {
        summary.products_updated++
      }
      if (log.entity_type === 'invoice' && log.action === 'create') {
        summary.invoices_created++
      }
    })

    return NextResponse.json(summary)
  } catch (error) {
    console.error('Error in audit summary:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
