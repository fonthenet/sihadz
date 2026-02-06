import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET - Query audit logs with filtering
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get supplier profile
    const { data: professional } = await supabase
      .from('professionals')
      .select('id, type, business_name')
      .eq('auth_user_id', user.id)
      .maybeSingle()

    if (!professional) {
      return NextResponse.json({ error: 'Professional profile not found' }, { status: 404 })
    }

    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = (page - 1) * limit

    // Filters
    const entityType = searchParams.get('entity_type') // order, invoice, product, etc.
    const action = searchParams.get('action') // create, update, status_change, etc.
    const dateFrom = searchParams.get('date_from')
    const dateTo = searchParams.get('date_to')
    const orderId = searchParams.get('order_id')
    const search = searchParams.get('search')

    // Build query - show logs where user is supplier OR buyer
    let query = supabase
      .from('supplier_audit_log')
      .select('*', { count: 'exact' })
      .or(`supplier_id.eq.${professional.id},buyer_id.eq.${professional.id}`)
      .order('created_at', { ascending: false })

    // Apply filters
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

    if (orderId) {
      query = query.eq('order_id', orderId)
    }

    if (search) {
      query = query.or(`entity_ref.ilike.%${search}%,action_label.ilike.%${search}%,actor_name.ilike.%${search}%`)
    }

    const { data: logs, count, error } = await query.range(offset, offset + limit - 1)

    if (error) {
      console.error('Error fetching audit logs:', error)
      return NextResponse.json({ error: 'Failed to fetch audit logs' }, { status: 500 })
    }

    return NextResponse.json({
      data: logs || [],
      total: count || 0,
      page,
      limit,
      hasMore: (count || 0) > offset + limit,
    })
  } catch (error) {
    console.error('Error in audit GET:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Create manual audit log entry
export async function POST(request: NextRequest) {
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

    const body = await request.json()
    const {
      entity_type,
      entity_id,
      entity_ref,
      action,
      action_label,
      old_values,
      new_values,
      changed_fields,
      buyer_id,
      order_id,
      amount_before,
      amount_after,
      notes,
    } = body

    if (!entity_type || !entity_id || !action) {
      return NextResponse.json({ error: 'entity_type, entity_id, and action are required' }, { status: 400 })
    }

    const { data: log, error } = await supabase
      .from('supplier_audit_log')
      .insert({
        actor_id: user.id,
        actor_type: professional.type?.includes('supplier') ? 'supplier' : 'buyer',
        actor_name: professional.business_name,
        entity_type,
        entity_id,
        entity_ref,
        action,
        action_label: action_label || `${action} on ${entity_type}`,
        old_values,
        new_values,
        changed_fields,
        supplier_id: professional.type?.includes('supplier') ? professional.id : null,
        buyer_id: buyer_id || (professional.type?.includes('supplier') ? null : professional.id),
        order_id,
        amount_before,
        amount_after,
        amount_change: amount_before != null && amount_after != null ? amount_after - amount_before : null,
        notes,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating audit log:', error)
      return NextResponse.json({ error: 'Failed to create audit log' }, { status: 500 })
    }

    return NextResponse.json(log)
  } catch (error) {
    console.error('Error in audit POST:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
