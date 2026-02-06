import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getPharmacyIdFromRequest } from '@/lib/pharmacy/auth'

/**
 * GET /api/pharmacy/inventory/categories
 * Get product categories (owner or employee).
 * Uses admin client so employees can read after auth check.
 */
export async function GET(request: NextRequest) {
  try {
    // Support both owner and employee auth
    const auth = await getPharmacyIdFromRequest(request)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = createAdminClient()
    const { data: categories, error } = await admin
      .from('pharmacy_product_categories')
      .select('*')
      .order('sort_order', { ascending: true })

    if (error) {
      console.error('[Categories API] Error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ categories: categories || [] })
  } catch (error: any) {
    console.error('[Categories API] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
