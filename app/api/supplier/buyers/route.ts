import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { LinkApprovalInput } from '@/lib/supplier/types'

// GET - List supplier's linked buyers
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

    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status')
    const search = searchParams.get('search')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = (page - 1) * limit

    let query = supabase
      .from('supplier_buyer_links')
      .select(`
        *,
        buyer:professionals!supplier_buyer_links_buyer_id_fkey(
          id, business_name, type, email, phone, wilaya, commune, address_line1
        )
      `, { count: 'exact' })
      .eq('supplier_id', professional.id)
      .order('created_at', { ascending: false })

    if (status) {
      const statuses = status.split(',')
      query = query.in('status', statuses)
    }

    const { data: links, count, error } = await query.range(offset, offset + limit - 1)

    if (error) {
      console.error('Error fetching buyer links:', error)
      return NextResponse.json({ error: 'Failed to fetch buyers' }, { status: 500 })
    }

    // Filter by search on buyer business_name if needed
    let filteredLinks = links || []
    if (search) {
      const searchLower = search.toLowerCase()
      filteredLinks = filteredLinks.filter((link: { buyer?: { business_name?: string } }) =>
        link.buyer?.business_name?.toLowerCase().includes(searchLower)
      )
    }

    // Enrich with unpaid orders per buyer
    const { data: unpaidOrders } = await supabase
      .from('supplier_purchase_orders')
      .select('buyer_id, total')
      .eq('supplier_id', professional.id)
      .in('status', ['delivered', 'completed', 'shipped'])
      .is('paid_at', null)

    const unpaidByBuyer: Record<string, { count: number; amount: number }> = {}
    for (const o of unpaidOrders || []) {
      const b = o.buyer_id
      if (!unpaidByBuyer[b]) unpaidByBuyer[b] = { count: 0, amount: 0 }
      unpaidByBuyer[b].count++
      unpaidByBuyer[b].amount += o.total || 0
    }

    const enrichedLinks = filteredLinks.map((link: { buyer_id: string; buyer?: unknown }) => ({
      ...link,
      unpaid_order_count: unpaidByBuyer[link.buyer_id]?.count || 0,
      unpaid_amount: unpaidByBuyer[link.buyer_id]?.amount || 0,
      has_unpaid: (unpaidByBuyer[link.buyer_id]?.count || 0) > 0,
    }))

    return NextResponse.json({
      data: enrichedLinks,
      total: count || 0,
      page,
      limit,
      hasMore: (count || 0) > offset + limit,
    })
  } catch (error) {
    console.error('Error in supplier buyers GET:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Create link request (supplier inviting buyer)
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

    const body = await request.json()
    const { buyer_id, payment_terms, credit_limit, discount_percent, notes } = body

    if (!buyer_id) {
      return NextResponse.json({ error: 'buyer_id is required' }, { status: 400 })
    }

    // Check if link already exists
    const { data: existingLink } = await supabase
      .from('supplier_buyer_links')
      .select('id, status')
      .eq('supplier_id', professional.id)
      .eq('buyer_id', buyer_id)
      .single()

    if (existingLink) {
      return NextResponse.json({ 
        error: 'Link already exists',
        existing_status: existingLink.status 
      }, { status: 409 })
    }

    // Create link request
    const { data: link, error } = await supabase
      .from('supplier_buyer_links')
      .insert({
        supplier_id: professional.id,
        buyer_id,
        status: 'pending',
        requested_by: 'supplier',
        payment_terms: payment_terms || 'cash',
        credit_limit,
        discount_percent: discount_percent || 0,
        notes,
      })
      .select(`
        *,
        buyer:professionals!supplier_buyer_links_buyer_id_fkey(
          id, business_name, type, email, phone, wilaya
        )
      `)
      .single()

    if (error) {
      console.error('Error creating link:', error)
      return NextResponse.json({ error: 'Failed to create link request' }, { status: 500 })
    }

    return NextResponse.json(link, { status: 201 })
  } catch (error) {
    console.error('Error in supplier buyers POST:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH - Update link (approve/reject/suspend/update terms)
export async function PATCH(request: NextRequest) {
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

    const body = await request.json()
    const { link_id, action, ...updateData }: { link_id: string; action: string } & LinkApprovalInput = body

    if (!link_id || !action) {
      return NextResponse.json({ error: 'link_id and action are required' }, { status: 400 })
    }

    // Get current link
    const { data: link } = await supabase
      .from('supplier_buyer_links')
      .select('*')
      .eq('id', link_id)
      .eq('supplier_id', professional.id)
      .single()

    if (!link) {
      return NextResponse.json({ error: 'Link not found' }, { status: 404 })
    }

    const updates: Record<string, unknown> = {}

    switch (action) {
      case 'approve':
        if (link.status !== 'pending') {
          return NextResponse.json({ error: 'Can only approve pending requests' }, { status: 400 })
        }
        updates.status = 'active'
        updates.approved_at = new Date().toISOString()
        updates.approved_by = user.id
        if (updateData.payment_terms) updates.payment_terms = updateData.payment_terms
        if (updateData.pay_after_orders !== undefined) updates.pay_after_orders = updateData.pay_after_orders
        if (updateData.credit_limit !== undefined) updates.credit_limit = updateData.credit_limit
        if (updateData.discount_percent !== undefined) updates.discount_percent = updateData.discount_percent
        break

      case 'reject':
        if (link.status !== 'pending') {
          return NextResponse.json({ error: 'Can only reject pending requests' }, { status: 400 })
        }
        updates.status = 'rejected'
        break

      case 'suspend':
        if (link.status !== 'active') {
          return NextResponse.json({ error: 'Can only suspend active links' }, { status: 400 })
        }
        updates.status = 'suspended'
        break

      case 'reactivate':
        if (link.status !== 'suspended') {
          return NextResponse.json({ error: 'Can only reactivate suspended links' }, { status: 400 })
        }
        updates.status = 'active'
        break

      case 'update_terms':
        if (updateData.payment_terms) updates.payment_terms = updateData.payment_terms
        if (updateData.credit_limit !== undefined) updates.credit_limit = updateData.credit_limit
        if (updateData.discount_percent !== undefined) updates.discount_percent = updateData.discount_percent
        break

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    const { data: updatedLink, error } = await supabase
      .from('supplier_buyer_links')
      .update(updates)
      .eq('id', link_id)
      .select(`
        *,
        buyer:professionals!supplier_buyer_links_buyer_id_fkey(
          id, business_name, type, email, phone, wilaya
        )
      `)
      .single()

    if (error) {
      console.error('Error updating link:', error)
      return NextResponse.json({ error: 'Failed to update link' }, { status: 500 })
    }

    return NextResponse.json(updatedLink)
  } catch (error) {
    console.error('Error in supplier buyers PATCH:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Remove link
export async function DELETE(request: NextRequest) {
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

    const searchParams = request.nextUrl.searchParams
    const linkId = searchParams.get('id')

    if (!linkId) {
      return NextResponse.json({ error: 'Link ID is required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('supplier_buyer_links')
      .delete()
      .eq('id', linkId)
      .eq('supplier_id', professional.id)

    if (error) {
      console.error('Error deleting link:', error)
      return NextResponse.json({ error: 'Failed to delete link' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Link deleted' })
  } catch (error) {
    console.error('Error in supplier buyers DELETE:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
