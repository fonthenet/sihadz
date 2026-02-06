import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

// POST - Request link with supplier
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: supplierId } = await params
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

    const { data: supplier } = await supabase
      .from('professionals')
      .select('id, business_name')
      .eq('id', supplierId)
      .in('type', ['pharma_supplier', 'equipment_supplier'])
      .single()

    if (!supplier) {
      return NextResponse.json({ error: 'Supplier not found' }, { status: 404 })
    }

    const { data: existingLink } = await supabase
      .from('supplier_buyer_links')
      .select('id, status')
      .eq('supplier_id', supplierId)
      .eq('buyer_id', buyer.id)
      .single()

    if (existingLink) {
      return NextResponse.json({
        error: 'Link already exists',
        existing_status: existingLink.status,
      }, { status: 409 })
    }

    const body = await request.json().catch(() => ({}))

    const { data: link, error } = await supabase
      .from('supplier_buyer_links')
      .insert({
        supplier_id: supplierId,
        buyer_id: buyer.id,
        status: 'pending',
        requested_by: 'buyer',
        notes: body.notes,
      })
      .select('*, supplier:professionals!supplier_buyer_links_supplier_id_fkey(id, business_name, type, email, phone, auth_user_id)')
      .single()

    if (error) {
      console.error('Error creating link request:', error)
      return NextResponse.json({ error: 'Failed to create link request' }, { status: 500 })
    }

    // Notify supplier of new link request (respect notify_new_link_requests, default true)
    // Use admin client - buyer cannot read supplier_settings due to RLS
    const admin = createAdminClient()
    const { data: supplierSettings } = await admin
      .from('supplier_settings')
      .select('notify_new_link_requests')
      .eq('supplier_id', supplierId)
      .single()
    const shouldNotifyLink = supplierSettings?.notify_new_link_requests !== false
    const supplierAuthId = (link?.supplier as { auth_user_id?: string })?.auth_user_id
    if (supplierAuthId && shouldNotifyLink) {
      const buyerName = (await admin.from('professionals').select('business_name').eq('id', buyer.id).single()).data?.business_name || 'A buyer'
      await admin.from('notifications').insert({
        user_id: supplierAuthId,
        type: 'supplier_order',
        title: 'New Connection Request',
        title_ar: 'طلب ربط جديد',
        title_fr: 'Nouvelle demande de liaison',
        message: `${buyerName} has requested to connect as a buyer`,
        message_ar: `طلب ${buyerName} الربط كمشتري`,
        message_fr: `${buyerName} a demandé à se connecter en tant qu'acheteur`,
        metadata: { link_id: link.id, supplier_id: supplierId, buyer_id: buyer.id },
        action_url: '/professional/dashboard?section=buyers',
        is_read: false,
      })
    }

    return NextResponse.json(link, { status: 201 })
  } catch (error) {
    console.error('Error in supplier link POST:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Cancel link request or remove link
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: supplierId } = await params
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

    const { error } = await supabase
      .from('supplier_buyer_links')
      .delete()
      .eq('supplier_id', supplierId)
      .eq('buyer_id', buyer.id)

    if (error) {
      console.error('Error deleting link:', error)
      return NextResponse.json({ error: 'Failed to delete link' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Link removed' })
  } catch (error) {
    console.error('Error in supplier link DELETE:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
