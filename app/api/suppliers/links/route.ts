import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET - List buyer's supplier links
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: buyer } = await supabase
      .from('professionals')
      .select('id, type')
      .eq('auth_user_id', user.id)
      .maybeSingle()

    if (!buyer) {
      return NextResponse.json({ error: 'Professional profile not found' }, { status: 404 })
    }

    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status')

    let query = supabase
      .from('supplier_buyer_links')
      .select(`
        *,
        supplier:professionals!supplier_buyer_links_supplier_id_fkey(
          id, business_name, type, email, phone, wilaya, commune
        )
      `)
      .eq('buyer_id', buyer.id)
      .order('created_at', { ascending: false })

    if (status) {
      const statuses = status.split(',')
      query = query.in('status', statuses)
    }

    const { data: links, error } = await query

    if (error) {
      console.error('Error fetching links:', error)
      return NextResponse.json({ error: 'Failed to fetch links' }, { status: 500 })
    }

    return NextResponse.json(links || [])
  } catch (error) {
    console.error('Error in buyer links GET:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH - Accept/reject link request from supplier
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: buyer } = await supabase
      .from('professionals')
      .select('id')
      .eq('auth_user_id', user.id)
      .maybeSingle()

    if (!buyer) {
      return NextResponse.json({ error: 'Professional profile not found' }, { status: 404 })
    }

    const body = await request.json()
    const { link_id, action } = body

    if (!link_id || !action) {
      return NextResponse.json({ error: 'link_id and action are required' }, { status: 400 })
    }

    // Get link
    const { data: link } = await supabase
      .from('supplier_buyer_links')
      .select('*')
      .eq('id', link_id)
      .eq('buyer_id', buyer.id)
      .single()

    if (!link) {
      return NextResponse.json({ error: 'Link not found' }, { status: 404 })
    }

    const updates: Record<string, unknown> = {}

    switch (action) {
      case 'accept':
        if (link.status !== 'pending' || link.requested_by !== 'supplier') {
          return NextResponse.json({ error: 'Cannot accept this link' }, { status: 400 })
        }
        updates.status = 'active'
        updates.approved_at = new Date().toISOString()
        updates.approved_by = user.id
        break

      case 'reject':
        if (link.status !== 'pending') {
          return NextResponse.json({ error: 'Cannot reject this link' }, { status: 400 })
        }
        updates.status = 'rejected'
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
        supplier:professionals!supplier_buyer_links_supplier_id_fkey(
          id, business_name, type, email, phone
        )
      `)
      .single()

    if (error) {
      console.error('Error updating link:', error)
      return NextResponse.json({ error: 'Failed to update link' }, { status: 500 })
    }

    return NextResponse.json(updatedLink)
  } catch (error) {
    console.error('Error in buyer links PATCH:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
