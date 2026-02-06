import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET - Export audit logs as CSV
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
    const format = searchParams.get('format') || 'csv'
    const entityType = searchParams.get('entity_type')
    const action = searchParams.get('action')
    const dateFrom = searchParams.get('date_from')
    const dateTo = searchParams.get('date_to')

    // Fetch all matching logs (up to 10000)
    let query = supabase
      .from('supplier_audit_log')
      .select('*')
      .or(`supplier_id.eq.${professional.id},buyer_id.eq.${professional.id}`)
      .order('created_at', { ascending: false })
      .limit(10000)

    if (entityType && entityType !== 'all') {
      query = query.eq('entity_type', entityType)
    }

    if (action && action !== 'all') {
      query = query.eq('action', action)
    }

    if (dateFrom) {
      query = query.gte('created_at', dateFrom)
    }

    if (dateTo) {
      query = query.lte('created_at', dateTo + 'T23:59:59.999Z')
    }

    const { data: logs, error } = await query

    if (error) {
      console.error('Error fetching audit logs for export:', error)
      return NextResponse.json({ error: 'Failed to fetch audit logs' }, { status: 500 })
    }

    if (format === 'csv') {
      // Generate CSV
      const headers = [
        'Date',
        'Time',
        'Actor',
        'Actor Type',
        'Entity Type',
        'Entity Ref',
        'Action',
        'Description',
        'Amount Before',
        'Amount After',
        'Amount Change',
        'Notes',
      ]

      const rows = (logs || []).map(log => {
        const date = new Date(log.created_at)
        return [
          date.toLocaleDateString(),
          date.toLocaleTimeString(),
          log.actor_name || '',
          log.actor_type || '',
          log.entity_type || '',
          log.entity_ref || '',
          log.action || '',
          log.action_label || '',
          log.amount_before?.toString() || '',
          log.amount_after?.toString() || '',
          log.amount_change?.toString() || '',
          log.notes || '',
        ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')
      })

      const csv = [headers.join(','), ...rows].join('\n')

      const filename = `audit-log-${professional.business_name?.replace(/[^a-z0-9]/gi, '-')}-${new Date().toISOString().split('T')[0]}.csv`

      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      })
    }

    if (format === 'json') {
      return NextResponse.json({
        exported_at: new Date().toISOString(),
        exported_by: professional.business_name,
        record_count: logs?.length || 0,
        filters: { entityType, action, dateFrom, dateTo },
        logs,
      })
    }

    return NextResponse.json({ error: 'Unsupported format. Use csv or json.' }, { status: 400 })
  } catch (error) {
    console.error('Error in audit export:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
