import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getProfessionalFromRequest } from '@/lib/storefront/auth'
import type { StorefrontCategoryFormData } from '@/lib/storefront/types'

/**
 * GET /api/storefront/categories
 * List categories for the authenticated professional
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await getProfessionalFromRequest(request)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = createAdminClient()

    // Get categories with product count
    const { data: categories, error } = await admin
      .from('storefront_categories')
      .select('*')
      .eq('professional_id', auth.professionalId)
      .order('display_order', { ascending: true })
      .order('name', { ascending: true })

    if (error) {
      console.error('[Storefront Categories] Error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Get product counts per category
    const { data: counts } = await admin
      .from('storefront_products')
      .select('category_id')
      .eq('professional_id', auth.professionalId)

    const countMap: Record<string, number> = {}
    counts?.forEach(p => {
      if (p.category_id) {
        countMap[p.category_id] = (countMap[p.category_id] || 0) + 1
      }
    })

    const categoriesWithCount = categories?.map(c => ({
      ...c,
      product_count: countMap[c.id] || 0,
    }))

    return NextResponse.json({ categories: categoriesWithCount || [] })
  } catch (error: any) {
    console.error('[Storefront Categories] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * POST /api/storefront/categories
 * Create a new category
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await getProfessionalFromRequest(request)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: StorefrontCategoryFormData = await request.json()
    const admin = createAdminClient()

    if (!body.name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    // Generate slug from name if not provided
    const slug = body.slug || body.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')

    const { data: category, error } = await admin
      .from('storefront_categories')
      .insert({
        professional_id: auth.professionalId,
        name: body.name,
        name_ar: body.name_ar || null,
        description: body.description || null,
        slug,
        icon: body.icon || null,
        display_order: body.display_order || 0,
        is_active: body.is_active !== false,
      })
      .select()
      .single()

    if (error) {
      console.error('[Storefront Categories] Insert error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ category }, { status: 201 })
  } catch (error: any) {
    console.error('[Storefront Categories] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
