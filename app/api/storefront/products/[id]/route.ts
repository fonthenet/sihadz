import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getProfessionalFromRequest } from '@/lib/storefront/auth'
import type { StorefrontProductFormData } from '@/lib/storefront/types'

export const runtime = "nodejs"
export const dynamic = "force-dynamic"


interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/storefront/products/[id]
 * Get a single product
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const auth = await getProfessionalFromRequest(request)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = createAdminClient()

    const { data: product, error } = await admin
      .from('storefront_products')
      .select('*, category:storefront_categories(*)')
      .eq('id', id)
      .eq('professional_id', auth.professionalId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Product not found' }, { status: 404 })
      }
      console.error('[Storefront Product] Error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ product })
  } catch (error: any) {
    console.error('[Storefront Product] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * PATCH /api/storefront/products/[id]
 * Update a product
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const auth = await getProfessionalFromRequest(request)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: Partial<StorefrontProductFormData> = await request.json()
    const admin = createAdminClient()

    // Verify ownership
    const { data: existing } = await admin
      .from('storefront_products')
      .select('id')
      .eq('id', id)
      .eq('professional_id', auth.professionalId)
      .single()

    if (!existing) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    const { data: product, error } = await admin
      .from('storefront_products')
      .update({
        ...body,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*, category:storefront_categories(*)')
      .single()

    if (error) {
      console.error('[Storefront Product] Update error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ product })
  } catch (error: any) {
    console.error('[Storefront Product] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * DELETE /api/storefront/products/[id]
 * Delete a product
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const auth = await getProfessionalFromRequest(request)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = createAdminClient()

    // Verify ownership before delete
    const { data: existing } = await admin
      .from('storefront_products')
      .select('id')
      .eq('id', id)
      .eq('professional_id', auth.professionalId)
      .single()

    if (!existing) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    const { error } = await admin
      .from('storefront_products')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('[Storefront Product] Delete error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[Storefront Product] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
