import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getProfessionalFromRequest } from '@/lib/storefront/auth'
import type { StorefrontCategoryFormData } from '@/lib/storefront/types'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/storefront/categories/[id]
 * Get a single category
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const auth = await getProfessionalFromRequest(request)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = createAdminClient()

    const { data: category, error } = await admin
      .from('storefront_categories')
      .select('*')
      .eq('id', id)
      .eq('professional_id', auth.professionalId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Category not found' }, { status: 404 })
      }
      console.error('[Storefront Category] Error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ category })
  } catch (error: any) {
    console.error('[Storefront Category] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * PATCH /api/storefront/categories/[id]
 * Update a category
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const auth = await getProfessionalFromRequest(request)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: Partial<StorefrontCategoryFormData> = await request.json()
    const admin = createAdminClient()

    // Verify ownership
    const { data: existing } = await admin
      .from('storefront_categories')
      .select('id')
      .eq('id', id)
      .eq('professional_id', auth.professionalId)
      .single()

    if (!existing) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 })
    }

    const { data: category, error } = await admin
      .from('storefront_categories')
      .update({
        ...body,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('[Storefront Category] Update error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ category })
  } catch (error: any) {
    console.error('[Storefront Category] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * DELETE /api/storefront/categories/[id]
 * Delete a category (products in category will have category_id set to null)
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const auth = await getProfessionalFromRequest(request)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = createAdminClient()

    // Verify ownership
    const { data: existing } = await admin
      .from('storefront_categories')
      .select('id')
      .eq('id', id)
      .eq('professional_id', auth.professionalId)
      .single()

    if (!existing) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 })
    }

    const { error } = await admin
      .from('storefront_categories')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('[Storefront Category] Delete error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[Storefront Category] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
